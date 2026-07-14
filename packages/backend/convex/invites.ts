import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Teams from './model/teams'

const vRole = v.union(v.literal('admin'), v.literal('member'))

const vInvite = v.object({
  _id: v.id('invites'),
  _creationTime: v.number(),
  teamId: v.id('teams'),
  email: v.string(),
  role: vRole,
  invitedBy: v.string(),
})

export const createInvite = mutation({
  args: { teamId: v.id('teams'), email: v.string(), role: vRole },
  returns: vInvite,
  handler: (ctx, args) => run(Teams.createInvite(ctx, args.teamId, args.email, args.role)),
})

export const listInvites = query({
  args: { teamId: v.id('teams') },
  returns: v.array(vInvite),
  handler: (ctx, args) => run(Teams.listInvites(ctx, args.teamId)),
})

export const revokeInvite = mutation({
  args: { inviteId: v.id('invites') },
  returns: v.null(),
  handler: (ctx, args) => run(Teams.revokeInvite(ctx, args.inviteId)),
})

export const acceptInvite = mutation({
  args: { inviteId: v.id('invites') },
  returns: v.null(),
  handler: (ctx, args) => run(Teams.acceptInvite(ctx, args.inviteId)),
})

export const listMyInvites = query({
  args: {},
  returns: v.array(vInvite),
  handler: (ctx) => run(Teams.listMyInvites(ctx)),
})
