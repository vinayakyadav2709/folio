import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Teams from './model/teams'

const vRole = v.union(v.literal('admin'), v.literal('member'))

const vTeam = v.object({
  _id: v.id('teams'),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
})

export const createTeam = mutation({
  args: { name: v.string(), slug: v.string() },
  returns: vTeam,
  handler: (ctx, args) => run(Teams.createTeam(ctx, args.name, args.slug)),
})

export const listMyTeams = query({
  args: {},
  returns: v.array(v.object({ ...vTeam.fields, role: vRole })),
  handler: (ctx) => run(Teams.listMyTeams(ctx)),
})

export const getTeam = query({
  args: { teamId: v.id('teams') },
  returns: v.object({
    team: vTeam,
    members: v.array(
      v.object({
        userId: v.string(),
        role: vRole,
        name: v.union(v.string(), v.null()),
        email: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: (ctx, args) => run(Teams.getTeam(ctx, args.teamId)),
})

export const updateTeam = mutation({
  args: { teamId: v.id('teams'), name: v.string() },
  returns: vTeam,
  handler: (ctx, args) => run(Teams.updateTeam(ctx, args.teamId, args.name)),
})

export const removeMember = mutation({
  args: { teamId: v.id('teams'), userId: v.string() },
  returns: v.null(),
  handler: (ctx, args) => run(Teams.removeMember(ctx, args.teamId, args.userId)),
})

export const leaveTeam = mutation({
  args: { teamId: v.id('teams') },
  returns: v.null(),
  handler: (ctx, args) => run(Teams.leaveTeam(ctx, args.teamId)),
})
