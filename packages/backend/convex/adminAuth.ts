import { v } from 'convex/values'
import { internalMutation, mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as AdminAuth from './model/adminAuth'

// True only when the caller is signed in as the configured ADMIN_EMAIL.
// The admin page uses this to show/gate itself.
export const amISiteAdmin = query({
  args: {},
  returns: v.boolean(),
  handler: (ctx) => run(AdminAuth.amISiteAdmin(ctx)),
})

// Reset any user's password. Gated: the caller must be the site admin.
// Not a shared secret — it requires an authenticated admin session.
export const resetUserPassword = mutation({
  args: { email: v.string(), newPassword: v.string() },
  returns: v.object({ userId: v.string() }),
  handler: (ctx, args) =>
    run(AdminAuth.adminResetPassword(ctx, args.email, args.newPassword)),
})

// Bootstrap escape hatch: ungated, but `internal` so it is NOT publicly
// callable — only runnable from the Convex dashboard / `npx convex run`, both
// of which require deploy access. Use this if the admin account itself is
// locked out (e.g. to set the very first admin password).
export const resetUserPasswordInternal = internalMutation({
  args: { email: v.string(), newPassword: v.string() },
  returns: v.object({ userId: v.string() }),
  handler: (ctx, args) =>
    run(AdminAuth.resetPassword(ctx, args.email, args.newPassword)),
})
