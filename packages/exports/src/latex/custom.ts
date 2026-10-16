import type { ResumeSnapshot, ResumeLink, ResumeBlock } from '../types'
import { groupSections } from '../sections'
import { escapeLatex } from './index'
import { moreProjects, portfolioLink } from '../latex-look'

// User text -> LaTeX. '₹' has no glyph in pdflatex's default fonts and aborts
// the compile, so it becomes "Rs. ".
const esc = (s = '') => escapeLatex(s).replace(/₹\s*/g, 'Rs. ')
// "Jan 2024 – Mar 2025" -> "Jan 2024 -- Mar 2025"
const dates = (s = '') => esc(s).replace(/\s*–\s*/g, ' -- ')
// "https://www.github.com/x/" -> "github.com/x/"
const display = (url: string) => url.replace(/^https?:\/\//, '').replace(/^www\./, '')
const isGithub = (l: ResumeLink) => l.label === 'GitHub' || l.url.includes('github.com')
const href = (url: string, body: string) => `\\href{${escapeLatex(url)}}{${body}}`

// Preamble copied from the user's own template. The spacing \newlength values
// are deliberate — do not change them. Their two project heading commands are
// folded into one: #3 = link icons, #4 = tech line (omitted when empty).
const PREAMBLE = `\\documentclass[a4paper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\usepackage{lmodern}
\\usepackage{microtype}
\\setlength{\\multicolsep}{6.0pt}
\\setlength{\\columnsep}{15pt}
\\input{glyphtounicode}
\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.2in}
\\addtolength{\\topmargin}{-.75in}
\\addtolength{\\textheight}{1.4in}
\\urlstyle{same}
\\raggedright
\\setlength{\\tabcolsep}{0in}
\\newlength{\\headernamevspace}\\setlength{\\headernamevspace}{4pt}
\\newlength{\\headercontactvspace}\\setlength{\\headercontactvspace}{0pt}
\\newlength{\\headerbottomvspace}\\setlength{\\headerbottomvspace}{6pt}
\\newlength{\\sectiontitlevspace}\\setlength{\\sectiontitlevspace}{-7pt}
\\newlength{\\sectionrulevspace}\\setlength{\\sectionrulevspace}{-6pt}
\\newlength{\\subheadingtopvspace}\\setlength{\\subheadingtopvspace}{-2pt}
\\newlength{\\subheadingbottomvspace}\\setlength{\\subheadingbottomvspace}{-0pt}
\\newlength{\\projectheadingvspaceaftertitle}\\setlength{\\projectheadingvspaceaftertitle}{-10pt}
\\newlength{\\projectheadingvspaceaftertech}\\setlength{\\projectheadingvspaceaftertech}{-0pt}
\\newlength{\\listitembottomvspace}\\setlength{\\listitembottomvspace}{-0pt}
\\newlength{\\outerlisttopsep}\\setlength{\\outerlisttopsep}{0pt}
\\newlength{\\outerlistpartopsep}\\setlength{\\outerlistpartopsep}{0pt}
\\newlength{\\outerlistparsep}\\setlength{\\outerlistparsep}{0pt}
\\newlength{\\innerlistleftmargin}\\setlength{\\innerlistleftmargin}{0.18in}
\\newlength{\\innerlisttopsep}\\setlength{\\innerlisttopsep}{2pt}
\\newlength{\\innerlistitemsep}\\setlength{\\innerlistitemsep}{-2pt}
\\newlength{\\innerlistparsep}\\setlength{\\innerlistparsep}{0pt}
\\newlength{\\afterinnerlistvspace}\\setlength{\\afterinnerlistvspace}{-5pt}
\\newlength{\\multicolitemsep}\\setlength{\\multicolitemsep}{1pt}
\\newlength{\\multcoltopsep}\\setlength{\\multcoltopsep}{2pt}
\\newlength{\\multicolparsep}\\setlength{\\multicolparsep}{0pt}
\\newlength{\\aftermultcolvspace}\\setlength{\\aftermultcolvspace}{-10pt}
\\newlength{\\achievementlistleftmargin}\\setlength{\\achievementlistleftmargin}{0.18in}
\\newlength{\\achievementlisttopsep}\\setlength{\\achievementlisttopsep}{2pt}
\\newlength{\\achievementlistitemsep}\\setlength{\\achievementlistitemsep}{-2pt}
\\newlength{\\achievementlistparsep}\\setlength{\\achievementlistparsep}{0pt}
\\titleformat{\\section}{
  \\vspace{\\sectiontitlevspace}\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{\\sectionrulevspace}]
\\pdfgentounicode=1
\\newcommand{\\resumeItem}[1]{
  \\item\\small{#1 \\vspace{\\listitembottomvspace}}
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{\\subheadingtopvspace}\\item
    \\begin{tabular*}{1.0\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & \\textbf{\\small #2} \\\\
      \\textit{\\small #3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{\\subheadingbottomvspace}
}
\\newcommand{\\resumeProjectHeading}[4]{
    \\item
    \\begin{tabular*}{\\textwidth}{@{}l@{\\extracolsep{\\fill}}r@{}}
       \\textbf{#1}#3 & \\textbf{\\small #2} \\\\
    \\end{tabular*}
    \\if\\relax\\detokenize{#4}\\relax\\else
    \\vspace{\\projectheadingvspaceaftertitle}
    \\\\
    \\textit{\\small #4}
    \\vspace{\\projectheadingvspaceaftertech}
    \\fi
}
\\renewcommand\\labelitemi{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.0in, label={}, topsep=\\outerlisttopsep, partopsep=\\outerlistpartopsep, parsep=\\outerlistparsep]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=\\innerlistleftmargin, topsep=\\innerlisttopsep, itemsep=\\innerlistitemsep, parsep=\\innerlistparsep]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{\\afterinnerlistvspace}}
`

function header(h: ResumeSnapshot['header']): string[] {
  const contact = [
    h.location && `\\faMapMarkerAlt\\ ${esc(h.location)}`,
    h.phone && href(`tel:${h.phone.replace(/[^+\d]/g, '')}`, `\\faPhone\\ ${esc(h.phone)}`),
    h.email && href(`mailto:${h.email}`, `\\faEnvelope\\ ${esc(h.email)}`),
  ].filter(Boolean)
  const links = h.links.map((l) => {
    const icon = /linkedin/i.test(l.url) ? '\\faLinkedin' : isGithub(l) ? '\\faGithub' : '\\faGlobe'
    return href(l.url, `${icon}\\ ${esc(display(l.url))}`)
  })
  const lines = [h.headline && esc(h.headline), contact.join(' \\quad\n    '), links.join(' \\quad\n    ')]
    .filter(Boolean)
    .map((l) => `    ${l}`)
  const name = `    {\\Huge ${esc(h.fullName.toUpperCase())}}`
  return [
    '\\begin{center}',
    ...(lines.length
      ? [`${name} \\\\[\\headernamevspace]`, '    \\small', lines.join(' \\\\[\\headercontactvspace]\n')]
      : [name]),
    '    \\\\[\\headerbottomvspace]',
    '\\end{center}',
  ]
}

function itemList(bullets: string[]): string[] {
  if (bullets.length === 0) return []
  return [
    '      \\resumeItemListStart',
    ...bullets.map((b) => `        \\resumeItem{${esc(b)}}`),
    '      \\resumeItemListEnd',
  ]
}

// subtitle is "Role · Location"; split on the last separator.
function subheading(b: ResumeBlock): string[] {
  const sub = b.subtitle ?? ''
  const i = sub.lastIndexOf(' · ')
  const [role, loc] = i === -1 ? [sub, ''] : [sub.slice(0, i), sub.slice(i + 3)]
  return [
    '    \\resumeSubheading',
    `      {${esc(b.title)}}{${dates(b.dateRange)}}`,
    `      {${esc(role)}}{${esc(loc)}}`,
    ...itemList(b.bullets),
  ]
}

function project(b: ResumeBlock): string[] {
  const icons = (b.links ?? [])
    .map((l, i) => {
      const icon = isGithub(l)
        ? '\\faGithub'
        : `\\faGlobe\\hspace{3pt}\\texttt{${esc(display(l.url).split('/')[0])}}`
      return `\\hspace{${i ? 10 : 6}pt}${href(l.url, `\\color{black}\\small${icon}`)}`
    })
    .join('')
  return [
    '    \\resumeProjectHeading',
    `        {${esc(b.title)}}`,
    `        {${dates(b.dateRange)}}`,
    `        {${icons}}`,
    `        {${esc(b.subtitle)}}`,
    ...itemList(b.bullets),
  ]
}

function skills(blocks: ResumeBlock[]): string[] {
  const lines = blocks.flatMap((b) => b.bullets).map((bullet) => {
    const i = bullet.indexOf(':')
    const body = i === -1 ? esc(bullet) : `\\textbf{${esc(bullet.slice(0, i))}}{: ${esc(bullet.slice(i + 1).trim())}}`
    return `         ${body} \\\\`
  })
  if (lines.length === 0) return []
  return [
    ' \\begin{multicols}{2}',
    '    \\begin{itemize}[leftmargin=0.15in, label={}, itemsep=\\multicolitemsep, topsep=\\multcoltopsep, parsep=\\multicolparsep]',
    '        \\small{\\item{',
    ...lines,
    '        }}',
    '    \\end{itemize}',
    ' \\end{multicols}',
    '\\vspace{\\aftermultcolvspace}',
  ]
}

// Achievements-style: a custom section whose blocks are plain bullet lists.
function plainList(blocks: ResumeBlock[]): string[] {
  const bullets = blocks.flatMap((b) => b.bullets)
  if (bullets.length === 0) return []
  return [
    '\\begin{itemize}[leftmargin=\\achievementlistleftmargin, topsep=\\achievementlisttopsep, itemsep=\\achievementlistitemsep, parsep=\\achievementlistparsep]',
    ...bullets.map((b) => `    \\item ${esc(b)}`),
    '\\end{itemize}',
  ]
}

const isPlain = (b: ResumeBlock) => !b.subtitle && !b.dateRange

// The user's own template (theme id 'latex'): icons in the header and on
// project links, two-column skills, bold right-aligned dates.
export function customLatex(snapshot: ResumeSnapshot): string {
  const out: string[] = [PREAMBLE + '\\begin{document}', ...header(snapshot.header)]
  const more = portfolioLink(snapshot.header.links)
  for (const section of groupSections(snapshot.blocks)) {
    const body =
      section.type === 'skills'
        ? skills(section.blocks)
        : section.type === 'custom' && section.blocks.every(isPlain)
          ? plainList(section.blocks)
          : [
              '\\resumeSubHeadingListStart',
              ...section.blocks.flatMap(section.type === 'project' ? project : subheading),
              '\\resumeSubHeadingListEnd',
            ]
    if (body.length) out.push(`\\section{${esc(section.heading)}}`, ...body)
    if (section.type === 'project' && more)
      out.push(`{\\raggedleft\\small ${moreProjects(snapshot.moreProjects)} ${href(more.url, `${esc(display(more.url))}`)}\\par}`)
  }
  out.push('\\end{document}', '')
  return out.join('\n')
}
