import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc, Id } from '@folio/backend/dataModel'
import { ArrowLeftIcon, GitBranchIcon, GitCommitHorizontalIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { BlockLibrary } from './block-library'
import { Canvas } from './canvas'
import { ExportMenu } from './export-menu'
import { SidePanel } from './side-panel'
import type { Snapshot } from '../lib/blocks'
import { errorMessage } from '../lib/errors'

export function ResumeEditor({
  resumeId,
  branchName,
}: {
  resumeId: Id<'resumes'>
  branchName: string
}) {
  const resume = useQuery(api.resumes.getResume, { resumeId })
  const tree = useQuery(api.snapshots.getTree, { resumeId })
  const branch =
    tree?.branches.find((b) => b.name === branchName) ??
    tree?.branches.find((b) => b.name === 'main')
  const snapshot = useQuery(
    api.snapshots.getSnapshot,
    branch?.headSnapshotId ? { snapshotId: branch.headSnapshotId } : 'skip',
  )

  if (!resume || !branch || !snapshot) {
    // Mirrors the real layout: top bar + library / canvas / settings panes.
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <span className="flex-1" />
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
        <div className="grid grid-cols-[12rem_minmax(0,1fr)_19rem] gap-6">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-full rounded-md" />
            <Skeleton className="h-7 w-3/4 rounded-md" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Keyed by snapshot id: a commit moves the head, remounts with fresh state.
  return <EditorInner key={snapshot._id} resume={resume} branch={branch} snapshot={snapshot} />
}

function EditorInner({
  resume,
  branch,
  snapshot,
}: {
  resume: Doc<'resumes'>
  branch: Doc<'branches'>
  snapshot: Snapshot
}) {
  const commit = useMutation(api.snapshots.commit)
  const [blocks, setBlocks] = useState(snapshot.blocks)
  const [header, setHeader] = useState(snapshot.header)
  const [theme, setTheme] = useState(snapshot.theme)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = useMemo(
    () =>
      JSON.stringify([blocks, header, theme]) !==
      JSON.stringify([snapshot.blocks, snapshot.header, snapshot.theme]),
    [blocks, header, theme, snapshot],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  async function onCommit() {
    setSaving(true)
    setError(null)
    try {
      await commit({
        branchId: branch._id,
        message: message.trim() || 'update',
        blocks,
        theme,
        header,
      })
      // head snapshot changed → EditorInner remounts clean via key
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky command bar — full-bleed inside the dashboard scroll container. */}
      <div className="-mx-6 -mt-8 sticky top-0 z-20 border-border/60 border-b bg-background/90 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Back to resumes"
            className="text-muted-foreground"
            render={<Link to="/dashboard/resumes" />}
          >
            <ArrowLeftIcon />
          </Button>
          <h1 className="font-heading font-semibold text-base">{resume.name}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-0.5 font-mono text-xs">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: branch.color }}
            />
            {branch.name}
          </span>
          {dirty && (
            <span className="inline-flex items-center gap-1.5 text-warning-foreground text-xs">
              <span className="size-1.5 animate-pulse rounded-full bg-warning-foreground/80" aria-hidden />
              unsaved
            </span>
          )}
          <span className="flex-1" />
          <Input
            value={message}
            placeholder="Describe your change…"
            size="sm"
            className="max-w-52"
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button size="sm" onClick={onCommit} disabled={!dirty} loading={saving}>
            <GitCommitHorizontalIcon />
            Commit
          </Button>
          <ExportMenu
            blocks={blocks}
            header={header}
            theme={theme}
            snapshotId={snapshot._id}
            fileName={resume.name.replace(/\s+/g, '-').toLowerCase() || 'resume'}
          />
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            render={
              <Link to="/dashboard/resumes/$resumeId/tree" params={{ resumeId: resume._id }} />
            }
          >
            <GitBranchIcon />
            Tree
          </Button>
        </div>
        {error && <p className="mt-2 text-destructive text-sm text-pretty">{error}</p>}
      </div>

      <div className="grid grid-cols-[12rem_minmax(0,1fr)_19rem] items-start gap-6">
        <BlockLibrary onAdd={(block) => setBlocks((prev) => [...prev, block])} />
        <Canvas blocks={blocks} onChange={setBlocks} />
        <SidePanel
          blocks={blocks}
          header={header}
          onHeader={setHeader}
          theme={theme}
          onTheme={setTheme}
        />
      </div>
    </div>
  )
}
