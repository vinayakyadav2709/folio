import type { ResumeSnapshot } from '../types'
import { ResumeDocument, ATS } from './document'

// ATS: Jake's-Resume-style single-column serif layout, matching the LaTeX export.
export function AtsResume({ snapshot }: { snapshot: ResumeSnapshot }) {
  return <ResumeDocument snapshot={snapshot} variant={ATS} />
}
