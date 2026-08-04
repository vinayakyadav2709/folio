import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import { AtSignIcon, CheckIcon, GraduationCapIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { Input } from '@/components/ui/input'
import { errorMessage } from '../lib/errors'
import { EMPTY_EDU, type MediaMap, type ProfileForm } from '../lib/use-profile-form'
import { AddEntry, EntryCard, EntryFooter, EntryList, MicroField, PoolEmpty } from './entry-card'
import { EntryMedia } from './entry-media'
import { Panel, PanelField, PanelSection, SaveBar } from './settings-panel'

// The set-once settings sections. The churny profile pool (experience, skills,
// achievements) lives in ./profile-pool as its own dashboard pages.

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

export function EducationSection({ form, media }: { form: ProfileForm; media: MediaMap }) {
  const { fields, setEducation } = form
  const rows = fields.education
  const setEdu = (i: number, patch: Partial<(typeof rows)[number]>) =>
    setEducation((all) => all.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const addRow = () => setEducation((all) => [...all, { ...EMPTY_EDU }])

  return (
    <Panel>
      <PanelSection title="Education" hint="Schools, degrees, and dates for your resume header.">
        {rows.length === 0 ? (
          <PoolEmpty
            icon={GraduationCapIcon}
            title="No education yet."
            description="Schools and degrees sit in your resume header. Attach a diploma or transcript if you want it to travel with the entry."
            action="Add education"
            onAction={addRow}
          />
        ) : (
          <EntryList>
            {rows.map((row, i) => (
              <EntryCard
                key={i}
                index={i}
                removeLabel="Remove education entry"
                onRemove={() => setEducation((all) => all.filter((_, idx) => idx !== i))}
                rail={
                  <>
                    <div className="@3xl:grid-cols-1 grid grid-cols-2 gap-2.5">
                      <MicroField label="Start">
                        <Input
                          value={row.startDate}
                          onChange={(e) => setEdu(i, { startDate: e.target.value })}
                          placeholder="Aug 2021"
                          className="font-mono tabular-nums"
                        />
                      </MicroField>
                      <MicroField label="End">
                        <Input
                          value={row.endDate}
                          onChange={(e) => setEdu(i, { endDate: e.target.value })}
                          placeholder="May 2025"
                          className="font-mono tabular-nums"
                        />
                      </MicroField>
                    </div>
                    <MicroField label="GPA">
                      <Input
                        value={row.gpa}
                        onChange={(e) => setEdu(i, { gpa: e.target.value })}
                        placeholder="3.9 / 4.0"
                        className="font-mono tabular-nums"
                      />
                    </MicroField>
                  </>
                }
              >
                <div className="@xl:grid-cols-2 grid gap-3 pr-8">
                  <MicroField label="School">
                    <Input
                      value={row.school}
                      onChange={(e) => setEdu(i, { school: e.target.value })}
                      placeholder="MIT"
                    />
                  </MicroField>
                  <MicroField label="Degree">
                    <Input
                      value={row.degree}
                      onChange={(e) => setEdu(i, { degree: e.target.value })}
                      placeholder="B.S. in Computer Science"
                    />
                  </MicroField>
                </div>
                <MicroField label="Location">
                  <Input
                    value={row.location}
                    onChange={(e) => setEdu(i, { location: e.target.value })}
                    placeholder="Cambridge, MA"
                  />
                </MicroField>
                <EntryFooter
                  label="Media"
                  hint="Diplomas, transcripts or certificates — images or PDF, up to 5 MB each."
                >
                  <EntryMedia
                    ids={row.mediaIds}
                    media={media}
                    onChange={(mediaIds) => setEdu(i, { mediaIds })}
                  />
                </EntryFooter>
              </EntryCard>
            ))}
            <AddEntry label="Add education" onClick={addRow} />
          </EntryList>
        )}
      </PanelSection>
      <SaveBar section={form.sections.education} />
    </Panel>
  )
}
