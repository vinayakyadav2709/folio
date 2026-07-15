import { useState, type ReactElement } from 'react'
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
  const resumes = useQuery(api.resumes.listMyResumes)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workspace"
        title="Resumes"
        description={
          resumes === undefined
            ? 'Loading your resumes…'
            : resumes.length === 0
              ? 'Compose, edit, and version resumes from your blocks.'
              : `${resumes.length} resume${resumes.length === 1 ? '' : 's'}, each with its own version tree`
        }
        actions={
          resumes !== undefined && resumes.length > 0 ? (
            <CreateResumeDialog
              trigger={
                <Button>
                  <PlusIcon />
                  New resume
                </Button>
              }
            />
          ) : undefined
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
  const [fullName, setFullName] = useState('')
  const [headline, setHeadline] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const resumeId = await createResume({
        name,
        header: {
          fullName,
          headline: headline.trim() || undefined,
          email: email.trim() || undefined,
          links: [],
        },
      })
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
            <Field>
              <FieldLabel>Full name</FieldLabel>
              <Input value={fullName} placeholder="Ada Lovelace" onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Headline</FieldLabel>
              <Input value={headline} placeholder="Software Engineer" onChange={(e) => setHeadline(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input value={email} type="email" placeholder="ada@example.com" onChange={(e) => setEmail(e.target.value)} />
            </Field>
            {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving || !name || !fullName}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
