import { Effect } from 'effect'
import { v } from 'convex/values'
import { action, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import { run, Invalid } from './lib/errors'
import { requireUserId } from './lib/access'
import { decryptKey } from './lib/crypto'
import * as keys from './model/aiKeys'
import { generateText } from './ai/provider'
import { decodeStringArray } from './ai/schemas'
import { rewriteBulletPrompt } from './ai/prompts/rewriteBullet'
import { generateDescriptionPrompt } from './ai/prompts/generateDescription'

const vKey = v.union(v.null(), v.object({ provider: vProviderLit(), encryptedKey: v.string() }))
function vProviderLit() {
  return v.union(v.literal('anthropic'), v.literal('openai'), v.literal('google'))
}

const NO_KEY = 'No AI key configured — add one in Settings'

// Internal: derives the current user server-side, returns the preferred
// encrypted key doc plus (optionally) the project context for a rewrite.
// Actions can't touch ctx.db, so they fetch through this and decrypt themselves.
export const loadContext = internalQuery({
  args: { projectId: v.optional(v.id('projects')) },
  returns: v.object({
    key: vKey,
    project: v.union(
      v.null(),
      v.object({ markdown: v.string(), contributionBullets: v.array(v.string()) }),
    ),
  }),
  handler: (ctx, args) =>
    run(
      requireUserId(ctx).pipe(
        Effect.flatMap((uid) =>
          Effect.gen(function* () {
            const key = yield* keys.getPreferredKey(ctx, uid)
            if (!args.projectId) return { key, project: null }
            const project = yield* Effect.promise(() => ctx.db.get(args.projectId!))
            if (!project) return { key, project: null }
            const contribution = yield* Effect.promise(() =>
              ctx.db
                .query('contributions')
                .withIndex('by_project_user', (q) =>
                  q.eq('projectId', args.projectId!).eq('userId', uid),
                )
                .unique(),
            )
            return {
              key,
              project: { markdown: project.description, contributionBullets: contribution?.bullets ?? [] },
            }
          }),
        ),
      ),
    ),
})

export const rewriteBullet = action({
  args: { bullet: v.string(), projectId: v.optional(v.id('projects')) },
  returns: v.array(v.string()),
  handler: async (ctx, args): Promise<string[]> => {
    const { key, project } = await ctx.runQuery(internal.ai.loadContext, { projectId: args.projectId })
    return run(
      Effect.gen(function* () {
        if (!key) return yield* Effect.fail(new Invalid({ message: NO_KEY }))
        const apiKey = yield* Effect.promise(() => decryptKey(key.encryptedKey))
        const { system, prompt } = rewriteBulletPrompt({
          bullet: args.bullet,
          projectContext: project?.markdown,
          contributionBullets: project?.contributionBullets,
        })
        const text = yield* generateText({ provider: key.provider, apiKey, system, prompt }).pipe(
          Effect.mapError(() => new Invalid({ message: 'AI request failed' })),
        )
        return [...(yield* decodeStringArray(text))]
      }),
    )
  },
})

export const generateDescription = action({
  args: { name: v.string(), notes: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const { key } = await ctx.runQuery(internal.ai.loadContext, {})
    return run(
      Effect.gen(function* () {
        if (!key) return yield* Effect.fail(new Invalid({ message: NO_KEY }))
        const apiKey = yield* Effect.promise(() => decryptKey(key.encryptedKey))
        const { system, prompt } = generateDescriptionPrompt({ name: args.name, notes: args.notes })
        const text = yield* generateText({ provider: key.provider, apiKey, system, prompt }).pipe(
          Effect.mapError(() => new Invalid({ message: 'AI request failed' })),
        )
        return text.trim()
      }),
    )
  },
})
