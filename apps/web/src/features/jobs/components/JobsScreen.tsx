import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import {
  BriefcaseIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PencilIcon,
  Plus,
  Trash2Icon,
  WalletIcon,
} from 'lucide-react'
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
import { Card, CardFooter, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
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
import { relativeTime } from '../lib/jobs'
import { JobDialog } from './JobDialog'

/**
 * The shared job board. Every signed-in user sees the same pool; only the
 * person who posted a job can edit or delete it.
 */
export function JobsScreen() {
  const jobs = useQuery(api.jobs.listJobs)
  const me = useQuery(api.auth.getAuthUser)
  const deleteJob = useMutation(api.jobs.deleteJob)

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Doc<'jobs'> | null>(null)
  const [deleting, setDeleting] = useState<Doc<'jobs'> | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const myId = (me as { _id: string } | null | undefined)?._id

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Jobs"
        description="A shared board — anything you add here is visible to everyone."
        actions={
          <Button className="transition-transform active:scale-[0.96]" onClick={() => setAdding(true)}>
            <Plus /> Add job
          </Button>
        }
      />

      {jobs === undefined ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : jobs.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BriefcaseIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No jobs yet</EmptyTitle>
            <EmptyDescription>
              Post the first opening — paste the description or a screenshot and AI will fill in
              the details.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add job
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {jobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              mine={job.createdBy === myId}
              onEdit={() => setEditing(job)}
              onDelete={() => {
                setDeleteError(null)
                setDeleting(job)
              }}
            />
          ))}
        </div>
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

function JobCard({
  job,
  mine,
  onEdit,
  onDelete,
}: {
  job: Doc<'jobs'>
  mine: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className="transition-[box-shadow,border-color] duration-200 hover:border-foreground/15 hover:shadow-md">
      <CardHeader className="gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-balance font-heading text-base">{job.role}</CardTitle>
            <p className="mt-0.5 truncate text-muted-foreground text-sm">{job.company}</p>
          </div>
          {mine && (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Edit job"
                onClick={onEdit}
                className="transition-transform active:scale-[0.96]"
              >
                <PencilIcon />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Delete job"
                onClick={onDelete}
                className="text-muted-foreground transition-transform hover:text-destructive active:scale-[0.96]"
              >
                <Trash2Icon />
              </Button>
            </div>
          )}
        </div>

        {(job.location || job.salary) && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs">
            {job.location && (
              <span className="inline-flex items-center gap-1">
                <MapPinIcon className="size-3.5" /> {job.location}
              </span>
            )}
            {job.salary && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <WalletIcon className="size-3.5" /> {job.salary}
              </span>
            )}
          </div>
        )}
      </CardHeader>

      {job.description.trim() && (
        <CardPanel className="pt-0">
          <p
            className={`whitespace-pre-wrap text-pretty text-muted-foreground text-sm ${
              expanded ? '' : 'line-clamp-4'
            }`}
          >
            {job.description}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 text-foreground/70 text-xs underline underline-offset-4 transition-colors hover:text-foreground"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        </CardPanel>
      )}

      <CardFooter className="mt-auto justify-between border-t">
        <span className="text-muted-foreground text-xs">
          Posted {relativeTime(job._creationTime)}
        </span>
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-foreground"
          >
            <ExternalLinkIcon className="size-3.5" /> Open posting
          </a>
        )}
      </CardFooter>
    </Card>
  )
}
