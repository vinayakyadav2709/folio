import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import {
  ChevronDownIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LockIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
  UsersIcon,
  WalletIcon,
} from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import {
  Menu,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '@/components/ui/menu'
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet'
import { errorMessage } from '@/lib/ai-extract'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { APP_STATUS, JOB_STATUS, JOB_STATUSES, type JobStatus, StatusChip } from './status'

export const statusOf = (job: Doc<'jobs'>): JobStatus => job.status ?? 'live'

type Tracked = keyof typeof APP_STATUS | undefined

type JobActionProps = {
  job: Doc<'jobs'>
  mine: boolean
  teamName: string | undefined
  tracked: Tracked
  onEdit: () => void
  onDelete: () => void
}

/** Both mutations any viewer may run, with one place for their error text. */
function useJobActions(job: Doc<'jobs'>) {
  const setJobStatus = useMutation(api.jobs.setJobStatus)
  const track = useMutation(api.applications.setStatus)
  const [error, setError] = useState<string | null>(null)

  const run = (p: Promise<unknown>) => {
    setError(null)
    p.catch((err) => setError(errorMessage(err)))
  }

  return {
    error,
    setStatus: (status: JobStatus) => run(setJobStatus({ jobId: job._id, status })),
    apply: () => run(track({ jobId: job._id, status: 'applied' })),
  }
}

const initials = (company: string) =>
  company
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '??'

/** One line of the pasted posting — newlines collapsed so the clamp is honest. */
const preview = (description: string) => description.replace(/\s+/g, ' ').trim()

/**
 * Does the collapsed text overflow its two lines? Character count, not DOM
 * measurement — the card column is a known width and nothing here needs to be
 * exact, only "obviously more than fits".
 *
 * ponytail: a fixed threshold, not a measurement. If the rail width changes a
 * lot, tune the number rather than reaching for ResizeObserver.
 */
const TRUNCATES_AT = 150

/**
 * The summary card — devl `card-invoice`'s horizontal row (monogram tile,
 * min-width middle column, meta and money to the right) crossed with
 * `card-event`'s icon meta row and footer actions.
 *
 * Nothing here expands: the whole card is a hit target that opens the full
 * posting in {@link JobDetailSheet}, so the list never reflows. The overlay
 * button sits under the real controls (status menu, apply, edit/delete), which
 * are lifted to `z-10` so they stay clickable.
 */
export function JobCard({
  job,
  mine,
  teamName,
  tracked,
  onOpen,
  onEdit,
  onDelete,
}: JobActionProps & { onOpen: () => void }) {
  const { error, setStatus, apply } = useJobActions(job)
  const status = statusOf(job)
  const text = preview(job.description)

  return (
    <article
      className={cn(
        'relative flex gap-4 rounded-2xl border bg-card p-4 text-card-foreground shadow-xs/5',
        'transition-[box-shadow,border-color,opacity] duration-200 hover:border-foreground/15 hover:shadow-md',
        status !== 'live' && 'opacity-75 hover:opacity-100',
      )}
    >
      {/* Stretched hit target: the card opens the posting, the controls above it don't. */}
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="sr-only">
          Open {job.role} at {job.company}
        </span>
      </button>

      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-xl border bg-foreground/[0.03] font-mono text-muted-foreground text-xs',
          status === 'broken' && 'border-destructive/20 text-destructive',
        )}
        aria-hidden="true"
      >
        {initials(job.company)}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-balance font-heading font-semibold text-base">
              {job.role}
            </h3>
            <p className="truncate text-muted-foreground text-sm">
              {job.company}
              {job.location && (
                <>
                  <span className="mx-1.5 text-muted-foreground/50">·</span>
                  {job.location}
                </>
              )}
              {/* Posted-at reads as provenance next to the company, not as
                  something to click — it sat beside Apply and looked like one. */}
              <span className="mx-1.5 text-muted-foreground/50">·</span>
              <span className="text-muted-foreground/70">{relativeTime(job._creationTime)}</span>
            </p>
          </div>
          {/* Every action on the card in one cluster. The status chip is here
              for everyone; edit/delete only for the owner — `items-center`
              keeps the lone chip aligned with where the buttons would be. */}
          <div className="pointer-events-none relative z-10 flex shrink-0 items-center gap-0.5">
            <StatusMenu job={job} status={status} onSelect={setStatus} />
            {mine && (
              <>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Edit job"
                  onClick={onEdit}
                  className="pointer-events-auto transition-transform active:scale-[0.96]"
                >
                  <PencilIcon />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Delete job"
                  onClick={onDelete}
                  className="pointer-events-auto text-muted-foreground transition-transform hover:text-destructive active:scale-[0.96]"
                >
                  <Trash2Icon />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Fixed two-line well: a short, long or missing description all take
            the same room, so the list keeps one rhythm. */}
        <div className="h-10">
          {text ? (
            <p className="line-clamp-2 text-pretty text-muted-foreground text-sm">{text}</p>
          ) : (
            <p className="text-muted-foreground/60 text-sm italic">No description on this posting.</p>
          )}
        </div>

        {/* Directly under the text it belongs to, and far from Apply — at the
            card's bottom-right the two sat a few pixels apart and invited a
            misclick. The row is always present so cards stay the same height. */}
        <div className="h-4">
          {text.length > TRUNCATES_AT && (
            // Not a button: it sits under the stretched card target, which
            // already opens the sheet. Nothing nested, nothing double-fires.
            <span
              aria-hidden="true"
              className="pointer-events-none text-foreground/70 text-xs underline underline-offset-2"
            >
              Show more
            </span>
          )}
        </div>

        {/* Lifted above the stretched button, but only the controls take the
            clicks — the gaps stay part of the card's hit area. `min-h-8` holds
            the row open whether or not there's a salary or an apply button. */}
        <div className="pointer-events-none relative z-10 flex min-h-8 min-w-0 items-center gap-x-3">
          <VisibilityTag job={job} teamName={teamName} />
          {job.salary && (
            <span className="inline-flex shrink-0 items-center gap-1 text-muted-foreground text-xs tabular-nums">
              <WalletIcon className="size-3.5" /> {job.salary}
            </span>
          )}
          <div className="ms-auto shrink-0">
            <AppliedAction tracked={tracked} url={job.url} onApply={apply} />
          </div>
        </div>

        {error && <p className="relative text-destructive text-xs">{error}</p>}
      </div>
    </article>
  )
}

