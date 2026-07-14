import { v } from 'convex/values'
import { mutation } from './_generated/server'
import { run } from './lib/errors'
import * as Projects from './model/projects'

export const upsertMyContribution = mutation({
  args: { projectId: v.id('projects'), bullets: v.array(v.string()) },
  returns: v.null(),
  handler: (ctx, { projectId, bullets }) =>
    run(Projects.upsertMyContribution(ctx, projectId, bullets)),
})

export const deleteMyContribution = mutation({
  args: { projectId: v.id('projects') },
  returns: v.null(),
  handler: (ctx, { projectId }) => run(Projects.deleteMyContribution(ctx, projectId)),
})
