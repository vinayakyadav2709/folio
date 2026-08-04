import { Effect } from 'effect'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireUserId } from '../lib/access'
import { Invalid } from '../lib/errors'

// Editable profile fields — everything except userId/username (username has its
// own guarded mutation). skills/education flow from the schema shape.
type ProfilePatch = {
  fullName?: string
  headline?: string
  email?: string
  phone?: string
  location?: string
  githubUrl?: string
  linkedinUrl?: string
  websiteUrl?: string
  skills?: Doc<'profiles'>['skills']
  education?: Doc<'profiles'>['education']
  experience?: Doc<'profiles'>['experience']
  achievements?: Doc<'profiles'>['achievements']
}

const myProfile = (ctx: QueryCtx | MutationCtx, userId: string) =>
  Effect.promise(() =>
    ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique(),
  )

// The three sections whose entries can carry attached media.
const MEDIA_SECTIONS = ['achievements', 'education', 'experience'] as const
type MediaEntries = readonly { mediaIds?: Id<'_storage'>[] }[] | undefined

const mediaIdsIn = (entries: MediaEntries) => (entries ?? []).flatMap((e) => e.mediaIds ?? [])

// Every storage id referenced anywhere on the profile, deduped.
const allMediaIds = (p: { [K in (typeof MEDIA_SECTIONS)[number]]?: MediaEntries }) => [
  ...new Set(MEDIA_SECTIONS.flatMap((k) => mediaIdsIn(p[k]))),
]

// Entry media, keyed by storage id: the form rows only ever carry ids
// (like projects.screenshotIds), so presentation data rides alongside as a map.
export const getMyProfile = Effect.fn('profiles.getMyProfile')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  const profile = yield* myProfile(ctx, userId)
  if (!profile) return null
  const entries = yield* Effect.forEach(
    allMediaIds(profile),
    (id) =>
      Effect.promise(async () => {
        const [url, meta] = await Promise.all([
          ctx.storage.getUrl(id),
          ctx.db.system.get('_storage', id),
        ])
        // Deleted/missing file — drop it rather than blowing up the query.
        return url ? ([id, { url, contentType: meta?.contentType, size: meta?.size ?? 0 }] as const) : null
      }),
    { concurrency: 'unbounded' },
  )
  const media = Object.fromEntries(entries.filter((e) => e !== null)) as Record<
    Id<'_storage'>,
    { url: string; contentType?: string; size: number }
  >
  return { ...profile, media }
})

// Upsert all profile fields EXCEPT username.
export const updateMyProfile = Effect.fn('profiles.updateMyProfile')(function* (
  ctx: MutationCtx,
  patch: ProfilePatch,
) {
  const userId = yield* requireUserId(ctx)
  const existing = yield* myProfile(ctx, userId)
  if (existing) {
    // Media dropped from the user's own entries loses its blob too, the same
    // way projects.removeScreenshot deletes rather than just unlinking. A blob
    // only dies when NO section still references it after the patch — sections
    // this patch doesn't carry keep their stored ids alive.
    const kept = new Set<string>(
      allMediaIds({
        achievements: patch.achievements ?? existing.achievements,
        education: patch.education ?? existing.education,
        experience: patch.experience ?? existing.experience,
      }),
    )
    const orphaned = [
      ...new Set(MEDIA_SECTIONS.flatMap((k) => (patch[k] ? mediaIdsIn(existing[k]) : []))),
    ].filter((id) => !kept.has(id))
    yield* Effect.promise(() => ctx.db.patch('profiles', existing._id, patch))
    yield* Effect.forEach(orphaned, (id) => Effect.promise(() => ctx.storage.delete(id)), {
      concurrency: 'unbounded',
    })
  } else {
    yield* Effect.promise(() =>
      ctx.db.insert('profiles', {
        ...patch,
        userId,
        skills: patch.skills ?? [],
        education: patch.education ?? [],
      }),
    )
  }
  return null
})

// Signed-in users upload achievement media straight to storage; the returned
// storageId only becomes reachable once it lands in their own profile row.
export const generateUploadUrl = Effect.fn('profiles.generateUploadUrl')(function* (
  ctx: MutationCtx,
) {
  yield* requireUserId(ctx)
  return yield* Effect.promise(() => ctx.storage.generateUploadUrl())
})

const USERNAME_RE = /^[a-z0-9-]{3,30}$/

// Globally-unique handle for the public /u/$username page.
export const setUsername = Effect.fn('profiles.setUsername')(function* (
  ctx: MutationCtx,
  username: string,
) {
  const userId = yield* requireUserId(ctx)
  if (!USERNAME_RE.test(username))
    return yield* new Invalid({ message: 'Username must be 3–30 chars: a–z, 0–9, hyphen' })
  const taken = yield* Effect.promise(() =>
    ctx.db
      .query('profiles')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique(),
  )
  if (taken && taken.userId !== userId)
    return yield* new Invalid({ message: 'Username already taken' })
  const existing = yield* myProfile(ctx, userId)
  if (existing) {
    yield* Effect.promise(() => ctx.db.patch('profiles', existing._id, { username }))
  } else {
    yield* Effect.promise(() =>
      ctx.db.insert('profiles', { userId, username, skills: [], education: [] }),
    )
  }
  return null
})

// Public — NO auth. Powers /u/$username: identity + published resumes + the
// projects this person contributed to. Never leaks unpublished resumes.
export const getPublicProfile = Effect.fn('profiles.getPublicProfile')(function* (
  ctx: QueryCtx,
  username: string,
) {
  const profile = yield* getOrFail(
    ctx.db
      .query('profiles')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique(),
    'Profile',
  )

  const resumes = yield* Effect.promise(() =>
    ctx.db
      .query('resumes')
      .withIndex('by_user', (q) => q.eq('userId', profile.userId))
      .collect(),
  )
  const publishedResumes = resumes
    .filter((r): r is typeof r & { slug: string } => !!r.publishedSnapshotId && !!r.slug)
    .map((r) => ({ name: r.name, slug: r.slug }))

  const contribs = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_user', (q) => q.eq('userId', profile.userId))
      .collect(),
  )
  const maybeProjects = yield* Effect.forEach(
    contribs,
    (c) =>
      Effect.promise(() => ctx.db.get('projects', c.projectId)).pipe(
        Effect.flatMap((p) =>
          p && p.slug && p.published === true
            ? Effect.promise(() => ctx.db.get('teams', p.teamId)).pipe(
                Effect.map((team) =>
                  team
                    ? {
                        name: p.name,
                        slug: p.slug as string,
                        subtitle: p.subtitle ?? null,
                        brief: p.brief ?? null,
                        teamSlug: team.slug,
                        demoUrl: p.demoUrl ?? null,
                        githubUrl: p.githubUrl ?? null,
                      }
                    : null,
                ),
              )
            : Effect.succeed(null),
        ),
      ),
    { concurrency: 'unbounded' },
  )
  const projects = maybeProjects.filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    username: profile.username as string,
    fullName: profile.fullName ?? null,
    headline: profile.headline ?? null,
    email: profile.email ?? null,
    phone: profile.phone ?? null,
    location: profile.location ?? null,
    githubUrl: profile.githubUrl ?? null,
    linkedinUrl: profile.linkedinUrl ?? null,
    websiteUrl: profile.websiteUrl ?? null,
    skills: profile.skills,
    education: profile.education,
    resumes: publishedResumes,
    projects,
  }
})
