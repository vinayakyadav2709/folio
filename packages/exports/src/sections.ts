import type { ResumeBlock } from './types'

export type Section = { type: ResumeBlock['type']; heading: string; blocks: ResumeBlock[] }

// Jake's-Resume section names (rendered small-caps by \scshape in LaTeX and
// by uppercase-look styling in the PDF; kept title-case in source).
const HEADINGS: Record<ResumeBlock['type'], string> = {
  experience: 'Experience',
  project: 'Projects',
  education: 'Education',
  skills: 'Technical Skills',
  custom: '',
}

// Group blocks by type. Section order = order of first appearance of each type;
// within a section, blocks keep their original order. Blocks with no title and
// no bullets are dropped so empty sections never render.
export function groupSections(blocks: ResumeBlock[]): Section[] {
  const sections: Section[] = []
  const byType = new Map<ResumeBlock['type'], Section>()
  for (const block of blocks) {
    if (!block.title && !block.subtitle && block.bullets.length === 0) continue
    let section = byType.get(block.type)
    if (!section) {
      // custom blocks fall back to their own title as the heading
      const heading = HEADINGS[block.type] || (block.title ?? '')
      section = { type: block.type, heading, blocks: [] }
      byType.set(block.type, section)
      sections.push(section)
    }
    section.blocks.push(block)
  }
  return sections
}
