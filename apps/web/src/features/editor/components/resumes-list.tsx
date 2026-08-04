import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { FileTextIcon, PlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ResumeCard } from './resume-card'
import { errorMessage } from '../lib/errors'

export function ResumesList() {
  const raw = useQuery(api.resumes.listMyResumes)
  // Newest first — the resume you just created is the one you want to open.
  const resumes = useMemo(
    () => raw && [...raw].sort((a, b) => b._creationTime - a._creationTime),
    [raw],
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumes"
        actions={
          <CreateResumeDialog
            trigger={
              <Button>
                <PlusIcon />
                New resume
              </Button>
            }
          />
        }
      />

      {resumes === undefined ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : resumes.length === 0 ? (
        <Empty className="rounded-xl border border-border/70 border-dashed py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileTextIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Create your first resume</EmptyTitle>
            <EmptyDescription>
              A resume is a composition of shared blocks with git-like version history — commit,
              branch, and tailor one per role.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <CreateResumeDialog
              trigger={
                <Button size="lg" className="w-full max-w-xs">
                  <PlusIcon />
                  Create resume
                </Button>
              }
            />
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <ResumeCard key={resume._id} resume={resume} />
          ))}
        </div>
      )}
    </div>
  )
}

function CreateResumeDialog({ trigger }: { trigger: ReactElement }) {
  const navigate = useNavigate()
  const createResume = useMutation(api.resumes.createResume)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      // The server builds the initial header from your profile.
      const resumeId = await createResume({ name })
      navigate({ to: '/dashboard/resumes/$resumeId', params: { resumeId } })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>New resume</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Resume name</FieldLabel>
              <Input value={name} autoFocus placeholder="Backend roles" onChange={(e) => setName(e.target.value)} />
            </Field>
            {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
