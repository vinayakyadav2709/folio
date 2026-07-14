import { Effect } from 'effect'
import type { QueryCtx } from '../_generated/server'
import { authComponent } from '../auth'
import { getOrFail } from '../lib/access'

// Public group-portfolio page (/team/$slug): NO auth. Non-sensitive fields only.
export const getPublicTeam = Effect.fn('portfolio.getPublicTeam')(function* (
  ctx: QueryCtx,
  slug: string,
) {
  const team = yield* getOrFail(
    ctx.db
      .query('teams')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique(),
    'Page',
  )
  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team', (q) => q.eq('teamId', team._id))
      .collect(),
  )
  const members = yield* Effect.forEach(
    memberships,
    (m) =>
      Effect.promise(() => authComponent.getAnyUserById(ctx, m.userId)).pipe(
        Effect.map((u) => ({ userId: m.userId, name: u?.name ?? null })),
      ),
    { concurrency: 'unbounded' },
  )
  const teamProjects = yield* Effect.promise(() =>
    ctx.db
      .query('projects')
      .withIndex('by_team', (q) => q.eq('teamId', team._id))
      .collect(),
  )
  const projects = yield* Effect.forEach(
    teamProjects,
    (p) =>
      Effect.promise(() =>
        ctx.db
          .query('contributions')
          .withIndex('by_project', (q) => q.eq('projectId', p._id))
          .collect(),
      ).pipe(
        Effect.map((contribs) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          links: p.links,
          contributorIds: contribs.map((c) => c.userId),
        })),
      ),
    { concurrency: 'unbounded' },
  )
  return { team: { name: team.name, slug: team.slug }, members, projects }
})
