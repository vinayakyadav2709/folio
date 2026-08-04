import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import {
  AtSignIcon,
  AwardIcon,
  BriefcaseIcon,
  CheckIcon,
  FileTextIcon,
  GraduationCapIcon,
  PaperclipIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '../lib/errors'
import {
  EMPTY_ACH,
  EMPTY_EDU,
  EMPTY_EXP,
  type MediaMap,
  type ProfileForm,
} from '../lib/use-profile-form'
import { Panel, PanelField, PanelSection, SaveBar } from './settings-panel'

// Username has its own guarded mutation, separate from the profile upsert and
// the shared SaveBar — it saves inline on the same field row grammar.
function UsernameField({ current }: { current: string }) {
  const setUsername = useMutation(api.profiles.setUsername)
  const [value, setValue] = useState(current)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function onSave() {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await setUsername({ username: value.trim() })
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const dirty = value.trim() !== current

  return (
    <PanelField
      label="Username"
      htmlFor="settings-username"
      hint={
        <>
          3–30 characters, lowercase letters, numbers and dashes. Your public page lives at{' '}
          <span className="font-mono">/u/{value.trim() || 'username'}</span>.
          {saved && (
            <span className="ml-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CheckIcon className="size-3" /> saved
            </span>
          )}
        </>
      }
    >
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <AtSignIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
          <Input
            id="settings-username"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSaved(false)
            }}
            placeholder="ada-lovelace"
            className="pl-8 font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button size="sm" onClick={onSave} disabled={!dirty || !value.trim() || saving}>
          {saving ? 'Saving…' : current ? 'Change' : 'Claim'}
        </Button>
        {current && <CopyLinkButton path={`/u/${current}`} size="sm" />}
      </div>
      {error && <p className="mt-1.5 text-destructive-foreground text-xs">{error}</p>}
    </PanelField>
  )
}

