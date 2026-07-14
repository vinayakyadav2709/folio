import { PlusIcon, XIcon } from 'lucide-react'
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
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
      {children}
    </h2>
  )
}

export function SidePanel({ blocks, header, onHeader, theme, onTheme }: Props) {
  const set = (patch: Partial<Header>) => onHeader({ ...header, ...patch })

  return (
    <aside className="flex flex-col gap-3">
      <SectionLabel>Header</SectionLabel>
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

      <Separator className="my-1" />
      <SectionLabel>Theme</SectionLabel>
      <div className="flex items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-0.5 rounded-lg border border-border/60 bg-foreground/[0.02] p-0.5">
          {(['classic', 'compact'] as const).map((id) => (
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
      </div>
      <Preview blocks={blocks} header={header} theme={theme} />
    </aside>
  )
}
