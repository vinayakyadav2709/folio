import { Effect } from 'effect'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireAdmin, requireMembership, requireUserId } from '../lib/access'
import { slugify, uniqueSlug } from '../lib/slug'

type Link = { label: string; url: string }

// A slug is unique within its team (public URL /p/$teamSlug/$projectSlug).
const teamProjectSlug = (ctx: MutationCtx, teamId: Id<'teams'>, name: string) =>
  uniqueSlug(slugify(name), (slug) =>
    Effect.promise(() =>
      ctx.db
        .query('projects')
        .withIndex('by_team_slug', (q) => q.eq('teamId', teamId).eq('slug', slug))
        .unique(),
    ).pipe(Effect.map(Boolean)),
  )

export const createProject = Effect.fn('projects.createProject')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  args: {
    name: string
    description: string
    subtitle?: string
    brief?: string
    demoUrl?: string
    githubUrl?: string
    links?: Link[]
  },
) {
  const userId = yield* requireUserId(ctx)
  yield* requireMembership(ctx, teamId, userId)
  const slug = yield* teamProjectSlug(ctx, teamId, args.name)
  return yield* Effect.promise(() =>
    ctx.db.insert('projects', {
      teamId,
      ownerId: userId,
      name: args.name,
      slug,
      subtitle: args.subtitle,
      brief: args.brief,
      description: args.description,
      demoUrl: args.demoUrl,
      githubUrl: args.githubUrl,
      links: args.links ?? [],
      screenshotIds: [],
      updatedAt: Date.now(),
    }),
  )
})

// The team pool is collaborative: any member may edit. The slug never changes
// on rename (URLs stay stable) — but legacy rows without one get backfilled.
export const updateProject = Effect.fn('projects.updateProject')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  patch: {
    name?: string
    description?: string
    subtitle?: string
    brief?: string
    demoUrl?: string
    githubUrl?: string
    links?: Link[]
  },
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  const slug = project.slug ?? (yield* teamProjectSlug(ctx, project.teamId, project.name))
  yield* Effect.promise(() =>
    ctx.db.patch(projectId, { ...patch, slug, updatedAt: Date.now() }),
  )
  return null
})

export const deleteProject = Effect.fn('projects.deleteProject')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  if (project.ownerId !== userId) yield* requireAdmin(ctx, project.teamId, userId)
  // Bounded by team size (one contribution per member).
  const contributions = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect(),
  )
  yield* Effect.forEach(contributions, (c) => Effect.promise(() => ctx.db.delete(c._id)), {
    concurrency: 'unbounded',
  })
  yield* Effect.promise(() => ctx.db.delete(projectId))
  return null
})

export const listTeamProjects = Effect.fn('projects.listTeamProjects')(function* (
  ctx: QueryCtx,
  teamId: Id<'teams'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireMembership(ctx, teamId, userId)
  const projects = yield* Effect.promise(() =>
    ctx.db
      .query('projects')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  return yield* Effect.forEach(
    projects,
    (p) =>
      Effect.promise(() =>
        ctx.db
          .query('contributions')
          .withIndex('by_project', (q) => q.eq('projectId', p._id))
          .collect(),
      ).pipe(Effect.map((contribs) => ({ ...p, contributorIds: contribs.map((c) => c.userId) }))),
    { concurrency: 'unbounded' },
  )
})

export const getProject = Effect.fn('projects.getProject')(function* (
  ctx: QueryCtx,
  projectId: Id<'projects'>,
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  const contributions = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_project', (q) => q.eq('projectId', projectId))
      .collect(),
  )
  return { ...project, contributions }
})

export const generateScreenshotUploadUrl = Effect.fn('projects.generateScreenshotUploadUrl')(
  function* (ctx: MutationCtx, projectId: Id<'projects'>) {
    const userId = yield* requireUserId(ctx)
    const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
    yield* requireMembership(ctx, project.teamId, userId)
    return yield* Effect.promise(() => ctx.storage.generateUploadUrl())
  },
)

export const addScreenshot = Effect.fn('projects.addScreenshot')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  storageId: Id<'_storage'>,
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  yield* Effect.promise(() =>
    ctx.db.patch(projectId, {
      screenshotIds: [...project.screenshotIds, storageId],
      updatedAt: Date.now(),
    }),
  )
  return null
})

export const removeScreenshot = Effect.fn('projects.removeScreenshot')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  storageId: Id<'_storage'>,
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  yield* Effect.promise(() =>
    ctx.db.patch(projectId, {
      screenshotIds: project.screenshotIds.filter((id) => id !== storageId),
      updatedAt: Date.now(),
    }),
  )
  // Drop the blob too so we don't leak orphaned storage.
  yield* Effect.promise(() => ctx.storage.delete(storageId))
  return null
})

// One contributions row per (project, user).
export const upsertMyContribution = Effect.fn('projects.upsertMyContribution')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  bullets: string[],
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  const existing = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
      .unique(),
  )
  if (existing) {
    yield* Effect.promise(() => ctx.db.patch(existing._id, { bullets }))
  } else {
    yield* Effect.promise(() => ctx.db.insert('contributions', { projectId, userId, bullets }))
  }
  return null
})

export const deleteMyContribution = Effect.fn('projects.deleteMyContribution')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
) {
  const userId = yield* requireUserId(ctx)
  const existing = yield* Effect.promise(() =>
    ctx.db
      .query('contributions')
      .withIndex('by_project_user', (q) => q.eq('projectId', projectId).eq('userId', userId))
      .unique(),
  )
  if (existing) yield* Effect.promise(() => ctx.db.delete(existing._id))
  return null
})
