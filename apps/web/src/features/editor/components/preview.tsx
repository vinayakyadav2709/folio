import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ICONS,
  type IconName,
  moreProjects,
  displayUrl,
  linkIcon,
  portfolioLink,
  splitSkill,
  splitSubtitle,
  urlHost,
} from '@folio/exports/latex-look'
import type { Block, Header, Theme } from '../lib/blocks'
import { useMoreProjects } from '../lib/use-more-projects'

// A true-to-scale page preview: the sheet is laid out in PDF point coordinates
// (A4 = 595.28 × 841.89pt, matching @react-pdf's `size="A4"`) and CSS-scaled to
// fit its pane, so it reads like the exported PDF instead of a stretched div.
// `maxScale` caps the fit — 4/3 (96px per 72pt) is the page at its real size.
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
  const sections: { type: Block['type']; heading: string; blocks: Block[] }[] = []
  const byType = new Map<Block['type'], (typeof sections)[number]>()
  for (const block of blocks) {
    let section = byType.get(block.type)
    if (!section) {
      section = { type: block.type, heading: HEADINGS[block.type] || (block.title ?? '').toUpperCase(), blocks: [] }
      byType.set(block.type, section)
      sections.push(section)
    }
    section.blocks.push(block)
  }
  return sections
}

export function Preview({
  blocks,
  header,
  theme,
  maxScale = Infinity,
}: {
  blocks: Block[]
  header: Header
  theme: Theme
  maxScale?: number
}) {
  const paneRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const n = useMoreProjects(blocks)
  const latex = theme.id === 'latex'
  const [sheetH, setSheetH] = useState(PAGE_H)

  // Fit the fixed-size sheet to the pane's width; reserve the scaled height so
  // the sheet doesn't overlap siblings. offsetHeight is the sheet's natural
  // (un-transformed) height, so observing it can't feed back into the scale.
  useEffect(() => {
    const pane = paneRef.current
    const sheet = sheetRef.current
    if (!pane || !sheet) return
    const measure = () => {
      setScale(Math.min(maxScale, pane.clientWidth / PAGE_W))
      setSheetH(sheet.offsetHeight)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(pane)
    ro.observe(sheet)
    return () => ro.disconnect()
  }, [maxScale])

  const v = VARIANTS[theme.id] ?? VARIANTS.classic
  const fontScale = theme.fontScale ?? 1
  const accent = theme.accentColor ?? '#000000'
  const base = v.base * fontScale
  const contact = [header.location, header.email, header.phone].filter(Boolean).join('  |  ')
  const more = portfolioLink(header.links)

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
            fontSize: latex ? 10 * fontScale : base,
            fontFamily: latex ? LM : v.font,
            lineHeight: latex ? 1.2 : 1.3,
            padding: latex ? '22px 28.8px 29px' : v.page,
            visibility: scale ? 'visible' : 'hidden',
          }}
        >
          {latex ? (
            <LatexPage blocks={blocks} header={header} s={fontScale} n={n} />
          ) : (
            <>
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
                  {section.type === 'project' && more && (
                    <div style={{ marginTop: v.blockGap, textAlign: 'right' }}>
                      {moreProjects(n)} <span style={{ color: accent }}>{displayUrl(more.url)}</span>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---- 'latex' theme: mirrors packages/exports/src/pdf/latex.tsx ----
const LM = '"LM Roman", "Latin Modern Roman", "Computer Modern", Georgia, serif'
const LATEX_HEADINGS: Record<Block['type'], string> = {
  experience: 'Experience',
  project: 'Projects',
  education: 'Education',
  skills: 'Technical Skills',
  custom: '',
}

// FA glyph sized to the text (512 units = 1em, baseline at y = 448).
function Icon({ name }: { name: IconName }) {
  const { w, d } = ICONS[name]
  return (
    <svg
      viewBox={`0 0 ${w} 512`}
      width={`${w / 512}em`}
      height="1em"
      style={{ display: 'inline-block', verticalAlign: '-0.125em' }}
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

function Row({ left, right, style }: { left: ReactNode; right?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, ...style }}>
      <div>{left}</div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
    </div>
  )
}

function Bullets({ items, size }: { items: string[]; size: number }) {
  return (
    <ul style={{ margin: '2px 0 0', padding: 0, listStyle: 'none', fontSize: size }}>
      {items.map((b, i) => (
        <li key={i} style={{ display: 'flex' }}>
          <span
            style={{
              width: 13,
              flexShrink: 0,
              textAlign: 'center',
              fontSize: '0.55em',
              lineHeight: `${(size * 1.2) / (size * 0.55)}`,
            }}
          >
            ●
          </span>
          <span>{b}</span>
        </li>
      ))}
    </ul>
  )
}

function LatexPage({ blocks, header, s, n }: { blocks: Block[]; header: Header; s: number; n?: number }) {
  const small = 9 * s
  const contacts: { icon: IconName; text: string }[][] = [
    [
      header.location && { icon: 'location' as const, text: header.location },
      header.phone && { icon: 'phone' as const, text: header.phone },
      header.email && { icon: 'envelope' as const, text: header.email },
    ].filter((c) => !!c),
    header.links.map((l) => ({ icon: linkIcon(l), text: displayUrl(l.url) })),
  ]
  const it = { fontStyle: 'italic', fontSize: small } as const
  const more = portfolioLink(header.links)
  const date = (b: Block) => b.dateRange && <b style={{ fontSize: small }}>{b.dateRange}</b>

  return (
    <>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 24.88 * s, lineHeight: 1.1, marginBottom: 4 * s }}>
          {(header.fullName || 'Your Name').toUpperCase()}
        </div>
        {contacts.map(
          (line, li) =>
            line.length > 0 && (
              <div
                key={li}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                  columnGap: small * 1.6,
                  fontSize: small,
                }}
              >
                {line.map((c, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.33em' }}>
                    <Icon name={c.icon} />
                    {c.text}
                  </span>
                ))}
              </div>
            ),
        )}
      </div>

      {groupSections(blocks.filter((b) => b.title || b.subtitle || b.bullets.length)).map((section, si) => (
        <div key={si} style={{ marginTop: si === 0 ? 0 : 2 * s }}>
          <div
            style={{
              fontSize: 12 * s,
              fontWeight: 700,
              marginTop: 7 * s,
              paddingBottom: 3.5 * s,
              borderBottom: '0.4px solid #000',
              lineHeight: 1.2,
            }}
          >
            {LATEX_HEADINGS[section.type] || section.blocks[0]?.title}
          </div>
          {section.type === 'skills' ? (
            <SkillColumns lines={section.blocks.flatMap((b) => b.bullets.filter(Boolean))} s={s} />
          ) : (
            section.blocks.map((block) => {
              const bullets = block.bullets.filter(Boolean)
              if (block.type === 'custom' && !block.subtitle && !block.dateRange)
                return <Bullets key={block.id} items={bullets} size={10 * s} />
              const [role, location] =
                block.type === 'project' ? [block.subtitle ?? '', ''] : splitSubtitle(block.subtitle)
              return (
                <div key={block.id} style={{ marginTop: 3 * s }}>
                  <Row
                    left={
                      <>
                        <b>{block.title}</b>
                        {block.type === 'project' &&
                          (block.links ?? []).map((l, i) => {
                            const icon = linkIcon(l)
                            return (
                              <span
                                key={i}
                                style={{
                                  marginLeft: (i ? 10 : 5) * s,
                                  fontSize: small,
                                  display: 'inline-flex',
                                  alignItems: 'baseline',
                                  gap: 3 * s,
                                }}
                              >
                                <Icon name={icon === 'github' ? 'github' : 'globe'} />
                                {icon !== 'github' && (
                                  <span style={{ fontFamily: '"LM Mono", monospace' }}>{urlHost(l.url)}</span>
                                )}
                              </span>
                            )
                          })}
                      </>
                    }
                    right={date(block)}
                  />
                  {(role || location) && (
                    <Row left={<span style={it}>{role}</span>} right={location && <span style={it}>{location}</span>} />
                  )}
                  {bullets.length > 0 && <Bullets items={bullets} size={small} />}
                </div>
              )
            })
          )}
          {section.type === 'project' && more && (
            <div style={{ fontSize: small, marginTop: 3 * s, textAlign: 'right' }}>
              {moreProjects(n)}{' '}
              <span>{displayUrl(more.url)}</span>
            </div>
          )}
        </div>
      ))}
    </>
  )
}

function SkillColumns({ lines, s }: { lines: string[]; s: number }) {
  const half = Math.ceil(lines.length / 2)
  return (
    <div style={{ display: 'flex', gap: 15 * s, marginTop: 3 * s, paddingLeft: 11 * s, fontSize: 9 * s }}>
      {[lines.slice(0, half), lines.slice(half)].map((col, ci) => (
        <div key={ci} style={{ flex: 1 }}>
          {col.map((line, i) => {
            const [cat, rest] = splitSkill(line)
            return (
              <div key={i} style={{ marginBottom: s }}>
                {cat && <b>{cat}</b>}
                {rest}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
