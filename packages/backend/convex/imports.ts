import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Imports from './model/imports'
import { vImportItem } from './schema'

const vImportDoc = v.object({
  _id: v.id('imports'),
  _creationTime: v.number(),
  userId: v.string(),
  at: v.number(),
  source: v.string(),
  applied: v.array(vImportItem),
})

export const listMyImports = query({
  args: {},
  returns: v.array(vImportDoc),
  handler: (ctx) => run(Imports.listMyImports(ctx)),
})

export const recordImport = mutation({
  args: { source: v.string(), applied: v.array(vImportItem) },
  returns: v.id('imports'),
  handler: (ctx, args) => run(Imports.recordImport(ctx, args)),
})
