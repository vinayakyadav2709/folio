import type { ResumeBlock } from './types'

export type Section = { type: ResumeBlock['type']; heading: string; blocks: ResumeBlock[] }

const HEADINGS: Record<ResumeBlock['type'], string> = {
  experience: 'EXPERIENCE',
  project: 'PROJECTS',
  education: 'EDUCATION',
  skills: 'SKILLS',
  custom: '',
}

// Group blocks by type. Section order = order of first appearance of each type;
// within a section, blocks keep their original order.
export function groupSections(blocks: ResumeBlock[]): Section[] {
  const sections: Section[] = []
  const byType = new Map<ResumeBlock['type'], Section>()
  for (const block of blocks) {
    let section = byType.get(block.type)
    if (!section) {
      // custom blocks fall back to their own title as the heading
      const heading = HEADINGS[block.type] || (block.title ?? '').toUpperCase()
      section = { type: block.type, heading, blocks: [] }
      byType.set(block.type, section)
      sections.push(section)
    }
    section.blocks.push(block)
  }
  return sections
}
