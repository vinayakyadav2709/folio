import { Effect } from 'effect'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { authComponent, createAuth } from '../auth'
import { Forbidden, Invalid, NotFound } from '../lib/errors'

type Ctx = QueryCtx | MutationCtx

// Site admin = the account whose email matches ADMIN_EMAIL (set per deployment
// via `convex env set ADMIN_EMAIL`). There is no admin flag in the schema and
// no shared secret — being admin means being signed in as that one account.
const siteAdminEmail = () => process.env.ADMIN_EMAIL?.toLowerCase() ?? null

const getSiteAdmin = (ctx: Ctx) =>
  Effect.promise(() => authComponent.safeGetAuthUser(ctx)).pipe(
    Effect.map((user) => {
      const admin = siteAdminEmail()
      return Boolean(user && admin && user.email?.toLowerCase() === admin)
    }),
  )

export const amISiteAdmin = Effect.fn('adminAuth.amISiteAdmin')(function* (
  ctx: Ctx,
) {
  return yield* getSiteAdmin(ctx)
})

const requireSiteAdmin = (ctx: Ctx) =>
  getSiteAdmin(ctx).pipe(
    Effect.flatMap((ok) =>
      ok ? Effect.void : Effect.fail(new Forbidden({ message: 'Admin only' })),
    ),
  )

// Core credential reset — hashes with Better Auth's own scrypt so the stored
// "<salt>:<key>" format is always valid, then updates only the
// providerId:"credential" account. Ungated; callers add the auth gate.
export const resetPassword = Effect.fn('adminAuth.resetPassword')(function* (
  ctx: MutationCtx,
  email: string,
  newPassword: string,
) {
  const authCtx = yield* Effect.promise(() => createAuth(ctx).$context)

  const min = authCtx.password.config.minPasswordLength
  if (newPassword.length < min) {
    return yield* Effect.fail(
      new Invalid({ message: `Password too short (min ${min})` }),
    )
  }

  // includeAccounts is required for found.accounts to be populated — without
  // it the credential check below always sees an empty list and false-negatives.
  const found = yield* Effect.promise(() =>
    authCtx.internalAdapter.findUserByEmail(email, { includeAccounts: true }),
  )
  if (!found?.user) {
    return yield* Effect.fail(new NotFound({ message: `No user with email ${email}` }))
  }

  // updatePassword only touches the credential account, so an OAuth-only user
  // would be a silent no-op — fail loudly instead.
  const hasCredential = found.accounts?.some((a) => a.providerId === 'credential')
  if (!hasCredential) {
    return yield* Effect.fail(
      new Invalid({ message: `${email} has no password credential to reset` }),
    )
  }

  const hash = yield* Effect.promise(() => authCtx.password.hash(newPassword))
  yield* Effect.promise(() =>
    authCtx.internalAdapter.updatePassword(found.user.id, hash),
  )

  return { userId: found.user.id as string }
})

// Admin-page reset: caller must be signed in as the site admin.
export const adminResetPassword = Effect.fn('adminAuth.adminResetPassword')(
  function* (ctx: MutationCtx, email: string, newPassword: string) {
    yield* requireSiteAdmin(ctx)
    return yield* resetPassword(ctx, email, newPassword)
  },
)
