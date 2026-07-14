import { Effect } from 'effect'
import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import { requireUserId } from './lib/access'
import * as model from './model/aiKeys'

const vProvider = v.union(v.literal('anthropic'), v.literal('openai'), v.literal('google'))

export const setKey = mutation({
  args: { provider: vProvider, apiKey: v.string() },
  returns: v.null(),
  handler: (ctx, args) =>
    run(
      requireUserId(ctx).pipe(
        Effect.flatMap((uid) => model.setKey(ctx, uid, args.provider, args.apiKey)),
        Effect.as(null),
      ),
    ),
})

export const removeKey = mutation({
  args: { provider: vProvider },
  returns: v.null(),
  handler: (ctx, args) =>
    run(
      requireUserId(ctx).pipe(
        Effect.flatMap((uid) => model.removeKey(ctx, uid, args.provider)),
        Effect.as(null),
      ),
    ),
})

export const myKeyStatus = query({
  args: {},
  returns: v.array(v.object({ provider: vProvider, configured: v.literal(true) })),
  handler: (ctx) => run(requireUserId(ctx).pipe(Effect.flatMap((uid) => model.myKeyStatus(ctx, uid)))),
})
