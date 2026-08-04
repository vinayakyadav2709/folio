import { Effect } from 'effect'
import type { MutationCtx } from '../_generated/server'
import { slugify, uniqueSlug } from '../lib/slug'

// One-off backfill: rows created before the slug feature have no slug, which
// hides them from the public pages and disables Share. Safe to re-run (skips
// rows that already have one).
export const backfillSlugs = Effect.fn('migrations.backfillSlugs')(function* (ctx: MutationCtx) {
  const projects = yield* Effect.promise(() => ctx.db.query('projects').collect())
  let patchedProjects = 0
  for (const project of projects.filter((p) => !p.slug)) {
    const slug = yield* uniqueSlug(slugify(project.name), (s) =>
      Effect.promise(() =>
        ctx.db
          .query('projects')
          .withIndex('by_team_slug', (q) => q.eq('teamId', project.teamId).eq('slug', s))
          .unique(),
      ).pipe(Effect.map(Boolean)),
    )
    yield* Effect.promise(() => ctx.db.patch(project._id, { slug }))
    patchedProjects += 1
  }

  const resumes = yield* Effect.promise(() => ctx.db.query('resumes').collect())
  let patchedResumes = 0
  for (const resume of resumes.filter((r) => !r.slug)) {
    const slug = yield* uniqueSlug(slugify(resume.name), (s) =>
      Effect.promise(() =>
        ctx.db
          .query('resumes')
          .withIndex('by_user_slug', (q) => q.eq('userId', resume.userId).eq('slug', s))
          .unique(),
      ).pipe(Effect.map(Boolean)),
    )
    yield* Effect.promise(() => ctx.db.patch(resume._id, { slug }))
    patchedResumes += 1
  }

  return { projects: patchedProjects, resumes: patchedResumes }
})

// One-off backfill: `published` was added after these rows existed, and every
// project with a slug was already public. Keep them public. Safe to re-run.
export const backfillPublished = Effect.fn('migrations.backfillPublished')(function* (
  ctx: MutationCtx,
) {
  const projects = yield* Effect.promise(() => ctx.db.query('projects').collect())
  const stale = projects.filter((p) => !!p.slug && p.published === undefined)
  yield* Effect.forEach(stale, (p) => Effect.promise(() => ctx.db.patch(p._id, { published: true })))
  return { projects: stale.length }
})

// One-off: jobs used to point at a single team through `jobs.teamId`; team
// scope now lives in the `jobTeams` join table. Copies each pointer across and
// leaves the old field in place (nothing reads it any more). Safe to re-run —
// skips jobs that already have a row for that team.
export const backfillJobTeams = Effect.fn('migrations.backfillJobTeams')(function* (
  ctx: MutationCtx,
) {
  const jobs = yield* Effect.promise(() => ctx.db.query('jobs').collect())
  let inserted = 0
  for (const job of jobs) {
    const teamId = job.teamId
    if (!teamId) continue
    const existing = yield* Effect.promise(() =>
      ctx.db
        .query('jobTeams')
        .withIndex('by_job', (q) => q.eq('jobId', job._id))
        .collect(),
    )
    if (existing.some((r) => r.teamId === teamId)) continue
    yield* Effect.promise(() => ctx.db.insert('jobTeams', { jobId: job._id, teamId }))
    inserted += 1
  }
  return { jobTeams: inserted }
})
