import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import {
  ClipboardListIcon,
  ExternalLinkIcon,
  MapPinIcon,
  StickyNoteIcon,
  XIcon,
} from 'lucide-react'
import { api } from '@folio/backend/api'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { errorMessage } from '@/lib/ai-extract'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { APP_STATUS, APP_STATUSES, type AppStatus } from './status'

type Application = NonNullable<
  ReturnType<typeof useQuery<typeof api.applications.listMyApplications>>
>[number]

const ITEMS = APP_STATUSES.map((value) => ({ value, label: APP_STATUS[value].label }))

/**
 * "Did I apply, and what came back." Everything the user is tracking, grouped
 * by lifecycle stage, with the stage settable in place on every row.
 */
export function ApplicationsScreen() {
  const applications = useQuery(api.applications.listMyApplications)
  const setStatus = useMutation(api.applications.setStatus)
  const clearStatus = useMutation(api.applications.clearStatus)
  const [error, setError] = useState<string | null>(null)

  const attempt = (p: Promise<unknown>) => {
    setError(null)
    p.catch((err) => setError(errorMessage(err)))
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Applications"
        actions={
          <Button
            variant="outline"
            className="transition-transform active:scale-[0.96]"
            render={<Link to="/dashboard/jobs" />}
          >
            Browse jobs
          </Button>
        }
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {applications === undefined ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : applications.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardListIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Nothing tracked yet</EmptyTitle>
            <EmptyDescription>
              Hit "I applied" on a posting and it shows up here — then move it along as you hear
              back.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/dashboard/jobs" />}>Browse jobs</Button>
          </EmptyContent>
        </Empty>
      ) : (
        APP_STATUSES.map((status) => {
          const rows = applications.filter((a) => a.status === status)
          if (rows.length === 0) return null
          return (
            <section key={status} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className={cn('size-1.5 rounded-full', APP_STATUS[status].dot)} />
                <h2 className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.25em]">
                  {APP_STATUS[status].label}
                </h2>
                <span className="text-muted-foreground/70 text-xs tabular-nums">{rows.length}</span>
              </div>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {rows.map((a) => (
                  <ApplicationRow
                    key={a._id}
                    application={a}
                    // setStatus patches status AND note together, so both
                    // always travel — otherwise changing the stage silently
                    // wipes the note.
                    onSave={(next, note) =>
                      attempt(setStatus({ jobId: a.jobId, status: next, note }))
                    }
                    onClear={() => attempt(clearStatus({ jobId: a.jobId }))}
                  />
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}

function ApplicationRow({
  application: a,
  onSave,
  onClear,
}: {
  application: Application
  onSave: (status: AppStatus, note: string | undefined) => void
  onClear: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(a.note ?? '')

  function saveNote() {
    setEditing(false)
    const next = draft.trim() || undefined
    if (next !== a.note) onSave(a.status, next)
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-foreground/[0.02]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium text-sm">{a.role}</div>
          <div className="flex flex-wrap items-center gap-x-3 text-muted-foreground text-xs">
            <span className="truncate">{a.company}</span>
            {a.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3" /> {a.location}
              </span>
            )}
            <span className="tabular-nums">Updated {relativeTime(a.at)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {a.url && (
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Open posting"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          )}
          <Button
            size="icon"
            variant="ghost"
            aria-label={a.note ? 'Edit note' : 'Add note'}
            onClick={() => {
              setDraft(a.note ?? '')
              setEditing((v) => !v)
            }}
            className={cn(
              'transition-transform active:scale-[0.96]',
              a.note || editing ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <StickyNoteIcon />
          </Button>
          <Select
            items={ITEMS}
            value={a.status}
            onValueChange={(next) => next && onSave(next as AppStatus, a.note)}
          >
            <SelectTrigger className="w-36 min-w-0" size="sm" aria-label="Application status">
              <span className={cn('size-1.5 shrink-0 rounded-full', APP_STATUS[a.status].dot)} />
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {ITEMS.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Stop tracking"
            onClick={onClear}
            className="text-muted-foreground transition-transform hover:text-destructive active:scale-[0.96]"
          >
            <XIcon />
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col items-end gap-2">
          <Textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false)
            }}
            placeholder="Recruiter name, next step, when to follow up…"
            className="min-h-16 resize-y text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveNote} className="transition-transform active:scale-[0.96]">
              Save note
            </Button>
          </div>
        </div>
      ) : (
        a.note && <p className="text-pretty text-muted-foreground text-sm">{a.note}</p>
      )}
    </li>
  )
}
