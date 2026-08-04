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

/** One thing the resume importer actually wrote, as recorded on an import run. */
export const vImportItem = v.object({
  section: v.union(
    v.literal('identity'),
    v.literal('links'),
    v.literal('skills'),
    v.literal('education'),
    v.literal('experience'),
    v.literal('achievements'),
    v.literal('projects'),
  ),
  key: v.string(), // normalized match key, or the scalar field name
  label: v.string(), // human label for the history list
  action: v.union(v.literal('create'), v.literal('update')),
})

export default defineSchema({
  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    // A personal team has exactly one member (its creator) and is closed to
    // invites — it is the private default home for unshared work. Optional
    // because rows predate the field; unset/false = a normal shared team.
    personal: v.optional(v.boolean()),
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
  // `slug` is unique within the team (public URL /p/$teamSlug/$projectSlug);
  // optional only because pre-slug rows exist — models backfill on write.
  projects: defineTable({
    teamId: v.id('teams'),
    ownerId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    brief: v.optional(v.string()), // one-paragraph plain-text summary
    description: v.string(),
    demoUrl: v.optional(v.string()), // the main live/demo link
    githubUrl: v.optional(v.string()),
    // free-text like education dates ("Jan 2024", "2023"); blocks derive dateRange
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    links: v.array(v.object({ label: v.string(), url: v.string() })), // legacy, superseded by demoUrl/githubUrl
    screenshotIds: v.array(v.id('_storage')),
    // unset/false = resume-only (private); true = listed on the public team page
    // and served at /p/$teamSlug/$projectSlug.
    published: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_team', ['teamId'])
    .index('by_team_slug', ['teamId', 'slug']),

  // Per-member roles on a shared project: shared facts, personal claims.
  contributions: defineTable({
    projectId: v.id('projects'),
    userId: v.string(),
    bullets: v.array(v.string()),
  })
    .index('by_project', ['projectId'])
    .index('by_user', ['userId'])
    .index('by_project_user', ['projectId', 'userId']),

  // Per-user public identity + the source of truth the editor pulls from.
  // `username` is globally unique (public URLs /u/$username[/...]).
  // Field shapes follow what an ATS resume needs (Jake's template):
  // contact links, skill categories, education entries.
  profiles: defineTable({
    userId: v.string(), // Better Auth user id
    username: v.optional(v.string()),
    fullName: v.optional(v.string()),
    headline: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    location: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    skills: v.array(v.object({ category: v.string(), items: v.array(v.string()) })),
    // `mediaIds` are diplomas/transcripts — optional so pre-media rows stay valid.
    education: v.array(
      v.object({
        school: v.string(),
        degree: v.optional(v.string()), // "B.Tech in Computer Science"
        location: v.optional(v.string()),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        gpa: v.optional(v.string()),
        mediaIds: v.optional(v.array(v.id('_storage'))),
      }),
    ),
    // optional: rows predate the field. Experience blocks pull from here.
    // `mediaIds` are offer letters/screenshots — optional, same as education.
    experience: v.optional(
      v.array(
        v.object({
          company: v.string(),
          role: v.optional(v.string()),
          location: v.optional(v.string()),
          startDate: v.optional(v.string()),
          endDate: v.optional(v.string()),
          bullets: v.array(v.string()),
          mediaIds: v.optional(v.array(v.id('_storage'))),
        }),
      ),
    ),
    // optional: rows predate the field. Awards, certifications, publications.
    // `mediaIds` are certificates/photos/screenshots — optional so pre-media rows stay valid.
    achievements: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.optional(v.string()),
          date: v.optional(v.string()),
          mediaIds: v.optional(v.array(v.id('_storage'))),
        }),
      ),
    ),
  })
    .index('by_user', ['userId'])
    .index('by_username', ['username']),

  resumes: defineTable({
    userId: v.string(),
    name: v.string(),
    // public page: /u/$username/$slug serves the snapshot at publishedSnapshotId
    slug: v.optional(v.string()), // unique per user
    // legacy — username now lives on profiles
    username: v.optional(v.string()),
    publishedSnapshotId: v.optional(v.id('snapshots')),
  })
    .index('by_user', ['userId'])
    .index('by_user_slug', ['userId', 'slug'])
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

  // Job-posting pool. `description` is the full JD text (pasted or
  // AI-extracted from a screenshot).
  // `visibility` is chosen at create time: 'private' = creator only,
  // 'team' = members of any team in `jobTeams`, 'global' = every signed-in
  // user. UNSET = a legacy row from when jobs were one global pool — those
  // mean exactly 'global' and are never backfilled or hidden.
  jobs: defineTable({
    createdBy: v.string(), // Better Auth user id
    company: v.string(),
    role: v.string(),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    salary: v.optional(v.string()),
    description: v.string(),
    visibility: v.optional(
      v.union(v.literal('global'), v.literal('team'), v.literal('private')),
    ),
    // LEGACY, write-only until migrated: the single team a 'team' job used to
    // point at. Superseded by the `jobTeams` join table — nothing reads it
    // except `migrations:backfillJobTeams`, which copies it across.
    teamId: v.optional(v.id('teams')),
    // Shared posting state — anyone who can SEE the job may change it, so a
    // dead link gets flagged by whoever hits it. UNSET MEANS 'live': existing
    // rows are not backfilled and are never hidden. 'expired' = posting closed,
    // 'broken' = the apply link is dead.
    status: v.optional(
      v.union(v.literal('live'), v.literal('expired'), v.literal('broken')),
    ),
  })
    // listJobs is a union of index scans, one per visibility bucket:
    // global = eq(visibility,'global') plus eq(visibility, undefined) for the
    // legacy rows; private = eq(visibility,'private').eq(createdBy, me);
    // team = jobTeams.by_team for each team I'm in.
    .index('by_visibility_creator', ['visibility', 'createdBy']),

  // Which teams a 'team'-visibility job is shared with. A join table rather
  // than an array field on `jobs` because Convex indexes cannot do array
  // containment — scan-then-filter would silently drop visible jobs once the
  // pool outgrows listJobs' take() cap.
  jobTeams: defineTable({
    jobId: v.id('jobs'),
    teamId: v.id('teams'),
  })
    .index('by_job', ['jobId'])
    .index('by_team', ['teamId']),

  // Application lifecycle. Per-USER state on a SHARED job row, so it lives in
  // its own join table rather than as a field on `jobs`.
  applications: defineTable({
    userId: v.string(), // Better Auth user id
    jobId: v.id('jobs'),
    status: v.union(
      v.literal('applied'),
      v.literal('in_progress'),
      v.literal('rejected'),
      v.literal('not_eligible'),
    ),
    at: v.number(), // Date.now() when the status last changed
    note: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_job', ['userId', 'jobId']),

  // Provenance for the resume importer: one row per import RUN, listing only
  // what was actually applied. Nothing is stamped onto the profile/project
  // rows themselves — `key` is the normalized match key (or the scalar field
  // name), so per-entry attribution can be derived later without a migration.
  imports: defineTable({
    userId: v.string(), // Better Auth user id
    at: v.number(), // Date.now() at apply time
    source: v.string(), // filename, or 'Pasted text'
    applied: v.array(vImportItem),
  }).index('by_user', ['userId']),

  // BYOK: encrypted at rest, decrypted only inside actions, never logged.
  aiKeys: defineTable({
    userId: v.string(),
    provider: v.union(v.literal('anthropic'), v.literal('openai'), v.literal('google')),
    encryptedKey: v.string(),
    // Unset = use the provider's default model (see ai/provider.ts).
    model: v.optional(v.string()),
  }).index('by_user', ['userId']),
})
