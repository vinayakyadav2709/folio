import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'

export type Profile = FunctionReturnType<typeof api.profiles.getPublicProfile>

// One row of the public page (experience, projects, achievements, education).
export type Entry = {
  key: string
  name: string
  kind: string
  group: 'Work' | 'Projects' | 'Achievements' | 'Education'
  from?: string | null
  to?: string | null
  project?: { teamSlug: string; slug: string }
  detail?: string[]
}

export const ONGOING = /present|current|now/i
const MONTHS = 'janfebmaraprmayjunjulaugsepoctnovdec'
const YEAR = /\b(19|20)\d{2}\b/

// "Jul 2026" / "November 2024" / "2027 (Expected)" -> month index.
// Year-only dates sit mid-year; "Present" is +Infinity; unparseable is null.
export function when(s?: string | null) {
  if (!s) return null
  if (ONGOING.test(s)) return Number.POSITIVE_INFINITY
  const y = s.match(YEAR)
  if (!y) return null
  const m = MONTHS.indexOf(s.slice(0, 3).toLowerCase())
  return Number(y[0]) * 12 + (m >= 0 && m % 3 === 0 ? m / 3 : 6)
}

const year = (s: string) => (ONGOING.test(s) ? '····' : (s.match(YEAR)?.[0] ?? s))
export const span = ({ from, to }: Pick<Entry, 'from' | 'to'>) =>
  from && to ? `${year(from)} → ${year(to)}` : from || to ? year((from ?? to) as string) : ''

// "Apex Detector - Deepfake Detection System" -> "Apex Detector"
const short = (s: string) => s.split(/ [-–(]|, /)[0]

export const startOf = (r: Entry) => when(r.from) ?? when(r.to)

// Newest first; undated rows last. The view groups rows by `group`.
export function timeline(d: Profile): Entry[] {
  const rows: Entry[] = [
    ...d.experience.map((x, i) => ({
      key: `x${i}`,
      name: short(x.company),
      kind: x.role ? short(x.role) : '',
      group: 'Work' as const,
      from: x.startDate,
      to: x.endDate,
      detail: x.bullets,
    })),
    ...d.projects.map((p) => ({
      key: `p-${p.teamSlug}-${p.slug}`,
      name: short(p.name),
      kind: p.subtitle?.split(',')[0] ?? '', // first tech as a hint
      group: 'Projects' as const,
      from: p.startDate,
      to: p.endDate,
      project: { teamSlug: p.teamSlug, slug: p.slug },
    })),
    ...d.achievements.map((a, i) => {
      // "National Winner, Smart India Hackathon 2024" -> name + rank as kind
      const [rank, event] = a.title.includes(', ') ? a.title.split(/, (.*)/) : ['', a.title]
      return {
        key: `a${i}`,
        name: event,
        kind: rank,
        group: 'Achievements' as const,
        to: a.date,
        detail: [[a.title, a.description].filter(Boolean).join(' — ')],
      }
    }),
    ...d.education.map((e, i) => ({
      key: `e${i}`,
      name: short(e.school),
      kind: e.degree ? e.degree.split(' in ')[0] : '',
      group: 'Education' as const,
      from: e.startDate,
      to: e.endDate,
      detail: e.degree ? [[e.degree, e.location].filter(Boolean).join(' · ')] : undefined,
    })),
  ]
  const key = (r: Entry) => startOf(r) ?? Number.NEGATIVE_INFINITY
  return rows.sort((a, b) => key(b) - key(a) || (when(b.to) ?? 0) - (when(a.to) ?? 0))
}
