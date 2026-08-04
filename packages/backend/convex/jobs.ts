import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Jobs from './model/jobs'

const vVisibility = v.union(v.literal('global'), v.literal('team'), v.literal('private'))
// Unset = 'live'. listJobs returns every visible job whatever its status —
// filtering expired/broken out is the UI's choice, not the server's.
const vStatus = v.union(v.literal('live'), v.literal('expired'), v.literal('broken'))

const vJobDoc = v.object({
  _id: v.id('jobs'),
  _creationTime: v.number(),
  createdBy: v.string(),
  company: v.string(),
  role: v.string(),
  location: v.optional(v.string()),
  url: v.optional(v.string()),
  salary: v.optional(v.string()),
  description: v.string(),
  visibility: v.optional(vVisibility),
  // Legacy field, still present on un-migrated rows — see schema.ts.
  teamId: v.optional(v.id('teams')),
  status: v.optional(vStatus),
})

export const listJobs = query({
  args: {},
  // `teamIds` is the live team scope (empty unless visibility === 'team').
  returns: v.array(
    v.object({ ...vJobDoc.fields, teamIds: v.array(v.id('teams')) }),
  ),
  handler: (ctx) => run(Jobs.listJobs(ctx)),
})

export const createJob = mutation({
  args: {
    company: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    salary: v.optional(v.string()),
    description: v.string(),
    visibility: v.optional(vVisibility),
    teamIds: v.optional(v.array(v.id('teams'))),
    status: v.optional(vStatus),
  },
  returns: v.id('jobs'),
  handler: (ctx, args) => run(Jobs.createJob(ctx, args)),
})

export const updateJob = mutation({
  args: {
    jobId: v.id('jobs'),
    company: v.optional(v.string()),
    role: v.optional(v.string()),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    salary: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(vVisibility),
    teamIds: v.optional(v.array(v.id('teams'))),
  },
  returns: v.null(),
  handler: (ctx, { jobId, ...patch }) => run(Jobs.updateJob(ctx, jobId, patch)),
})

// Not owner-gated (unlike updateJob): any user who can see the job may flag it.
export const setJobStatus = mutation({
  args: { jobId: v.id('jobs'), status: vStatus },
  returns: v.null(),
  handler: (ctx, { jobId, status }) => run(Jobs.setJobStatus(ctx, jobId, status)),
})

export const deleteJob = mutation({
  args: { jobId: v.id('jobs') },
  returns: v.null(),
  handler: (ctx, { jobId }) => run(Jobs.deleteJob(ctx, jobId)),
})
