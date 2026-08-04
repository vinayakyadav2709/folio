import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Jobs from './model/jobs'

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
})

export const listJobs = query({
  args: {},
  returns: v.array(vJobDoc),
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
  },
  returns: v.null(),
  handler: (ctx, { jobId, ...patch }) => run(Jobs.updateJob(ctx, jobId, patch)),
})

export const deleteJob = mutation({
  args: { jobId: v.id('jobs') },
  returns: v.null(),
  handler: (ctx, { jobId }) => run(Jobs.deleteJob(ctx, jobId)),
})
