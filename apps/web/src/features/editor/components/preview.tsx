import type { Block, Header, Theme } from '../lib/blocks'

// Cheap HTML approximation of the PDF themes (packages/exports/src/pdf) so the
// preview updates on every keystroke without rendering a PDF.

const HEADINGS: Record<Block['type'], string> = {
  experience: 'EXPERIENCE',
  project: 'PROJECTS',
  education: 'EDUCATION',
  skills: 'SKILLS',
  custom: '',
}

// Mirrors groupSections in @folio/exports — importing it statically would drag
// @react-pdf/renderer into the SSR bundle, so keep this 14-line copy local.
function groupSections(blocks: Block[]) {
  const sections: { heading: string; blocks: Block[] }[] = []
  const byType = new Map<Block['type'], (typeof sections)[number]>()
  for (const block of blocks) {
    let section = byType.get(block.type)
    if (!section) {
      section = { heading: HEADINGS[block.type] || (block.title ?? '').toUpperCase(), blocks: [] }
      byType.set(block.type, section)
      sections.push(section)
    }
    section.blocks.push(block)
  }
  return sections
}

export function Preview({ blocks, header, theme }: { blocks: Block[]; header: Header; theme: Theme }) {
  const scale = theme.fontScale ?? 1
  const accent = theme.accentColor ?? '#000000'
  const compact = theme.id === 'compact'
  const base = (compact ? 9 : 10.5) * scale
  const contact = [header.location, header.email, header.phone].filter(Boolean).join('  |  ')

  return (
    // The "desk": a dim well the paper sheet sits on, in both color schemes.
    <div className="rounded-xl bg-foreground/[0.04] p-3 dark:bg-black/30">
      <div
        className="min-h-[20rem] rounded-[3px] bg-white text-black shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08),0_12px_28px_-12px_rgba(0,0,0,0.35)]"
        style={{
          fontSize: base,
          fontFamily: 'Helvetica, Arial, sans-serif',
          lineHeight: 1.3,
          padding: compact ? 16 : 24,
        }}
      >
        <div style={{ fontSize: base * 1.9, fontWeight: 700, color: accent }}>
          {header.fullName || 'Your Name'}
        </div>
        {header.headline && <div style={{ fontSize: base * 1.05 }}>{header.headline}</div>}
        {contact && <div style={{ fontSize: base * 0.95, color: '#333' }}>{contact}</div>}
        {header.links.length > 0 && (
          <div style={{ fontSize: base * 0.95, color: accent }}>
            {header.links.map((l) => l.label || l.url).join('  |  ')}
          </div>
        )}

        {groupSections(blocks).map((section, si) => (
          <div key={si} style={{ marginTop: compact ? 9 : 14 }}>
            <div
              style={{
                fontSize: base * 1.05,
                fontWeight: 700,
                color: accent,
                borderBottom: `1px solid ${accent}`,
                paddingBottom: 2,
                marginBottom: 4,
              }}
            >
              {section.heading}
            </div>
            {section.blocks.map((block, bi) => (
              <div key={block.id} style={{ marginTop: bi === 0 ? 0 : compact ? 5 : 9 }}>
                {block.title && (
                  <div>
                    <span style={{ fontWeight: 700 }}>{block.title}</span>
                    {block.dateRange && <span style={{ color: '#333' }}>{'   ' + block.dateRange}</span>}
                  </div>
                )}
                {block.subtitle && <div style={{ fontStyle: 'italic' }}>{block.subtitle}</div>}
                {block.bullets.filter(Boolean).map((b, i) => (
                  <div key={i} style={{ display: 'flex', marginTop: compact ? 1.5 : 3 }}>
                    <span style={{ width: base * 1.1, flexShrink: 0 }}>•</span>
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
