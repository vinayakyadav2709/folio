import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import { ExternalLinkIcon, FileTextIcon, GlobeIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '../lib/errors'

export function ResumeCard({ resume }: { resume: Doc<'resumes'> }) {
  const renameResume = useMutation(api.resumes.renameResume)
  const deleteResume = useMutation(api.resumes.deleteResume)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(resume.name)
  const [error, setError] = useState<string | null>(null)

  async function onRename() {
    setError(null)
    try {
      await renameResume({ resumeId: resume._id, name })
      setRenaming(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${resume.name}" and its whole history?`)) return
    try {
      await deleteResume({ resumeId: resume._id })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <div className="group flex flex-col gap-3 rounded-xl bg-card p-4 shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06),0_2px_4px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 ease-out hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_-1px_rgba(0,0,0,0.08),0_6px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.13)]">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground">
          <FileTextIcon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <Input value={name} size="sm" autoFocus onChange={(e) => setName(e.target.value)} />
              <Button size="sm" onClick={onRename} disabled={!name}>
                Save
              </Button>
            </div>
          ) : (
            <Link
              to="/dashboard/resumes/$resumeId"
              params={{ resumeId: resume._id }}
              className="block truncate font-medium hover:underline"
            >
              {resume.name}
            </Link>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {resume.username && (
              <span className="rounded-full border border-border/60 bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                /u/{resume.username}
              </span>
            )}
            {resume.publishedSnapshotId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] text-success-foreground dark:bg-success/16">
                <span className="size-1.5 rounded-full bg-success" aria-hidden />
                published
              </span>
            )}
          </div>
        </div>
      </div>
      {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
      <div className="mt-auto flex items-center gap-1 border-border/60 border-t pt-3">
        <PublishDialog resume={resume} />
        <span className="flex-1" />
        <Button
          size="xs"
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => setRenaming((v) => !v)}
        >
          Rename
        </Button>
        <Button size="xs" variant="ghost" className="text-destructive" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}

function PublishDialog({ resume }: { resume: Doc<'resumes'> }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        <GlobeIcon />
        {resume.publishedSnapshotId ? 'Published' : 'Publish'}
      </DialogTrigger>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>Publish “{resume.name}”</DialogTitle>
          <DialogDescription>
            Publishes the latest commit on main to a public page.
          </DialogDescription>
        </DialogHeader>
        <PublishForm resume={resume} />
      </DialogPopup>
    </Dialog>
  )
}

// Mounted only while the dialog is open, so getTree runs on demand.
function PublishForm({ resume }: { resume: Doc<'resumes'> }) {
  const tree = useQuery(api.snapshots.getTree, { resumeId: resume._id })
  const setUsername = useMutation(api.resumes.setUsername)
  const publish = useMutation(api.resumes.publish)
  const unpublish = useMutation(api.resumes.unpublish)
  const [username, setUsernameInput] = useState(resume.username ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const mainHead = tree?.branches.find((b) => b.name === 'main')?.headSnapshotId

  async function onPublish() {
    setError(null)
    setBusy(true)
    try {
      if (username !== resume.username) {
        await setUsername({ resumeId: resume._id, username })
      }
      await publish({ resumeId: resume._id, snapshotId: mainHead! })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <DialogPanel className="flex flex-col gap-3">
      <Input
        value={username}
        placeholder="username (e.g. ada-lovelace)"
        onChange={(e) => setUsernameInput(e.target.value)}
      />
      {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onPublish} disabled={!username || !mainHead} loading={busy}>
          {resume.publishedSnapshotId ? 'Republish main head' : 'Publish main head'}
        </Button>
        {resume.publishedSnapshotId && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => unpublish({ resumeId: resume._id }).catch((e) => setError(errorMessage(e)))}
          >
            Unpublish
          </Button>
        )}
      </div>
      {resume.publishedSnapshotId && resume.username && (
        <a
          href={`/u/${resume.username}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
        >
          <ExternalLinkIcon className="size-3.5" />
          View public page: <span className="font-mono text-xs">/u/{resume.username}</span>
        </a>
      )}
    </DialogPanel>
  )
}
