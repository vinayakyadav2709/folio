// Local types mirroring packages/backend/convex/schema.ts (vBlock, vTheme,
// snapshot.header). Kept local so this package stays pure — no convex import.

export type ResumeLink = { label: string; url: string }

export type ResumeBlock = {
  id: string
  type: 'project' | 'experience' | 'education' | 'skills' | 'custom'
  title?: string
  subtitle?: string
  dateRange?: string
  bullets: string[]
  links?: ResumeLink[]
}

export type ResumeTheme = {
  id: string
  accentColor?: string
  fontScale?: number
}

export type ResumeHeader = {
  fullName: string
  headline?: string
  email?: string
  phone?: string
  location?: string
  links: ResumeLink[]
}

export type ResumeSnapshot = {
  blocks: ResumeBlock[]
  theme: ResumeTheme
  header: ResumeHeader
}
