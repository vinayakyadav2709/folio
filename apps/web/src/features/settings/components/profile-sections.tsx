import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import { AtSignIcon, CheckIcon, GraduationCapIcon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '../lib/errors'
import { EMPTY_EDU, type ProfileForm, useSectionSave } from '../lib/use-profile-form'

export function PanelHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <header className="border-border/60 border-b pb-6">
      <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
        {eyebrow}
      </div>
      <h1 className="mt-1 font-heading font-semibold text-2xl tracking-tight">{title}</h1>
      <p className="mt-1.5 max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </header>
  )
}

function SaveRow({
  label,
  save,
}: {
  label: string
  save: () => Promise<unknown>
}) {
  const { saving, saved, error, run } = useSectionSave()
  return (
    <div className="flex items-center gap-3 pt-2">
      <Button onClick={() => run(save)} loading={saving}>
        {label}
      </Button>
      {saved && (
        <span className="inline-flex items-center gap-1 text-emerald-600 text-sm dark:text-emerald-400">
          <CheckIcon className="size-3.5" /> Saved
        </span>
      )}
      {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
    </div>
  )
}

// Username has its own guarded mutation, separate from the profile upsert.
function UsernameSection({ current }: { current: string }) {
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
    <section className="flex flex-col gap-3">
      <Field>
        <FieldLabel>Username</FieldLabel>
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <AtSignIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-3.5 text-muted-foreground" />
            <Input
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
        {error && <FieldError>{error}</FieldError>}
      </Field>
      <p className="text-muted-foreground text-xs leading-relaxed">
        3–30 characters, lowercase letters, numbers and dashes. Your public page lives at{' '}
        <span className="font-mono">/u/{value.trim() || 'username'}</span>.
        {saved && (
          <span className="ml-1 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="size-3" /> saved
          </span>
        )}
      </p>
    </section>
  )
}

export function ProfileSection({ form, username }: { form: ProfileForm; username: string }) {
  const { fields, set } = form
  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        eyebrow="Settings · Profile"
        title="Your profile"
        description="Your public handle and the identity your resumes and public page pull from."
      />
      <UsernameSection current={username} />
      <section className="flex flex-col gap-3">
        <Field>
          <FieldLabel>Full name</FieldLabel>
          <Input
            value={fields.fullName}
            onChange={(e) => set({ fullName: e.target.value })}
            placeholder="Ada Lovelace"
          />
        </Field>
        <Field>
          <FieldLabel>Headline</FieldLabel>
          <Input
            value={fields.headline}
            onChange={(e) => set({ headline: e.target.value })}
            placeholder="Backend engineer · distributed systems"
          />
        </Field>
        <SaveRow label="Save profile" save={form.saveIdentity} />
      </section>
    </div>
  )
}

export function ContactSection({ form }: { form: ProfileForm }) {
  const { fields, set } = form
  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        eyebrow="Settings · Contact"
        title="Contact & links"
        description="How people reach you, and where your work lives online."
      />
      <section className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input
              type="email"
              value={fields.email}
              onChange={(e) => set({ email: e.target.value })}
              placeholder="ada@example.com"
            />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input
              value={fields.phone}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+1 555 0100"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input
            value={fields.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Berlin, DE"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel>GitHub</FieldLabel>
            <Input
              value={fields.githubUrl}
              onChange={(e) => set({ githubUrl: e.target.value })}
              placeholder="https://github.com/…"
            />
          </Field>
          <Field>
            <FieldLabel>LinkedIn</FieldLabel>
            <Input
              value={fields.linkedinUrl}
              onChange={(e) => set({ linkedinUrl: e.target.value })}
              placeholder="https://linkedin.com/in/…"
            />
          </Field>
          <Field>
            <FieldLabel>Website</FieldLabel>
            <Input
              value={fields.websiteUrl}
              onChange={(e) => set({ websiteUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
        </div>
        <SaveRow label="Save contact" save={form.saveContact} />
      </section>
    </div>
  )
}

export function SkillsSection({ form }: { form: ProfileForm }) {
  const { fields, setSkills } = form
  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        eyebrow="Settings · Skills"
        title="Skills"
        description="Grouped by category, shaped for an ATS-friendly resume."
      />
      <section className="flex flex-col gap-3">
        <p className="text-muted-foreground text-xs leading-relaxed">
          One row per category. List items comma-separated — e.g. category{' '}
          <span className="font-mono">Languages</span>, items{' '}
          <span className="font-mono">TypeScript, Rust, Go</span>.
        </p>
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
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setSkills((rows) => [...rows, { category: '', itemsText: '' }])}
        >
          <PlusIcon /> Add category
        </Button>
        <SaveRow label="Save skills" save={form.saveSkills} />
      </section>
    </div>
  )
}

export function EducationSection({ form }: { form: ProfileForm }) {
  const { fields, setEducation } = form
  const setEdu = (i: number, patch: Partial<(typeof fields.education)[number]>) =>
    setEducation((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  return (
    <div className="flex flex-col gap-8">
      <PanelHeader
        eyebrow="Settings · Education"
        title="Education"
        description="Schools, degrees, and dates for your resume header."
      />
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3">
          {fields.education.map((row, i) => (
            <div key={i} className="relative flex flex-col gap-2.5 rounded-xl border border-border/60 bg-background/40 p-4">
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
                <Field>
                  <FieldLabel>School</FieldLabel>
                  <Input value={row.school} onChange={(e) => setEdu(i, { school: e.target.value })} placeholder="MIT" />
                </Field>
                <Field>
                  <FieldLabel>Degree</FieldLabel>
                  <Input
                    value={row.degree}
                    onChange={(e) => setEdu(i, { degree: e.target.value })}
                    placeholder="B.S. in Computer Science"
                  />
                </Field>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-4">
                <Field className="sm:col-span-2">
                  <FieldLabel>Location</FieldLabel>
                  <Input value={row.location} onChange={(e) => setEdu(i, { location: e.target.value })} placeholder="Cambridge, MA" />
                </Field>
                <Field>
                  <FieldLabel>Start</FieldLabel>
                  <Input value={row.startDate} onChange={(e) => setEdu(i, { startDate: e.target.value })} placeholder="Aug 2021" />
                </Field>
                <Field>
                  <FieldLabel>End</FieldLabel>
                  <Input value={row.endDate} onChange={(e) => setEdu(i, { endDate: e.target.value })} placeholder="May 2025" />
                </Field>
              </div>
              <Field className="sm:max-w-40">
                <FieldLabel>GPA</FieldLabel>
                <Input value={row.gpa} onChange={(e) => setEdu(i, { gpa: e.target.value })} placeholder="3.9 / 4.0" />
              </Field>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setEducation((rows) => [...rows, { ...EMPTY_EDU }])}
        >
          <GraduationCapIcon /> Add education
        </Button>
        <SaveRow label="Save education" save={form.saveEducation} />
      </section>
    </div>
  )
}
