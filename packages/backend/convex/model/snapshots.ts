import { Effect } from 'effect'
import type { Infer } from 'convex/values'
import type { Doc, Id } from '../_generated/dataModel'
import type { MutationCtx, QueryCtx } from '../_generated/server'
import type { vBlock, vTheme } from '../schema'
import { getOrFail, requireUserId, type Ctx } from '../lib/access'
import { Forbidden, Invalid, NotFound } from '../lib/errors'

// Types flow from schema — never hand-written duplicates.
export type Block = Infer<typeof vBlock>
export type Theme = Infer<typeof vTheme>
export type Header = Doc<'snapshots'>['header']

// ---------------------------------------------------------------------------
// THE INVARIANT: snapshots are immutable. Nothing in this file (or anywhere)
// may ctx.db.patch/replace a snapshot's content. Commit, fork and cherry-pick
// all INSERT new rows; only branches.headSnapshotId and
// resumes.publishedSnapshotId pointers ever move. The single sanctioned
// exception is tagSent (export-time metadata) — see below.
// ---------------------------------------------------------------------------

// --- ownership helpers ------------------------------------------------------

const getOwnedResume = (ctx: Ctx, resumeId: Id<'resumes'>, userId: string) =>
  getOrFail(ctx.db.get('resumes', resumeId), 'Resume').pipe(
    Effect.filterOrFail(
      (r) => r.userId === userId,
      () => new Forbidden({ message: 'Not your resume' }),
    ),
  )

const getOwnedSnapshot = (ctx: Ctx, snapshotId: Id<'snapshots'>, userId: string) =>
  getOrFail(ctx.db.get('snapshots', snapshotId), 'Snapshot').pipe(
    Effect.tap((s) => getOwnedResume(ctx, s.resumeId, userId)),
  )

const getOwnedBranch = (ctx: Ctx, branchId: Id<'branches'>, userId: string) =>
  getOrFail(ctx.db.get('branches', branchId), 'Branch').pipe(
    Effect.tap((b) => getOwnedResume(ctx, b.resumeId, userId)),
  )

// --- resumes ----------------------------------------------------------------

export const createResume = Effect.fn('snapshots.createResume')(function* (
  ctx: MutationCtx,
  args: { name: string; header: Header },
) {
  const userId = yield* requireUserId(ctx)
  const resumeId = yield* Effect.promise(() => ctx.db.insert('resumes', { userId, name: args.name }))
  const branchId = yield* Effect.promise(() =>
    ctx.db.insert('branches', { resumeId, name: 'main', color: '#6366f1' }),
  )
  const snapshotId = yield* Effect.promise(() =>
    ctx.db.insert('snapshots', {
      resumeId,
      branchId,
      message: 'init',
      blocks: [],
      theme: { id: 'classic' },
      header: args.header,
    }),
  )
  yield* Effect.promise(() => ctx.db.patch('branches', branchId, { headSnapshotId: snapshotId }))
  return resumeId
})

export const listMyResumes = Effect.fn('snapshots.listMyResumes')(function* (ctx: QueryCtx) {
  const userId = yield* requireUserId(ctx)
  return yield* Effect.promise(() =>
    ctx.db
      .query('resumes')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect(),
  )
})

export const getResume = Effect.fn('snapshots.getResume')(function* (
  ctx: QueryCtx,
  resumeId: Id<'resumes'>,
) {
  const userId = yield* requireUserId(ctx)
  return yield* getOwnedResume(ctx, resumeId, userId)
})

export const renameResume = Effect.fn('snapshots.renameResume')(function* (
  ctx: MutationCtx,
  resumeId: Id<'resumes'>,
  name: string,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  yield* Effect.promise(() => ctx.db.patch('resumes', resumeId, { name }))
  return null
})

export const deleteResume = Effect.fn('snapshots.deleteResume')(function* (
  ctx: MutationCtx,
  resumeId: Id<'resumes'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  // Cascade: deleting rows is not a snapshot mutation — the tree dies whole.
  const [snapshots, branches] = yield* Effect.all(
    [
      Effect.promise(() =>
        ctx.db
          .query('snapshots')
          .withIndex('by_resume', (q) => q.eq('resumeId', resumeId))
          .collect(),
      ),
      Effect.promise(() =>
        ctx.db
          .query('branches')
          .withIndex('by_resume', (q) => q.eq('resumeId', resumeId))
          .collect(),
      ),
    ],
    { concurrency: 'unbounded' },
  )
  yield* Effect.forEach(snapshots, (s) => Effect.promise(() => ctx.db.delete('snapshots', s._id)), {
    concurrency: 'unbounded',
  })
  yield* Effect.forEach(branches, (b) => Effect.promise(() => ctx.db.delete('branches', b._id)), {
    concurrency: 'unbounded',
  })
  yield* Effect.promise(() => ctx.db.delete('resumes', resumeId))
  return null
})

