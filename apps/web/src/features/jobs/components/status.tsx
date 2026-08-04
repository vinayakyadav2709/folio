import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * One status vocabulary for the whole job-search surface — the shared posting
 * state (`live/expired/broken`) and my private application state
 * (`applied/in_progress/rejected/not_eligible`).
 *
 * The colour system is the app's own semantic tokens, not four arbitrary
 * pills: `info` = it has entered the pipeline, `warning` = something is
 * actively happening, `success` = good, `error` = bad, and *no tint at all*
 * for the inert states (expired, not eligible) so dead rows visibly recede.
 * Tokens flip with the theme, so every chip reads in light and dark for free,
 * and each chip always carries its label — colour is never the only signal.
 */

export type JobStatus = 'live' | 'expired' | 'broken'
export type AppStatus = 'applied' | 'in_progress' | 'rejected' | 'not_eligible'

type Variant = ComponentProps<typeof Badge>['variant']
// `dot` is the same hue as the chip, for places that need the mark without the
// pill (filter toggles, group headings).
type Meta = { label: string; variant: Variant; dot: string; muted?: boolean }

const INERT = { variant: 'outline', dot: 'bg-muted-foreground/40', muted: true } as const

export const JOB_STATUS: Record<JobStatus, Meta> = {
  live: { label: 'Live', variant: 'success', dot: 'bg-success' },
  expired: { label: 'Expired', ...INERT },
  broken: { label: 'Broken link', variant: 'error', dot: 'bg-destructive' },
}

export const APP_STATUS: Record<AppStatus, Meta> = {
  applied: { label: 'Applied', variant: 'info', dot: 'bg-info' },
  in_progress: { label: 'In progress', variant: 'warning', dot: 'bg-warning' },
  rejected: { label: 'Rejected', variant: 'error', dot: 'bg-destructive' },
  not_eligible: { label: 'Not eligible', ...INERT },
}

// Display order for filters, groups and pickers — the lifecycle, not the
// alphabet.
export const JOB_STATUSES = ['live', 'expired', 'broken'] as const
export const APP_STATUSES = ['applied', 'in_progress', 'rejected', 'not_eligible'] as const

/**
 * The chip. `children` is trailing adornment only (a chevron when the chip is
 * a menu trigger) — the label always comes from the meta.
 */
export function StatusChip({
  meta,
  className,
  children,
  ...props
}: { meta: Meta } & Omit<ComponentProps<typeof Badge>, 'variant'>) {
  return (
    <Badge
      variant={meta.variant}
      className={cn('gap-1.5 px-2', meta.muted && 'text-muted-foreground', className)}
      {...props}
    >
      <span className={cn('size-1.5 rounded-full bg-current', meta.muted && 'opacity-50')} />
      {meta.label}
      {children}
    </Badge>
  )
}
