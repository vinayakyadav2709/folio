import type { ResumeSnapshot, ResumeLink, ResumeBlock } from '../types'
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

// Jake Gutierrez's "Jake's Resume" preamble (jakegut/resume, MIT): article
// class, custom \resume* commands, machine-readable PDF via \pdfgentounicode=1.
// No icons/graphics/columns — pure single-column ATS-friendly text.
const PREAMBLE = `\\documentclass[letterpaper,11pt]{article}

\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[T1]{fontenc}
\\usepackage{textcomp}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{tabularx}
\\input{glyphtounicode}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting: small-caps heading + horizontal rule
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\titlerule \\vspace{-5pt}]

% Ensure the generated PDF is machine-readable / ATS-parsable
\\pdfgentounicode=1

% Custom resume commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`

// Bullets: \resumeItem rows wrapped in an item list. No-op if empty.
function itemList(bullets: string[]): string[] {
  if (bullets.length === 0) return []
  return [
    '    \\resumeItemListStart',
    ...bullets.map((b) => `      \\resumeItem{${escapeLatex(b)}}`),
    '    \\resumeItemListEnd',
  ]
}

// Experience / Education / custom: title + date on line 1, subtitle + location
// on line 2. We carry no per-block location, so the 4th arg stays empty.
function subheadingBlock(block: ResumeBlock): string[] {
  return [
    `    \\resumeSubheading{${escapeLatex(block.title ?? '')}}{${escapeLatex(
      block.dateRange ?? '',
    )}}{${escapeLatex(block.subtitle ?? '')}}{}`,
    ...itemList(block.bullets),
  ]
}

// Projects: title (optionally an \href to the first link) + date on the heading.
function projectBlock(block: ResumeBlock): string[] {
  const first = block.links?.[0]
  const name = first
    ? `\\href{${escapeLatex(first.url)}}{${escapeLatex(block.title ?? '')}}`
    : escapeLatex(block.title ?? '')
  const rest = (block.links ?? []).slice(1).map(link)
  const heading = [`\\textbf{${name}}`, ...rest].join(' $|$ ')
  return [
    `    \\resumeProjectHeading{${heading}}{${escapeLatex(block.dateRange ?? '')}}`,
    ...itemList(block.bullets),
  ]
}

// Technical Skills: each bullet is a "Category: items" line -> \textbf{Category}: items
function skillsSection(heading: string, blocks: ResumeBlock[]): string[] {
  const lines = blocks
    .flatMap((b) => b.bullets)
    .map((bullet) => {
      const i = bullet.indexOf(':')
      if (i === -1) return escapeLatex(bullet)
      const cat = escapeLatex(bullet.slice(0, i))
      const items = escapeLatex(bullet.slice(i + 1).trim())
      return `     \\textbf{${cat}}{: ${items}}`
    })
  if (lines.length === 0) return []
  return [
    `\\section{${escapeLatex(heading)}}`,
    ' \\begin{itemize}[leftmargin=0.15in, label={}]',
    '    \\small{\\item{',
    lines.join(' \\\\\n'),
    '    }}',
    ' \\end{itemize}',
    '',
  ]
}

// Jake's-Resume-style single-file .tex. Standard article class + standard
// packages only, no external template. Blocks grouped into sections in the same
// order as the PDF renderer.
export function snapshotToLatex(snapshot: ResumeSnapshot): string {
  const { header, blocks } = snapshot
  const out: string[] = [PREAMBLE, '\\begin{document}', '']

  // Header: centered name, optional headline, contact line joined by " | ".
  out.push('\\begin{center}')
  out.push(`    \\textbf{\\Huge \\scshape ${escapeLatex(header.fullName)}} \\\\ \\vspace{1pt}`)
  if (header.headline) out.push(`    \\small ${escapeLatex(header.headline)} \\\\ \\vspace{1pt}`)
  const contact: string[] = []
  if (header.phone) contact.push(escapeLatex(header.phone))
  if (header.email) contact.push(`\\href{mailto:${escapeLatex(header.email)}}{${escapeLatex(header.email)}}`)
  if (header.location) contact.push(escapeLatex(header.location))
  contact.push(...header.links.map(link))
  if (contact.length) out.push(`    \\small ${contact.join(' $|$ ')}`)
  out.push('\\end{center}', '')

  // Sections
  for (const section of groupSections(blocks)) {
    if (section.type === 'skills') {
      out.push(...skillsSection(section.heading, section.blocks))
      continue
    }
    out.push(`\\section{${escapeLatex(section.heading)}}`)
    out.push('  \\resumeSubHeadingListStart')
    for (const block of section.blocks) {
      out.push(...(section.type === 'project' ? projectBlock(block) : subheadingBlock(block)))
    }
    out.push('  \\resumeSubHeadingListEnd', '')
  }

  out.push('\\end{document}', '')
  return out.join('\n')
}
