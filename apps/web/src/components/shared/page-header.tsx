import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The dashboard page header. One full-width row on desktop — title (with an
 * optional mono eyebrow) on the left, actions pinned right — that stacks
 * gracefully on small screens. Modeled on the metrics-overview reference so
 * every page uses the horizontal real estate instead of a narrow centered
 * island. `title` accepts any node so pages with an editable name or a leading
 * monogram can compose their own heading content.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 border-border/60 border-b pb-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 flex items-center gap-3 text-balance font-heading font-semibold text-2xl tracking-tight">
          {title}
        </h1>
        {description ? (
          <div className="mt-1 text-pretty text-muted-foreground text-sm">
            {description}
          </div>
        ) : null}
        {meta ? <div className="mt-2">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
