import { v } from 'convex/values'
import { query } from './_generated/server'
import { run } from './lib/errors'
import * as Portfolio from './model/portfolio'

const vLink = v.object({ label: v.string(), url: v.string() })

// Public — no auth. Powers the group portfolio page /team/$slug.
export const getPublicTeam = query({
  args: { slug: v.string() },
  returns: v.object({
    team: v.object({ name: v.string(), slug: v.string() }),
    members: v.array(v.object({ userId: v.string(), name: v.union(v.string(), v.null()) })),
    projects: v.array(
      v.object({
        _id: v.id('projects'),
        name: v.string(),
        description: v.string(),
        links: v.array(vLink),
        contributorIds: v.array(v.string()),
      }),
    ),
  }),
  handler: (ctx, { slug }) => run(Portfolio.getPublicTeam(ctx, slug)),
})
