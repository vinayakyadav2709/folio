import { Effect } from 'effect'
import type { Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import { authComponent } from '../auth'
import { requireAdmin, requireMembership, requireUserId, getOrFail, type Ctx } from '../lib/access'
import { Forbidden, Invalid, NotFound } from '../lib/errors'
import { slugify, uniqueSlug } from '../lib/slug'
import * as Projects from './projects'

type Role = 'admin' | 'member'

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Current user with email, for invite matching.
const requireUser = (ctx: Ctx) =>
  Effect.promise(() => authComponent.safeGetAuthUser(ctx)).pipe(
    Effect.flatMap((u) =>
      u ? Effect.succeed(u) : Effect.fail(new Forbidden({ message: 'Not signed in' })),
    ),
  )

// Team slugs are globally unique (public URL /team/$slug) — same numbered
// dedupe as project/resume slugs.
const globalTeamSlug = (ctx: QueryCtx, name: string) =>
  uniqueSlug(slugify(name), (slug) =>
    Effect.promise(() =>
      ctx.db
        .query('teams')
        .withIndex('by_slug', (q) => q.eq('slug', slug))
        .unique(),
    ).pipe(Effect.map((t) => t !== null)),
  )

// A personal team is closed: nobody may be added to it and its owner may not
// leave it. Enforced here so every membership path shares one gate.
const refuseIfPersonal = (ctx: Ctx, teamId: Id<'teams'>, message: string) =>
  getOrFail(ctx.db.get(teamId), 'Team').pipe(
    Effect.flatMap((team) =>
      team.personal ? Effect.fail(new Forbidden({ message })) : Effect.succeed(team),
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

// Every user gets exactly one personal team: a real team row they solely own
// that nobody can ever join. Idempotent — returns the existing one if there is
// one, so it is safe to call on every dashboard mount.
// A user is in a handful of teams, so collecting their memberships and
// scanning for the personal flag is cheaper than carrying an extra index.
export const ensurePersonalTeam = Effect.fn('teams.ensurePersonalTeam')(function* (
  ctx: MutationCtx,
  userId: string,
) {
  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  )
  const teams = yield* Effect.forEach(
    memberships,
    (m) => Effect.promise(() => ctx.db.get(m.teamId)),
    { concurrency: 'unbounded' },
  )
  const existing = teams.find((t) => t?.personal === true)
  if (existing) return existing

  const user = yield* Effect.promise(() => authComponent.getAnyUserById(ctx, userId))
  const display = user?.name?.trim() || user?.email?.split('@')[0]?.trim() || 'My'
  const name = `${display}'s Space`
  // slugify can return '' (e.g. a name of only emoji); uniqueSlug falls back
  // to 'untitled' in that case, so this never fails on an unslugifiable name.
  const slug = yield* globalTeamSlug(ctx, name)
  const teamId = yield* Effect.promise(() =>
    ctx.db.insert('teams', { name, slug, personal: true }),
  )
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
      Effect.all([
        Effect.promise(() => authComponent.getAnyUserById(ctx, m.userId)),
        Effect.promise(() =>
          ctx.db
            .query('profiles')
            .withIndex('by_user', (q) => q.eq('userId', m.userId))
            .unique(),
        ),
      ]).pipe(
        Effect.map(([u, profile]) => ({
          userId: m.userId,
          role: m.role,
          name: u?.name ?? null,
          email: u?.email ?? null,
          username: profile?.username ?? null,
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
  yield* refuseIfPersonal(ctx, teamId, 'Your personal team has no other members')
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
  yield* refuseIfPersonal(ctx, teamId, "You can't leave your personal team")
  if (membership.role === 'admin') {
    const admins = yield* adminCount(ctx, teamId)
    if (admins <= 1) return yield* new Invalid({ message: 'Cannot leave as the last admin' })
  }
  yield* Effect.promise(() => ctx.db.delete(membership._id))
  return null
})

export const deleteTeam = Effect.fn('teams.deleteTeam')(function* (
  ctx: MutationCtx,
  teamId: Id<'teams'>,
  deleteProjects?: boolean,
) {
  const userId = yield* requireUserId(ctx)
  yield* requireAdmin(ctx, teamId, userId)
  yield* refuseIfPersonal(ctx, teamId, "You can't delete your personal team")

  // Projects are never cascaded implicitly. A project can belong to another
  // member, and snapshots are immutable (CLAUDE.md rule 4) — a resume block
  // that referenced a deleted project keeps a dangling `projectId` in every
  // snapshot that ever held it, and nothing may rewrite those rows. So the
  // default is still to refuse; the caller must opt in explicitly.
  //
  // Everything below runs inside one Convex mutation, i.e. one transaction:
  // either every project, contribution, membership, invite and the team row
  // go away together, or nothing does. A client-side loop over
  // projects.deleteProject followed by teams.deleteTeam could half-fail and
  // leave the team gutted but alive — which is exactly why the cascade lives
  // here.
  const projects = yield* Effect.promise(() =>
    ctx.db
      .query('projects')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  if (projects.length > 0 && !deleteProjects)
    return yield* new Invalid({
      message: `Delete or move this team's ${projects.length} ${
        projects.length === 1 ? 'project' : 'projects'
      } first`,
    })

  // Reuse projects.deleteProject rather than restating its cascade (today:
  // contributions + the row; it deliberately leaves screenshot blobs alone).
  // It re-checks auth itself — owner, else team admin — which for the caller
  // we already proved to be an admin of this team is the same membership row
  // read again, never a weaker gate. Redundant, not bypassed: one extra
  // indexed read per project buys us a single definition of "delete a
  // project" that can't drift.
  yield* Effect.forEach(projects, (p) => Projects.deleteProject(ctx, p._id), {
    concurrency: 'unbounded',
  })

  // This team's share of every job posting goes away with it. A job shared
  // with other teams as well keeps those; one left with no teams at all would
  // be a 'team' job nobody can see, so it falls back to private — it still
  // carries `createdBy`. Unlike projects nothing immutable points at a job
  // (applications key off jobId, which survives), so this loses no data.
  const shares = yield* Effect.promise(() =>
    ctx.db
      .query('jobTeams')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  yield* Effect.forEach(shares, (s) => Effect.promise(() => ctx.db.delete(s._id)), {
    concurrency: 'unbounded',
  })
  yield* Effect.forEach(
    shares,
    (s) =>
      Effect.all([
        Effect.promise(() =>
          ctx.db
            .query('jobTeams')
            .withIndex('by_job', (q) => q.eq('jobId', s.jobId))
            .first(),
        ),
        Effect.promise(() => ctx.db.get(s.jobId)),
      ]).pipe(
        Effect.flatMap(([remaining, job]) =>
          remaining || job?.visibility !== 'team'
            ? Effect.void
            : Effect.promise(() =>
                ctx.db.patch(s.jobId, { visibility: 'private', teamId: undefined }),
              ),
        ),
      ),
    { concurrency: 'unbounded' },
  )

  // Memberships and invites exist only for this team — both bounded by team
  // size and indexed by team, so cascading them is safe.
  const memberships = yield* Effect.promise(() =>
    ctx.db
      .query('memberships')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  const invites = yield* Effect.promise(() =>
    ctx.db
      .query('invites')
      .withIndex('by_team', (q) => q.eq('teamId', teamId))
      .collect(),
  )
  yield* Effect.forEach(
    [...memberships, ...invites],
    (row) => Effect.promise(() => ctx.db.delete(row._id)),
    { concurrency: 'unbounded' },
  )
  yield* Effect.promise(() => ctx.db.delete(teamId))
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
  yield* refuseIfPersonal(ctx, teamId, "Your personal team can't have members")
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
  // Defence in depth: createInvite already refuses, so such an invite should
  // not exist — but never let one add a member to a personal team.
  yield* refuseIfPersonal(ctx, invite.teamId, "Your personal team can't have members")
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
