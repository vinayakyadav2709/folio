import { Effect } from 'effect'
import type { QueryCtx } from '../_generated/server'
import { authComponent } from '../auth'

// Public display name: profile fullName when set, else the account name.
// Never expose emails here.
const publicIdentity = (ctx: QueryCtx, userId: string) =>
  Effect.all([
    Effect.promise(() =>
      ctx.db
        .query('profiles')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .unique(),
    ),
    Effect.promise(() => authComponent.getAnyUserById(ctx, userId)),
  ]).pipe(
    Effect.map(([profile, user]) => ({
      username: profile?.username ?? null,
      fullName: profile?.fullName ?? user?.name ?? null,
      headline: profile?.headline ?? null,
    })),
  )

// All queries here are PUBLIC (no auth) and power the slug/username-based public
// pages. Missing/unpublished resolves to `null` (the frontend renders its 404);
// drafts are never leaked.

// Public group-portfolio page (/team/$slug).
export const getPublicTeam = Effect.fn('portfolio.getPublicTeam')(function* (
  ctx: QueryCtx,
  slug: string,
) {
  const team = yield* Effect.promise(() =>
    ctx.db
      .query('teams')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique(),
  )
  if (!team) return null

  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team', (q) => q.eq('teamId', team._id))
      .collect(),
  )
  const members = yield* Effect.forEach(
    memberships,
    (m) => publicIdentity(ctx, m.userId),
    { concurrency: 'unbounded' },
  )

  const teamProjects = yield* Effect.promise(() =>
    ctx.db
      .query('projects')
      .withIndex('by_team', (q) => q.eq('teamId', team._id))
      .collect(),
  )
  const projects = teamProjects
    .filter((p): p is typeof p & { slug: string } => !!p.slug)
    .map((p) => ({
      name: p.name,
      slug: p.slug,
      subtitle: p.subtitle ?? null,
      brief: p.brief ?? null,
      demoUrl: p.demoUrl ?? null,
      githubUrl: p.githubUrl ?? null,
    }))

  return { team: { name: team.name, slug: team.slug }, members, projects }
})

// Public project detail page (/p/$teamSlug/$projectSlug).
export const getPublicProject = Effect.fn('portfolio.getPublicProject')(function* (
  ctx: QueryCtx,
  teamSlug: string,
  projectSlug: string,
) {
  const team = yield* Effect.promise(() =>
    ctx.db
      .query('teams')
      .withIndex('by_slug', (q) => q.eq('slug', teamSlug))
      .unique(),
  )
  if (!team) return null
  const project = yield* Effect.promise(() =>
    ctx.db
      .query('projects')
      .withIndex('by_team_slug', (q) => q.eq('teamId', team._id).eq('slug', projectSlug))
      .unique(),
  )
  if (!project) return null

  const screenshotUrls = yield* Effect.forEach(
    project.screenshotIds,
    (id) => Effect.promise(() => ctx.storage.getUrl(id)),
    { concurrency: 'unbounded' },
  )
  const contribs = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_project', (q) => q.eq('projectId', project._id))
      .collect(),
  )
  const contributors = yield* Effect.forEach(
    contribs,
    (c) =>
      publicIdentity(ctx, c.userId).pipe(
        Effect.map(({ username, fullName }) => ({ username, fullName, bullets: c.bullets })),
      ),
    { concurrency: 'unbounded' },
  )

  return {
    project: {
      name: project.name,
      slug: project.slug as string,
      subtitle: project.subtitle ?? null,
      brief: project.brief ?? null,
      description: project.description,
      demoUrl: project.demoUrl ?? null,
      githubUrl: project.githubUrl ?? null,
      links: project.links,
      screenshotUrls: screenshotUrls.filter((u): u is string => u !== null),
      updatedAt: project.updatedAt,
    },
    team: { name: team.name, slug: team.slug },
    contributors,
  }
})

// Public resume page (/u/$username/$resumeSlug): the published snapshot only.
export const getPublicResume = Effect.fn('portfolio.getPublicResume')(function* (
  ctx: QueryCtx,
  username: string,
  resumeSlug: string,
) {
  const profile = yield* Effect.promise(() =>
    ctx.db
      .query('profiles')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique(),
  )
  if (!profile) return null
  const resume = yield* Effect.promise(() =>
    ctx.db
      .query('resumes')
      .withIndex('by_user_slug', (q) => q.eq('userId', profile.userId).eq('slug', resumeSlug))
      .unique(),
  )
  if (!resume || !resume.publishedSnapshotId) return null
  const snapshot = yield* Effect.promise(() => ctx.db.get('snapshots', resume.publishedSnapshotId!))
  if (!snapshot) return null
  return {
    name: resume.name,
    header: snapshot.header,
    blocks: snapshot.blocks,
    theme: snapshot.theme,
  }
})
