// Karobaar → real product details (Gandiva Labs, 4+ companies) in the profile
// and the "Product Engineer" resume; resume Portfolio link → folio.gandivalabs.com.
// Run: bun scripts/as-me.ts scripts/tasks/karobaar.ts
import type { ConvexHttpClient } from 'convex/browser'
import type { api as Api } from '../../convex/_generated/api'

const entry = {
  company: 'Gandiva Labs (Karobaar)',
  role: 'Founder',
  location: 'Remote',
  startDate: 'Jan 2026',
  endDate: 'Present',
  bullets: [
    'Founded Gandiva Labs and built Karobaar, a configurable sales-to-billing workspace used by 4+ companies',
    'Shipped custom sales pipelines, configurable customer fields, quotations, invoicing and role-based access',
    'In production with 900+ bills, 600+ customers and suppliers, and 150+ leads tracked; Android app on Play Store',
  ],
}
const PORTFOLIO = { label: 'Portfolio', url: 'https://folio.gandivalabs.com/u/vinayak' }
const isKarobaar = (name: string) => name === 'Karobaar' || name === entry.company

export default async function ({ client, api }: { client: ConvexHttpClient; api: typeof Api }) {
  // Profile: replace the Karobaar entry in place, keeping its uploaded media.
  const profile = await client.query(api.profiles.getMyProfile, {})
  const experience = profile?.experience ?? []
  if (!experience.some((x) => isKarobaar(x.company))) throw new Error('no Karobaar entry in profile')
  await client.mutation(api.profiles.updateMyProfile, {
    experience: experience.map((x) => (isKarobaar(x.company) ? { ...entry, mediaIds: x.mediaIds } : x)),
  })
  console.log('Profile: Karobaar entry updated')

  // Resume: commit on main (a new snapshot), then publish it if the resume is published.
  const resume = (await client.query(api.resumes.listMyResumes, {})).find((r) => r.slug === 'product-engineer')
  if (!resume) throw new Error('no "product-engineer" resume')
  const { branches } = await client.query(api.snapshots.getTree, { resumeId: resume._id })
  const main = branches.find((b) => b.name === 'main')
  if (!main?.headSnapshotId) throw new Error('resume has no main head')
  const head = await client.query(api.snapshots.getSnapshot, { snapshotId: main.headSnapshotId })

  const blocks = head.blocks.map((b) =>
    b.type === 'experience' && b.title && isKarobaar(b.title)
      ? {
          id: b.id, // same logical block — keep its id (cherry-pick matches on it)
          type: 'experience' as const,
          title: entry.company,
          subtitle: `${entry.role} · ${entry.location}`,
          dateRange: `${entry.startDate} – ${entry.endDate}`,
          bullets: entry.bullets,
        }
      : b,
  )
  const links = [PORTFOLIO, ...head.header.links.filter((l) => l.label.toLowerCase() !== 'portfolio')]
  const snapshotId = await client.mutation(api.snapshots.commit, {
    branchId: main._id,
    message: 'Karobaar: real product details; portfolio link on folio.gandivalabs.com',
    blocks,
    theme: head.theme,
    header: { ...head.header, links },
  })
  console.log(`Resume: committed ${snapshotId}`)
  if (resume.publishedSnapshotId) {
    await client.mutation(api.resumes.publish, { resumeId: resume._id, snapshotId })
    console.log('Resume: published the new version')
  }
}
