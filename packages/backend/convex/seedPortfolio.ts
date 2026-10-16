import { v } from 'convex/values'
import { internalMutation } from './_generated/server'
import schema, { vBlock } from './schema'

// One-off (removed after running): replace one experience entry in the profile
// and in the resume's main-branch head, and swap the resume header links.
// Commit = insert a child snapshot and move the branch head; nothing is patched.
const profileFields = schema.tables.profiles.validator.fields

export const updateExperience = internalMutation({
  args: {
    userId: v.string(),
    resumeId: v.id('resumes'),
    company: v.string(), // the entry to replace, matched by company / block title
    entry: profileFields.experience.element,
    block: vBlock,
    links: v.array(v.object({ label: v.string(), url: v.string() })),
    message: v.string(),
  },
  returns: v.id('snapshots'),
  handler: async (ctx, { userId, resumeId, company, entry, block, links, message }) => {
    const profile = await ctx.db
      .query('profiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .unique()
    if (!profile?.experience?.some((x) => x.company === company)) throw new Error('profile entry not found')
    await ctx.db.patch('profiles', profile._id, {
      experience: profile.experience.map((x) => (x.company === company ? { ...entry, mediaIds: x.mediaIds } : x)),
    })

    const resume = await ctx.db.get('resumes', resumeId)
    if (resume?.userId !== userId) throw new Error('resume not found')
    const branch = (await ctx.db.query('branches').withIndex('by_resume', (q) => q.eq('resumeId', resumeId)).collect())
      .find((b) => b.name === 'main')
    const head = branch?.headSnapshotId && (await ctx.db.get('snapshots', branch.headSnapshotId))
    if (!branch || !head) throw new Error('main branch head not found')
    if (!head.blocks.some((b) => b.type === 'experience' && b.title === company)) throw new Error('resume block not found')
    const { _id, _creationTime, ...rest } = head
    const snapshotId = await ctx.db.insert('snapshots', {
      ...rest,
      parentId: head._id,
      message,
      blocks: head.blocks.map((b) => (b.type === 'experience' && b.title === company ? block : b)),
      header: { ...head.header, links },
      atsScores: undefined,
      sentTo: undefined,
    })
    await ctx.db.patch('branches', branch._id, { headSnapshotId: snapshotId })
    if (resume.publishedSnapshotId) await ctx.db.patch('resumes', resumeId, { publishedSnapshotId: snapshotId })
    return snapshotId
  },
})