// --- publishing -------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const setUsername = Effect.fn('snapshots.setUsername')(function* (
  ctx: MutationCtx,
  resumeId: Id<'resumes'>,
  username: string,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  if (!USERNAME_RE.test(username))
    return yield* new Invalid({ message: 'Username must be lowercase kebab-case' })
  const taken = yield* Effect.promise(() =>
    ctx.db
      .query('resumes')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique(),
  )
  if (taken && taken._id !== resumeId)
    return yield* new Invalid({ message: 'Username already taken' })
  yield* Effect.promise(() => ctx.db.patch('resumes', resumeId, { username }))
  return null
})

export const publish = Effect.fn('snapshots.publish')(function* (
  ctx: MutationCtx,
  resumeId: Id<'resumes'>,
  snapshotId: Id<'snapshots'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  const snapshot = yield* getOrFail(ctx.db.get('snapshots', snapshotId), 'Snapshot')
  if (snapshot.resumeId !== resumeId)
    return yield* new Invalid({ message: 'Snapshot belongs to a different resume' })
  yield* Effect.promise(() =>
    ctx.db.patch('resumes', resumeId, { publishedSnapshotId: snapshotId }),
  )
  return null
})

export const unpublish = Effect.fn('snapshots.unpublish')(function* (
  ctx: MutationCtx,
  resumeId: Id<'resumes'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  yield* Effect.promise(() =>
    ctx.db.patch('resumes', resumeId, { publishedSnapshotId: undefined }),
  )
  return null
})

// --- the DAG: commit / fork / cherry-pick (inserts only) ---------------------

export const commit = Effect.fn('snapshots.commit')(function* (
  ctx: MutationCtx,
  args: {
    branchId: Id<'branches'>
    message: string
    blocks: Block[]
    theme: Theme
    header: Header
  },
) {
  const userId = yield* requireUserId(ctx)
  const branch = yield* getOwnedBranch(ctx, args.branchId, userId)
  const snapshotId = yield* Effect.promise(() =>
    ctx.db.insert('snapshots', {
      resumeId: branch.resumeId,
      branchId: branch._id,
      parentId: branch.headSnapshotId,
      message: args.message,
      blocks: args.blocks,
      theme: args.theme,
      header: args.header,
    }),
  )
  yield* Effect.promise(() =>
    ctx.db.patch('branches', branch._id, { headSnapshotId: snapshotId }),
  )
  return snapshotId
})

export const fork = Effect.fn('snapshots.fork')(function* (
  ctx: MutationCtx,
  args: { fromSnapshotId: Id<'snapshots'>; branchName: string; color: string },
) {
  const userId = yield* requireUserId(ctx)
  const source = yield* getOwnedSnapshot(ctx, args.fromSnapshotId, userId)
  const sourceBranch = yield* getOrFail(ctx.db.get('branches', source.branchId), 'Branch')
  const branchId = yield* Effect.promise(() =>
    ctx.db.insert('branches', {
      resumeId: source.resumeId,
      name: args.branchName,
      color: args.color,
    }),
  )
  const snapshotId = yield* Effect.promise(() =>
    ctx.db.insert('snapshots', {
      resumeId: source.resumeId,
      branchId,
      parentId: source._id,
      message: `fork of ${sourceBranch.name}`,
      blocks: source.blocks,
      theme: source.theme,
      header: source.header,
    }),
  )
  yield* Effect.promise(() => ctx.db.patch('branches', branchId, { headSnapshotId: snapshotId }))
  return { branchId, snapshotId }
})

