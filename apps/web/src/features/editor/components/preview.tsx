import { useEffect, useRef, useState } from 'react'
import type { Block, Header, Theme } from '../lib/blocks'

// A true-to-scale page preview: the sheet is laid out in PDF point coordinates
// (A4 = 595.28 × 841.89pt, matching @react-pdf's `size="A4"`) and CSS-scaled to
// fit its pane, so it reads like the exported PDF instead of a stretched div.
const PAGE_W = 595.28
const PAGE_H = 841.89

// Mirrors the Variant table in packages/exports/src/pdf/document.tsx so the
// on-screen page matches each theme's real spacing/type. Importing it statically
// would drag @react-pdf/renderer into the SSR bundle, so keep this copy local.
type Variant = {
  base: number
  page: number
  sectionGap: number
  blockGap: number
  lineGap: number
  font: string
  center: boolean
}
const SANS = 'Helvetica, Arial, sans-serif'
const VARIANTS: Record<string, Variant> = {
  classic: { base: 10.5, page: 40, sectionGap: 14, blockGap: 9, lineGap: 3, font: SANS, center: false },
  compact: { base: 9, page: 28, sectionGap: 9, blockGap: 5, lineGap: 1.5, font: SANS, center: false },
  ats: { base: 10, page: 36, sectionGap: 10, blockGap: 6, lineGap: 2, font: '"Times New Roman", Georgia, serif', center: true },
}

const HEADINGS: Record<Block['type'], string> = {
  experience: 'EXPERIENCE',
  project: 'PROJECTS',
  education: 'EDUCATION',
  skills: 'SKILLS',
  custom: '',
}

// Mirrors groupSections in @folio/exports (kept local for the same bundle reason).
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
  const paneRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [sheetH, setSheetH] = useState(PAGE_H)

  // Fit the fixed-size sheet to the pane's width; reserve the scaled height so
  // the sheet doesn't overlap siblings. offsetHeight is the sheet's natural
  // (un-transformed) height, so observing it can't feed back into the scale.
  useEffect(() => {
    const pane = paneRef.current
    const sheet = sheetRef.current
    if (!pane || !sheet) return
    const measure = () => {
      setScale(pane.clientWidth / PAGE_W)
      setSheetH(sheet.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(pane)
    ro.observe(sheet)
    return () => ro.disconnect()
  }, [])

  const v = VARIANTS[theme.id] ?? VARIANTS.classic
  const fontScale = theme.fontScale ?? 1
  const accent = theme.accentColor ?? '#000000'
  const base = v.base * fontScale
  const contact = [header.location, header.email, header.phone].filter(Boolean).join('  |  ')

  return (
    // The "desk": a dim well the paper sheet sits on, in both color schemes.
    <div ref={paneRef} className="overflow-hidden rounded-xl bg-foreground/[0.04] p-3 dark:bg-black/30">
      {/* Height reserver in scaled space so short pages still fill the sheet. */}
      <div style={{ height: sheetH * scale }}>
        <div
          ref={sheetRef}
          className="bg-white text-black shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.08),0_18px_40px_-16px_rgba(0,0,0,0.4)]"
          style={{
            width: PAGE_W,
            minHeight: PAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            fontSize: base,
            fontFamily: v.font,
            lineHeight: 1.3,
            padding: v.page,
            visibility: scale ? 'visible' : 'hidden',
          }}
        >
          <div style={{ textAlign: v.center ? 'center' : 'left' }}>
            <div style={{ fontSize: base * 1.9, fontWeight: 700, color: accent }}>
              {header.fullName || 'Your Name'}
            </div>
            {header.headline && <div style={{ fontSize: base * 1.05, marginTop: 2 }}>{header.headline}</div>}
            {contact && <div style={{ fontSize: base * 0.95, marginTop: 3, color: '#333' }}>{contact}</div>}
            {header.links.length > 0 && (
              <div style={{ fontSize: base * 0.95, marginTop: 3, color: accent }}>
                {header.links.map((l) => l.label || l.url).join('  |  ')}
              </div>
            )}
          </div>

          {groupSections(blocks).map((section, si) => (
            <div key={si} style={{ marginTop: v.sectionGap }}>
              <div
                style={{
                  fontSize: base * 1.05,
                  fontWeight: 700,
                  color: accent,
                  borderBottom: `0.75px solid ${accent}`,
                  paddingBottom: 2,
                  marginBottom: 4,
                }}
              >
                {section.heading}
              </div>
              {section.blocks.map((block, bi) => (
                <div key={block.id} style={{ marginTop: bi === 0 ? 0 : v.blockGap }}>
                  {block.title && (
                    <div>
                      <span style={{ fontWeight: 700 }}>{block.title}</span>
                      {block.dateRange && <span style={{ color: '#333' }}>{'   ' + block.dateRange}</span>}
                    </div>
                  )}
                  {block.subtitle && <div style={{ fontStyle: 'italic' }}>{block.subtitle}</div>}
                  {block.bullets.filter(Boolean).map((b, i) => (
                    <div key={i} style={{ display: 'flex', marginTop: v.lineGap }}>
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
    </div>
  )
}
