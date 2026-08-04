import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import { run } from './lib/errors'
import * as Migrations from './model/migrations'

// Run with: bunx convex run migrations:backfillSlugs [--prod]
export const backfillSlugs = internalMutation({
  args: {},
  returns: v.object({ projects: v.number(), resumes: v.number() }),
  handler: (ctx) => run(Migrations.backfillSlugs(ctx)),
})

// Run with: bunx convex run migrations:backfillPublished [--prod]
export const backfillPublished = internalMutation({
  args: {},
  returns: v.object({ projects: v.number() }),
  handler: (ctx) => run(Migrations.backfillPublished(ctx)),
})

// Run with: bunx convex run migrations:backfillJobTeams [--prod]
export const backfillJobTeams = internalMutation({
  args: {},
  returns: v.object({ jobTeams: v.number() }),
  handler: (ctx) => run(Migrations.backfillJobTeams(ctx)),
})
