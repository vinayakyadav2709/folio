import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import {
  BotIcon,
  CheckIcon,
  CherryIcon,
  GitBranchPlusIcon,
  PencilIcon,
  SendIcon,
  XIcon,
} from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectValue } from '#/components/ui/select'
import { SelectTrigger } from '#/components/ui/select'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { relativeTime } from '../lib/format'
import type { TreeBranch, TreeSnapshot } from '../lib/layout'

type Props = {
  snapshot: TreeSnapshot
  branch: TreeBranch | undefined
  branches: TreeBranch[]
  resumeId: string
  onClose: () => void
}

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
      {children}
    </p>
  )
}

export function NodePanel({ snapshot, branch, branches, resumeId, onClose }: Props) {
  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-border/60 border-l bg-card">
      <div className="flex items-start justify-between gap-2 border-border/60 border-b p-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
            Snapshot
          </p>
          <p className="mt-1 font-medium leading-snug text-pretty">{snapshot.message}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground tabular-nums">
            {new Date(snapshot._creationTime).toLocaleString()} ·{' '}
            {relativeTime(snapshot._creationTime)}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
          <XIcon />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        {branch && (
          <div>
            <MetaLabel>Branch</MetaLabel>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1 font-medium text-xs">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: branch.color }}
                aria-hidden
              />
              {branch.name}
              {branch.createdByAi && (
                <BotIcon className="size-3 text-muted-foreground" aria-label="AI-created" />
              )}
            </span>
          </div>
        )}

        <div>
          <MetaLabel>Blocks</MetaLabel>
          <p className="tabular-nums">{snapshot.blockCount}</p>
        </div>

        {snapshot.sentTo && (
          <div>
            <MetaLabel>Sent to</MetaLabel>
            <p className="flex items-center gap-1.5">
              <SendIcon className="size-3.5 text-muted-foreground" aria-hidden />
              {snapshot.sentTo.company} — {snapshot.sentTo.role}
            </p>
            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
              {new Date(snapshot.sentTo.at).toLocaleDateString()}
            </p>
          </div>
        )}

        {snapshot.atsScores && (
          <div>
            <MetaLabel>ATS scores</MetaLabel>
            <div className="flex flex-wrap gap-1">
              {Object.entries(snapshot.atsScores).map(([k, val]) => (
                <Badge key={k} size="sm" variant="outline" className="tabular-nums">
                  {k}: {val}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 border-border/60 border-t p-4">
        <Button
          variant="outline"
          className="w-full"
          render={
            <a
              href={`/dashboard/resumes/${resumeId}?branch=${encodeURIComponent(branch?.name ?? '')}`}
            >
              <PencilIcon />
              Open in editor
            </a>
          }
        />
        <ForkDialog snapshotId={snapshot._id} />
        <CherryPickDialog snapshotId={snapshot._id} branches={branches} />
      </div>
    </aside>
  )
}

function ForkDialog({ snapshotId }: { snapshotId: Id<'snapshots'> }) {
  const fork = useMutation(api.snapshots.fork)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!name.trim()) return
    setBusy(true)
    try {
      await fork({ fromSnapshotId: snapshotId, branchName: name.trim(), color })
      setOpen(false)
      setName('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <GitBranchPlusIcon />
        Fork from here
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fork a new branch</DialogTitle>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fork-name">Branch name</Label>
            <Input
              id="fork-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="finance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fork-color">Color</Label>
            <div className="flex items-center gap-2">
              <input
                id="fork-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 shrink-0 cursor-pointer rounded-md border border-border/60 bg-transparent"
              />
              <Input value={color} className="font-mono" onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={submit} loading={busy} disabled={!name.trim()}>
            Fork
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CherryPickDialog({
  snapshotId,
  branches,
}: {
  snapshotId: Id<'snapshots'>
  branches: TreeBranch[]
}) {
  const [open, setOpen] = useState(false)
  const [blockId, setBlockId] = useState<string | null>(null)
  const [targetBranch, setTargetBranch] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const cherryPick = useMutation(api.snapshots.cherryPickBlock)
  const snapshot = useQuery(api.snapshots.getSnapshot, open ? { snapshotId } : 'skip')

  async function submit() {
    if (!blockId || !targetBranch) return
    setBusy(true)
    try {
      await cherryPick({
        fromSnapshotId: snapshotId,
        blockId,
        toBranchId: targetBranch as Id<'branches'>,
      })
      setOpen(false)
      setBlockId(null)
      setTargetBranch(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" className="w-full" onClick={() => setOpen(true)}>
        <CherryIcon />
        Cherry-pick a block
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cherry-pick a block</DialogTitle>
        </DialogHeader>
        <DialogPanel className="space-y-4">
          <div className="space-y-2">
            <Label>Block to copy</Label>
            {snapshot === undefined ? (
              <div className="space-y-1.5">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ) : (
              <div className="space-y-1">
                {snapshot.blocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBlockId(b.id)}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors',
                      blockId === b.id
                        ? 'border-ring bg-accent'
                        : 'border-border/60 hover:bg-accent/50',
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">{b.title ?? b.type}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
                        {b.type}
                      </span>
                    </span>
                    {blockId === b.id && (
                      <CheckIcon className="size-4 shrink-0 text-foreground" aria-hidden />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>Target branch</Label>
            <Select
              value={targetBranch ?? undefined}
              onValueChange={(v) => setTargetBranch(v as string)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: b.color }}
                        aria-hidden
                      />
                      {b.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={submit} loading={busy} disabled={!blockId || !targetBranch}>
            Cherry-pick
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
