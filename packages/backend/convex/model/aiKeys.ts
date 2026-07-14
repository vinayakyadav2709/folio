import { Effect } from 'effect'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Doc } from '../_generated/dataModel'
import { encryptKey } from '../lib/crypto'

export type Provider = Doc<'aiKeys'>['provider']

// At most 3 keys per user (one per provider), so collecting is bounded.
const userKeys = (ctx: QueryCtx | MutationCtx, userId: string) =>
  Effect.promise(() =>
    ctx.db.query('aiKeys').withIndex('by_user', (q) => q.eq('userId', userId)).collect(),
  )

// Encrypt + upsert by (user, provider). Encryption happens here (mutation
// runtime); the plaintext key never touches the DB or the query layer.
export const setKey = Effect.fn('aiKeys.setKey')(function* (
  ctx: MutationCtx,
  userId: string,
  provider: Provider,
  apiKey: string,
) {
  const encryptedKey = yield* Effect.promise(() => encryptKey(apiKey))
  const existing = (yield* userKeys(ctx, userId)).find((k) => k.provider === provider)
  yield* existing
    ? Effect.promise(() => ctx.db.patch(existing._id, { encryptedKey }))
    : Effect.promise(() => ctx.db.insert('aiKeys', { userId, provider, encryptedKey }))
})

export const removeKey = Effect.fn('aiKeys.removeKey')(function* (
  ctx: MutationCtx,
  userId: string,
  provider: Provider,
) {
  const match = (yield* userKeys(ctx, userId)).find((k) => k.provider === provider)
  if (match) yield* Effect.promise(() => ctx.db.delete(match._id))
})

// Never returns key material — only which providers are configured.
export const myKeyStatus = Effect.fn('aiKeys.myKeyStatus')(function* (
  ctx: QueryCtx,
  userId: string,
) {
  const keys = yield* userKeys(ctx, userId)
  return keys.map((k) => ({ provider: k.provider, configured: true as const }))
})

// The encrypted doc for one configured key, preferring anthropic. Decryption
// happens in the caller (an action); this only moves the ciphertext.
export const getPreferredKey = Effect.fn('aiKeys.getPreferredKey')(function* (
  ctx: QueryCtx,
  userId: string,
) {
  const keys = yield* userKeys(ctx, userId)
  const chosen = keys.find((k) => k.provider === 'anthropic') ?? keys[0]
  return chosen ? { provider: chosen.provider, encryptedKey: chosen.encryptedKey } : null
})
