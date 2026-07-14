import type { ResumeSnapshot, ResumeLink } from '../types'
import { groupSections } from '../sections'

const LATEX_ESCAPES: Record<string, string> = {
  '\\': '\\textbackslash{}',
  '&': '\\&',
  '%': '\\%',
  $: '\\$',
  '#': '\\#',
  _: '\\_',
  '{': '\\{',
  '}': '\\}',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}',
}

// Escape LaTeX special characters in user content. Single pass so replacement
// text (e.g. the braces in \textbackslash{}) is never re-escaped. Use this for
// ALL user-provided strings.
export function escapeLatex(input: string): string {
  return input.replace(/[\\&%$#_{}~^]/g, (c) => LATEX_ESCAPES[c] ?? c)
}

// A hyperlink; url is escaped too since # and % are legal in URLs.
function link(l: ResumeLink): string {
  return `\\href{${escapeLatex(l.url)}}{${escapeLatex(l.label)}}`
}

const PREAMBLE = `\\documentclass[letterpaper,11pt]{article}
\\usepackage[empty]{fullpage}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[T1]{fontenc}
\\usepackage{textcomp}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\titleformat{\\section}{\\large\\bfseries}{}{0pt}{}[\\titlerule]
\\titlespacing{\\section}{0pt}{12pt}{6pt}
\\setlist[itemize]{leftmargin=1.5em,itemsep=1pt,topsep=2pt}
`

// Jake's-resume-style single-file .tex. Standard article class + standard
// packages only, no external template. Blocks grouped into sections in the same
// order as the PDF renderer.
export function snapshotToLatex(snapshot: ResumeSnapshot): string {
  const { header, blocks } = snapshot
  const out: string[] = [PREAMBLE, '\\begin{document}', '']

  // Header
  out.push('\\begin{center}')
  out.push(`  {\\Huge \\bfseries ${escapeLatex(header.fullName)}} \\\\[4pt]`)
  if (header.headline) out.push(`  ${escapeLatex(header.headline)} \\\\[2pt]`)
  const contact = [header.location, header.email, header.phone]
    .filter((x): x is string => Boolean(x))
    .map(escapeLatex)
  const links = header.links.map(link)
  const line = [...contact, ...links].join(' $|$ ')
  if (line) out.push(`  ${line}`)
  out.push('\\end{center}', '')

  // Sections
  for (const section of groupSections(blocks)) {
    out.push(`\\section{${escapeLatex(section.heading)}}`)
    for (const block of section.blocks) {
      const titleBits: string[] = []
      if (block.title) titleBits.push(`\\textbf{${escapeLatex(block.title)}}`)
      if (block.dateRange) titleBits.push(`\\hfill ${escapeLatex(block.dateRange)}`)
      if (titleBits.length) out.push(`${titleBits.join(' ')} \\\\`)
      if (block.subtitle) out.push(`\\textit{${escapeLatex(block.subtitle)}} \\\\`)
      if (block.bullets.length) {
        out.push('\\begin{itemize}')
        for (const b of block.bullets) out.push(`  \\item ${escapeLatex(b)}`)
        out.push('\\end{itemize}')
      }
      if (block.links && block.links.length) {
        out.push(block.links.map(link).join(' $|$ ') + ' \\\\')
      }
      out.push('')
    }
  }

  out.push('\\end{document}', '')
  return out.join('\n')
}