export function ProfileSection({ form, username }: { form: ProfileForm; username: string }) {
  const { fields, set } = form
  return (
    <Panel>
      <PanelSection
        title="Identity"
        hint="Your public handle and the name your resumes and public page pull from."
      >
        <UsernameField current={username} />
        <PanelField label="Full name" htmlFor="settings-fullname">
          <Input
            id="settings-fullname"
            value={fields.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="Ada Lovelace"
          />
        </PanelField>
        <PanelField label="Headline" htmlFor="settings-headline">
          <Input
            id="settings-headline"
            value={fields.headline}
            onChange={(e) => set({ headline: e.target.value })}
            placeholder="Backend engineer · distributed systems"
          />
        </PanelField>
      </PanelSection>
      <SaveBar section={form.sections.identity} />
    </Panel>
  )
}

export function ContactSection({ form }: { form: ProfileForm }) {
  const { fields, set } = form
  return (
    <Panel>
      <PanelSection title="Contact" hint="How people reach you, and where your work lives online.">
        <div className="grid gap-4 sm:grid-cols-2">
          <PanelField label="Email" htmlFor="settings-email">
            <Input
              id="settings-email"
              type="email"
              value={fields.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="ada@example.com"
            />
          </PanelField>
          <PanelField label="Phone" htmlFor="settings-phone">
            <Input
              id="settings-phone"
              value={fields.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+1 555 0100"
            />
          </PanelField>
        </div>
        <PanelField label="Location" htmlFor="settings-location">
          <Input
            id="settings-location"
            value={fields.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Berlin, DE"
          />
        </PanelField>
        <PanelField label="GitHub" htmlFor="settings-github">
          <Input
            id="settings-github"
            value={fields.githubUrl}
            onChange={(e) => set({ githubUrl: e.target.value })}
            placeholder="https://github.com/…"
          />
        </PanelField>
        <PanelField label="LinkedIn" htmlFor="settings-linkedin">
          <Input
            id="settings-linkedin"
            value={fields.linkedinUrl}
            onChange={(e) => set({ linkedinUrl: e.target.value })}
            placeholder="https://linkedin.com/in/…"
          />
        </PanelField>
        <PanelField label="Website" htmlFor="settings-website">
          <Input
            id="settings-website"
            value={fields.websiteUrl}
            onChange={(e) => set({ websiteUrl: e.target.value })}
            placeholder="https://…"
          />
        </PanelField>
      </PanelSection>
      <SaveBar section={form.sections.contact} />
    </Panel>
  )
}

export function ExperienceSection({ form }: { form: ProfileForm }) {
  const { fields, setExperience } = form
  const setExp = (i: number, patch: Partial<(typeof fields.experience)[number]>) =>
    setExperience((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <Panel>
      <PanelSection
        title="Work experience"
        hint="Roles, dates, and what you actually shipped — one bullet per line."
      >
        <div className="flex flex-col gap-3">
          {fields.experience.map((row, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-background/40 p-4"
            >
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Remove experience entry"
                className="absolute top-2.5 right-2.5 text-muted-foreground"
                onClick={() => setExperience((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <XIcon />
              </Button>
              <div className="grid gap-2.5 pr-8 sm:grid-cols-2">
                <PanelField label="Company">
                  <Input
                    value={row.company}
                    onChange={(e) => setExp(i, { company: e.target.value })}
                    placeholder="Acme Inc."
                  />
                </PanelField>
                <PanelField label="Role">
                  <Input
                    value={row.role}
                    onChange={(e) => setExp(i, { role: e.target.value })}
                    placeholder="Senior Backend Engineer"
                  />
                </PanelField>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-4">
                <PanelField label="Location" className="sm:col-span-2">
                  <Input
                    value={row.location}
                    onChange={(e) => setExp(i, { location: e.target.value })}
                    placeholder="Berlin, DE"
                  />
                </PanelField>
                <PanelField label="Start">
                  <Input
                    value={row.startDate}
                    onChange={(e) => setExp(i, { startDate: e.target.value })}
                    placeholder="Jan 2023"
                  />
                </PanelField>
                <PanelField label="End">
                  <Input
                    value={row.endDate}
                    onChange={(e) => setExp(i, { endDate: e.target.value })}
                    placeholder="Present"
                  />
                </PanelField>
              </div>
              <PanelField label="Highlights" hint="One bullet per line.">
                <Textarea
                  value={row.bulletsText}
                  onChange={(e) => setExp(i, { bulletsText: e.target.value })}
                  placeholder={'Cut p99 latency 40% by…\nLed migration of…'}
                  rows={4}
                />
              </PanelField>
            </div>
          ))}
          {fields.experience.length === 0 && (
            <p className="rounded-lg border border-border/60 border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
              No work experience yet.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setExperience((rows) => [...rows, { ...EMPTY_EXP }])}
          >
            <BriefcaseIcon /> Add experience
          </Button>
        </div>
      </PanelSection>
      <SaveBar section={form.sections.experience} />
    </Panel>
  )
}

const MAX_MEDIA_BYTES = 5 * 1024 * 1024
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Certificates, photos and screenshots for one achievement row. Uploads land in
// storage immediately (we need a storage id), but the row only becomes real on
// the section's Save — removal likewise just drops the id, and the server GCs
// the blob when the shorter list is saved.
function AchievementMedia({
  ids,
  media,
  onChange,
}: {
  ids: Id<'_storage'>[]
  media: MediaMap
  onChange: (ids: Id<'_storage'>[]) => void
}) {
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Freshly uploaded files aren't in the server's `media` map until the section
  // saves, so keep a local preview keyed by the same storage id.
  const [local, setLocal] = useState<MediaMap & Record<string, { name?: string }>>({})

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (file.size > MAX_MEDIA_BYTES) {
      setError(`“${file.name}” is ${formatSize(file.size)} — the limit is 5 MB.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      setLocal((m) => ({
        ...m,
        [storageId]: {
          url: URL.createObjectURL(file),
          contentType: file.type,
          size: file.size,
          name: file.name,
        },
      }))
      onChange([...ids, storageId])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ids.map((id) => {
          const item = local[id] ?? media[id]
          const isImage = item?.contentType?.startsWith('image/') ?? false
          return (
            <div
              key={id}
              className="group relative flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background/60 text-center shadow-xs/5"
            >
              {item && isImage ? (
                <img
                  src={item.url}
                  alt="Achievement media"
                  className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 group-hover:scale-[1.04] dark:outline-white/10"
                />
              ) : item ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-full flex-col items-center justify-center gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                >
                  <FileTextIcon className="size-5 opacity-70" />
                  <span className="line-clamp-1 w-full break-all text-[10px] leading-tight">
                    {local[id]?.name ?? 'PDF'}
                  </span>
                  <span className="text-[10px] tabular-nums opacity-70">{formatSize(item.size)}</span>
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">Uploading…</span>
              )}
              <Button
                size="icon-xs"
                variant="destructive"
                aria-label="Remove media"
                className="absolute top-1 right-1 opacity-0 shadow-sm transition-[opacity,scale] group-hover:opacity-100 focus-visible:opacity-100 active:scale-[0.96]"
                onClick={() => onChange(ids.filter((x) => x !== id))}
              >
                <XIcon />
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="active:scale-[0.96]"
        >
          <PaperclipIcon /> Add media
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFile}
        />
      </div>
      {error && <p className="text-destructive-foreground text-xs">{error}</p>}
    </div>
  )
}

export function AchievementsSection({ form, media }: { form: ProfileForm; media: MediaMap }) {
  const { fields, setAchievements } = form
  const setAch = (i: number, patch: Partial<(typeof fields.achievements)[number]>) =>
    setAchievements((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <Panel>
      <PanelSection
        title="Achievements"
        hint="Awards, certifications, and publications worth calling out."
      >
        <div className="flex flex-col gap-3">
          {fields.achievements.map((row, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-background/40 p-4"
            >
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Remove achievement entry"
                className="absolute top-2.5 right-2.5 text-muted-foreground"
                onClick={() => setAchievements((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <XIcon />
              </Button>
              <div className="grid gap-2.5 pr-8 sm:grid-cols-4">
                <PanelField label="Title" className="sm:col-span-3">
                  <Input
                    value={row.title}
                    onChange={(e) => setAch(i, { title: e.target.value })}
                    placeholder="AWS Solutions Architect"
                  />
                </PanelField>
                <PanelField label="Date">
                  <Input
                    value={row.date}
                    onChange={(e) => setAch(i, { date: e.target.value })}
                    placeholder="Mar 2024"
                  />
                </PanelField>
              </div>
              <PanelField label="Description">
                <Textarea
                  value={row.description}
                  onChange={(e) => setAch(i, { description: e.target.value })}
                  placeholder="What it was and why it mattered."
                  rows={2}
                />
              </PanelField>
              <PanelField label="Media" hint="Certificates, photos or screenshots — images or PDF, up to 5 MB each.">
                <AchievementMedia
                  ids={row.mediaIds}
                  media={media}
                  onChange={(mediaIds) => setAch(i, { mediaIds })}
                />
              </PanelField>
            </div>
          ))}
          {fields.achievements.length === 0 && (
            <p className="rounded-lg border border-border/60 border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
              No achievements yet.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setAchievements((rows) => [...rows, { ...EMPTY_ACH }])}
          >
            <AwardIcon /> Add achievement
          </Button>
        </div>
      </PanelSection>
      <SaveBar section={form.sections.achievements} />
    </Panel>
  )
}

export function SkillsSection({ form }: { form: ProfileForm }) {
  const { fields, setSkills } = form
  return (
    <Panel>
      <PanelSection
        title="Skills"
        hint={
          <>
            One row per category, items comma-separated — e.g.{' '}
            <span className="font-mono">Languages</span> ·{' '}
            <span className="font-mono">TypeScript, Rust, Go</span>.
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {fields.skills.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <Input
                value={row.category}
                onChange={(e) =>
                  setSkills((rows) => rows.map((r, idx) => (idx === i ? { ...r, category: e.target.value } : r)))
                }
                placeholder="Category"
                className="w-40 shrink-0"
              />
              <Input
                value={row.itemsText}
                onChange={(e) =>
                  setSkills((rows) => rows.map((r, idx) => (idx === i ? { ...r, itemsText: e.target.value } : r)))
                }
                placeholder="TypeScript, Rust, Go"
                className="flex-1"
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label="Remove category"
                className="shrink-0 text-muted-foreground"
                onClick={() => setSkills((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <XIcon />
              </Button>
            </div>
          ))}
          {fields.skills.length === 0 && (
            <p className="rounded-lg border border-border/60 border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
              No skill categories yet.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setSkills((rows) => [...rows, { category: '', itemsText: '' }])}
          >
            <PlusIcon /> Add category
          </Button>
        </div>
      </PanelSection>
      <SaveBar section={form.sections.skills} />
    </Panel>
  )
}

export function EducationSection({ form }: { form: ProfileForm }) {
  const { fields, setEducation } = form
  const setEdu = (i: number, patch: Partial<(typeof fields.education)[number]>) =>
    setEducation((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <Panel>
      <PanelSection title="Education" hint="Schools, degrees, and dates for your resume header.">
        <div className="flex flex-col gap-3">
          {fields.education.map((row, i) => (
            <div
              key={i}
              className="relative flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-background/40 p-4"
            >
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label="Remove education entry"
                className="absolute top-2.5 right-2.5 text-muted-foreground"
                onClick={() => setEducation((rows) => rows.filter((_, idx) => idx !== i))}
              >
                <XIcon />
              </Button>
              <div className="grid gap-2.5 pr-8 sm:grid-cols-2">
                <PanelField label="School">
                  <Input value={row.school} onChange={(e) => setEdu(i, { school: e.target.value })} placeholder="MIT" />
                </PanelField>
                <PanelField label="Degree">
                  <Input
                    value={row.degree}
                    onChange={(e) => setEdu(i, { degree: e.target.value })}
                    placeholder="B.S. in Computer Science"
                  />
                </PanelField>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-4">
                <PanelField label="Location" className="sm:col-span-2">
                  <Input
                    value={row.location}
                    onChange={(e) => setEdu(i, { location: e.target.value })}
                    placeholder="Cambridge, MA"
                  />
                </PanelField>
                <PanelField label="Start">
                  <Input value={row.startDate} onChange={(e) => setEdu(i, { startDate: e.target.value })} placeholder="Aug 2021" />
                </PanelField>
                <PanelField label="End">
                  <Input value={row.endDate} onChange={(e) => setEdu(i, { endDate: e.target.value })} placeholder="May 2025" />
                </PanelField>
              </div>
              <PanelField label="GPA" className="sm:max-w-40">
                <Input value={row.gpa} onChange={(e) => setEdu(i, { gpa: e.target.value })} placeholder="3.9 / 4.0" />
              </PanelField>
            </div>
          ))}
          {fields.education.length === 0 && (
            <p className="rounded-lg border border-border/60 border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
              No education entries yet.
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setEducation((rows) => [...rows, { ...EMPTY_EDU }])}
          >
            <GraduationCapIcon /> Add education
          </Button>
        </div>
      </PanelSection>
      <SaveBar section={form.sections.education} />
    </Panel>
  )
}
