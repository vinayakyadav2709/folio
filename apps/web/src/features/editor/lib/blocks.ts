import { v7 as uuidv7 } from 'uuid'
import type { Doc, Id } from '@folio/backend/dataModel'

// Types flow from schema (rule 5): a block/header/theme is whatever a snapshot holds.
export type Snapshot = Doc<'snapshots'>
export type Block = Snapshot['blocks'][number]
export type Header = Snapshot['header']
export type Theme = Snapshot['theme']

export const BLANK_TYPES = ['experience', 'education', 'skills', 'custom'] as const

export function newBlock(type: (typeof BLANK_TYPES)[number]): Block {
  return { id: uuidv7(), type, title: '', bullets: [] }
}

export function newProjectBlock(
  project: { _id: Id<'projects'>; name: string },
  bullets: string[],
): Block {
  return {
    id: uuidv7(),
    type: 'project',
    projectId: project._id,
    title: project.name,
    bullets,
    syncedAt: Date.now(),
  }
}

export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
