import { v } from 'convex/values'
import { query } from './_generated/server'
import { vBlock, vTheme } from './schema'
import { vHeader } from './resumes'
import { run } from './lib/errors'
import * as Portfolio from './model/portfolio'

const vLink = v.object({ label: v.string(), url: v.string() })
const nullableString = v.union(v.string(), v.null())

// Public — no auth. Powers the group portfolio page /team/$slug.
export const getPublicTeam = query({
  args: { slug: v.string() },
  returns: v.union(
    v.object({
      team: v.object({ name: v.string(), slug: v.string() }),
      members: v.array(
        v.object({
          username: nullableString,
          fullName: nullableString,
          headline: nullableString,
        }),
      ),
      projects: v.array(
        v.object({
          name: v.string(),
          slug: v.string(),
          subtitle: nullableString,
          brief: nullableString,
          demoUrl: nullableString,
          githubUrl: nullableString,
        }),
      ),
    }),
    v.null(),
  ),
  handler: (ctx, { slug }) => run(Portfolio.getPublicTeam(ctx, slug)),
})

// Public — no auth. Powers the project detail page /p/$teamSlug/$projectSlug.
export const getPublicProject = query({
  args: { teamSlug: v.string(), projectSlug: v.string() },
  returns: v.union(
    v.object({
      project: v.object({
        name: v.string(),
        slug: v.string(),
        subtitle: nullableString,
        brief: nullableString,
        description: v.string(),
        demoUrl: nullableString,
        githubUrl: nullableString,
        links: v.array(vLink),
        screenshotUrls: v.array(v.string()),
        updatedAt: v.number(),
      }),
      team: v.object({ name: v.string(), slug: v.string() }),
      contributors: v.array(
        v.object({
          username: nullableString,
          fullName: nullableString,
          bullets: v.array(v.string()),
        }),
      ),
    }),
    v.null(),
  ),
  handler: (ctx, { teamSlug, projectSlug }) =>
    run(Portfolio.getPublicProject(ctx, teamSlug, projectSlug)),
})

// Public — no auth. Powers the resume page /u/$username/$resumeSlug.
export const getPublicResume = query({
  args: { username: v.string(), resumeSlug: v.string() },
  returns: v.union(
    v.object({
      name: v.string(),
      header: vHeader,
      blocks: v.array(vBlock),
      theme: vTheme,
    }),
    v.null(),
  ),
  handler: (ctx, { username, resumeSlug }) =>
    run(Portfolio.getPublicResume(ctx, username, resumeSlug)),
})
