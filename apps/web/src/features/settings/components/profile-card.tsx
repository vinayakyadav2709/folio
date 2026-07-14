import { useEffect, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import { AtSignIcon, CheckIcon, GraduationCapIcon, PlusIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '../lib/errors'

// Skills/education are edited as flat local rows; items are a comma-separated
// string in the UI and split on save (the shape the ATS template wants).
type SkillRow = { category: string; itemsText: string }
type EducationRow = {
  school: string
  degree: string
  location: string
  startDate: string
  endDate: string
  gpa: string
}

const EMPTY_EDU: EducationRow = {
  school: '',
  degree: '',
  location: '',
  startDate: '',
  endDate: '',
  gpa: '',
}

export function ProfileCard() {
  const profile = useQuery(api.profiles.getMyProfile)

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          Settings · Profile
        </div>
        <h1 className="mt-1 font-heading font-semibold text-2xl tracking-tight">Your profile</h1>
        <p className="mt-1.5 max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">
          The single source of truth your resumes and public page pull from — identity, contact,
          skills, and education, shaped for an ATS-friendly resume.
        </p>
      </header>

      {profile === undefined ? (
        <div className="mt-6 flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <UsernameSection current={profile?.username ?? ''} />
          <ProfileForm profile={profile} />
        </div>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] text-muted-foreground/80 uppercase tracking-[0.2em]">
      {children}
    </h2>
  )
}

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
      <SectionHeading>Username</SectionHeading>
      <Field>
        <FieldLabel className="sr-only">Username</FieldLabel>
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

function ProfileForm({ profile }: { profile: Doc<'profiles'> | null }) {
  const update = useMutation(api.profiles.updateMyProfile)

  const [fullName, setFullName] = useState('')
  const [headline, setHeadline] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [skills, setSkills] = useState<SkillRow[]>([])
  const [education, setEducation] = useState<EducationRow[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed local state once the profile arrives (and whenever a server refresh
  // lands — the key here is the profile id so this only reseeds on identity).
  useEffect(() => {
    setFullName(profile?.fullName ?? '')
    setHeadline(profile?.headline ?? '')
    setEmail(profile?.email ?? '')
    setPhone(profile?.phone ?? '')
    setLocation(profile?.location ?? '')
    setGithubUrl(profile?.githubUrl ?? '')
    setLinkedinUrl(profile?.linkedinUrl ?? '')
    setWebsiteUrl(profile?.websiteUrl ?? '')
    setSkills((profile?.skills ?? []).map((s) => ({ category: s.category, itemsText: s.items.join(', ') })))
    setEducation(
      (profile?.education ?? []).map((e) => ({
        school: e.school,
        degree: e.degree ?? '',
        location: e.location ?? '',
        startDate: e.startDate ?? '',
        endDate: e.endDate ?? '',
        gpa: e.gpa ?? '',
      })),
    )
  }, [profile?._id])

  async function onSave() {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await update({
        fullName: fullName.trim() || undefined,
        headline: headline.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        linkedinUrl: linkedinUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        skills: skills
          .map((s) => ({
            category: s.category.trim(),
            items: s.itemsText
              .split(',')
              .map((i) => i.trim())
              .filter(Boolean),
          }))
          .filter((s) => s.category && s.items.length > 0),
        education: education
          .map((e) => ({
            school: e.school.trim(),
            degree: e.degree.trim() || undefined,
            location: e.location.trim() || undefined,
            startDate: e.startDate.trim() || undefined,
            endDate: e.endDate.trim() || undefined,
            gpa: e.gpa.trim() || undefined,
          }))
          .filter((e) => e.school),
      })
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  function setEdu(i: number, patch: Partial<EducationRow>) {
    setEducation((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Identity */}
      <section className="flex flex-col gap-3">
        <SectionHeading>Identity</SectionHeading>
        <Field>
          <FieldLabel>Full name</FieldLabel>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" />
        </Field>
        <Field>
          <FieldLabel>Headline</FieldLabel>
          <Input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Backend engineer · distributed systems"
          />
        </Field>
      </section>

      <Separator />

      {/* Contact & links */}
      <section className="flex flex-col gap-3">
        <SectionHeading>Contact &amp; links</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>Email</FieldLabel>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
          </Field>
          <Field>
            <FieldLabel>Phone</FieldLabel>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </Field>
        </div>
        <Field>
          <FieldLabel>Location</FieldLabel>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Berlin, DE" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel>GitHub</FieldLabel>
            <Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" />
          </Field>
          <Field>
            <FieldLabel>LinkedIn</FieldLabel>
            <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/…" />
          </Field>
          <Field>
            <FieldLabel>Website</FieldLabel>
            <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://…" />
          </Field>
        </div>
      </section>

      <Separator />

      {/* Skills */}
      <section className="flex flex-col gap-3">
        <SectionHeading>Skills</SectionHeading>
        <p className="text-muted-foreground text-xs leading-relaxed">
          One row per category. List items comma-separated — e.g. category{' '}
          <span className="font-mono">Languages</span>, items{' '}
          <span className="font-mono">TypeScript, Rust, Go</span>.
        </p>
        <div className="flex flex-col gap-2">
          {skills.map((row, i) => (
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
      </section>

      <Separator />

      {/* Education */}
      <section className="flex flex-col gap-3">
        <SectionHeading>Education</SectionHeading>
        <div className="flex flex-col gap-3">
          {education.map((row, i) => (
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
      </section>

      {/* Save bar */}
      <div className="sticky bottom-0 flex items-center gap-3 border-border/60 border-t bg-background/90 py-3 backdrop-blur">
        <Button onClick={onSave} loading={saving}>
          Save profile
        </Button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-emerald-600 text-sm dark:text-emerald-400">
            <CheckIcon className="size-3.5" /> Saved
          </span>
        )}
        {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
      </div>
    </div>
  )
}
