import { expect, test } from 'bun:test'
import { renderToBuffer } from '@react-pdf/renderer'
import { escapeLatex, snapshotToLatex } from './latex'
import { AtsResume, ClassicResume, CompactResume } from './pdf'
import type { ResumeSnapshot } from './types'

test('escapeLatex escapes all special chars', () => {
  expect(escapeLatex('C++ & 50% $aving_s')).toBe('C++ \\& 50\\% \\$aving\\_s')
  expect(escapeLatex('# {a} ~ ^ end')).toBe(
    '\\# \\{a\\} \\textasciitilde{} \\textasciicircum{} end',
  )
  // backslash first: no double-escaping of the sequences it introduces
  expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b')
})

// Fixture exercising all 5 block types.
const snapshot: ResumeSnapshot = {
  header: {
    fullName: 'Ada & Lovelace',
    headline: '100% engineer',
    email: 'ada@x.io',
    phone: '555-0100',
    location: 'London',
    links: [{ label: 'GitHub', url: 'https://github.com/ada?tab=repos' }],
  },
  theme: { id: 'ats' },
  blocks: [
    {
      id: 'ed1',
      type: 'education',
      title: 'University of #London',
      subtitle: 'BSc Mathematics',
      dateRange: '1830–1834',
      bullets: [],
    },
    {
      id: 'e1',
      type: 'experience',
      title: 'Analytical Engine Co',
      subtitle: 'Lead Programmer',
      dateRange: '1842–1843',
      bullets: ['Wrote C++ & saved 50% $ on compute_time'],
    },
    {
      id: 'p1',
      type: 'project',
      title: 'Note G',
      dateRange: '1843',
      bullets: ['First algorithm'],
      links: [{ label: 'demo', url: 'https://x.io/#run' }],
    },
    {
      id: 's1',
      type: 'skills',
      bullets: ['Languages: Assembly, Mathematics', 'Tools: Punch cards & levers'],
    },
    {
      id: 'c1',
      type: 'custom',
      title: 'Awards',
      bullets: ['First programmer in history'],
    },
    { id: 'e2', type: 'experience', title: 'Second job', bullets: ['More work'] },
  ],
}

test('snapshotToLatex emits a compilable Jake-style document', () => {
  const tex = snapshotToLatex(snapshot)

  // Preamble + document shell (compile-shaped)
  expect(tex).toContain('\\documentclass[letterpaper,11pt]{article}')
  expect(tex).toContain('\\pdfgentounicode=1')
  expect(tex).toContain('\\newcommand{\\resumeSubheading}')
  expect(tex).toContain('\\newcommand{\\resumeProjectHeading}')
  expect(tex.indexOf('\\begin{document}')).toBeGreaterThan(-1)
  expect(tex.indexOf('\\end{document}')).toBeGreaterThan(tex.indexOf('\\begin{document}'))

  // All five sections, in first-appearance order
  for (const h of ['Education', 'Experience', 'Projects', 'Technical Skills', 'Awards']) {
    expect(tex).toContain(`\\section{${h}}`)
  }
  expect(tex.indexOf('\\section{Education}')).toBeLessThan(tex.indexOf('\\section{Experience}'))
  expect(tex.indexOf('\\section{Experience}')).toBeLessThan(tex.indexOf('\\section{Projects}'))

  // Jake commands actually used in the body
  expect(tex).toContain('\\resumeSubHeadingListStart')
  expect(tex).toContain('\\resumeSubheading{Analytical Engine Co}')
  expect(tex).toContain('\\resumeItem{First algorithm}')

  // Escaping in header, bullets, and subheading titles
  expect(tex).toContain('\\Huge \\scshape Ada \\& Lovelace')
  expect(tex).toContain('100\\% engineer')
  expect(tex).toContain('Wrote C++ \\& saved 50\\% \\$ on compute\\_time')
  expect(tex).toContain('\\resumeSubheading{University of \\#London}')
  expect(tex).not.toContain('Ada & Lovelace')
  expect(tex).not.toContain('compute_time')

  // Project heading links to its first link; header + contact links use \href
  expect(tex).toContain('\\href{https://x.io/\\#run}{Note G}')
  expect(tex).toContain('\\href{https://github.com/ada?tab=repos}{GitHub}')
  expect(tex).toContain('\\href{mailto:ada@x.io}{ada@x.io}')

  // Technical Skills: "Category: items" -> \textbf{Category}: items
  expect(tex).toContain('\\textbf{Languages}{: Assembly, Mathematics}')

  // Both experience blocks land under the single Experience section
  expect(tex).toContain('Second job')
})

test('empty sections are skipped', () => {
  const tex = snapshotToLatex({
    header: { fullName: 'Nobody', links: [] },
    theme: { id: 'ats' },
    blocks: [{ id: 'x', type: 'project', bullets: [] }],
  })
  expect(tex).not.toContain('\\section{Projects}')
})

test('PDF theme components render to a PDF without throwing', async () => {
  for (const Theme of [AtsResume, ClassicResume, CompactResume]) {
    const buf = await renderToBuffer(<Theme snapshot={snapshot} />)
    expect(buf.length).toBeGreaterThan(0)
  }
})
