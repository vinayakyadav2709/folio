import { Document, Page, Text, View, Link, StyleSheet } from '@react-pdf/renderer'
import type { ResumeSnapshot } from '../types'
import { groupSections } from '../sections'

// Shared, ATS-safe resume document: single column, standard section headers,
// built-in fonts (no font registration), real text throughout, hyperlinks via
// Link, no tables/columns/graphics. Variants differ only in the spacing/size +
// font-family config passed in.
export type Variant = {
  base: number // base body font size (pt)
  page: number // page padding (pt)
  sectionGap: number // vertical gap above each section
  blockGap: number // vertical gap between blocks
  lineGap: number // gap between bullet lines
  font: string // regular family (built-in: Helvetica / Times-Roman)
  fontBold: string // bold family
  fontItalic: string // italic family
  centerHeader?: boolean // center name + contact (Jake's-Resume look)
}

const HELVETICA = { font: 'Helvetica', fontBold: 'Helvetica-Bold', fontItalic: 'Helvetica-Oblique' }
const TIMES = { font: 'Times-Roman', fontBold: 'Times-Bold', fontItalic: 'Times-Italic' }

export const CLASSIC: Variant = { base: 10.5, page: 40, sectionGap: 14, blockGap: 9, lineGap: 3, ...HELVETICA }
export const COMPACT: Variant = { base: 9, page: 28, sectionGap: 9, blockGap: 5, lineGap: 1.5, ...HELVETICA }
// ATS: Jake's-Resume-style — Times serif, centered header, tight bullets.
export const ATS: Variant = { base: 10, page: 36, sectionGap: 10, blockGap: 6, lineGap: 2, centerHeader: true, ...TIMES }

export function ResumeDocument({ snapshot, variant }: { snapshot: ResumeSnapshot; variant: Variant }) {
  const { header, theme, blocks } = snapshot
  const scale = theme.fontScale ?? 1
  const accent = theme.accentColor ?? '#000000'
  const base = variant.base * scale

  const styles = StyleSheet.create({
    page: {
      fontFamily: variant.font,
      fontSize: base,
      paddingVertical: variant.page,
      paddingHorizontal: variant.page,
      color: '#000000',
      lineHeight: 1.3,
    },
    header: variant.centerHeader ? { textAlign: 'center' } : {},
    name: { fontSize: base * 1.9, fontFamily: variant.fontBold, color: accent },
    headline: { fontSize: base * 1.05, marginTop: 2 },
    contact: { fontSize: base * 0.95, marginTop: 3, color: '#333333' },
    sectionHeading: {
      fontSize: base * 1.05,
      fontFamily: variant.fontBold,
      color: accent,
      marginBottom: 4,
      borderBottomWidth: 0.75,
      borderBottomColor: accent,
      paddingBottom: 2,
    },
    blockTitle: { fontFamily: variant.fontBold },
    blockSubtitle: { fontFamily: variant.fontItalic },
    dateRange: { color: '#333333' },
    bulletRow: { flexDirection: 'row', marginTop: variant.lineGap },
    bulletDot: { width: base * 1.1 },
    bulletText: { flex: 1 },
    link: { color: accent, textDecoration: 'none' },
  })

  const contactBits = [header.location, header.email, header.phone].filter(Boolean) as string[]
  const sections = groupSections(blocks)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{header.fullName}</Text>
          {header.headline ? <Text style={styles.headline}>{header.headline}</Text> : null}
          {contactBits.length > 0 ? <Text style={styles.contact}>{contactBits.join('  |  ')}</Text> : null}
          {header.links.length > 0 ? (
            <Text style={styles.contact}>
              {header.links.map((l, i) => (
                <Text key={i}>
                  {i > 0 ? '  |  ' : ''}
                  <Link src={l.url} style={styles.link}>
                    {l.label}
                  </Link>
                </Text>
              ))}
            </Text>
          ) : null}
        </View>

        {/* Sections */}
        {sections.map((section, si) => (
          <View key={si} style={{ marginTop: variant.sectionGap }} wrap={false}>
            <Text style={styles.sectionHeading}>{section.heading}</Text>
            {section.blocks.map((block, bi) => (
              <View key={block.id} style={{ marginTop: bi === 0 ? 0 : variant.blockGap }}>
                {block.title ? (
                  <Text>
                    <Text style={styles.blockTitle}>{block.title}</Text>
                    {block.dateRange ? <Text style={styles.dateRange}>{'   ' + block.dateRange}</Text> : null}
                  </Text>
                ) : null}
                {block.subtitle ? <Text style={styles.blockSubtitle}>{block.subtitle}</Text> : null}
                {block.bullets.map((b, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>{'•'}</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
                {block.links && block.links.length > 0 ? (
                  <Text style={{ marginTop: variant.lineGap }}>
                    {block.links.map((l, i) => (
                      <Text key={i}>
                        {i > 0 ? '  |  ' : ''}
                        <Link src={l.url} style={styles.link}>
                          {l.label}
                        </Link>
                      </Text>
                    ))}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  )
}
