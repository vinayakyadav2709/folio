import { useEffect, useMemo, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Doc, Id } from '@folio/backend/dataModel'
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

// Bullets are one-per-line in a textarea, split on save.
export type ExperienceRow = {
  company: string
  role: string
  location: string
  startDate: string
  endDate: string
  bulletsText: string
}

export const EMPTY_EDU: EducationRow = {
  school: '',
  degree: '',
  location: '',
  startDate: '',
  endDate: '',
  gpa: '',
}

// Awards, certifications, publications. `mediaIds` are certificates/photos
// already uploaded to storage; the row only carries ids, the resolved
// urls/sizes come from the profile query's `media` map.
export type AchievementRow = {
  title: string
  description: string
  date: string
  mediaIds: Id<'_storage'>[]
}

export const EMPTY_ACH: AchievementRow = { title: '', description: '', date: '', mediaIds: [] }

// Resolved achievement media from `api.profiles.getMyProfile`, keyed by storage id.
export type MediaMap = Record<string, { url: string; contentType?: string; size: number }>

export const EMPTY_EXP: ExperienceRow = {
  company: '',
  role: '',
  location: '',
  startDate: '',
  endDate: '',
  bulletsText: '',
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
  experience: ExperienceRow[]
  achievements: AchievementRow[]
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
  experience: [],
  achievements: [],
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

const serializeExperience = (experience: ExperienceRow[]) =>
  experience
    .map((x) => ({
      company: x.company.trim(),
      role: trimmed(x.role),
      location: trimmed(x.location),
      startDate: trimmed(x.startDate),
      endDate: trimmed(x.endDate),
      bullets: x.bulletsText
        .split('\n')
        .map((b) => b.trim())
        .filter(Boolean),
    }))
    .filter((x) => x.company)

const serializeAchievements = (achievements: AchievementRow[]) =>
  achievements
    .map((a) => ({
      title: a.title.trim(),
      description: trimmed(a.description),
      date: trimmed(a.date),
      mediaIds: a.mediaIds,
    }))
    .filter((a) => a.title)

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// The shape the form edits, derived from the server row. Pure, so it can be
// recomputed on every profile change and diffed against the baseline.
const toFields = (profile: Doc<'profiles'> | null | undefined): ProfileFields => ({
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
  experience: (profile?.experience ?? []).map((x) => ({
    company: x.company,
    role: x.role ?? '',
    location: x.location ?? '',
    startDate: x.startDate ?? '',
    endDate: x.endDate ?? '',
    bulletsText: x.bullets.join('\n'),
  })),
  achievements: (profile?.achievements ?? []).map((a) => ({
    title: a.title,
    description: a.description ?? '',
    date: a.date ?? '',
    mediaIds: a.mediaIds ?? [],
  })),
})

// Which keys move together — the unit of dirty, save, discard and reseed.
const SECTION_KEYS = {
  identity: ['fullName', 'headline'],
  contact: ['email', 'phone', 'location', 'githubUrl', 'linkedinUrl', 'websiteUrl'],
  skills: ['skills'],
  education: ['education'],
  experience: ['experience'],
  achievements: ['achievements'],
} satisfies Record<string, FieldKey[]>

type State = { fields: ProfileFields; baseline: ProfileFields }

// Pick up writes made to the same profile row elsewhere (the resume Import
// tab) without stomping edits in progress: a section reseeds only when it is
// clean (fields == baseline) and the server actually moved away from the
// baseline. Dirty sections keep the user's text until they save or discard.
// Returns the same object when nothing moved, so the effect can't loop.
const reseed = (s: State, seeded: ProfileFields): State => {
  const keys = Object.values(SECTION_KEYS)
    .filter(
      (ks) =>
        ks.every((k) => same(s.fields[k], s.baseline[k])) &&
        ks.some((k) => !same(seeded[k], s.baseline[k])),
    )
    .flat()
  if (keys.length === 0) return s
  const next = pick(seeded, keys)
  return { fields: { ...s.fields, ...next }, baseline: { ...s.baseline, ...next } }
}

// One shared field state seeded from the profile, plus per-section save slices.
// updateMyProfile is a partial upsert, so each slice only sends its own keys —
// saving Skills never touches Education, etc.
export function useProfileForm(profile: Doc<'profiles'> | null | undefined) {
  const update = useMutation(api.profiles.updateMyProfile)
  // fields + baseline live in one state so a reseed moves both atomically.
  const [{ fields, baseline }, setState] = useState<State>({ fields: EMPTY, baseline: EMPTY })

  const seeded = useMemo(() => toFields(profile), [profile])
  useEffect(() => setState((s) => reseed(s, seeded)), [seeded])

  const setFields = (fn: (f: ProfileFields) => ProfileFields) =>
    setState((s) => ({ ...s, fields: fn(s.fields) }))

  const set = (patch: Partial<ProfileFields>) => setFields((f) => ({ ...f, ...patch }))

  // A section is dirty when any of its keys drift from the last saved baseline.
  // save() rebaselines those keys so dirty clears; the echo of its own write
  // then lands on a clean section and only normalises it (trimmed strings,
  // dropped blank rows). discard() resets them to baseline.
  const section = (keys: FieldKey[], save: () => Promise<unknown>): SaveSection => ({
    dirty: keys.some((k) => !same(fields[k], baseline[k])),
    save: async () => {
      await save()
      setState((s) => ({ ...s, baseline: { ...s.baseline, ...pick(fields, keys) } }))
    },
    // Discard reverts to server truth, not to the stale baseline — otherwise a
    // section that skipped a reseed while dirty would stay stale after discard.
    discard: () =>
      setState((s) => ({
        fields: { ...s.fields, ...pick(seeded, keys) },
        baseline: { ...s.baseline, ...pick(seeded, keys) },
      })),
  })

  return {
    fields,
    set,
    setSkills: (fn: (rows: SkillRow[]) => SkillRow[]) => setFields((f) => ({ ...f, skills: fn(f.skills) })),
    setEducation: (fn: (rows: EducationRow[]) => EducationRow[]) =>
      setFields((f) => ({ ...f, education: fn(f.education) })),
    setExperience: (fn: (rows: ExperienceRow[]) => ExperienceRow[]) =>
      setFields((f) => ({ ...f, experience: fn(f.experience) })),
    setAchievements: (fn: (rows: AchievementRow[]) => AchievementRow[]) =>
      setFields((f) => ({ ...f, achievements: fn(f.achievements) })),
    sections: {
      identity: section(SECTION_KEYS.identity, () =>
        update({ fullName: trimmed(fields.fullName), headline: trimmed(fields.headline) }),
      ),
      contact: section(SECTION_KEYS.contact, () =>
        update({
          email: trimmed(fields.email),
          phone: trimmed(fields.phone),
          location: trimmed(fields.location),
          githubUrl: trimmed(fields.githubUrl),
          linkedinUrl: trimmed(fields.linkedinUrl),
          websiteUrl: trimmed(fields.websiteUrl),
        }),
      ),
      skills: section(SECTION_KEYS.skills, () => update({ skills: serializeSkills(fields.skills) })),
      education: section(SECTION_KEYS.education, () =>
        update({ education: serializeEducation(fields.education) }),
      ),
      experience: section(SECTION_KEYS.experience, () =>
        update({ experience: serializeExperience(fields.experience) }),
      ),
      achievements: section(SECTION_KEYS.achievements, () =>
        update({ achievements: serializeAchievements(fields.achievements) }),
      ),
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
