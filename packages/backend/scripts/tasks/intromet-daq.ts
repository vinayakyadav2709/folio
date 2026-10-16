// ISRO: fold the INTROMET 2025 paper into the third bullet (profile + resume).
// Profile only: add the SPIT industrial DAQ internship under Dr. Y. S. Rao.
// Run: bun run as-me scripts/tasks/intromet-daq.ts
import type { ConvexHttpClient } from 'convex/browser'
import type { api as Api } from '../../convex/_generated/api'

const ISRO = 'ISRO Space Applications Centre (SAC)'
const OLD = 'Deployed spatiotemporal deep-learning forecasts and contributed to scientific publications'
const NEW = 'Deployed spatiotemporal deep-learning forecasts; published a paper at INTROMET 2025'
const DAQ = {
  company: 'SPIT (under Dr. Y. S. Rao)',
  role: 'Software Developer, Industrial DAQ System',
  location: 'Mumbai, India',
  startDate: 'Jan 2024', // 2nd → 3rd semester, just before ISRO
  endDate: 'Nov 2024',
  bullets: [
    'Built an industrial data-acquisition system end to end: embedded C firmware, a Python GUI and cross-platform communication protocols',
  ],
}
const swap = (bullets: string[]) => bullets.map((b) => (b === OLD ? NEW : b))

export default async function ({ client, api }: { client: ConvexHttpClient; api: typeof Api }) {
  // Profile: ISRO bullet + DAQ entry (appended last = oldest; skipped if already there).
  const profile = await client.query(api.profiles.getMyProfile, {})
  const experience = profile?.experience ?? []
  if (!experience.some((x) => x.company === ISRO)) throw new Error('no ISRO entry in profile')
  await client.mutation(api.profiles.updateMyProfile, {
    experience: [
      ...experience.map((x) => (x.company === ISRO ? { ...x, bullets: swap(x.bullets) } : x)),
      ...(experience.some((x) => x.company === DAQ.company) ? [] : [DAQ]),
    ],
  })
  console.log('Profile: ISRO bullet updated, DAQ internship added')

  // Resume: same ISRO bullet, as a new commit on main; republish if published.
  const resume = (await client.query(api.resumes.listMyResumes, {})).find((r) => r.slug === 'product-engineer')
  if (!resume) throw new Error('no "product-engineer" resume')
  const { branches } = await client.query(api.snapshots.getTree, { resumeId: resume._id })
  const main = branches.find((b) => b.name === 'main')
  if (!main?.headSnapshotId) throw new Error('resume has no main head')
  const head = await client.query(api.snapshots.getSnapshot, { snapshotId: main.headSnapshotId })
  if (!head.blocks.some((b) => b.title === ISRO && b.bullets.includes(OLD))) {
    console.log('Resume: ISRO bullet already updated, nothing to commit')
    return
  }
  const snapshotId = await client.mutation(api.snapshots.commit, {
    branchId: main._id,
    message: 'ISRO: INTROMET 2025 paper',
    blocks: head.blocks.map((b) => (b.title === ISRO ? { ...b, bullets: swap(b.bullets) } : b)),
    theme: head.theme,
    header: head.header,
  })
  console.log(`Resume: committed ${snapshotId}`)
  if (resume.publishedSnapshotId) {
    await client.mutation(api.resumes.publish, { resumeId: resume._id, snapshotId })
    console.log('Resume: published the new version')
  }
}
