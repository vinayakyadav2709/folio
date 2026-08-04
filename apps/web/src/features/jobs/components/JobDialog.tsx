import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation } from 'convex/react'
import { FileTextIcon, ImageIcon, Sparkles, UploadIcon, XIcon } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage, fileToBase64, isNoAiKey } from '@/lib/ai-extract'

type Fields = {
  company: string
  role: string
  location: string
  url: string
  salary: string
  description: string
}

const emptyFields: Fields = {
  company: '',
  role: '',
  location: '',
  url: '',
  salary: '',
  description: '',
}

const fieldsOf = (job: Doc<'jobs'> | undefined): Fields =>
  job
    ? {
        company: job.company,
        role: job.role,
        location: job.location ?? '',
        url: job.url ?? '',
        salary: job.salary ?? '',
        description: job.description,
      }
    : emptyFields

/**
 * Create / edit a job posting. Creating leads with the AI extractor — paste a
 * JD or a screenshot and it fills the form below for review — but every field
 * is editable by hand, so manual entry never depends on a key being set.
 */
export function JobDialog({
  open,
  onOpenChange,
  job,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  job?: Doc<'jobs'>
}) {
  const createJob = useMutation(api.jobs.createJob)
  const updateJob = useMutation(api.jobs.updateJob)
  const extractJob = useAction(api.ai.extractJob)
  const fileInput = useRef<HTMLInputElement>(null)

  const [fields, setFields] = useState<Fields>(() => fieldsOf(job))
  const [source, setSource] = useState('')
  const [image, setImage] = useState<{ data: string; mediaType: string } | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noAiKey, setNoAiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: keyof Fields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }))

  function reset() {
    setFields(fieldsOf(job))
    setSource('')
    setImage(null)
    setError(null)
    setNoAiKey(false)
  }

  function close(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  // A JD arrives as a screenshot or, just as often, a PDF — Gemini reads both.
  async function takeFile(file: File | undefined | null) {
    if (!file || !(file.type.startsWith('image/') || file.type === 'application/pdf')) return
    setImage(await fileToBase64(file))
    setError(null)
  }

  async function onExtract() {
    if (!source.trim() && !image) return
    setExtracting(true)
    setError(null)
    setNoAiKey(false)
    try {
      const extracted = await extractJob({
        text: source.trim() || undefined,
        file: image ?? undefined,
      })
      setFields({
        company: extracted.company,
        role: extracted.role,
        location: extracted.location ?? '',
        url: extracted.url ?? '',
        salary: extracted.salary ?? '',
        description: extracted.description,
      })
    } catch (err) {
      if (isNoAiKey(err)) setNoAiKey(true)
      else setError(errorMessage(err))
    } finally {
      setExtracting(false)
    }
  }

  async function onSave() {
    if (!fields.company.trim() || !fields.role.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      company: fields.company.trim(),
      role: fields.role.trim(),
      location: fields.location.trim() || undefined,
      url: fields.url.trim() || undefined,
      salary: fields.salary.trim() || undefined,
      description: fields.description.trim(),
    }
    try {
      if (job) await updateJob({ jobId: job._id, ...payload })
      else await createJob(payload)
      close(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const canSave = Boolean(fields.company.trim() && fields.role.trim())

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogPopup className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{job ? 'Edit job' : 'Add a job'}</DialogTitle>
          <DialogDescription>
            {job
              ? 'Update this posting — everyone in the pool sees the change.'
              : 'Paste the description or a screenshot and let AI fill it in, or type it yourself.'}
          </DialogDescription>
        </DialogHeader>

        <DialogPanel className="flex max-h-[60vh] flex-col gap-5">
          {!job && (
            <div className="flex flex-col gap-2.5 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-sky-500/[0.06] p-3 dark:border-violet-400/25">
              <Textarea
                value={source}
                onChange={(e) => setSource(e.target.value)}
                onPaste={(e) => {
                  const file = e.clipboardData.files[0]
                  if (file) {
                    e.preventDefault()
                    void takeFile(file)
                  }
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  void takeFile(e.dataTransfer.files[0])
                }}
                placeholder="Paste the job description — or paste / drop a screenshot or PDF."
                className="min-h-24 resize-y bg-background/60 text-sm"
              />

              {image && (
                <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-2">
                  {image.mediaType.startsWith('image/') ? (
                    <img
                      src={`data:${image.mediaType};base64,${image.data}`}
                      alt=""
                      className="h-12 w-16 shrink-0 rounded-md object-cover outline outline-black/10 dark:outline-white/10"
                    />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] outline outline-black/10 dark:outline-white/10">
                      <FileTextIcon className="size-5 text-muted-foreground" />
                    </span>
                  )}
                  <span className="flex-1 truncate text-muted-foreground text-xs">
                    {image.mediaType === 'application/pdf' ? 'PDF attached' : 'Screenshot attached'}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove attachment"
                    onClick={() => setImage(null)}
                  >
                    <XIcon />
                  </Button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="transition-transform active:scale-[0.96]"
                  onClick={() => fileInput.current?.click()}
                >
                  {image ? <ImageIcon /> : <UploadIcon />} Upload file
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="hidden"
                  onChange={(e) => {
                    void takeFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onExtract}
                  loading={extracting}
                  disabled={extracting || (!source.trim() && !image)}
                  className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-sky-500/10 transition-[background-color,scale] hover:from-violet-500/20 hover:to-sky-500/20 active:scale-[0.96] dark:border-violet-400/30"
                >
                  <Sparkles className="text-violet-500 dark:text-violet-300" />
                  {extracting ? 'Reading…' : 'Extract with AI'}
                </Button>
              </div>

              {noAiKey && (
                <p className="text-muted-foreground text-sm">
                  No AI key configured.{' '}
                  <Link to="/dashboard/settings" className="underline underline-offset-4">
                    Add one in Settings
                  </Link>{' '}
                  to use AI assist.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="job-role"
              label="Role"
              value={fields.role}
              onChange={set('role')}
              placeholder="Senior Frontend Engineer"
            />
            <Field
              id="job-company"
              label="Company"
              value={fields.company}
              onChange={set('company')}
              placeholder="Acme Inc."
            />
            <Field
              id="job-location"
              label="Location"
              value={fields.location}
              onChange={set('location')}
              placeholder="Remote / Bengaluru"
            />
            <Field
              id="job-salary"
              label="Salary"
              value={fields.salary}
              onChange={set('salary')}
              placeholder="₹30–45 LPA"
            />
          </div>

          <Field
            id="job-url"
            label="Link"
            type="url"
            value={fields.url}
            onChange={set('url')}
            placeholder="https://acme.com/careers/123"
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="job-description">Description</Label>
            <Textarea
              id="job-description"
              value={fields.description}
              onChange={(e) => set('description')(e.target.value)}
              placeholder="Responsibilities, requirements, how to apply…"
              className="min-h-32 resize-y text-sm"
            />
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </DialogPanel>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            loading={saving}
            disabled={!canSave || saving}
            className="transition-transform active:scale-[0.96]"
          >
            {job ? 'Save changes' : 'Add job'}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
