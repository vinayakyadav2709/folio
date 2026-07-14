import { Effect } from 'effect'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireAdmin, requireMembership, requireUserId } from '../lib/access'

type Link = { label: string; url: string }

export const createProject = Effect.fn('projects.createProject')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  name: string,
  description: string,
  links: Link[],
) {
  const userId = yield* requireUserId(ctx)
  yield* requireMembership(ctx, teamId, userId)
  return yield* Effect.promise(() =>
    ctx.db.insert('projects', {
      teamId,
      ownerId: userId,
      name,
      description,
      links,
      screenshotIds: [],
      updatedAt: Date.now(),
    }),
  )
})

// The team pool is collaborative: any member may edit.
export const updateProject = Effect.fn('projects.updateProject')(function* (
  ctx: MutationCtx,
  projectId: Id<'projects'>,
  patch: { name?: string; description?: string; links?: Link[] },
) {
  const userId = yield* requireUserId(ctx)
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  yield* requireMembership(ctx, project.teamId, userId)
  yield* Effect.promise(() => ctx.db.patch(projectId, { ...patch, updatedAt: Date.now() }))
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

// Public share page (/p/$projectId): no auth, non-sensitive fields only.
export const getPublicProject = Effect.fn('projects.getPublicProject')(function* (
  ctx: QueryCtx,
  projectId: Id<'projects'>,
) {
  const project = yield* getOrFail(ctx.db.get(projectId), 'Project')
  const urls = yield* Effect.forEach(
    project.screenshotIds,
    (id) => Effect.promise(() => ctx.storage.getUrl(id)),
    { concurrency: 'unbounded' },
  )
  return {
    name: project.name,
    description: project.description,
    links: project.links,
    updatedAt: project.updatedAt,
    screenshotUrls: urls.filter((u): u is string => u !== null),
  }
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
