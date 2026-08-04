import { Effect } from 'effect'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { getOrFail, requireMembership, requireUserId, type Ctx } from '../lib/access'
import { Forbidden, Invalid } from '../lib/errors'

// `teamId` is the legacy single-team pointer — the join table replaced it, so
// no caller may set it any more (see migrations:backfillJobTeams).
type JobFields = Omit<Doc<'jobs'>, '_id' | '_creationTime' | 'createdBy' | 'teamId'>
type JobInput = JobFields & { teamIds?: Id<'teams'>[] }

// ponytail: bounded at 200 per bucket; paginate if the pool ever gets that big.
const LIMIT = 200

const myTeamIds = (ctx: QueryCtx, userId: string) =>
  Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  ).pipe(Effect.map((ms) => ms.map((m) => m.teamId)))

const teamIdsOf = (ctx: QueryCtx, jobId: Id<'jobs'>) =>
  Effect.promise(() =>
    ctx.db
      .query('jobTeams')
      .withIndex('by_job', (q) => q.eq('jobId', jobId))
      .collect(),
  )

// A team job needs at least one team, and every one of them must be a team the
// caller actually belongs to. 'global', 'private' and the legacy unset value
// need no extra check.
const requireVisibilityOk = (
  ctx: Ctx,
  userId: string,
  visibility: Doc<'jobs'>['visibility'],
  teamIds: Id<'teams'>[],
) =>
  visibility !== 'team'
    ? Effect.void
    : teamIds.length === 0
      ? new Invalid({ message: 'A team job needs at least one team' })
      : Effect.forEach(teamIds, (teamId) => requireMembership(ctx, teamId, userId), {
          concurrency: 'unbounded',
        }).pipe(Effect.asVoid)

/** Replace a job's team rows with exactly `teamIds` (no-op rows untouched). */
const setJobTeams = Effect.fn('jobs.setJobTeams')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
  teamIds: Id<'teams'>[],
) {
  const rows = yield* teamIdsOf(ctx, jobId)
  const wanted = new Set(teamIds)
  const have = new Set(rows.map((r) => r.teamId))
  yield* Effect.forEach(
    rows.filter((r) => !wanted.has(r.teamId)),
    (r) => Effect.promise(() => ctx.db.delete('jobTeams', r._id)),
    { concurrency: 'unbounded' },
  )
  yield* Effect.forEach(
    teamIds.filter((t) => !have.has(t)),
    (teamId) => Effect.promise(() => ctx.db.insert('jobTeams', { jobId, teamId })),
    { concurrency: 'unbounded' },
  )
})

/** Can `userId` see this job? Unset visibility = legacy global-pool row = yes. */
export const canSee = Effect.fn('jobs.canSee')(function* (
  ctx: QueryCtx,
  job: Doc<'jobs'>,
  userId: string,
) {
  if (!job.visibility || job.visibility === 'global') return true
  if (job.visibility === 'private') return job.createdBy === userId
  const [rows, mine] = yield* Effect.all([teamIdsOf(ctx, job._id), myTeamIds(ctx, userId)])
  const teams = new Set<Id<'teams'>>(mine)
  return rows.some((r) => teams.has(r.teamId))
})

