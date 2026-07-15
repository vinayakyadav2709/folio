import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Maximize2Icon, Minimize2Icon, PencilIcon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { Preview } from './preview'
import type { Block, Header, Theme } from '../lib/blocks'

type Props = {
  blocks: Block[]
  header: Header
  onHeader: (header: Header) => void
  theme: Theme
  onTheme: (theme: Theme) => void
  expanded: boolean
  onToggleExpanded: () => void
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
      {children}
    </h2>
  )
}

// The header auto-fills from the user's profile on load (see EditorInner). Here
// it reads as a compact, read-only summary — Settings stays the source of truth
// — with an Override affordance for per-resume tweaks persisted in the snapshot.
function HeaderSection({ header, onHeader }: { header: Header; onHeader: (h: Header) => void }) {
  const [editing, setEditing] = useState(false)
  const set = (patch: Partial<Header>) => onHeader({ ...header, ...patch })

  if (!editing) {
    const contact = [header.email, header.phone, header.location].filter(Boolean).join('  ·  ')
    return (
      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-sm text-pretty">{header.fullName || 'Your name'}</p>
            {header.headline && (
              <p className="truncate text-muted-foreground text-xs">{header.headline}</p>
            )}
          </div>
          <Button
            size="xs"
            variant="ghost"
            className="-mt-1 -me-1 shrink-0 text-muted-foreground"
            onClick={() => setEditing(true)}
          >
            <PencilIcon />
            Override
          </Button>
        </div>
        {contact && <p className="truncate text-muted-foreground text-xs">{contact}</p>}
        {header.links.length > 0 && (
          <p className="truncate text-muted-foreground text-xs">
            {header.links.map((l) => l.label || l.url).join('  ·  ')}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-muted-foreground/70 text-pretty">
          From your{' '}
          <Link to="/dashboard/settings" className="underline underline-offset-2">
            profile
          </Link>{' '}
          — override to tweak just this resume.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 shadow-xs">
      <Input value={header.fullName} placeholder="Full name" onChange={(e) => set({ fullName: e.target.value })} />
      <Input value={header.headline ?? ''} placeholder="Headline" onChange={(e) => set({ headline: e.target.value })} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={header.email ?? ''} placeholder="Email" onChange={(e) => set({ email: e.target.value })} />
        <Input value={header.phone ?? ''} placeholder="Phone" onChange={(e) => set({ phone: e.target.value })} />
      </div>
      <Input value={header.location ?? ''} placeholder="Location" onChange={(e) => set({ location: e.target.value })} />

      <div className="flex flex-col gap-1.5">
        {header.links.map((link, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={link.label}
              placeholder="Label"
              className="w-24"
              onChange={(e) =>
                set({ links: header.links.map((l, j) => (j === i ? { ...l, label: e.target.value } : l)) })
              }
            />
            <Input
              value={link.url}
              placeholder="https://…"
              onChange={(e) =>
                set({ links: header.links.map((l, j) => (j === i ? { ...l, url: e.target.value } : l)) })
              }
            />
            <Button
              size="icon-xs"
              variant="ghost"
              aria-label="Remove link"
              className="text-muted-foreground"
              onClick={() => set({ links: header.links.filter((_, j) => j !== i) })}
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button
            size="xs"
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => set({ links: [...header.links, { label: '', url: '' }] })}
          >
            <PlusIcon /> link
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setEditing(false)}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

export function SidePanel({
  blocks,
  header,
  onHeader,
  theme,
  onTheme,
  expanded,
  onToggleExpanded,
}: Props) {
  return (
    <aside className="flex flex-col gap-3">
      <SectionLabel>Header</SectionLabel>
      <HeaderSection header={header} onHeader={onHeader} />

      <Separator className="my-1" />
      <SectionLabel>Theme</SectionLabel>
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-3 gap-0.5 rounded-lg border border-border/60 bg-foreground/[0.02] p-0.5">
          {(['ats', 'classic', 'compact'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onTheme({ ...theme, id })}
              className={cn(
                'rounded-md px-2 py-1 font-medium text-xs capitalize transition-colors',
                theme.id === id
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {id}
            </button>
          ))}
        </div>
        <input
          type="color"
          aria-label="Accent color"
          value={theme.accentColor ?? '#000000'}
          onChange={(e) => onTheme({ ...theme, accentColor: e.target.value })}
          className="size-8 shrink-0 cursor-pointer rounded-lg border border-border/60 bg-transparent"
        />
      </div>
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-xs">Font</span>
        <Slider
          min={0.8}
          max={1.2}
          step={0.05}
          value={theme.fontScale ?? 1}
          onValueChange={(value) =>
            onTheme({ ...theme, fontScale: Array.isArray(value) ? value[0] : value })
          }
        />
        <span className="w-8 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
          {Math.round((theme.fontScale ?? 1) * 100)}%
        </span>
      </div>

      <Separator className="my-1" />
      <div className="flex items-center gap-2">
        <SectionLabel>Preview</SectionLabel>
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-success" />
        </span>
        <span className="text-[10px] text-muted-foreground">live</span>
        <span className="flex-1" />
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={expanded ? 'Shrink preview' : 'Expand preview'}
          className="-my-1 hidden text-muted-foreground lg:inline-flex"
          onClick={onToggleExpanded}
        >
          {expanded ? <Minimize2Icon /> : <Maximize2Icon />}
        </Button>
      </div>
      <Preview blocks={blocks} header={header} theme={theme} />
    </aside>
  )
}
