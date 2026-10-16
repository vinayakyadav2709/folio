import { v7 as uuidv7 } from 'uuid'
import type { Doc, Id } from '@folio/backend/dataModel'

// Types flow from schema (rule 5): a block/header/theme is whatever a snapshot holds.
export type Snapshot = Doc<'snapshots'>
export type Block = Snapshot['blocks'][number]
export type Header = Snapshot['header']
export type Theme = Snapshot['theme']

export const BLANK_TYPES = ['experience', 'education', 'skills', 'custom'] as const

export function newBlock(type: (typeof BLANK_TYPES)[number]): Block {
  return { id: uuidv7(), type, title: '', bullets: [] }
}

export type UpstreamProject = {
  _id: Id<'projects'>
  name: string
  startDate?: string
  endDate?: string
  demoUrl?: string
  githubUrl?: string
}

// The fields a project block mirrors from upstream — used on insert and on Pull.
export function projectFields(project: Omit<UpstreamProject, '_id'>) {
  return {
    title: project.name,
    dateRange: dateRange(project.startDate, project.endDate),
    links: [
      project.demoUrl && { label: 'Demo', url: project.demoUrl },
      project.githubUrl && { label: 'GitHub', url: project.githubUrl },
    ].filter((l): l is { label: string; url: string } => Boolean(l)),
  }
}

export function newProjectBlock(project: UpstreamProject, bullets: string[]): Block {
  return {
    id: uuidv7(),
    type: 'project',
    projectId: project._id,
    ...projectFields(project),
    bullets,
    syncedAt: Date.now(),
  }
}

// ---- Profile → resume inserts (rule: pull from the user's profile pool) ----

type ProfileEducation = {
  school: string
  degree?: string
  location?: string
  startDate?: string
  endDate?: string
  gpa?: string
}
type ProfileExperience = {
  company: string
  role?: string
  location?: string
  startDate?: string
  endDate?: string
  bullets: string[]
}
type ProfileSkill = { category: string; items: string[] }

function dateRange(start?: string, end?: string): string | undefined {
  const range = [start, end].filter(Boolean).join(' – ')
  return range || undefined
}

// One Education block per profile entry: school as title, degree (+ location)
// as subtitle, start–end as the date range, GPA as a bullet.
export function newEducationBlock(entry: ProfileEducation): Block {
  const subtitle = [entry.degree, entry.location].filter(Boolean).join(' · ')
  return {
    id: uuidv7(),
    type: 'education',
    title: entry.school,
    subtitle: subtitle || undefined,
    dateRange: dateRange(entry.startDate, entry.endDate),
    bullets: entry.gpa ? [`GPA: ${entry.gpa}`] : [],
  }
}

// One Experience block per profile entry: company as title, role (+ location)
// as subtitle, start–end as the date range, bullets carried over as-is.
export function newExperienceBlock(entry: ProfileExperience): Block {
  const subtitle = [entry.role, entry.location].filter(Boolean).join(' · ')
  return {
    id: uuidv7(),
    type: 'experience',
    title: entry.company,
    subtitle: subtitle || undefined,
    dateRange: dateRange(entry.startDate, entry.endDate),
    bullets: entry.bullets,
  }
}

// A single Skills block: one "Category: item, item" bullet per category — the
// exports package renders each as a bold category line.
export function newSkillsBlock(skills: ProfileSkill[]): Block {
  return {
    id: uuidv7(),
    type: 'skills',
    title: 'Skills',
    bullets: skills
      .filter((s) => s.category.trim() && s.items.length > 0)
      .map((s) => `${s.category}: ${s.items.join(', ')}`),
  }
}

// Header prefilled from profile identity + the social URLs + the public
// portfolio page (exports repeat the "Portfolio" link under Projects).
export function headerFromProfile(profile: {
  username?: string
  fullName?: string
  headline?: string
  email?: string
  phone?: string
  location?: string
  githubUrl?: string
  linkedinUrl?: string
  websiteUrl?: string
}): Header {
  const links = [
    profile.username && { label: 'Portfolio', url: `${window.location.origin}/u/${profile.username}` },
    profile.githubUrl && { label: 'GitHub', url: profile.githubUrl },
    profile.linkedinUrl && { label: 'LinkedIn', url: profile.linkedinUrl },
    profile.websiteUrl && { label: 'Website', url: profile.websiteUrl },
  ].filter((l): l is { label: string; url: string } => Boolean(l))
  return {
    fullName: profile.fullName ?? '',
    headline: profile.headline || undefined,
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    location: profile.location || undefined,
    links,
  }
}

// A header is "empty" when nothing meaningful has been entered yet — used to
// decide whether prefilling from profile is safe (won't clobber real edits).
export function isHeaderEmpty(header: Header): boolean {
  return (
    !header.fullName.trim() &&
    !header.headline &&
    !header.email &&
    !header.phone &&
    !header.location &&
    header.links.length === 0
  )
}

export function reorder<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
