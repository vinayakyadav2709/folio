import type { ReactNode } from 'react'
import { Document, Font, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { ResumeBlock, ResumeLink, ResumeSnapshot } from '../types'
import { groupSections } from '../sections'
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
} from '../latex-look'

// Latin Modern (GUST Font License), served by the web app from /fonts. The PDF
// is built client-side, where react-pdf fetches relative URLs like any asset.
const FONTS = '/fonts/'
Font.register({
  family: 'LMRoman',
  fonts: [
    { src: `${FONTS}lmroman10-regular.otf` },
    { src: `${FONTS}lmroman10-bold.otf`, fontWeight: 'bold' },
    { src: `${FONTS}lmroman10-italic.otf`, fontStyle: 'italic' },
  ],
})
Font.register({ family: 'LMMono', src: `${FONTS}lmmono10-regular.otf` })
// LaTeX only hyphenates when it must; react-pdf splits eagerly ("Pan-das"). Never split.
Font.registerHyphenationCallback((word) => [word])

// pt sizes of the LaTeX 10pt class: \Huge, \large, \normalsize, \small.
const HUGE = 24.88
const LARGE = 12
const NORMAL = 10
const SMALL = 9

// FA icon sized to the surrounding text (512 units = 1em, baseline at 448).
function Icon({ name, size }: { name: IconName; size: number }) {
  const { w, d } = ICONS[name]
  return (
    <Svg viewBox={`0 0 ${w} 512`} width={(size * w) / 512} height={size} style={{ marginBottom: -size * 0.12 }}>
      <Path d={d} fill="#000000" />
    </Svg>
  )
}

// One contact item: icon + text, optionally linked.
function Contact({ icon, text, href, size }: { icon: IconName; text: string; href?: string; size: number }) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.33 }}>
      <Icon name={icon} size={size} />
      <Text>{text}</Text>
    </View>
  )
  return href ? (
    <Link src={href} style={{ color: '#000000', textDecoration: 'none' }}>
      {body}
    </Link>
  ) : (
    body
  )
}

// LaTeX itemize with the template's \tiny vertically-centred bullet.
function Bullets({ items, size, s }: { items: string[]; size: number; s: number }) {
  return (
    <View style={{ marginTop: 2 * s }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', fontSize: size }}>
          <View style={{ width: 13 * s, alignItems: 'center', paddingTop: size * 0.6 }}>
            <View style={{ width: 2.2 * s, height: 2.2 * s, borderRadius: 1.1 * s, backgroundColor: '#000000' }} />
          </View>
          <Text style={{ flex: 1 }}>{item}</Text>
        </View>
      ))}
    </View>
  )
}

// Left/right row (the template's tabular* with \extracolsep{\fill}).
function Row({ left, right, style }: { left: ReactNode; right?: ReactNode; style?: object }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', ...style }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>{left}</View>
      {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
    </View>
  )
}

function ProjectLinks({ links, s }: { links: ResumeLink[]; s: number }) {
  return links.map((l, i) => {
    const icon = linkIcon(l)
    return (
      <Link key={i} src={l.url} style={{ color: '#000000', textDecoration: 'none', marginLeft: (i ? 10 : 5) * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 * s }}>
          <Icon name={icon === 'linkedin' ? 'globe' : icon} size={SMALL * s} />
          {icon === 'github' ? null : (
            <Text style={{ fontFamily: 'LMMono', fontSize: SMALL * s }}>{urlHost(l.url)}</Text>
          )}
        </View>
      </Link>
    )
  })
}

function Entry({ block, s }: { block: ResumeBlock; s: number }) {
  const bullets = block.bullets.filter(Boolean)
  const date = block.dateRange ? (
    <Text style={{ fontWeight: 'bold', fontSize: SMALL * s }}>{block.dateRange}</Text>
  ) : undefined
  const title = <Text style={{ fontWeight: 'bold' }}>{block.title}</Text>

  if (block.type === 'project') {
    return (
      <View style={{ marginTop: 3 * s }} wrap={false}>
        <Row
          left={
            <>
              {title}
              <ProjectLinks links={block.links ?? []} s={s} />
            </>
          }
          right={date}
        />
        {block.subtitle ? <Text style={{ fontStyle: 'italic', fontSize: SMALL * s }}>{block.subtitle}</Text> : null}
        {bullets.length ? <Bullets items={bullets} size={SMALL * s} s={s} /> : null}
      </View>
    )
  }
  const [role, location] = splitSubtitle(block.subtitle)
  const it = { fontStyle: 'italic', fontSize: SMALL * s } as const
  return (
    <View style={{ marginTop: 3 * s }} wrap={false}>
      <Row left={title} right={date} />
      {role || location ? (
        <Row left={<Text style={it}>{role}</Text>} right={location ? <Text style={it}>{location}</Text> : undefined} />
      ) : null}
      {bullets.length ? <Bullets items={bullets} size={SMALL * s} s={s} /> : null}
    </View>
  )
}

