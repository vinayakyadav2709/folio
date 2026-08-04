import { Effect } from 'effect'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireUserId } from '../lib/access'
import { Forbidden } from '../lib/errors'
import { canSee } from './jobs'

type Status = Doc<'applications'>['status']

// ponytail: a single user's tracked jobs is a small set; bounded anyway.
const LIMIT = 200

const myApplication = (ctx: QueryCtx, userId: string, jobId: Id<'jobs'>) =>
  Effect.promise(() =>
    ctx.db
      .query('applications')
      .withIndex('by_user_job', (q) => q.eq('userId', userId).eq('jobId', jobId))
      .unique(),
  )

// Upsert by (user, job). You can only track a job you can actually see.
export const setStatus = Effect.fn('applications.setStatus')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
  status: Status,
  note?: string,
) {
  const userId = yield* requireUserId(ctx)
  const job = yield* getOrFail(ctx.db.get('jobs', jobId), 'Job')
  if (!(yield* canSee(ctx, job, userId)))
    return yield* new Forbidden({ message: 'Not your job posting' })
  const existing = yield* myApplication(ctx, userId, jobId)
  // `note` is only written when the caller actually passed one — patching it
  // unconditionally would delete the note every time a caller moves the status
  // along without one (Convex treats `undefined` in a patch as field removal).
  // Pass an empty string to clear it deliberately.
  const fields = {
    status,
    at: Date.now(),
    ...(note === undefined ? {} : { note: note.trim() || undefined }),
  }
  if (existing) yield* Effect.promise(() => ctx.db.patch('applications', existing._id, fields))
  else yield* Effect.promise(() => ctx.db.insert('applications', { userId, jobId, ...fields }))
  return null
})

export const clearStatus = Effect.fn('applications.clearStatus')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
) {
  const userId = yield* requireUserId(ctx)
  const existing = yield* myApplication(ctx, userId, jobId)
  if (existing) yield* Effect.promise(() => ctx.db.delete('applications', existing._id))
  return null
})

// Joined with the job row, newest-changed first. A job deleted out from under
// an application is SKIPPED — the row carries no company/role of its own, so a
// flagged entry would render as an empty card; the orphan is harmless and gets
// cleaned up the next time the user clears it.
export const listMyApplications = Effect.fn('applications.listMyApplications')(function* (
  ctx: QueryCtx,
) {
  const userId = yield* requireUserId(ctx)
  const apps = yield* Effect.promise(() =>
    ctx.db
      .query('applications')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .take(LIMIT),
  )
  const rows = yield* Effect.forEach(
    apps,
    (a) =>
      Effect.promise(() => ctx.db.get('jobs', a.jobId)).pipe(
        Effect.map((job) =>
          job
            ? {
                _id: a._id,
                jobId: a.jobId,
                status: a.status,
                at: a.at,
                note: a.note,
                company: job.company,
                role: job.role,
                location: job.location,
                url: job.url,
              }
            : null,
        ),
      ),
    { concurrency: 'unbounded' },
  )
  return rows.filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.at - a.at)
})
