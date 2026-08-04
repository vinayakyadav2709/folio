import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { CheckIcon, Maximize2Icon, Minimize2Icon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { cn } from '@/lib/utils'
import { Preview } from './preview'
import { TailorPanel } from './tailor-panel'
import type { Block, Header, Theme } from '../lib/blocks'

type Props = {
  blocks: Block[]
  onBlocks: (blocks: Block[]) => void
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

// Which profile values can be toggled onto the header. Plain fields land on the
// header directly; the three URLs land in `links` under a fixed label.
const CHANNELS = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' },
  { key: 'githubUrl', label: 'GitHub' },
  { key: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'websiteUrl', label: 'Website' },
] as const

type Channel = (typeof CHANNELS)[number]

const isLink = (c: Channel) => c.key.endsWith('Url')

// Toggle chips for every contact channel the profile actually has. Checked
// state is derived from the header itself — no extra state to drift.
function ProfileChannels({
  header,
  onHeader,
}: {
  header: Header
  onHeader: (h: Header) => void
}) {
  const profile = useQuery(api.profiles.getMyProfile)
  if (!profile) return null

  const available = CHANNELS.map((c) => [c, profile[c.key]?.trim()] as const).filter(
    (pair): pair is readonly [Channel, string] => Boolean(pair[1]),
  )
  if (available.length === 0) return null

  const has = (c: Channel, value: string) =>
    isLink(c) ? header.links.some((l) => l.url === value) : header[c.key as 'email'] === value

  const toggle = (c: Channel, value: string, on: boolean) => {
    if (isLink(c)) {
      const links = header.links.filter((l) => l.url !== value && l.label !== c.label)
      onHeader({ ...header, links: on ? [...links, { label: c.label, url: value }] : links })
    } else {
      onHeader({ ...header, [c.key]: on ? value : undefined })
    }
  }

  return (
    <div className="flex flex-col gap-1.5 border-border/60 border-t pt-2">
      <p className="text-[10px] text-muted-foreground/70 text-pretty">
        From your{' '}
        <Link to="/dashboard/settings" className="underline underline-offset-2">
          profile
        </Link>
      </p>
      <div className="flex flex-wrap gap-1">
        {available.map(([c, value]) => {
          const on = has(c, value)
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              title={value}
              onClick={() => toggle(c, value, !on)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors',
                on
                  ? 'border-transparent bg-foreground/[0.08] text-foreground'
                  : 'border-border/70 border-dashed text-muted-foreground hover:border-border hover:bg-foreground/[0.04] hover:text-foreground',
              )}
            >
              {on ? <CheckIcon className="size-3" /> : <PlusIcon className="size-3" />}
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Header fields are always directly editable — the snapshot is the source of
// truth. Profile values are opt-in per channel via the chips below.
function HeaderSection({ header, onHeader }: { header: Header; onHeader: (h: Header) => void }) {
  const set = (patch: Partial<Header>) => onHeader({ ...header, ...patch })

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
        <Button
          size="xs"
          variant="ghost"
          className="self-start text-muted-foreground"
          onClick={() => set({ links: [...header.links, { label: '', url: '' }] })}
        >
          <PlusIcon /> link
        </Button>
      </div>

      <ProfileChannels header={header} onHeader={onHeader} />
    </div>
  )
}

export function SidePanel({
  blocks,
  onBlocks,
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
      <SectionLabel>Tailor to job</SectionLabel>
      <TailorPanel blocks={blocks} onBlocks={onBlocks} />

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
