import { Effect } from 'effect'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { authComponent } from '../auth'
import { requireAdmin, requireMembership, requireUserId, getOrFail, type Ctx } from '../lib/access'
import { Forbidden, Invalid, NotFound } from '../lib/errors'

type Role = 'admin' | 'member'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Current user with email, for invite matching.
const requireUser = (ctx: Ctx) =>
  Effect.promise(() => authComponent.safeGetAuthUser(ctx)).pipe(
    Effect.flatMap((u) =>
      u ? Effect.succeed(u) : Effect.fail(new Forbidden({ message: 'Not signed in' })),
    ),
  )

const adminCount = (ctx: QueryCtx, teamId: Id<'teams'>) =>
  Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  ).pipe(Effect.map((ms) => ms.filter((m) => m.role === 'admin').length))

export const createTeam = Effect.fn('teams.createTeam')(function* (
  ctx: MutationCtx,
  name: string,
  slug: string,
) {
  const userId = yield* requireUserId(ctx)
  if (!SLUG_RE.test(slug))
    return yield* new Invalid({ message: 'Slug must be lowercase kebab-case' })
  const existing = yield* Effect.promise(() =>
    ctx.db
      .query('teams')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique(),
  )
  if (existing) return yield* new Invalid({ message: 'Slug already taken' })
  const teamId = yield* Effect.promise(() => ctx.db.insert('teams', { name, slug }))
  yield* Effect.promise(() =>
    ctx.db.insert('memberships', { teamId, userId, role: 'admin' as Role }),
  )
  return yield* getOrFail(ctx.db.get(teamId), 'Team')
})

export const listMyTeams = Effect.fn('teams.listMyTeams')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  )
  const teams = yield* Effect.forEach(
    memberships,
    (m) =>
      Effect.promise(() => ctx.db.get(m.teamId)).pipe(
        Effect.map((team) => (team ? { ...team, role: m.role } : null)),
      ),
    { concurrency: 'unbounded' },
  )
  return teams.filter((t): t is NonNullable<typeof t> => t !== null)
})

export const getTeam = Effect.fn('teams.getTeam')(function* (ctx: QueryCtx, teamId: Id<'teams'>) {
  const userId = yield* requireUserId(ctx)
  yield* requireMembership(ctx, teamId, userId)
  const team = yield* getOrFail(ctx.db.get(teamId), 'Team')
  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  const members = yield* Effect.forEach(
    memberships,
    (m) =>
      Effect.promise(() => authComponent.getAnyUserById(ctx, m.userId)).pipe(
        Effect.map((u) => ({
          userId: m.userId,
          role: m.role,
          name: u?.name ?? null,
          email: u?.email ?? null,
        })),
      ),
    { concurrency: 'unbounded' },
  )
  return { team, members }
})

export const updateTeam = Effect.fn('teams.updateTeam')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  name: string,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireAdmin(ctx, teamId, userId)
  yield* Effect.promise(() => ctx.db.patch(teamId, { name }))
  return yield* getOrFail(ctx.db.get(teamId), 'Team')
})

export const removeMember = Effect.fn('teams.removeMember')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  targetUserId: string,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireAdmin(ctx, teamId, userId)
  const target = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team_user', (q) => q.eq('teamId', teamId).eq('userId', targetUserId))
      .unique(),
  )
  if (!target) return yield* new NotFound({ message: 'Member not found' })
  if (target.role === 'admin') {
    const admins = yield* adminCount(ctx, teamId)
    if (admins <= 1) return yield* new Invalid({ message: 'Cannot remove the last admin' })
  }
  yield* Effect.promise(() => ctx.db.delete(target._id))
  return null
})

export const leaveTeam = Effect.fn('teams.leaveTeam')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
) {
  const userId = yield* requireUserId(ctx)
  const membership = yield* requireMembership(ctx, teamId, userId)
  if (membership.role === 'admin') {
    const admins = yield* adminCount(ctx, teamId)
    if (admins <= 1) return yield* new Invalid({ message: 'Cannot leave as the last admin' })
  }
  yield* Effect.promise(() => ctx.db.delete(membership._id))
  return null
})

export const createInvite = Effect.fn('teams.createInvite')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  email: string,
  role: Role,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireAdmin(ctx, teamId, userId)
  const normalized = email.toLowerCase()
  const existing = yield* Effect.promise(() =>
    ctx.db
      .query('invites')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  const dupe = existing.find((i) => i.email.toLowerCase() === normalized)
  if (dupe) return yield* getOrFail(ctx.db.get(dupe._id), 'Invite')
  const inviteId = yield* Effect.promise(() =>
    ctx.db.insert('invites', { teamId, email: normalized, role, invitedBy: userId }),
  )
  return yield* getOrFail(ctx.db.get(inviteId), 'Invite')
})

export const listInvites = Effect.fn('teams.listInvites')(function* (
  ctx: QueryCtx,
  teamId: Id<'teams'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireAdmin(ctx, teamId, userId)
  return yield* Effect.promise(() =>
    ctx.db
      .query('invites')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
})

export const revokeInvite = Effect.fn('teams.revokeInvite')(function* (
  ctx: MutationCtx,
  inviteId: Id<'invites'>,
) {
  const userId = yield* requireUserId(ctx)
  const invite = yield* getOrFail(ctx.db.get(inviteId), 'Invite')
  yield* requireAdmin(ctx, invite.teamId, userId)
  yield* Effect.promise(() => ctx.db.delete(inviteId))
  return null
})

export const acceptInvite = Effect.fn('teams.acceptInvite')(function* (
  ctx: MutationCtx,
  inviteId: Id<'invites'>,
) {
  const user = yield* requireUser(ctx)
  const invite = yield* getOrFail(ctx.db.get(inviteId), 'Invite')
  if (invite.email.toLowerCase() !== user.email.toLowerCase())
    return yield* new Forbidden({ message: 'Invite is for a different email' })
  const existing = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team_user', (q) =>
        q.eq('teamId', invite.teamId).eq('userId', user._id as string),
      )
      .unique(),
  )
  if (!existing)
    yield* Effect.promise(() =>
      ctx.db.insert('memberships', {
        teamId: invite.teamId,
        userId: user._id as string,
        role: invite.role,
      }),
    )
  yield* Effect.promise(() => ctx.db.delete(inviteId))
  return null
})

export const listMyInvites = Effect.fn('teams.listMyInvites')(function* (ctx: QueryCtx) {
  const user = yield* requireUser(ctx)
  return yield* Effect.promise(() =>
    ctx.db
      .query('invites')
      .withIndex('by_email', (q) => q.eq('email', user.email.toLowerCase()))
      .collect(),
  )
})
