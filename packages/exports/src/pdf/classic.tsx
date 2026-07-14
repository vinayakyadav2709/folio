import type { ResumeSnapshot } from '../types'
import { ResumeDocument, CLASSIC } from './document'

// Classic: comfortable spacing, larger type.
export function ClassicResume({ snapshot }: { snapshot: ResumeSnapshot }) {
  return <ResumeDocument snapshot={snapshot} variant={CLASSIC} />
}
