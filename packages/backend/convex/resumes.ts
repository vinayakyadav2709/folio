import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { vBlock, vTheme } from './schema'
import { run } from './lib/errors'
import * as Snapshots from './model/snapshots'

// Header validator for function boundaries (schema declares it inline).
export const vHeader = v.object({
  fullName: v.string(),
  headline: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  location: v.optional(v.string()),
  links: v.array(v.object({ label: v.string(), url: v.string() })),
})

const vResumeDoc = v.object({
  _id: v.id('resumes'),
  _creationTime: v.number(),
  userId: v.string(),
  name: v.string(),
  username: v.optional(v.string()),
  publishedSnapshotId: v.optional(v.id('snapshots')),
})

export const createResume = mutation({
  args: { name: v.string(), header: vHeader },
  returns: v.id('resumes'),
  handler: (ctx, args) => run(Snapshots.createResume(ctx, args)),
})

export const listMyResumes = query({
  args: {},
  returns: v.array(vResumeDoc),
  handler: (ctx) => run(Snapshots.listMyResumes(ctx)),
})

export const getResume = query({
  args: { resumeId: v.id('resumes') },
  returns: vResumeDoc,
  handler: (ctx, args) => run(Snapshots.getResume(ctx, args.resumeId)),
})

export const renameResume = mutation({
  args: { resumeId: v.id('resumes'), name: v.string() },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.renameResume(ctx, args.resumeId, args.name)),
})

export const deleteResume = mutation({
  args: { resumeId: v.id('resumes') },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.deleteResume(ctx, args.resumeId)),
})

export const setUsername = mutation({
  args: { resumeId: v.id('resumes'), username: v.string() },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.setUsername(ctx, args.resumeId, args.username)),
})

export const publish = mutation({
  args: { resumeId: v.id('resumes'), snapshotId: v.id('snapshots') },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.publish(ctx, args.resumeId, args.snapshotId)),
})

export const unpublish = mutation({
  args: { resumeId: v.id('resumes') },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.unpublish(ctx, args.resumeId)),
})

// Public — no auth. Powers /u/$username.
export const getPublished = query({
  args: { username: v.string() },
  returns: v.object({
    name: v.string(),
    header: vHeader,
    blocks: v.array(vBlock),
    theme: vTheme,
  }),
  handler: (ctx, args) => run(Snapshots.getPublished(ctx, args.username)),
})
