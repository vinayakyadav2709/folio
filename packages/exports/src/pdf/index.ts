import type { ReactElement } from 'react'
import type { ResumeSnapshot } from '../types'
import { ClassicResume } from './classic'
import { CompactResume } from './compact'
import { AtsResume } from './ats'
import { LatexResume } from './latex'

export { ClassicResume } from './classic'
export { CompactResume } from './compact'
export { AtsResume } from './ats'
export { LatexResume } from './latex'

export type PdfTheme = (props: { snapshot: ResumeSnapshot }) => ReactElement

const THEMES: Record<string, PdfTheme> = {
  compact: CompactResume,
  ats: AtsResume,
  classic: ClassicResume,
  latex: LatexResume,
}

// Map a theme id to its document component. Defaults to classic.
export function getPdfTheme(themeId: string): PdfTheme {
  return THEMES[themeId] ?? ClassicResume
}
