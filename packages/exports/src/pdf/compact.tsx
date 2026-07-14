import type { ResumeSnapshot } from '../types'
import { ResumeDocument, COMPACT } from './document'

// Compact: tighter spacing, smaller type for 1-page density.
export function CompactResume({ snapshot }: { snapshot: ResumeSnapshot }) {
  return <ResumeDocument snapshot={snapshot} variant={COMPACT} />
}
