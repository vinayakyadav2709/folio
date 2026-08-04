import { Effect } from 'effect'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireUserId } from '../lib/access'
import { Forbidden } from '../lib/errors'

type JobFields = {
  company: string
  role: string
  location?: string
  url?: string
  salary?: string
  description: string
}

// Global pool — every signed-in user sees every job, newest first.
export const listJobs = Effect.fn('jobs.listJobs')(function* (ctx: QueryCtx) {
  yield* requireUserId(ctx)
  // ponytail: bounded at 200; paginate if the pool ever gets that big.
  return yield* Effect.promise(() => ctx.db.query('jobs').order('desc').take(200))
})

export const createJob = Effect.fn('jobs.createJob')(function* (
  ctx: MutationCtx,
  args: JobFields,
) {
  const createdBy = yield* requireUserId(ctx)
  return yield* Effect.promise(() => ctx.db.insert('jobs', { ...args, createdBy }))
})

const getOwnedJob = (ctx: MutationCtx, jobId: Id<'jobs'>, userId: string) =>
  getOrFail(ctx.db.get('jobs', jobId), 'Job').pipe(
    Effect.filterOrFail(
      (j) => j.createdBy === userId,
      () => new Forbidden({ message: 'Not your job posting' }),
    ),
  )

export const updateJob = Effect.fn('jobs.updateJob')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
  patch: Partial<JobFields>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedJob(ctx, jobId, userId)
  yield* Effect.promise(() => ctx.db.patch('jobs', jobId, patch))
  return null
})

export const deleteJob = Effect.fn('jobs.deleteJob')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedJob(ctx, jobId, userId)
  yield* Effect.promise(() => ctx.db.delete('jobs', jobId))
  return null
})
