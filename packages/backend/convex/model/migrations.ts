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
