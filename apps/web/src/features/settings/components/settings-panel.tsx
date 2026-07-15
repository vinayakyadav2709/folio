import type { ReactNode } from 'react'
import { CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { type SaveSection, useSectionSave } from '../lib/use-profile-form'

// Shared panel skeleton, lifted from the devl.dev workspace-settings content
// column. Every settings section composes these three pieces:
//   Panel        — the column wrapper (also the sticky context for SaveBar)
//   PanelSection  — a titled field group: small heading + hint on the left,
//                   a max-width-capped stack of fields on the right
//   PanelField    — a Label + control (+ optional hint) row
// plus one save affordance, SaveBar, shared by every section that persists.

export function Panel({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col gap-10">{children}</div>
}

export function PanelSection({
  title,
  hint,
  children,
}: {
  title: string
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="grid gap-x-10 gap-y-5 lg:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <h2 className="text-balance font-medium text-sm">{title}</h2>
        {hint ? (
          <p className="mt-1 text-pretty text-muted-foreground text-xs leading-relaxed">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="flex w-full max-w-2xl flex-col gap-5">{children}</div>
    </section>
  )
}

export function PanelField({
  label,
  htmlFor,
  hint,
  className,
  children,
}: {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint ? <div className="text-muted-foreground text-xs leading-relaxed">{hint}</div> : null}
    </div>
  )
}

// One dirty-state save bar for every section. Pinned to the bottom of the
// content column (mt-auto pushes it down when the section is short; sticky
// keeps it in view while a long panel scrolls), enabling only when the
// section is dirty — the same position and grammar in each panel.
export function SaveBar({ section }: { section: SaveSection }) {
  const { saving, saved, error, run } = useSectionSave()
  const { dirty, save, discard } = section

  return (
    <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-4 border-border/60 border-t bg-background/85 py-3 backdrop-blur">
      <div className="min-w-0 font-mono text-[10px] uppercase tracking-[0.3em]">
        {error ? (
          <span className="text-destructive-foreground normal-case tracking-normal">{error}</span>
        ) : dirty ? (
          <span className="text-muted-foreground">Unsaved changes</span>
        ) : saved ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="size-3" /> All saved
          </span>
        ) : (
          <span className="text-muted-foreground/70">All saved</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="ghost" size="sm" type="button" onClick={discard} disabled={!dirty || saving}>
          Discard
        </Button>
        <Button size="sm" type="button" onClick={() => run(save)} loading={saving} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  )
}
