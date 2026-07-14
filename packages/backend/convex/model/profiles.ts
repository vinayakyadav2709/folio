import { Effect } from 'effect'
import type { Doc } from '../_generated/dataModel'
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
}

const myProfile = (ctx: QueryCtx | MutationCtx, userId: string) =>
  Effect.promise(() =>
    ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique(),
  )

export const getMyProfile = Effect.fn('profiles.getMyProfile')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  return yield* myProfile(ctx, userId)
})

// Upsert all profile fields EXCEPT username.
export const updateMyProfile = Effect.fn('profiles.updateMyProfile')(function* (
  ctx: MutationCtx,
  patch: ProfilePatch,
) {
  const userId = yield* requireUserId(ctx)
  const existing = yield* myProfile(ctx, userId)
  if (existing) {
    yield* Effect.promise(() => ctx.db.patch('profiles', existing._id, patch))
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
          p && p.slug
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