// Union of index scans — one per bucket the caller can see — merged newest
// first. No unfiltered scan, so an invisible job is never read at all.
export const listJobs = Effect.fn('jobs.listJobs')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  const teamIds = yield* myTeamIds(ctx, userId)
  const [own, shared] = yield* Effect.all([
    Effect.all(
      [
        // Legacy rows written before `visibility` existed: still everyone's.
        Effect.promise(() =>
          ctx.db
            .query('jobs')
            .withIndex('by_visibility_creator', (q) => q.eq('visibility', undefined))
            .order('desc')
            .take(LIMIT),
        ),
        Effect.promise(() =>
          ctx.db
            .query('jobs')
            .withIndex('by_visibility_creator', (q) => q.eq('visibility', 'global'))
            .order('desc')
            .take(LIMIT),
        ),
        Effect.promise(() =>
          ctx.db
            .query('jobs')
            .withIndex('by_visibility_creator', (q) =>
              q.eq('visibility', 'private').eq('createdBy', userId),
            )
            .order('desc')
            .take(LIMIT),
        ),
      ],
      { concurrency: 'unbounded' },
    ),
    // Team jobs come through the join table: one indexed scan per membership,
    // then a point-get per row. Still no scan over jobs the caller can't see.
    Effect.forEach(
      teamIds,
      (teamId) =>
        Effect.promise(() =>
          ctx.db
            .query('jobTeams')
            .withIndex('by_team', (q) => q.eq('teamId', teamId))
            .order('desc')
            .take(LIMIT),
        ).pipe(
          Effect.flatMap((rows) =>
            Effect.forEach(rows, (r) => Effect.promise(() => ctx.db.get('jobs', r.jobId)), {
              concurrency: 'unbounded',
            }),
          ),
        ),
      { concurrency: 'unbounded' },
    ),
  ])

  const byId = new Map<Id<'jobs'>, Doc<'jobs'>>()
  for (const job of own.flat()) byId.set(job._id, job)
  // A job can be shared with several of my teams, and a stale row can outlive
  // the job or its 'team' visibility — dedupe by id and trust the job row.
  for (const job of shared.flat())
    if (job && job.visibility === 'team') byId.set(job._id, job)

  const jobs = [...byId.values()]
    .sort((a, b) => b._creationTime - a._creationTime)
    .slice(0, LIMIT)

  // The UI shows which teams a posting is shared with; only team jobs have any.
  return yield* Effect.forEach(
    jobs,
    (job) =>
      job.visibility !== 'team'
        ? Effect.succeed({ ...job, teamIds: [] as Id<'teams'>[] })
        : teamIdsOf(ctx, job._id).pipe(
            Effect.map((rows) => ({ ...job, teamIds: rows.map((r) => r.teamId) })),
          ),
    { concurrency: 'unbounded' },
  )
})

export const createJob = Effect.fn('jobs.createJob')(function* (
  ctx: MutationCtx,
  { teamIds = [], ...fields }: JobInput,
) {
  const createdBy = yield* requireUserId(ctx)
  yield* requireVisibilityOk(ctx, createdBy, fields.visibility, teamIds)
  const jobId = yield* Effect.promise(() => ctx.db.insert('jobs', { ...fields, createdBy }))
  if (fields.visibility === 'team') yield* setJobTeams(ctx, jobId, teamIds)
  return jobId
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
  { teamIds, ...patch }: Partial<JobInput>,
) {
  const userId = yield* requireUserId(ctx)
  const job = yield* getOwnedJob(ctx, jobId, userId)
  // Validate the RESULT, so patching visibility alone still checks the row's
  // teams — and patching teams alone still checks the row's visibility.
  const visibility = patch.visibility ?? job.visibility
  const nextTeams =
    visibility !== 'team'
      ? []
      : (teamIds ?? (yield* teamIdsOf(ctx, jobId)).map((r) => r.teamId))
  yield* requireVisibilityOk(ctx, userId, visibility, nextTeams)
  yield* Effect.promise(() => ctx.db.patch('jobs', jobId, patch))
  yield* setJobTeams(ctx, jobId, nextTeams)
  return null
})

// Deliberately NOT owner-only: whoever clicks a dead link should be able to
// flag it, so this authorises with `canSee` rather than `getOwnedJob`.
export const setJobStatus = Effect.fn('jobs.setJobStatus')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
  status: NonNullable<Doc<'jobs'>['status']>,
) {
  const userId = yield* requireUserId(ctx)
  const job = yield* getOrFail(ctx.db.get('jobs', jobId), 'Job')
  if (!(yield* canSee(ctx, job, userId)))
    return yield* new Forbidden({ message: 'Not your job posting' })
  yield* Effect.promise(() => ctx.db.patch('jobs', jobId, { status }))
  return null
})

export const deleteJob = Effect.fn('jobs.deleteJob')(function* (
  ctx: MutationCtx,
  jobId: Id<'jobs'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedJob(ctx, jobId, userId)
  yield* setJobTeams(ctx, jobId, [])
  yield* Effect.promise(() => ctx.db.delete('jobs', jobId))
  return null
})
