import type { ReactElement } from 'react'
import type { ResumeSnapshot } from '../types'
import { ClassicResume } from './classic'
import { CompactResume } from './compact'

export { ClassicResume } from './classic'
export { CompactResume } from './compact'

export type PdfTheme = (props: { snapshot: ResumeSnapshot }) => ReactElement

// Map a theme id to its document component. Defaults to classic.
export function getPdfTheme(themeId: string): PdfTheme {
  return themeId === 'compact' ? CompactResume : ClassicResume
}