export const cherryPickBlock = Effect.fn('snapshots.cherryPickBlock')(function* (
  ctx: MutationCtx,
  args: { fromSnapshotId: Id<'snapshots'>; blockId: string; toBranchId: Id<'branches'> },
) {
  const userId = yield* requireUserId(ctx)
  const source = yield* getOwnedSnapshot(ctx, args.fromSnapshotId, userId)
  const target = yield* getOwnedBranch(ctx, args.toBranchId, userId)
  const block = source.blocks.find((b) => b.id === args.blockId)
  if (!block) return yield* new NotFound({ message: 'Block not found in source snapshot' })
  if (!target.headSnapshotId)
    return yield* new Invalid({ message: 'Target branch has no head snapshot' })
  const head = yield* getOrFail(ctx.db.get('snapshots', target.headSnapshotId), 'Snapshot')
  // Replace by stable block id if present, else append.
  const blocks = head.blocks.some((b) => b.id === block.id)
    ? head.blocks.map((b) => (b.id === block.id ? block : b))
    : [...head.blocks, block]
  const snapshotId = yield* Effect.promise(() =>
    ctx.db.insert('snapshots', {
      resumeId: head.resumeId,
      branchId: target._id,
      parentId: head._id,
      message: `cherry-pick: ${block.title ?? block.id}`,
      blocks,
      theme: head.theme,
      header: head.header,
    }),
  )
  yield* Effect.promise(() =>
    ctx.db.patch('branches', target._id, { headSnapshotId: snapshotId }),
  )
  return snapshotId
})

// --- tagSent: THE sanctioned metadata exception ------------------------------
// Snapshots are immutable in CONTENT. `sentTo` is not content — it is
// export-time provenance metadata that by definition can only be known after
// the snapshot exists, and is write-once (only if currently undefined). A
// patch of ONLY this field keeps the DAG one-row-per-state and avoids a
// phantom child node in the tree; atsScores will get the same treatment.
// No other code path may patch a snapshot, ever.
export const tagSent = Effect.fn('snapshots.tagSent')(function* (
  ctx: MutationCtx,
  args: { snapshotId: Id<'snapshots'>; company: string; role: string },
) {
  const userId = yield* requireUserId(ctx)
  const snapshot = yield* getOwnedSnapshot(ctx, args.snapshotId, userId)
  if (snapshot.sentTo !== undefined)
    return yield* new Invalid({ message: 'Snapshot is already tagged as sent' })
  yield* Effect.promise(() =>
    ctx.db.patch('snapshots', args.snapshotId, {
      sentTo: { company: args.company, role: args.role, at: Date.now() },
    }),
  )
  return null
})

// --- reads -------------------------------------------------------------------

export const getSnapshot = Effect.fn('snapshots.getSnapshot')(function* (
  ctx: QueryCtx,
  snapshotId: Id<'snapshots'>,
) {
  const userId = yield* requireUserId(ctx)
  return yield* getOwnedSnapshot(ctx, snapshotId, userId)
})

// Everything React Flow needs in one query. Slim nodes only — full block
// content comes from getSnapshot on click.
export const getTree = Effect.fn('snapshots.getTree')(function* (
  ctx: QueryCtx,
  resumeId: Id<'resumes'>,
) {
  const userId = yield* requireUserId(ctx)
  yield* getOwnedResume(ctx, resumeId, userId)
  const [branches, snapshots] = yield* Effect.all(
    [
      Effect.promise(() =>
        ctx.db
          .query('branches')
          .withIndex('by_resume', (q) => q.eq('resumeId', resumeId))
          .collect(),
      ),
      Effect.promise(() =>
        ctx.db
          .query('snapshots')
          .withIndex('by_resume', (q) => q.eq('resumeId', resumeId))
          .collect(),
      ),
    ],
    { concurrency: 'unbounded' },
  )
  return {
    branches,
    snapshots: snapshots.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      branchId: s.branchId,
      parentId: s.parentId,
      message: s.message,
      atsScores: s.atsScores,
      sentTo: s.sentTo,
      blockCount: s.blocks.length,
    })),
  }
})

// Public — NO auth. Powers /u/$username.
export const getPublished = Effect.fn('snapshots.getPublished')(function* (
  ctx: QueryCtx,
  username: string,
) {
  const resume = yield* getOrFail(
    ctx.db
      .query('resumes')
      .withIndex('by_username', (q) => q.eq('username', username))
      .unique(),
    'Page',
  )
  if (!resume.publishedSnapshotId) return yield* new NotFound({ message: 'Page not found' })
  const snapshot = yield* getOrFail(ctx.db.get('snapshots', resume.publishedSnapshotId), 'Page')
  return {
    name: resume.name,
    header: snapshot.header,
    blocks: snapshot.blocks,
    theme: snapshot.theme,
  }
})
