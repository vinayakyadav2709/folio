import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Projects from './model/projects'

const vLink = v.object({ label: v.string(), url: v.string() })

const vProject = {
  _id: v.id('projects'),
  _creationTime: v.number(),
  teamId: v.id('teams'),
  ownerId: v.string(),
  name: v.string(),
  slug: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  brief: v.optional(v.string()),
  description: v.string(),
  demoUrl: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  links: v.array(vLink),
  screenshotIds: v.array(v.id('_storage')),
  updatedAt: v.number(),
}

const vContribution = v.object({
  _id: v.id('contributions'),
  _creationTime: v.number(),
  projectId: v.id('projects'),
  userId: v.string(),
  bullets: v.array(v.string()),
})

export const createProject = mutation({
  args: {
    teamId: v.id('teams'),
    name: v.string(),
    description: v.string(),
    subtitle: v.optional(v.string()),
    brief: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    links: v.optional(v.array(vLink)),
  },
  returns: v.id('projects'),
  handler: (ctx, { teamId, ...args }) => run(Projects.createProject(ctx, teamId, args)),
})

export const updateProject = mutation({
  args: {
    projectId: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    brief: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    links: v.optional(v.array(vLink)),
  },
  returns: v.null(),
  handler: (ctx, { projectId, ...patch }) => run(Projects.updateProject(ctx, projectId, patch)),
})

export const deleteProject = mutation({
  args: { projectId: v.id('projects') },
  returns: v.null(),
  handler: (ctx, { projectId }) => run(Projects.deleteProject(ctx, projectId)),
})

export const listTeamProjects = query({
  args: { teamId: v.id('teams') },
  returns: v.array(v.object({ ...vProject, contributorIds: v.array(v.string()) })),
  handler: (ctx, { teamId }) => run(Projects.listTeamProjects(ctx, teamId)),
})

export const getProject = query({
  args: { projectId: v.id('projects') },
  returns: v.object({
    ...vProject,
    contributions: v.array(vContribution),
    screenshotUrls: v.array(v.string()),
  }),
  handler: (ctx, { projectId }) => run(Projects.getProject(ctx, projectId)),
})

export const generateScreenshotUploadUrl = mutation({
  args: { projectId: v.id('projects') },
  returns: v.string(),
  handler: (ctx, { projectId }) => run(Projects.generateScreenshotUploadUrl(ctx, projectId)),
})

export const addScreenshot = mutation({
  args: { projectId: v.id('projects'), storageId: v.id('_storage') },
  returns: v.null(),
  handler: (ctx, { projectId, storageId }) => run(Projects.addScreenshot(ctx, projectId, storageId)),
})

export const removeScreenshot = mutation({
  args: { projectId: v.id('projects'), storageId: v.id('_storage') },
  returns: v.null(),
  handler: (ctx, { projectId, storageId }) =>
    run(Projects.removeScreenshot(ctx, projectId, storageId)),
})
