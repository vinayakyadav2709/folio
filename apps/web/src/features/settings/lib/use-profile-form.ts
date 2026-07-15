import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc } from '@folio/backend/dataModel'
import { errorMessage } from './errors'

// Skills/education are edited as flat local rows; items are a comma-separated
// string in the UI and split on save (the shape the ATS template wants).
export type SkillRow = { category: string; itemsText: string }
export type EducationRow = {
  school: string
  degree: string
  location: string
  startDate: string
  endDate: string
  gpa: string
}

export const EMPTY_EDU: EducationRow = {
  school: '',
  degree: '',
  location: '',
  startDate: '',
  endDate: '',
  gpa: '',
}

type ProfileFields = {
  fullName: string
  headline: string
  email: string
  phone: string
  location: string
  githubUrl: string
  linkedinUrl: string
  websiteUrl: string
  skills: SkillRow[]
  education: EducationRow[]
}

const EMPTY: ProfileFields = {
  fullName: '',
  headline: '',
  email: '',
  phone: '',
  location: '',
  githubUrl: '',
  linkedinUrl: '',
  websiteUrl: '',
  skills: [],
  education: [],
}

const trimmed = (s: string) => s.trim() || undefined

type FieldKey = keyof ProfileFields
const pick = (obj: ProfileFields, keys: FieldKey[]): Partial<ProfileFields> =>
  Object.fromEntries(keys.map((k) => [k, obj[k]])) as Partial<ProfileFields>

// A section the SaveBar drives: dirty flag, a save that also rebaselines its
// own keys (so dirty clears without a full reseed), and a discard to baseline.
export type SaveSection = { dirty: boolean; save: () => Promise<unknown>; discard: () => void }

const serializeSkills = (skills: SkillRow[]) =>
  skills
    .map((s) => ({
      category: s.category.trim(),
      items: s.itemsText
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.category && s.items.length > 0)

const serializeEducation = (education: EducationRow[]) =>
  education
    .map((e) => ({
      school: e.school.trim(),
      degree: trimmed(e.degree),
      location: trimmed(e.location),
      startDate: trimmed(e.startDate),
      endDate: trimmed(e.endDate),
      gpa: trimmed(e.gpa),
    }))
    .filter((e) => e.school)

// One shared field state seeded from the profile, plus per-section save slices.
// updateMyProfile is a partial upsert, so each slice only sends its own keys —
// saving Skills never touches Education, etc.
export function useProfileForm(profile: Doc<'profiles'> | null | undefined) {
  const update = useMutation(api.profiles.updateMyProfile)
  const [fields, setFields] = useState<ProfileFields>(EMPTY)
  const [baseline, setBaseline] = useState<ProfileFields>(EMPTY)

  // Reseed only when identity changes (the profile id), not on every refresh.
  useEffect(() => {
    const seeded: ProfileFields = {
      fullName: profile?.fullName ?? '',
      headline: profile?.headline ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      location: profile?.location ?? '',
      githubUrl: profile?.githubUrl ?? '',
      linkedinUrl: profile?.linkedinUrl ?? '',
      websiteUrl: profile?.websiteUrl ?? '',
      skills: (profile?.skills ?? []).map((s) => ({
        category: s.category,
        itemsText: s.items.join(', '),
      })),
      education: (profile?.education ?? []).map((e) => ({
        school: e.school,
        degree: e.degree ?? '',
        location: e.location ?? '',
        startDate: e.startDate ?? '',
        endDate: e.endDate ?? '',
        gpa: e.gpa ?? '',
      })),
    }
    setFields(seeded)
    setBaseline(seeded)
  }, [profile?._id])

  const set = (patch: Partial<ProfileFields>) => setFields((f) => ({ ...f, ...patch }))

  // A section is dirty when any of its keys drift from the last saved baseline.
  // save() rebaselines those keys so dirty clears (the profile query won't
  // reseed — the _id is unchanged); discard() resets them to baseline.
  const section = (keys: FieldKey[], save: () => Promise<unknown>): SaveSection => ({
    dirty: keys.some((k) => JSON.stringify(fields[k]) !== JSON.stringify(baseline[k])),
    save: async () => {
      await save()
      setBaseline((b) => ({ ...b, ...pick(fields, keys) }))
    },
    discard: () => setFields((f) => ({ ...f, ...pick(baseline, keys) })),
  })

  return {
    fields,
    set,
    setSkills: (fn: (rows: SkillRow[]) => SkillRow[]) => setFields((f) => ({ ...f, skills: fn(f.skills) })),
    setEducation: (fn: (rows: EducationRow[]) => EducationRow[]) =>
      setFields((f) => ({ ...f, education: fn(f.education) })),
    sections: {
      identity: section(['fullName', 'headline'], () =>
        update({ fullName: trimmed(fields.fullName), headline: trimmed(fields.headline) }),
      ),
      contact: section(['email', 'phone', 'location', 'githubUrl', 'linkedinUrl', 'websiteUrl'], () =>
        update({
          email: trimmed(fields.email),
          phone: trimmed(fields.phone),
          location: trimmed(fields.location),
          githubUrl: trimmed(fields.githubUrl),
          linkedinUrl: trimmed(fields.linkedinUrl),
          websiteUrl: trimmed(fields.websiteUrl),
        }),
      ),
      skills: section(['skills'], () => update({ skills: serializeSkills(fields.skills) })),
      education: section(['education'], () => update({ education: serializeEducation(fields.education) })),
    },
  }
}

export type ProfileForm = ReturnType<typeof useProfileForm>

// Shared saving/saved/error flow for a section's save button.
export function useSectionSave() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(fn: () => Promise<unknown>) {
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      await fn()
      setSaved(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return { saving, saved, error, run, clearSaved: () => setSaved(false) }
}