/**
 * The full posting. A side drawer keeps the list in place — you can flag a
 * dead link, mark it applied, and close, without the grid ever reflowing under
 * you. The wall of pasted text scrolls inside the sheet, never in the card.
 */
export function JobDetailSheet({
  job,
  mine,
  teamName,
  tracked,
  onClose,
  onEdit,
  onDelete,
}: JobActionProps & { onClose: () => void }) {
  const { error, setStatus, apply } = useJobActions(job)
  const status = statusOf(job)

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetPopup side="right" className="max-w-xl">
        <SheetHeader className="pe-12">
          <SheetTitle className="text-balance">{job.role}</SheetTitle>
          <SheetDescription>
            {job.company}
            {job.location && (
              <>
                <span className="mx-1.5 text-muted-foreground/50">·</span>
                {job.location}
              </>
            )}
          </SheetDescription>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <StatusMenu job={job} status={status} onSelect={setStatus} />
            <VisibilityTag job={job} teamName={teamName} />
            {job.salary && (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs tabular-nums">
                <WalletIcon className="size-3.5" /> {job.salary}
              </span>
            )}
            {job.location && (
              <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
                <MapPinIcon className="size-3.5" /> {job.location}
              </span>
            )}
            <span className="text-muted-foreground text-xs">
              Posted {relativeTime(job._creationTime)}
            </span>
          </div>
          {mine && (
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={onEdit} className="transition-transform active:scale-[0.96]">
                <PencilIcon /> Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-muted-foreground transition-transform hover:text-destructive active:scale-[0.96]"
              >
                <Trash2Icon /> Delete
              </Button>
            </div>
          )}
        </SheetHeader>

        <SheetPanel>
          {job.description.trim() ? (
            <p className="whitespace-pre-wrap text-pretty text-foreground/85 text-sm leading-relaxed">
              {job.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">No description on this posting.</p>
          )}
          {error && <p className="mt-3 text-destructive text-sm">{error}</p>}
        </SheetPanel>

        <SheetFooter className="sm:justify-between">
          {job.url ? (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3.5" /> Open posting
            </a>
          ) : (
            <span />
          )}
          <AppliedAction tracked={tracked} url={job.url} onApply={apply} />
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  )
}

/** Status is shared: anyone who can see the posting can flag it. */
function StatusMenu({
  job,
  status,
  onSelect,
}: {
  job: Doc<'jobs'>
  status: JobStatus
  onSelect: (next: JobStatus) => void
}) {
  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label={`Posting status: ${JOB_STATUS[status].label}. Change`}
            // h-9 sm:h-8 matches the icon buttons beside it, so the chip sits
            // on their optical centre line instead of floating.
            className="pointer-events-auto flex h-9 cursor-pointer items-center rounded-sm outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] sm:h-8"
          />
        }
      >
        <StatusChip
          meta={JOB_STATUS[status]}
          className="transition-shadow hover:ring-2 hover:ring-foreground/10"
        >
          <ChevronDownIcon className="-me-0.5 size-3 opacity-60" />
        </StatusChip>
      </MenuTrigger>
      <MenuPopup align="start" className="w-44">
        <MenuRadioGroup value={status} onValueChange={(next) => onSelect(next as JobStatus)}>
          {JOB_STATUSES.map((s) => (
            <MenuRadioItem key={`${job._id}-${s}`} value={s}>
              {/* MenuRadioItem wraps children in an inline span — this flex row
                  is what gives the dot a box to be round in. */}
              <span className="flex items-center gap-2">
                <span className={cn('size-1.5 shrink-0 rounded-full', JOB_STATUS[s].dot)} />
                {JOB_STATUS[s].label}
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  )
}

function VisibilityTag({ job, teamName }: { job: Doc<'jobs'>; teamName: string | undefined }) {
  if (job.visibility === 'private')
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
        <LockIcon className="size-3.5" /> Private
      </span>
    )
  if (job.visibility === 'team')
    return (
      <span className="inline-flex min-w-0 items-center gap-1 text-muted-foreground text-xs">
        <UsersIcon className="size-3.5 shrink-0" />
        <span className="truncate">{teamName ?? 'Team'}</span>
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground text-xs">
      <GlobeIcon className="size-3.5" /> Everyone
    </span>
  )
}

/**
 * The card's primary action. Applying is two things at once — you go read the
 * posting and it lands in the tracker — so one button does both. No url (an
 * AI-pasted posting without a link) just tracks it, as before.
 */
function AppliedAction({
  tracked,
  url,
  onApply,
}: {
  tracked: Tracked
  url?: string
  onApply: () => void
}) {
  if (tracked)
    return (
      <Link
        to="/dashboard/applications"
        aria-label="Open in Applications"
        className="pointer-events-auto shrink-0"
      >
        <StatusChip meta={APP_STATUS[tracked]} />
      </Link>
    )
  return (
    <Button
      size="sm"
      className="pointer-events-auto shrink-0 transition-transform active:scale-[0.96]"
      onClick={() => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
        onApply()
      }}
    >
      Apply
    </Button>
  )
}
