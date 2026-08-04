import {
  CheckIcon,
  GlobeIcon,
  LockIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  UsersIcon,
} from 'lucide-react'
import type { Doc } from '@folio/backend/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import { Label } from '@/components/ui/label'
import { Radio, RadioGroup } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { type TeamOption } from '@/components/shared/team-picker'
import { cn } from '@/lib/utils'
import { JOB_STATUS, JOB_STATUSES, type JobStatus } from './status'

/**
 * The job-board filter rail — the devl `forms-workspace-settings` *form*
 * grammar (a stack of titled sections, each a hint plus grouped labelled
 * controls) rather than a toolbar of pills. Facets mirror what the data
 * actually holds: posting status, visibility bucket, team, and my own
 * application state.
 */

export type Audience = 'team' | 'private' | 'everyone'
export type AppliedFilter = 'any' | 'applied' | 'not_applied'

export type JobFilterState = {
  status: JobStatus[]
  audience: Audience[]
  teamIds: string[]
  applied: AppliedFilter
}

/** Expired and broken start hidden — "many of these will expire" is the whole reason the flag exists. */
export const DEFAULT_FILTERS: JobFilterState = {
  status: ['live'],
  audience: [],
  teamIds: [],
  applied: 'any',
}

/** What "Show all" means: every facet at its most permissive. */
export const SHOW_ALL_FILTERS: JobFilterState = {
  status: [...JOB_STATUSES],
  audience: [],
  teamIds: [],
  applied: 'any',
}

/** A row with no `visibility` is a legacy job from the one-global-pool era —
 *  which means exactly what 'global' means now. */
export const audienceOf = (job: Doc<'jobs'>): Audience =>
  job.visibility === 'team' || job.visibility === 'private' ? job.visibility : 'everyone'

export const AUDIENCES: { value: Audience; label: string; icon: typeof UsersIcon }[] = [
  { value: 'team', label: 'Team', icon: UsersIcon },
  { value: 'private', label: 'Private', icon: LockIcon },
  { value: 'everyone', label: 'Everyone', icon: GlobeIcon },
]

const APPLIED_OPTIONS: { value: AppliedFilter; label: string }[] = [
  { value: 'any', label: 'Any' },
  { value: 'applied', label: "I've applied" },
  { value: 'not_applied', label: 'Not applied yet' },
]

export function matchesFilters(
  job: Doc<'jobs'> & { teamIds: string[] },
  f: JobFilterState,
  appliedIds: ReadonlySet<string>,
): boolean {
  if (!f.status.includes(job.status ?? 'live')) return false
  if (f.audience.length > 0 && !f.audience.includes(audienceOf(job))) return false
  if (f.teamIds.length > 0 && !job.teamIds.some((t) => f.teamIds.includes(t))) return false
  if (f.applied === 'applied' && !appliedIds.has(job._id)) return false
  if (f.applied === 'not_applied' && appliedIds.has(job._id)) return false
  return true
}

/** How many facets differ from the default view — drives the badge and Reset.
 *  Every team selected narrows nothing (ticking Team selects them all), so it
 *  only counts once you've actually unticked one. */
export function activeFilterCount(f: JobFilterState, teamCount = 0): number {
  const narrowedByTeam = f.teamIds.length > 0 && f.teamIds.length < teamCount
  return (
    (f.status.length !== 1 || f.status[0] !== 'live' ? 1 : 0) +
    (f.audience.length > 0 ? 1 : 0) +
    (narrowedByTeam ? 1 : 0) +
    (f.applied !== 'any' ? 1 : 0)
  )
}

