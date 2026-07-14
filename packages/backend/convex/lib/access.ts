import { Effect } from 'effect'
import type { QueryCtx, MutationCtx } from '../_generated/server'
import type { Id } from '../_generated/dataModel'
import { authComponent } from '../auth'
import { Forbidden, NotFound } from './errors'

export type Ctx = QueryCtx | MutationCtx

// Effect.promise vs Effect.tryPromise — the project-wide decision (applied
// everywhere): calls into Convex infrastructure (ctx.db.*, ctx.storage.*,
// authComponent.*) and better-auth crypto are wrapped with Effect.promise ON
// PURPOSE. If one of these rejects it means the infrastructure itself failed
// (transaction aborted, storage down, corrupt ciphertext) — that is a DEFECT,
// not a recoverable DomainError, so it must escape the typed error channel and
// surface as a 500 at the run() boundary (lib/errors.ts). Domain-level
// "absence" (a missing row) is handled explicitly via getOrFail -> NotFound.

export const requireUserId = (ctx: Ctx) =>
  Effect.promise(() => authComponent.safeGetAuthUser(ctx)).pipe(
    Effect.flatMap((user) =>
      user
        ? Effect.succeed(user._id as string)
        : Effect.fail(new Forbidden({ message: 'Not signed in' })),
    ),
  )

export const requireMembership = (ctx: Ctx, teamId: Id<'teams'>, userId: string) =>
  Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team_user', (q) => q.eq('teamId', teamId).eq('userId', userId))
      .unique(),
  ).pipe(
    Effect.flatMap((m) =>
      m ? Effect.succeed(m) : Effect.fail(new Forbidden({ message: 'Not a team member' })),
    ),
  )

export const requireAdmin = (ctx: Ctx, teamId: Id<'teams'>, userId: string) =>
  requireMembership(ctx, teamId, userId).pipe(
    Effect.flatMap((m) =>
      m.role === 'admin'
        ? Effect.succeed(m)
        : Effect.fail(new Forbidden({ message: 'Admin only' })),
    ),
  )

export const getOrFail = <T>(promise: Promise<T | null>, what: string) =>
  Effect.promise(() => promise).pipe(
    Effect.flatMap((doc) =>
      doc ? Effect.succeed(doc) : Effect.fail(new NotFound({ message: `${what} not found` })),
    ),
  )