function Skills({ blocks, s }: { blocks: ResumeBlock[]; s: number }) {
  const lines = blocks.flatMap((b) => b.bullets.filter(Boolean))
  const half = Math.ceil(lines.length / 2)
  return (
    <View style={{ flexDirection: 'row', gap: 15 * s, marginTop: 3 * s, paddingLeft: 11 * s, fontSize: SMALL * s }}>
      {[lines.slice(0, half), lines.slice(half)].map((col, ci) => (
        <View key={ci} style={{ flex: 1 }}>
          {col.map((line, i) => {
            const [cat, rest] = splitSkill(line)
            return (
              <Text key={i} style={{ marginBottom: 1 * s }}>
                {cat ? <Text style={{ fontWeight: 'bold' }}>{cat}</Text> : null}
                {rest}
              </Text>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// Reproduces a classic one-page LaTeX resume (10pt Latin Modern, A4 paper,
// FontAwesome contact icons, ruled \large\bfseries section titles).
export function LatexResume({ snapshot }: { snapshot: ResumeSnapshot }) {
  const { header, theme, blocks } = snapshot
  const s = theme.fontScale ?? 1
  const styles = StyleSheet.create({
    page: {
      fontFamily: 'LMRoman',
      fontSize: NORMAL * s,
      lineHeight: 1.2,
      paddingTop: 22,
      paddingBottom: 29,
      paddingHorizontal: 28.8,
      color: '#000000',
    },
    contactLine: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: SMALL * 1.6 * s,
      fontSize: SMALL * s,
    },
    heading: {
      fontSize: LARGE * s,
      fontWeight: 'bold',
      marginTop: 7 * s,
      paddingBottom: 3.5 * s,
      borderBottomWidth: 0.4,
      borderBottomColor: '#000000',
    },
  })

  const line1 = [
    header.location && { icon: 'location' as const, text: header.location },
    header.phone && { icon: 'phone' as const, text: header.phone, href: `tel:${header.phone.replace(/[^\d+]/g, '')}` },
    header.email && { icon: 'envelope' as const, text: header.email, href: `mailto:${header.email}` },
  ].filter((c) => !!c)
  const line2 = header.links.map((l) => ({ icon: linkIcon(l), text: displayUrl(l.url), href: l.url }))
  const more = portfolioLink(header.links)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: HUGE * s, lineHeight: 1.1, marginBottom: 4 * s }}>
            {header.fullName.toUpperCase()}
          </Text>
          {[line1, line2].map((line, li) =>
            line.length ? (
              <View key={li} style={styles.contactLine}>
                {line.map((c, i) => (
                  <Contact key={i} {...c} size={SMALL * s} />
                ))}
              </View>
            ) : null,
          )}
        </View>

        {groupSections(blocks).map((section, si) => (
          <View key={si} style={{ marginTop: si === 0 ? 0 : 2 * s }}>
            <Text style={styles.heading} minPresenceAhead={40}>
              {section.heading}
            </Text>
            {section.type === 'skills' ? (
              <Skills blocks={section.blocks} s={s} />
            ) : (
              section.blocks.map((block) =>
                block.type === 'custom' && !block.subtitle && !block.dateRange ? (
                  <Bullets key={block.id} items={block.bullets.filter(Boolean)} size={NORMAL * s} s={s} />
                ) : (
                  <Entry key={block.id} block={block} s={s} />
                ),
              )
            )}
            {section.type === 'project' && more ? (
              <Text style={{ fontSize: SMALL * s, marginTop: 3 * s, textAlign: 'right' }}>
                {`${moreProjects(snapshot.moreProjects)} `}
                <Link src={more.url} style={{ color: '#000000' }}>
                  {displayUrl(more.url)}
                </Link>
              </Text>
            ) : null}
          </View>
        ))}
      </Page>
    </Document>
  )
}