export function JobFilters({
  value,
  onChange,
  statusCounts,
  audienceCounts,
  teams,
  open,
  onOpenChange,
  className,
}: {
  value: JobFilterState
  onChange: (next: JobFilterState) => void
  statusCounts: Record<string, number>
  audienceCounts: Record<Audience, number>
  teams: TeamOption[] | undefined
  /** Narrow-screen disclosure — above `lg` the panel is always shown. */
  open: boolean
  onOpenChange: (open: boolean) => void
  className?: string
}) {
  const active = activeFilterCount(value, teams?.length ?? 0)
  const set = (patch: Partial<JobFilterState>) => onChange({ ...value, ...patch })

  return (
    <aside
      className={cn(
        'flex flex-col rounded-2xl border bg-card text-card-foreground shadow-xs/5',
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className="-mx-1 flex min-h-9 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:pointer-events-none lg:cursor-default"
        >
          <SlidersHorizontalIcon className="size-4 text-muted-foreground" />
          <span className="font-medium text-sm">Filters</span>
          {active > 0 && (
            <Badge size="sm" variant="secondary" className="tabular-nums">
              {active}
            </Badge>
          )}
          <span className="ms-auto text-muted-foreground text-xs lg:hidden">
            {open ? 'Hide' : 'Show'}
          </span>
        </button>
        <Button
          size="sm"
          variant="ghost"
          className="text-muted-foreground transition-transform active:scale-[0.96]"
          onClick={() => onChange(DEFAULT_FILTERS)}
          disabled={active === 0}
        >
          <RotateCcwIcon />
          Reset
        </Button>
      </header>

      <div className={cn('flex flex-col gap-5 p-4', !open && 'max-lg:hidden')}>
        <Section title="Posting status" hint="Expired and broken stay out of the way by default.">
          <CheckboxGroup
            aria-label="Posting status"
            value={value.status}
            onValueChange={(next) => set({ status: next as JobStatus[] })}
            className="flex flex-col gap-2.5"
          >
            {JOB_STATUSES.map((s) => (
              <Label key={s} className="flex min-h-6 cursor-pointer items-center gap-2.5 font-normal">
                <Checkbox value={s} />
                <span className={cn('size-1.5 shrink-0 rounded-full', JOB_STATUS[s].dot)} />
                <span className="flex-1">{JOB_STATUS[s].label}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {statusCounts[s] ?? 0}
                </span>
              </Label>
            ))}
          </CheckboxGroup>
        </Section>

        <Separator />

        <Section title="Visibility" hint="Who else can see the posting. Leave empty for all.">
          <CheckboxGroup
            aria-label="Visibility"
            value={value.audience}
            onValueChange={(next) => {
              const audience = next as Audience[]
              // Ticking Team selects every team, so the chips read as what's
              // actually included and you narrow by unticking. Unticking Team
              // clears them — the chips hide, and a filter you can no longer
              // see must not keep narrowing the list.
              if (!audience.includes('team')) return set({ audience, teamIds: [] })
              if (value.audience.includes('team')) return set({ audience })
              set({ audience, teamIds: (teams ?? []).map((t) => t._id) })
            }}
            className="flex flex-col gap-2.5"
          >
            {AUDIENCES.map(({ value: v, label, icon: Icon }) => (
              <div key={v} className="flex flex-col gap-2.5">
                <Label className="flex min-h-6 cursor-pointer items-center gap-2.5 font-normal">
                  <Checkbox value={v} />
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{label}</span>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {audienceCounts[v]}
                  </span>
                </Label>
                {/* Which teams live under the Team toggle they qualify, rather
                    than in a section of their own — they mean nothing until
                    Team is ticked. Toggles, not a select: filtering by two
                    teams at once is the common case, and every option stays
                    visible instead of hiding behind a closed dropdown.
                    None ticked = every team, so the filter starts permissive. */}
                {v === 'team' && value.audience.includes('team') && teams && teams.length > 0 && (
                  <div className="ms-6 flex flex-wrap gap-1.5">
                    {teams.map((t) => {
                      const on = value.teamIds.includes(t._id)
                      return (
                        <button
                          key={t._id}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set({
                              teamIds: on
                                ? value.teamIds.filter((id) => id !== t._id)
                                : [...value.teamIds, t._id],
                            })
                          }
                          className={cn(
                            'inline-flex min-h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-2.5 text-xs transition-[color,background-color,border-color,scale] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:scale-[0.97]',
                            on
                              ? 'border-foreground/25 bg-foreground/10 text-foreground'
                              : 'border-border/70 text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                          )}
                        >
                          {on && <CheckIcon className="size-3 shrink-0" />}
                          <span className="truncate">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </CheckboxGroup>
        </Section>

        <Separator />

        <Section title="My application" hint="Tracked in the applications board.">
          <RadioGroup
            aria-label="My application"
            value={value.applied}
            onValueChange={(next) => set({ applied: next as AppliedFilter })}
            className="flex flex-col gap-2.5"
          >
            {APPLIED_OPTIONS.map((o) => (
              <Label
                key={o.value}
                className="flex min-h-6 cursor-pointer items-center gap-2.5 font-normal"
              >
                <Radio value={o.value} />
                {o.label}
              </Label>
            ))}
          </RadioGroup>
        </Section>
      </div>
    </aside>
  )
}

/** The settings-form section: title, optional hint, then the controls. */
function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-medium text-sm">{title}</h2>
        {hint && <p className="mt-1 text-pretty text-muted-foreground text-xs leading-relaxed">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
