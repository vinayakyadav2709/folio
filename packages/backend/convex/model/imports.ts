import { Effect } from 'effect'
import type { Doc } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { requireUserId } from '../lib/access'

type ImportFields = {
  source: string
  applied: Doc<'imports'>['applied']
}

/** Provenance for one import run — written after the data has already landed. */
export const recordImport = Effect.fn('imports.recordImport')(function* (
  ctx: MutationCtx,
  args: ImportFields,
) {
  const userId = yield* requireUserId(ctx)
  return yield* Effect.promise(() =>
    ctx.db.insert('imports', { ...args, userId, at: Date.now() }),
  )
})

export const listMyImports = Effect.fn('imports.listMyImports')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  // ponytail: the history panel shows recent runs; 50 is more than anyone reads.
  return yield* Effect.promise(() =>
    ctx.db
      .query('imports')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(50),
  )
})
