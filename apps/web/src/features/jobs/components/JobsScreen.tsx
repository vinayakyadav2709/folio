import { useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { BriefcaseIcon, Plus } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/shared/page-header'
import { errorMessage } from '@/lib/ai-extract'
import { JobCard, JobDetailSheet, statusOf } from './JobCard'
import { JobDialog } from './JobDialog'
import {
  type Audience,
  audienceOf,
  DEFAULT_FILTERS,
  type JobFilterState,
  JobFilters,
  matchesFilters,
  SHOW_ALL_FILTERS,
} from './JobFilters'

type Job = Doc<'jobs'> & { teamIds: string[] }

/**
 * The job board. Every posting the signed-in user can see — team postings from
 * their teams plus their own private ones — with the shared `live/expired/
 * broken` flag anyone can set, and a one-click path into the applications
 * tracker.
 *
 * Two panes (devl `layouts-two-pane`): a filter rail on the left, the card list
 * in the remaining width. The rail is `lg:sticky` so it stays put while the
 * list scrolls, and collapses to its own header-disclosure below `lg`.
 */
export function JobsScreen() {
  const jobs = useQuery(api.jobs.listJobs) as Job[] | undefined
  const me = useQuery(api.auth.getAuthUser)
  const teams = useQuery(api.teams.listMyTeams)
  const applications = useQuery(api.applications.listMyApplications)
  const deleteJob = useMutation(api.jobs.deleteJob)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Job | null>(null)
  const [viewing, setViewing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<Job | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [filters, setFilters] = useState<JobFilterState>(DEFAULT_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const myId = (me as { _id: string } | null | undefined)?._id
  // A team posting can be shared with several teams — name the ones I'm in.
  const teamNames = (ids: string[]) => {
    const named = ids.map((id) => teams?.find((t) => t._id === id)?.name).filter(Boolean)
    return named.length > 0 ? named.join(', ') : undefined
  }
  const trackedStatus = (jobId: string) => applications?.find((a) => a.jobId === jobId)?.status

  const appliedIds = useMemo(
    () => new Set((applications ?? []).map((a) => a.jobId as string)),
    [applications],
  )

  const all = jobs ?? []
  const statusCounts = all.reduce<Record<string, number>>((acc, job) => {
    const s = statusOf(job)
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})
  const audienceCounts = all.reduce<Record<Audience, number>>(
    (acc, job) => {
      acc[audienceOf(job)] += 1
      return acc
    },
    { team: 0, private: 0, everyone: 0 },
  )

  const visible = all.filter((job) => matchesFilters(job, filters, appliedIds))
  const hidden = all.length - visible.length

  // Re-read the open job from the live list so the sheet reflects edits and
  // status changes instead of a stale snapshot — and closes if it's deleted.
  const open = viewing ? (all.find((j) => j._id === viewing) ?? null) : null

  async function onDelete() {
    if (!deleting) return
    setDeletePending(true)
    setDeleteError(null)
    try {
      await deleteJob({ jobId: deleting._id })
      setDeleting(null)
    } catch (err) {
      setDeleteError(errorMessage(err))
    } finally {
      setDeletePending(false)
    }
  }

  const cardProps = (job: Job) => ({
    job,
    mine: job.createdBy === myId,
    teamName: teamNames(job.teamIds),
    tracked: trackedStatus(job._id),
    onEdit: () => setEditing(job),
    onDelete: () => {
      setDeleteError(null)
      setDeleting(job)
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Job search"
        actions={
          <Button
            className="transition-transform active:scale-[0.96]"
            onClick={() => setAdding(true)}
          >
            <Plus /> Add job
          </Button>
        }
      />

      {jobs === undefined ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : all.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No jobs yet</EmptyTitle>
            <EmptyDescription>
              Post the first opening — paste the description or a screenshot and AI will fill in the
              details.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add job
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <JobFilters
            value={filters}
            onChange={setFilters}
            statusCounts={statusCounts}
            audienceCounts={audienceCounts}
            teams={teams}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            className="lg:sticky lg:top-6"
          />

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-muted-foreground text-sm">
                <span className="tabular-nums">{visible.length}</span>
                {visible.length === 1 ? ' posting' : ' postings'}
              </p>
              {hidden > 0 && (
                <p className="text-muted-foreground text-sm">
                  <span className="tabular-nums">{hidden}</span> hidden ·{' '}
                  <button
                    type="button"
                    onClick={() => setFilters(SHOW_ALL_FILTERS)}
                    className="cursor-pointer underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Show all
                  </button>
                </p>
              )}
            </div>

            {visible.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground text-sm">
                Every posting is hidden by the current filter.
              </p>
            ) : (
              visible.map((job) => (
                <JobCard key={job._id} {...cardProps(job)} onOpen={() => setViewing(job._id)} />
              ))
            )}
          </div>
        </div>
      )}

      {open && (
        <JobDetailSheet
          key={open._id}
          {...cardProps(open)}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setViewing(null)
            setEditing(open)
          }}
          onDelete={() => {
            setViewing(null)
            setDeleteError(null)
            setDeleting(open)
          }}
        />
      )}

      {adding && <JobDialog open onOpenChange={setAdding} />}
      {editing && (
        <JobDialog
          key={editing._id}
          open
          onOpenChange={(next) => !next && setEditing(null)}
          job={editing}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogPopup className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${deleting.role} at ${deleting.company}` : ''} will be removed from the
              board for everyone. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="px-6 text-destructive text-sm">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </AlertDialogClose>
            <Button type="button" variant="destructive" loading={deletePending} onClick={onDelete}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  )
}
