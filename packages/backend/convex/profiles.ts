import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { run } from './lib/errors'
import * as Profiles from './model/profiles'

const vSkills = v.array(v.object({ category: v.string(), items: v.array(v.string()) }))
const vEducation = v.array(
  v.object({
    school: v.string(),
    degree: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    gpa: v.optional(v.string()),
  }),
)

const vProfileDoc = v.object({
  _id: v.id('profiles'),
  _creationTime: v.number(),
  userId: v.string(),
  username: v.optional(v.string()),
  fullName: v.optional(v.string()),
  headline: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  location: v.optional(v.string()),
  githubUrl: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
  websiteUrl: v.optional(v.string()),
  skills: vSkills,
  education: vEducation,
})

const nullableString = v.union(v.string(), v.null())

export const getMyProfile = query({
  args: {},
  returns: v.union(vProfileDoc, v.null()),
  handler: (ctx) => run(Profiles.getMyProfile(ctx)),
})

export const updateMyProfile = mutation({
  args: {
    fullName: v.optional(v.string()),
    headline: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    skills: v.optional(vSkills),
    education: v.optional(vEducation),
  },
  returns: v.null(),
  handler: (ctx, patch) => run(Profiles.updateMyProfile(ctx, patch)),
})

export const setUsername = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: (ctx, { username }) => run(Profiles.setUsername(ctx, username)),
})

// Public — NO auth. Powers /u/$username.
export const getPublicProfile = query({
  args: { username: v.string() },
  returns: v.object({
    username: v.string(),
    fullName: nullableString,
    headline: nullableString,
    email: nullableString,
    phone: nullableString,
    location: nullableString,
    githubUrl: nullableString,
    linkedinUrl: nullableString,
    websiteUrl: nullableString,
    skills: vSkills,
    education: vEducation,
    resumes: v.array(v.object({ name: v.string(), slug: v.string() })),
    projects: v.array(
      v.object({
        name: v.string(),
        slug: v.string(),
        subtitle: nullableString,
        brief: nullableString,
        teamSlug: v.string(),
        demoUrl: nullableString,
        githubUrl: nullableString,
      }),
    ),
  }),
  handler: (ctx, { username }) => run(Profiles.getPublicProfile(ctx, username)),
})
