import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import {
  CheckIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  LockIcon,
  Sparkles,
  UploadIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Doc, Id } from '@folio/backend/dataModel'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  const teams = useQuery(api.teams.listMyTeams)
  const fileInput = useRef<HTMLInputElement>(null)

  const [fields, setFields] = useState<Fields>(() => fieldsOf(job))
  const [source, setSource] = useState('')
  const [image, setImage] = useState<{ data: string; mediaType: string } | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noAiKey, setNoAiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // null = "not touched yet", so the default can follow `teams` as it loads
  // without an effect writing state back (same trick as ProjectsListScreen).
  const [visibility, setVisibility] = useState<'global' | 'team' | 'private' | null>(null)
  const [teamIds, setTeamIds] = useState<string[] | null>(null)

  const hasTeams = teams !== undefined && teams.length > 0
  // Default is My teams: this board is a team pool, and a posting only helps
  // the people you'd share it with. Falls back to Just me with no team.
  const audience = visibility ?? (hasTeams ? 'team' : 'private')
  // Untouched means literally "my teams" — all of them ticked. Every team here
  // is one the signed-in user already belongs to, so this shares no wider than
  // the old single-team default did in spirit, and Save is never dead on open.
  const activeTeamIds = (teamIds ?? teams?.map((t) => t._id) ?? []).filter((id) =>
    teams?.some((t) => t._id === id),
  )

  const set = (key: keyof Fields) => (value: string) =>
    setFields((f) => ({ ...f, [key]: value }))

  function reset() {
    setFields(fieldsOf(job))
    setSource('')
    setImage(null)
    setError(null)
    setNoAiKey(false)
    setVisibility(null)
    setTeamIds(null)
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
      else
        await createJob({
          ...payload,
          visibility: audience,
          teamIds: audience === 'team' ? (activeTeamIds as Id<'teams'>[]) : undefined,
        })
      close(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const canSave = Boolean(
    fields.company.trim() &&
      fields.role.trim() &&
      (job || audience !== 'team' || activeTeamIds.length > 0),
  )

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

          {!job && (
            <div className="flex flex-col gap-2.5 rounded-xl border bg-foreground/[0.02] p-3">
              <Label>Who can see this</Label>
              <ToggleGroup
                variant="outline"
                value={[audience]}
                onValueChange={(next) => {
                  const picked = next[0]
                  if (picked) setVisibility(picked as 'global' | 'team' | 'private')
                }}
              >
                <ToggleGroupItem value="global" aria-label="Everyone">
                  <GlobeIcon /> Everyone
                </ToggleGroupItem>
                <ToggleGroupItem value="team" disabled={!hasTeams} aria-label="My teams">
                  <UsersIcon /> My teams
                </ToggleGroupItem>
                <ToggleGroupItem value="private" aria-label="Just me">
                  <LockIcon /> Just me
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Tick-mark toggles, multi-select: a job can be shared with any
                  number of the teams the signed-in user belongs to. */}
              {audience === 'team' && teams && teams.length > 0 && (
                <ToggleGroup
                  multiple
                  value={activeTeamIds}
                  onValueChange={setTeamIds}
                  aria-label="Teams to share with"
                  className="flex-wrap gap-1.5"
                >
                  {teams.map((team) => (
                    <ToggleGroupItem
                      key={team._id}
                      value={team._id}
                      variant="outline"
                      className="rounded-full transition-transform active:scale-[0.96]"
                    >
                      {activeTeamIds.includes(team._id) ? (
                        <CheckIcon className="text-foreground" />
                      ) : (
                        <span className="size-3.5 rounded-[4px] border border-input" />
                      )}
                      {team.name}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              )}
              <p className="text-muted-foreground text-xs">
                {teams === undefined ? (
                  ' '
                ) : audience === 'global' ? (
                  'Anyone signed in can see this posting and flag it expired or broken.'
                ) : audience === 'private' ? (
                  'Only you will see this posting.'
                ) : hasTeams ? (
                  activeTeamIds.length === 0 ? (
                    'Pick at least one team — or share it with everyone instead.'
                  ) : (
                    `Everyone on ${
                      activeTeamIds.length === 1
                        ? (teams.find((t) => t._id === activeTeamIds[0])?.name ?? 'the team')
                        : `${activeTeamIds.length} teams`
                    } sees this posting and can flag it expired or broken.`
                  )
                ) : (
                  <>
                    You're not on a team yet, so this stays private.{' '}
                    <Link to="/dashboard/teams" className="underline underline-offset-4">
                      Create a team
                    </Link>{' '}
                    to share postings.
                  </>
                )}
              </p>
            </div>
          )}

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
