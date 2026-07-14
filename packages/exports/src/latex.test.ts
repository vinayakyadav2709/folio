import { expect, test } from 'bun:test'
import { escapeLatex, snapshotToLatex } from './latex'
import type { ResumeSnapshot } from './types'

test('escapeLatex escapes all special chars', () => {
  expect(escapeLatex('C++ & 50% $aving_s')).toBe('C++ \\& 50\\% \\$aving\\_s')
  expect(escapeLatex('# {a} ~ ^ end')).toBe(
    '\\# \\{a\\} \\textasciitilde{} \\textasciicircum{} end',
  )
  // backslash first: no double-escaping of the sequences it introduces
  expect(escapeLatex('a\\b')).toBe('a\\textbackslash{}b')
})

const snapshot: ResumeSnapshot = {
  header: {
    fullName: 'Ada & Lovelace',
    headline: '100% engineer',
    email: 'ada@x.io',
    links: [{ label: 'GitHub', url: 'https://github.com/ada?tab=repos' }],
  },
  theme: { id: 'classic' },
  blocks: [
    {
      id: 'e1',
      type: 'experience',
      title: 'Analytical Engine Co',
      dateRange: '1842–1843',
      bullets: ['Wrote C++ & saved 50% $ on compute_time'],
    },
    {
      id: 'p1',
      type: 'project',
      title: 'Note G',
      bullets: ['First algorithm'],
      links: [{ label: 'demo', url: 'https://x.io/#run' }],
    },
    { id: 'e2', type: 'experience', title: 'Second job', bullets: ['More work'] },
  ],
}

test('snapshotToLatex escapes user content and emits key strings', () => {
  const tex = snapshotToLatex(snapshot)

  // structure
  expect(tex).toContain('\\documentclass[letterpaper,11pt]{article}')
  expect(tex).toContain('\\begin{document}')
  expect(tex).toContain('\\end{document}')

  // standard ATS section headers, grouped by type in first-appearance order
  expect(tex).toContain('\\section{EXPERIENCE}')
  expect(tex).toContain('\\section{PROJECTS}')
  expect(tex.indexOf('\\section{EXPERIENCE}')).toBeLessThan(tex.indexOf('\\section{PROJECTS}'))

  // escaping in header, bullets, and everywhere
  expect(tex).toContain('Ada \\& Lovelace')
  expect(tex).toContain('100\\% engineer')
  expect(tex).toContain('Wrote C++ \\& saved 50\\% \\$ on compute\\_time')

  // no unescaped special char leaks in user content
  expect(tex).not.toContain('Ada & Lovelace')
  expect(tex).not.toContain('compute_time')

  // hyperlinks with escaped urls
  expect(tex).toContain('\\href{https://github.com/ada?tab=repos}{GitHub}')
  expect(tex).toContain('\\href{https://x.io/\\#run}{demo}')

  // both experience blocks land under the single EXPERIENCE section
  expect(tex).toContain('Second job')
})
