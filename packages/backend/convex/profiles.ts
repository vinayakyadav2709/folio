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
    mediaIds: v.optional(v.array(v.id('_storage'))),
  }),
)

const vExperience = v.array(
  v.object({
    company: v.string(),
    role: v.optional(v.string()),
    location: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    bullets: v.array(v.string()),
    mediaIds: v.optional(v.array(v.id('_storage'))),
  }),
)

const vAchievements = v.array(
  v.object({
    title: v.string(),
    description: v.optional(v.string()),
    date: v.optional(v.string()),
    mediaIds: v.optional(v.array(v.id('_storage'))),
  }),
)

// Resolved entry media (achievements/education/experience), keyed by storage id
// (see model/profiles.ts).
const vMedia = v.record(
  v.id('_storage'),
  v.object({ url: v.string(), contentType: v.optional(v.string()), size: v.number() }),
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
  experience: v.optional(vExperience),
  achievements: v.optional(vAchievements),
  media: vMedia,
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
    experience: v.optional(vExperience),
    achievements: v.optional(vAchievements),
  },
  returns: v.null(),
  handler: (ctx, patch) => run(Profiles.updateMyProfile(ctx, patch)),
})

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: (ctx) => run(Profiles.generateUploadUrl(ctx)),
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
    experience: v.array(
      v.object({
        company: v.string(),
        role: v.optional(v.string()),
        location: v.optional(v.string()),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        bullets: v.array(v.string()),
      }),
    ),
    achievements: v.array(
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        date: v.optional(v.string()),
      }),
    ),
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
        startDate: nullableString,
        endDate: nullableString,
      }),
    ),
  }),
  handler: (ctx, { username }) => run(Profiles.getPublicProfile(ctx, username)),
})
