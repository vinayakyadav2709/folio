import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// A resume is a composition of blocks. Blocks referencing a shared project
// (`projectId`) carry per-resume overrides in `title`/`bullets`; standalone
// blocks (experience, education, skills, custom) carry their content directly.
export const vBlock = v.object({
  id: v.string(), // stable within a resume lineage — cherry-pick matches on it
  type: v.union(
    v.literal('project'),
    v.literal('experience'),
    v.literal('education'),
    v.literal('skills'),
    v.literal('custom'),
  ),
  projectId: v.optional(v.id('projects')),
  // upstream project version this block was synced from, for "upstream updated" diffing
  syncedAt: v.optional(v.number()),
  title: v.optional(v.string()),
  subtitle: v.optional(v.string()),
  dateRange: v.optional(v.string()),
  bullets: v.array(v.string()),
  links: v.optional(v.array(v.object({ label: v.string(), url: v.string() }))),
})

export const vTheme = v.object({
  id: v.string(), // 'classic' | 'compact' — the 2 ATS-safe themes
  accentColor: v.optional(v.string()),
  fontScale: v.optional(v.number()),
})

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
  }).index('by_slug', ['slug']),

  memberships: defineTable({
    teamId: v.id('teams'),
    userId: v.string(), // Better Auth user id
    role: v.union(v.literal('admin'), v.literal('member')),
  })
    .index('by_team', ['teamId'])
    .index('by_user', ['userId'])
    .index('by_team_user', ['teamId', 'userId']),

  invites: defineTable({
    teamId: v.id('teams'),
    email: v.string(),
    role: v.union(v.literal('admin'), v.literal('member')),
    invitedBy: v.string(),
  })
    .index('by_team', ['teamId'])
    .index('by_email', ['email']),

  // The shared pool. `description` is markdown. `updatedAt` drives the
  // "upstream updated — pull changes?" indicator on referencing blocks.
  projects: defineTable({
    teamId: v.id('teams'),
    ownerId: v.string(),
    name: v.string(),
    description: v.string(),
    links: v.array(v.object({ label: v.string(), url: v.string() })),
    screenshotIds: v.array(v.id('_storage')),
    updatedAt: v.number(),
  }).index('by_team', ['teamId']),

  // Per-member roles on a shared project: shared facts, personal claims.
  contributions: defineTable({
    projectId: v.id('projects'),
    userId: v.string(),
    bullets: v.array(v.string()),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_project_user', ['projectId', 'userId']),

  resumes: defineTable({
    userId: v.string(),
    name: v.string(),
    // public page: /u/$username serves the snapshot at publishedSnapshotId
    username: v.optional(v.string()),
    publishedSnapshotId: v.optional(v.id('snapshots')),
  })
    .index('by_user', ['userId'])
    .index('by_username', ['username']),

  branches: defineTable({
    resumeId: v.id('resumes'),
    name: v.string(), // 'main', 'finance', 'frontend', ...
    color: v.string(),
    headSnapshotId: v.optional(v.id('snapshots')),
    createdByAi: v.optional(v.boolean()), // JD-tailored branches get the 🤖 badge
  }).index('by_resume', ['resumeId']),

  // IMMUTABLE. Never patched — fork/commit/cherry-pick insert new rows.
  // parentId forms the DAG; full state per row, no deltas.
  snapshots: defineTable({
    resumeId: v.id('resumes'),
    branchId: v.id('branches'),
    parentId: v.optional(v.id('snapshots')),
    message: v.string(), // commit message: "rewrote auth bullets"
    blocks: v.array(vBlock),
    theme: vTheme,
    header: v.object({
      fullName: v.string(),
      headline: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      location: v.optional(v.string()),
      links: v.array(v.object({ label: v.string(), url: v.string() })),
    }),
    atsScores: v.optional(v.record(v.string(), v.number())),
    sentTo: v.optional(v.object({ company: v.string(), role: v.string(), at: v.number() })),
  })
    .index('by_resume', ['resumeId'])
    .index('by_branch', ['branchId'])
    .index('by_parent', ['parentId']),

  // BYOK: encrypted at rest, decrypted only inside actions, never logged.
  aiKeys: defineTable({
    userId: v.string(),
    provider: v.union(v.literal('anthropic'), v.literal('openai'), v.literal('google')),
    encryptedKey: v.string(),
  }).index('by_user', ['userId']),
})
