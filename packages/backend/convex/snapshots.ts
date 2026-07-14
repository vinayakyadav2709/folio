import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { vBlock, vTheme } from './schema'
import { run } from './lib/errors'
import { vHeader } from './resumes'
import * as Snapshots from './model/snapshots'

const vSentTo = v.object({ company: v.string(), role: v.string(), at: v.number() })

const vSnapshotDoc = v.object({
  _id: v.id('snapshots'),
  _creationTime: v.number(),
  resumeId: v.id('resumes'),
  branchId: v.id('branches'),
  parentId: v.optional(v.id('snapshots')),
  message: v.string(),
  blocks: v.array(vBlock),
  theme: vTheme,
  header: vHeader,
  atsScores: v.optional(v.record(v.string(), v.number())),
  sentTo: v.optional(vSentTo),
})

export const commit = mutation({
  args: {
    branchId: v.id('branches'),
    message: v.string(),
    blocks: v.array(vBlock),
    theme: vTheme,
    header: vHeader,
  },
  returns: v.id('snapshots'),
  handler: (ctx, args) => run(Snapshots.commit(ctx, args)),
})

export const fork = mutation({
  args: { fromSnapshotId: v.id('snapshots'), branchName: v.string(), color: v.string() },
  returns: v.object({ branchId: v.id('branches'), snapshotId: v.id('snapshots') }),
  handler: (ctx, args) => run(Snapshots.fork(ctx, args)),
})

export const cherryPickBlock = mutation({
  args: {
    fromSnapshotId: v.id('snapshots'),
    blockId: v.string(),
    toBranchId: v.id('branches'),
  },
  returns: v.id('snapshots'),
  handler: (ctx, args) => run(Snapshots.cherryPickBlock(ctx, args)),
})

// The one sanctioned snapshot patch: write-once export-time metadata.
export const tagSent = mutation({
  args: { snapshotId: v.id('snapshots'), company: v.string(), role: v.string() },
  returns: v.null(),
  handler: (ctx, args) => run(Snapshots.tagSent(ctx, args)),
})

export const getSnapshot = query({
  args: { snapshotId: v.id('snapshots') },
  returns: vSnapshotDoc,
  handler: (ctx, args) => run(Snapshots.getSnapshot(ctx, args.snapshotId)),
})

export const getTree = query({
  args: { resumeId: v.id('resumes') },
  returns: v.object({
    branches: v.array(
      v.object({
        _id: v.id('branches'),
        _creationTime: v.number(),
        resumeId: v.id('resumes'),
        name: v.string(),
        color: v.string(),
        headSnapshotId: v.optional(v.id('snapshots')),
        createdByAi: v.optional(v.boolean()),
      }),
    ),
    snapshots: v.array(
      v.object({
        _id: v.id('snapshots'),
        _creationTime: v.number(),
        branchId: v.id('branches'),
        parentId: v.optional(v.id('snapshots')),
        message: v.string(),
        atsScores: v.optional(v.record(v.string(), v.number())),
        sentTo: v.optional(vSentTo),
        blockCount: v.number(),
      }),
    ),
  }),
  handler: (ctx, args) => run(Snapshots.getTree(ctx, args.resumeId)),
})
