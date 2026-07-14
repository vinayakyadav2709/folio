import '@xyflow/react/dist/style.css'
import { useEffect, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
} from '@xyflow/react'
import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { GitBranchIcon, PencilIcon } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty'
import { Spinner } from '#/components/ui/spinner'
import { BranchLegend } from './branch-legend'
import { NodePanel } from './node-panel'
import { SnapshotNode } from './snapshot-node'
import { layoutTree, type SnapshotNode as SnapshotNodeType } from '../lib/layout'

const nodeTypes: NodeTypes = { snapshot: SnapshotNode }

export function VersionTree({ resumeId }: { resumeId: string }) {
  const tree = useQuery(api.snapshots.getTree, { resumeId: resumeId as Id<'resumes'> })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // useNodesState so drags apply; re-layout whenever the tree changes.
  const [nodes, setNodes, onNodesChange] = useNodesState<SnapshotNodeType>([])
  const [edges, setEdges] = useEdgesState<Edge>([])

  useEffect(() => {
    if (!tree) return
    const laidOut = layoutTree(tree)
    setNodes(laidOut.nodes)
    setEdges(laidOut.edges)
  }, [tree, setNodes, setEdges])

  const onNodeClick: NodeMouseHandler = (_, node) => setSelectedId(node.id)

  if (tree === undefined) {
    return (
      <div className="grid h-full place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner className="size-5" />
          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Loading tree</span>
        </div>
      </div>
    )
  }

  if (tree.snapshots.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GitBranchIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>No snapshots yet</EmptyTitle>
            <EmptyDescription>
              Every commit becomes a node here — fork branches, cherry-pick blocks, and track
              which version went where.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<a href={`/dashboard/resumes/${resumeId}`} />}>
              <PencilIcon />
              Commit from the editor
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  const selected = tree.snapshots.find((s) => s._id === selectedId)
  const selectedBranch = selected
    ? tree.branches.find((b) => b._id === selected.branchId)
    : undefined

  return (
    <div className="flex h-full min-h-0">
      <div className="relative min-w-0 flex-1">
        <BranchLegend branches={tree.branches} />
        <ReactFlow
          nodes={nodes.map((n) => ({ ...n, selected: n.id === selectedId }))}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesConnectable={false}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedId(null)}
          fitView
          proOptions={{ hideAttribution: true }}
          className="!bg-background"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.25}
            color="var(--color-border)"
          />
          <Controls
            showInteractive={false}
            className="!shadow-none [&>button]:!border-border/60 [&>button]:!bg-card [&>button]:!text-foreground [&>button:hover]:!bg-accent"
          />
        </ReactFlow>
      </div>
      {selected && (
        <NodePanel
          snapshot={selected}
          branch={selectedBranch}
          branches={tree.branches}
          resumeId={resumeId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
