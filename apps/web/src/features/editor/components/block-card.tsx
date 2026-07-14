import { Component, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { GripVerticalIcon, PlusIcon, SparklesIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverPopup, PopoverTrigger } from '@/components/ui/popover'
import { Spinner } from '@/components/ui/spinner'
import type { Block } from '../lib/blocks'
import { errorMessage } from '../lib/errors'

type Props = {
  block: Block
  onChange: (block: Block) => void
  onRemove: () => void
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>
}

export function BlockCard({ block, onChange, onRemove, dragHandleProps }: Props) {
  const set = (patch: Partial<Block>) => onChange({ ...block, ...patch })
  const setBullet = (i: number, value: string) =>
    set({ bullets: block.bullets.map((b, j) => (j === i ? value : b)) })

  return (
    <div className="group flex flex-col gap-2.5 rounded-xl bg-card p-3.5 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06),0_2px_4px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 ease-out hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_-1px_rgba(0,0,0,0.08),0_6px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.13)]">
      <div className="flex items-center gap-2">
        <button
          className="-my-1 -ml-1.5 cursor-grab touch-none rounded-md px-0.5 py-1 text-muted-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...dragHandleProps}
        >
          <GripVerticalIcon className="size-4" />
        </button>
        <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.15em]">
          {block.type}
        </span>
        {block.projectId && (
          <QueryBoundary>
            <UpstreamHint block={block} onPull={(name) => set({ title: name, syncedAt: Date.now() })} />
          </QueryBoundary>
        )}
        <span className="flex-1" />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label="Remove block"
          className="text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100"
          onClick={onRemove}
        >
          <XIcon />
        </Button>
      </div>

      <div className="grid grid-cols-[1fr_1fr_8rem] gap-2">
        <Input
          value={block.title ?? ''}
          placeholder="Title"
          onChange={(e) => set({ title: e.target.value })}
        />
        <Input
          value={block.subtitle ?? ''}
          placeholder="Subtitle"
          onChange={(e) => set({ subtitle: e.target.value })}
        />
        <Input
          value={block.dateRange ?? ''}
          placeholder="2023 – now"
          onChange={(e) => set({ dateRange: e.target.value })}
        />
      </div>

      <ul className="flex flex-col">
        {block.bullets.map((bullet, i) => (
          <BulletRow
            key={i}
            value={bullet}
            projectId={block.projectId}
            onChange={(v) => setBullet(i, v)}
            onRemove={() => set({ bullets: block.bullets.filter((_, j) => j !== i) })}
          />
        ))}
      </ul>
      <Button
        size="xs"
        variant="ghost"
        className="self-start text-muted-foreground"
        onClick={() => set({ bullets: [...block.bullets, ''] })}
      >
        <PlusIcon /> bullet
      </Button>
    </div>
  )
}

function BulletRow({
  value,
  projectId,
  onChange,
  onRemove,
}: {
  value: string
  projectId?: Id<'projects'>
  onChange: (value: string) => void
  onRemove: () => void
}) {
  const rewrite = useAction(api.ai.rewriteBullet)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchSuggestions() {
    setSuggestions(null)
    setError(null)
    try {
      setSuggestions(await rewrite({ bullet: value, projectId }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <li className="group/bullet -mx-1.5 flex items-center gap-0.5 rounded-md px-1.5 transition-colors focus-within:bg-foreground/[0.03] hover:bg-foreground/[0.03]">
      <span className="select-none text-muted-foreground/60" aria-hidden>
        •
      </span>
      <Input
        unstyled
        className="relative inline-flex w-full min-w-0 flex-1 rounded-md text-foreground text-sm"
        value={value}
        placeholder="Did the thing, moved the metric"
        onChange={(e) => onChange(e.target.value)}
      />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) fetchSuggestions()
        }}
      >
        <PopoverTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="AI rewrite"
              disabled={!value.trim()}
              className="text-muted-foreground opacity-0 transition-opacity group-focus-within/bullet:opacity-100 group-hover/bullet:opacity-100 data-popup-open:opacity-100 pointer-coarse:opacity-100"
            >
              <SparklesIcon />
            </Button>
          }
        />
        <PopoverPopup className="w-96 max-w-[90vw] p-1.5">
          <div className="flex items-center gap-1.5 px-2 pt-1 pb-1.5 text-muted-foreground">
            <SparklesIcon className="size-3" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Rewrites</span>
          </div>
          {suggestions === null && error === null && (
            <div className="flex items-center gap-2 px-2 pt-0.5 pb-2 text-muted-foreground text-sm">
              <Spinner className="size-4" /> Rewriting…
            </div>
          )}
          {error && (
            <p className="px-2 pt-0.5 pb-2 text-destructive text-sm text-pretty">
              {error}
              {error.includes('No AI key') && (
                <>
                  {' '}
                  <Link to="/dashboard/settings" className="underline">
                    Open settings
                  </Link>
                </>
              )}
            </p>
          )}
          {suggestions && (
            <ul className="flex flex-col gap-0.5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    className="w-full rounded-md px-2.5 py-2 text-left text-sm leading-snug text-pretty transition-colors hover:bg-accent"
                    onClick={() => {
                      onChange(s)
                      setOpen(false)
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverPopup>
      </Popover>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Remove bullet"
        className="text-muted-foreground opacity-0 transition-opacity group-focus-within/bullet:opacity-100 group-hover/bullet:opacity-100 pointer-coarse:opacity-100"
        onClick={onRemove}
      >
        <XIcon />
      </Button>
    </li>
  )
}

// Shows a hint when the upstream project changed after this block was synced.
// Pull refreshes title + syncedAt only — bullets stay personal.
function UpstreamHint({ block, onPull }: { block: Block; onPull: (name: string) => void }) {
  const project = useQuery(api.projects.getProject, { projectId: block.projectId! })
  if (!project || (block.syncedAt ?? 0) >= project.updatedAt) return null
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-warning/8 py-0.5 pr-1 pl-2.5 text-warning-foreground text-xs dark:bg-warning/16">
      upstream updated
      <Button size="xs" variant="outline" className="h-5 rounded-full sm:h-5" onClick={() => onPull(project.name)}>
        Pull
      </Button>
    </span>
  )
}

// getProject throws if the project was deleted — don't let that kill the editor.
class QueryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
