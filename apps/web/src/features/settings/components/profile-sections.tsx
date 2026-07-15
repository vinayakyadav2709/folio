import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import { AtSignIcon, CheckIcon, GraduationCapIcon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '../lib/errors'
import { EMPTY_EDU, type ProfileForm } from '../lib/use-profile-form'
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
            <p className="rounded-2xl border border-border/60 border-dashed px-3 py-6 text-center text-muted-foreground text-xs">
              No education entries yet.
            </p>
          )}
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
      </PanelSection>
      <SaveBar section={form.sections.education} />
    </Panel>
  )
}
