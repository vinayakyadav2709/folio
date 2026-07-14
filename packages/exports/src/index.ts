// Pure export functions: snapshot -> PDF component / .tex string.
export * from './types'
export { getPdfTheme, ClassicResume, CompactResume, AtsResume } from './pdf'
export type { PdfTheme } from './pdf'
export { snapshotToLatex, escapeLatex } from './latex'
// Re-exported so the web app (isolated installs — no direct dep on the
// renderer) can build PDFs client-side with the same renderer instance.
export { pdf } from '@react-pdf/renderer'
export { groupSections } from './sections'
export type { Section } from './sections'
