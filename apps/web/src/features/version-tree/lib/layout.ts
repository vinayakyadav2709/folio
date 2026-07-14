import type { Edge, Node } from '@xyflow/react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'

export type Tree = FunctionReturnType<typeof api.snapshots.getTree>
export type TreeBranch = Tree['branches'][number]
export type TreeSnapshot = Tree['snapshots'][number]

export type SnapshotNodeData = {
  message: string
  creationTime: number
  blockCount: number
  color: string
  branchName: string
  createdByAi: boolean
  isHead: boolean
  sentTo?: TreeSnapshot['sentTo']
  atsScores?: TreeSnapshot['atsScores']
}

export type SnapshotNode = Node<SnapshotNodeData, 'snapshot'>

const COLUMN_WIDTH = 300
const ROW_HEIGHT = 150

// Pure layout: one column per branch (branches ordered by creation), y by
// global creation-time rank. Parents always precede children in time, so the
// vertical order is a valid topological sort of the DAG. No external dep.
export function layoutTree(tree: Tree): { nodes: SnapshotNode[]; edges: Edge[] } {
  const branchOrder = [...tree.branches].sort((a, b) => a._creationTime - b._creationTime)
  const columnOf = new Map(branchOrder.map((b, i) => [b._id, i]))
  const branchById = new Map(tree.branches.map((b) => [b._id, b]))

  const ranked = [...tree.snapshots].sort((a, b) => a._creationTime - b._creationTime)

  const nodes: SnapshotNode[] = ranked.map((s, rank) => {
    const branch = branchById.get(s.branchId)
    return {
      id: s._id,
      type: 'snapshot',
      position: { x: (columnOf.get(s.branchId) ?? 0) * COLUMN_WIDTH, y: rank * ROW_HEIGHT },
      data: {
        message: s.message,
        creationTime: s._creationTime,
        blockCount: s.blockCount,
        color: branch?.color ?? '#888',
        branchName: branch?.name ?? '',
        createdByAi: branch?.createdByAi ?? false,
        isHead: branch?.headSnapshotId === s._id,
        sentTo: s.sentTo,
        atsScores: s.atsScores,
      },
    }
  })

  const edges: Edge[] = tree.snapshots
    .filter((s) => s.parentId)
    .map((s) => ({
      id: `${s.parentId}-${s._id}`,
      source: s.parentId as string,
      target: s._id,
      type: 'smoothstep',
      animated: false,
    }))

  return { nodes, edges }
}
