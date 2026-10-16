import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import schema, { vBlock } from './schema'
import { slugify } from './lib/slug'

// One-off: load portfolio content for a user from the CLI
// (`convex run seedPortfolio:seed '<json>'`). Internal only — never client-callable.
// Projects whose slug already exists in the team are skipped, so re-runs are safe.
const profileFields = schema.tables.profiles.validator.fields
const projectFields = schema.tables.projects.validator.fields

// Undo a seed run: drop the resume it created (with its branches/snapshots) and named projects.
export const undo = internalMutation({
  args: { resumeId: v.optional(v.id('resumes')), projectIds: v.array(v.id('projects')) },
  returns: v.null(),
  handler: async (ctx, { resumeId, projectIds }) => {
    if (resumeId) {
      for (const s of await ctx.db.query('snapshots').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
        await ctx.db.delete('snapshots', s._id)
      for (const b of await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
        await ctx.db.delete('branches', b._id)
      await ctx.db.delete('resumes', resumeId)
    }
    for (const id of projectIds) await ctx.db.delete('projects', id)
    return null
  },
})

// Drop an experience entry from the profile and commit a resume snapshot without it.
// Commit = insert a child snapshot and move the branch head; nothing is patched.
export const dropExperience = internalMutation({
  args: { userId: v.string(), resumeId: v.id('resumes'), company: v.string() },
  returns: v.id('snapshots'),
  handler: async (ctx, { userId, resumeId, company }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!profile) throw new Error('profile not found')
    await ctx.db.patch('profiles', profile._id, {
      experience: profile.experience?.filter((x) => x.company !== company),
    })
    const branch = (await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
      .find((b) => b.name === 'main')
    const head = branch?.headSnapshotId && (await ctx.db.get('snapshots', branch.headSnapshotId))
    if (!branch || !head) throw new Error('main branch head not found')
    const { _id, _creationTime, ...rest } = head
    const snapshotId = await ctx.db.insert('snapshots', {
      ...rest,
      parentId: head._id,
      message: `remove ${company}`,
      blocks: head.blocks.filter((b) => !(b.type === 'experience' && b.title === company)),
      atsScores: undefined,
      sentTo: undefined,
    })
    await ctx.db.patch('branches', branch._id, { headSnapshotId: snapshotId })
    return snapshotId
  },
})

// Replace one experience entry with several, in the profile and (as a new commit) in the resume.
export const replaceExperience = internalMutation({
  args: {
    userId: v.string(),
    resumeId: v.id('resumes'),
    company: v.string(),
    entries: v.array(profileFields.experience.element),
    blocks: v.array(vBlock),
  },
  returns: v.id('snapshots'),
  handler: async (ctx, { userId, resumeId, company, entries, blocks }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!profile) throw new Error('profile not found')
    const current = profile.experience ?? []
    // not in the profile (e.g. deleted there) → insert at the same position it has on the resume
    const resumeIndex = await (async () => {
      const b = (await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
        .find((x) => x.name === 'main')
      const h = b?.headSnapshotId && (await ctx.db.get('snapshots', b.headSnapshotId))
      return h ? h.blocks.filter((x) => x.type === 'experience').findIndex((x) => x.title === company) : -1
    })()
    await ctx.db.patch('profiles', profile._id, {
      experience: current.some((x) => x.company === company)
        ? current.flatMap((x) => (x.company === company ? entries : [x]))
        : [...current.slice(0, resumeIndex < 0 ? undefined : resumeIndex), ...entries, ...(resumeIndex < 0 ? [] : current.slice(resumeIndex))],
    })
    const branch = (await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
      .find((b) => b.name === 'main')
    const head = branch?.headSnapshotId && (await ctx.db.get('snapshots', branch.headSnapshotId))
    if (!branch || !head) throw new Error('main branch head not found')
    const { _id, _creationTime, ...rest } = head
    const snapshotId = await ctx.db.insert('snapshots', {
      ...rest,
      parentId: head._id,
      message: `split ${company}`,
      blocks: head.blocks.flatMap((b) => (b.type === 'experience' && b.title === company ? blocks : [b])),
      atsScores: undefined,
      sentTo: undefined,
    })
    await ctx.db.patch('branches', branch._id, { headSnapshotId: snapshotId })
    return snapshotId
  },
})

// Rewrite: set profile experience/achievements (keeping uploaded media) and commit
// a new resume snapshot with the given blocks + theme on main.
export const rewrite = internalMutation({
  args: {
    userId: v.string(),
    resumeId: v.id('resumes'),
    message: v.string(),
    themeId: v.string(),
    experience: v.array(profileFields.experience.element),
    achievements: v.array(profileFields.achievements.element),
    blocks: v.array(vBlock),
    header: v.optional(schema.tables.snapshots.validator.fields.header),
  },
  returns: v.id('snapshots'),
  handler: async (ctx, { userId, resumeId, message, themeId, experience, achievements, blocks, header }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!profile) throw new Error('profile not found')
    const expMedia = new Map(profile.experience?.map((x) => [x.company, x.mediaIds]))
    await ctx.db.patch('profiles', profile._id, {
      experience: experience.map((x) => ({ ...x, mediaIds: expMedia.get(x.company) })),
      // same entries, same order — carry media across by position
      achievements: achievements.map((a, i) => ({ ...a, mediaIds: profile.achievements?.[i]?.mediaIds })),
    })
    const branch = (await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
      .find((b) => b.name === 'main')
    const head = branch?.headSnapshotId && (await ctx.db.get('snapshots', branch.headSnapshotId))
    if (!branch || !head) throw new Error('main branch head not found')
    const snapshotId = await ctx.db.insert('snapshots', {
      resumeId,
      branchId: branch._id,
      parentId: head._id,
      message,
      blocks,
      theme: { ...head.theme, id: themeId },
      header: header ?? head.header,
    })
    await ctx.db.patch('branches', branch._id, { headSnapshotId: snapshotId })
    return snapshotId
  },
})

// Add one published project to a team's pool (slug derived from the name).
export const addProject = internalMutation({
  args: {
    userId: v.string(),
    teamId: v.id('teams'),
    name: v.string(),
    subtitle: v.string(),
    brief: v.string(),
    description: v.string(),
    githubUrl: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  returns: v.id('projects'),
  handler: async (ctx, { userId, teamId, ...p }) =>
    await ctx.db.insert('projects', {
      ...p,
      teamId,
      ownerId: userId,
      slug: slugify(p.name),
      links: [],
      screenshotIds: [],
      published: true,
      updatedAt: Date.now(),
    }),
})

// Set a pool project's dates.
export const setProjectDates = internalMutation({
  args: { projectId: v.id('projects'), startDate: v.optional(v.string()), endDate: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { projectId, ...dates }) => {
    await ctx.db.patch('projects', projectId, { ...dates, updatedAt: Date.now() })
    return null
  },
})

// Publish every project a user owns.
export const publishAll = internalMutation({
  args: { userId: v.string() },
  returns: v.number(),
  handler: async (ctx, { userId }) => {
    const owned = await ctx.db.query('projects').withIndex('by_owner', (q) => q.eq('ownerId', userId)).collect()
    for (const p of owned) await ctx.db.patch('projects', p._id, { published: true })
    return owned.length
  },
})

export const seed = internalMutation({
  args: {
    userId: v.string(),
    teamId: v.id('teams'),
    profile: v.object({
      headline: profileFields.headline,
      skills: profileFields.skills,
      experience: profileFields.experience,
    }),
    projects: v.array(
      v.object({
        name: v.string(),
        subtitle: projectFields.subtitle,
        brief: projectFields.brief,
        description: v.string(),
        demoUrl: projectFields.demoUrl,
        githubUrl: projectFields.githubUrl,
        startDate: projectFields.startDate,
        endDate: projectFields.endDate,
        // block ids (uuid v7) are minted by the caller; projectId is filled in here
        block: vBlock,
      }),
    ),
    resume: v.object({ name: v.string(), message: v.string(), blocks: v.array(vBlock) }),
  },
  returns: v.object({ resumeId: v.id('resumes'), skipped: v.array(v.string()) }),
  handler: async (ctx, { userId, teamId, profile, projects, resume }) => {
    const existing = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!existing) throw new Error('profile not found')
    // keep uploaded media (offer letters etc.) on entries that already exist
    const media = new Map(existing.experience?.map((x) => [x.startDate, x.mediaIds]))
    await ctx.db.patch('profiles', existing._id, {
      ...profile,
      experience: profile.experience?.map((x) => ({ ...x, mediaIds: media.get(x.startDate) })),
    })

    const skipped: string[] = []
    const projectBlocks = new Map<string, typeof vBlock.type>()
    for (const { block, ...p } of projects) {
      const slug = slugify(p.name)
      const dupe = await ctx.db
        .query('projects')
        .withIndex('by_team_slug', (q) => q.eq('teamId', teamId).eq('slug', slug))
        .unique()
      const projectId =
        dupe?._id ??
        (await ctx.db.insert('projects', {
          ...p,
          teamId,
          ownerId: userId,
          slug,
          links: [],
          screenshotIds: [],
          updatedAt: Date.now(),
        }))
      if (dupe) skipped.push(p.name)
      projectBlocks.set(block.id, { ...block, projectId, syncedAt: Date.now() })
    }

    const resumeId = await ctx.db.insert('resumes', {
      userId,
      name: resume.name,
      slug: slugify(resume.name),
    })
    const branchId = await ctx.db.insert('branches', { resumeId, name: 'main', color: '#6366f1' })
    const snapshotId = await ctx.db.insert('snapshots', {
      resumeId,
      branchId,
      message: resume.message,
      blocks: resume.blocks.map((b) => projectBlocks.get(b.id) ?? b),
      theme: { id: 'classic' },
      header: {
        fullName: existing.fullName ?? '',
        headline: profile.headline,
        email: existing.email,
        phone: existing.phone,
        location: existing.location,
        links: [
          existing.githubUrl && { label: 'GitHub', url: existing.githubUrl },
          existing.linkedinUrl && { label: 'LinkedIn', url: existing.linkedinUrl },
          existing.websiteUrl && { label: 'Website', url: existing.websiteUrl },
        ].filter((l): l is { label: string; url: string } => Boolean(l)),
      },
    })
    await ctx.db.patch('branches', branchId, { headSnapshotId: snapshotId })
    return { resumeId, skipped }
  },
})
