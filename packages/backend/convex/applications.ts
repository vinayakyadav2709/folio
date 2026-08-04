import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Applications from './model/applications'

const vStatus = v.union(
  v.literal('applied'),
  v.literal('in_progress'),
  v.literal('rejected'),
  v.literal('not_eligible'),
)

export const setStatus = mutation({
  args: { jobId: v.id('jobs'), status: vStatus, note: v.optional(v.string()) },
  returns: v.null(),
  handler: (ctx, { jobId, status, note }) =>
    run(Applications.setStatus(ctx, jobId, status, note)),
})

export const clearStatus = mutation({
  args: { jobId: v.id('jobs') },
  returns: v.null(),
  handler: (ctx, { jobId }) => run(Applications.clearStatus(ctx, jobId)),
})

export const listMyApplications = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('applications'),
      jobId: v.id('jobs'),
      status: vStatus,
      at: v.number(),
      note: v.optional(v.string()),
      company: v.string(),
      role: v.string(),
      location: v.optional(v.string()),
      url: v.optional(v.string()),
    }),
  ),
  handler: (ctx) => run(Applications.listMyApplications(ctx)),
})
