import type { ReactNode } from 'react'
import { PlusIcon, XIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'

// Surfaces for the dated profile pools — experience, education, achievements.
//
// Structure is lifted from the devl.dev `timelines-changelog` experiment: each
// entry is a two-column article — a narrow metadata rail (index, when, where)
// against a hairline, with the content column beside it — so a row of inputs
// can never stretch across the whole canvas. Section rules and the dashed add
// affordance come from `profile-skills`; the empty states are the coss `Empty`
// primitives in the `empty-first-project` arrangement.

/** Caps the measure of a pool page so field rows read as a column, not a band. */
export function PoolBody({ children }: { children: ReactNode }) {
  return <div className="@container flex w-full flex-col gap-5">{children}</div>
}

/**
 * Entry list for a narrower host (the Education section inside Settings).
 * Entry cards size off the container, not the viewport, so the same card reads
 * as a rail + content column on a pool page and stacks in a settings column.
 */
export function EntryList({ children }: { children: ReactNode }) {
  return <div className="@container flex flex-col gap-4">{children}</div>
}

/**
 * devl `profile-skills` rule: heading, count, then a hairline eating the rest.
 * `children` ride after the hairline — the section's own control (a master
 * checkbox, a tally) sits at the far edge of the rule rather than above it.
 */
export function SectionRule({
  label,
  count,
  children,
}: {
  label: string
  count: number
  children?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-heading font-medium text-sm">{label}</h2>
      <span className="font-mono text-[10px] text-muted-foreground uppercase tabular-nums tracking-[0.25em]">
        {String(count).padStart(2, '0')}
      </span>
      <span className="h-px flex-1 bg-border/40" />
      {children}
    </div>
  )
}

/** Compact mono field label — the metadata voice used inside entry cards. */
export function MicroField({
  label,
  hint,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-pretty text-muted-foreground/80 text-xs">{hint}</span> : null}
    </label>
  )
}

/**
 * One entry. `rail` holds the *when / where* metadata, `children` the *what*.
 * The stagger is capped so appending a row still lands quickly.
 */
export function EntryCard({
  index,
  rail,
  removeLabel,
  onRemove,
  children,
}: {
  index: number
  rail: ReactNode
  removeLabel: string
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <article
      style={{ animationDelay: `${Math.min(index, 4) * 45}ms` }}
      className="group/entry @3xl:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] relative grid animate-entry gap-x-8 gap-y-5 rounded-2xl border border-border/60 bg-card/30 p-5 transition-colors duration-200 hover:border-foreground/20"
    >
      <aside className="@3xl:border-border/50 @3xl:border-r @3xl:pr-8 flex flex-col gap-3.5">
        <span className="font-mono text-[10px] text-muted-foreground/60 uppercase tabular-nums tracking-[0.3em]">
          {String(index + 1).padStart(2, '0')}
        </span>
        {rail}
      </aside>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
      <RemoveEntry label={removeLabel} onClick={onRemove} />
    </article>
  )
}

/** Reveal-on-hover remove, pinned to the card's top-right corner. */
export function RemoveEntry({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      size="icon-sm"
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      className="absolute top-3 right-3 text-muted-foreground opacity-0 transition-[opacity,color,scale] hover:text-destructive-foreground focus-visible:opacity-100 active:scale-[0.96] group-hover/entry:opacity-100"
    >
      <XIcon />
    </Button>
  )
}

/** Hairline-separated footer inside an entry card — media lives here. */
export function EntryFooter({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 border-border/50 border-t pt-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
          {label}
        </span>
        {hint ? <span className="text-muted-foreground/70 text-xs">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

export function AddEntry({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 self-start rounded-xl border border-border/70 border-dashed px-4 py-2.5 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] transition-[color,border-color,background-color,scale] hover:border-foreground/40 hover:bg-accent/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-[0.98]"
    >
      <PlusIcon className="size-3.5 opacity-70" />
      {label}
    </button>
  )
}

/** Empty state — coss `Empty` in the devl `empty-first-project` arrangement. */
export function PoolEmpty({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: LucideIcon
  title: string
  description: ReactNode
  action: string
  onAction: () => void
}) {
  return (
    <Empty className="animate-entry rounded-2xl border border-border/60 border-dashed bg-card/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-balance">{title}</EmptyTitle>
        <EmptyDescription className="text-pretty">{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onAction} className="active:scale-[0.96]">
          <PlusIcon />
          {action}
        </Button>
      </EmptyContent>
    </Empty>
  )
}
