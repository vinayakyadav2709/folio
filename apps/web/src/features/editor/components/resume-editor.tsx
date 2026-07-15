import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc, Id } from '@folio/backend/dataModel'
import { ArrowLeftIcon, GitBranchIcon, GitCommitHorizontalIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { BlockLibrary } from './block-library'
import { Canvas } from './canvas'
import { ExportMenu } from './export-menu'
import { SidePanel } from './side-panel'
import { headerFromProfile, isHeaderEmpty, type Snapshot } from '../lib/blocks'
import { errorMessage } from '../lib/errors'

export type EditorView = 'edit' | 'history'

// Spacious three-pane workspace: a fixed-width library rail, a fluid canvas, and
// a settings + true-to-scale preview rail. Wide enough to breathe on large
// screens, collapses to a single column below `lg`.
const EDIT_GRID =
  'grid grid-cols-1 items-start gap-8 lg:grid-cols-[13rem_minmax(0,1fr)_21rem] xl:grid-cols-[14rem_minmax(0,1fr)_23rem]'

function BranchPill({ branch }: { branch: Doc<'branches'> }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-0.5 font-mono text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: branch.color }} />
      {branch.name}
    </span>
  )
}

function ViewTabs({ value, onChange }: { value: EditorView; onChange: (v: EditorView) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as EditorView)}>
      <TabsList>
        <TabsTab value="edit">
          <PencilIcon />
          Edit
        </TabsTab>
        <TabsTab value="history">
          <GitBranchIcon />
          History
        </TabsTab>
      </TabsList>
    </Tabs>
  )
}

// Sticky command bar shared by both views. `right` holds the view-specific
// actions (commit + export in Edit; nothing in History).
function TopBar({
  name,
  branch,
  dirty,
  view,
  onViewChange,
  right,
}: {
  name?: string
  branch?: Doc<'branches'>
  dirty?: boolean
  view: EditorView
  onViewChange: (v: EditorView) => void
  right?: React.ReactNode
}) {
  return (
    <div className="-mx-6 -mt-8 sticky top-0 z-20 flex flex-wrap items-center gap-3 border-border/60 border-b bg-background/90 px-6 py-3 backdrop-blur">
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label="Back to resumes"
        className="text-muted-foreground"
        render={<Link to="/dashboard/resumes" />}
      >
        <ArrowLeftIcon />
      </Button>
      {name ? (
        <h1 className="font-heading font-semibold text-base text-balance">{name}</h1>
      ) : (
        <Skeleton className="h-6 w-40" />
      )}
      {branch && <BranchPill branch={branch} />}
      {dirty && (
        <span className="inline-flex items-center gap-1.5 text-warning-foreground text-xs">
          <span className="size-1.5 animate-pulse rounded-full bg-warning-foreground/80" aria-hidden />
          unsaved
        </span>
      )}
      <span className="flex-1" />
      <ViewTabs value={view} onChange={onViewChange} />
      {right}
    </div>
  )
}

export function ResumeEditor({
  resumeId,
  branchName,
  view,
  onViewChange,
  historyView,
}: {
  resumeId: Id<'resumes'>
  branchName: string
  view: EditorView
  onViewChange: (v: EditorView) => void
  historyView: React.ReactNode
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

  // History is folded into this page: the version tree renders full-bleed below
  // the shared command bar. It doesn't need the head snapshot, so show it as
  // soon as we're on the tab.
  if (view === 'history') {
    return (
      <div className="flex flex-col">
        <TopBar name={resume?.name} branch={branch} view={view} onViewChange={onViewChange} />
        <div className="-mx-6 -mb-8 mt-6 h-[calc(100dvh-9rem)] min-h-[26rem]">{historyView}</div>
      </div>
    )
  }

  if (!resume || !branch || !snapshot) {
    return (
      <div className="flex flex-col gap-8">
        <TopBar name={resume?.name} branch={branch} view={view} onViewChange={onViewChange} />
        <div className={EDIT_GRID}>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-7 w-3/4 rounded-md" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 w-full rounded-lg" />
            <Skeleton className="h-80 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  // Keyed by snapshot id: a commit moves the head, remounts with fresh state.
  return (
    <EditorInner
      key={snapshot._id}
      resume={resume}
      branch={branch}
      snapshot={snapshot}
      view={view}
      onViewChange={onViewChange}
    />
  )
}

function EditorInner({
  resume,
  branch,
  snapshot,
  view,
  onViewChange,
}: {
  resume: Doc<'resumes'>
  branch: Doc<'branches'>
  snapshot: Snapshot
  view: EditorView
  onViewChange: (v: EditorView) => void
}) {
  const commit = useMutation(api.snapshots.commit)
  const profile = useQuery(api.profiles.getMyProfile)
  const [blocks, setBlocks] = useState(snapshot.blocks)
  const [header, setHeader] = useState(snapshot.header)
  const [theme, setTheme] = useState(snapshot.theme)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-fill the header from the user's profile when the committed header is
  // empty — never clobber a header already customized in this snapshot. Runs
  // once, as soon as the profile resolves.
  const prefilled = useRef(false)
  useEffect(() => {
    if (prefilled.current || !profile) return
    prefilled.current = true
    if (isHeaderEmpty(snapshot.header) && isHeaderEmpty(header)) {
      setHeader(headerFromProfile(profile))
    }
  }, [profile, header, snapshot.header])

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
    <div className="flex flex-col gap-8">
      <TopBar
        name={resume.name}
        branch={branch}
        dirty={dirty}
        view={view}
        onViewChange={onViewChange}
        right={
          <div className="flex items-center gap-2">
            <Input
              value={message}
              placeholder="Describe your change…"
              size="sm"
              className="w-44 sm:w-52"
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
          </div>
        }
      />
      {error && <p className="-mt-4 text-destructive text-sm text-pretty">{error}</p>}

      <div className={EDIT_GRID}>
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
