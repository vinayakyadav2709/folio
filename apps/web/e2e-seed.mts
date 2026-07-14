// Temp E2E seed script (deleted after use). Run: bun e2e-seed.mts <jwt>
import { ConvexHttpClient } from 'convex/browser'
import { api } from '@folio/backend/api'

const jwt = process.argv[2]
if (!jwt) throw new Error('pass jwt')
const c = new ConvexHttpClient('http://127.0.0.1:3210')
c.setAuth(jwt)

const log = (label: string, v: unknown) =>
  console.log(label + ':', JSON.stringify(v)?.slice(0, 200))

// team
let teams: any = await c.query(api.teams.listMyTeams, {})
log('teams', teams)
let team = (teams as any[]).find((t) => t.slug === 'demo-team' || t.team?.slug === 'demo-team')
if (!team) {
  const created: any = await c.mutation(api.teams.createTeam, {
    name: 'Demo Team',
    slug: 'demo-team',
  })
  log('createTeam', created)
  teams = await c.query(api.teams.listMyTeams, {})
  team = (teams as any[]).find((t) => t.slug === 'demo-team' || t.team?.slug === 'demo-team')
}
const teamId = team._id ?? team.team?._id ?? team.teamId
log('teamId', teamId)

// project
const projects: any[] = await c.query(api.projects.listTeamProjects, { teamId })
let project = projects.find((p) => p.name === 'Realtime Chat Service')
if (!project) {
  const pid: any = await c.mutation(api.projects.createProject, {
    teamId,
    name: 'Realtime Chat Service',
    description:
      '# Realtime Chat Service\n\nA websocket chat backend with presence, typing indicators and message history.\n\n```ts\nconst ws = new WebSocket(url)\nws.send(JSON.stringify({ type: "join", room }))\n```\n\n- Handles 10k concurrent connections\n- Redis-backed presence',
    links: [{ label: 'GitHub', url: 'https://github.com/example/chat' }],
  })
  log('createProject', pid)
  const after: any[] = await c.query(api.projects.listTeamProjects, { teamId })
  project = after.find((p) => p.name === 'Realtime Chat Service')
}
const projectId = project._id ?? project.projectId
log('projectId', projectId)

// my contribution
await c.mutation(api.contributions.upsertMyContribution, {
  projectId,
  bullets: [
    'Designed and built the websocket gateway handling 10k concurrent connections',
    'Implemented Redis-backed presence with 99.9% uptime',
  ],
})
log('contribution', 'ok')

// resume
let resumes: any[] = await c.query(api.resumes.listMyResumes, {})
let resume = resumes.find((r) => r.name === 'Main Resume')
if (!resume) {
  const rid: any = await c.mutation(api.resumes.createResume, {
    name: 'Main Resume',
    header: {
      fullName: 'Test User',
      headline: 'Backend Engineer',
      email: 'test@folio.dev',
      links: [{ label: 'GitHub', url: 'https://github.com/testuser' }],
    },
  })
  log('createResume', rid)
  resumes = await c.query(api.resumes.listMyResumes, {})
  resume = resumes.find((r) => r.name === 'Main Resume')
}
const resumeId = resume._id ?? resume.resumeId
log('resumeId', resumeId)

// commit a snapshot with a project block on main
const tree: any = await c.query(api.snapshots.getTree, { resumeId })
log('branches', tree.branches?.map((b: any) => b.name))
const main = tree.branches.find((b: any) => b.name === 'main')
const committed: any = await c.mutation(api.snapshots.commit, {
  branchId: main._id,
  message: 'add chat service project',
  blocks: [
    {
      id: '0198f5c2-0000-7000-8000-000000000001',
      type: 'project' as const,
      projectId,
      title: 'Realtime Chat Service',
      subtitle: 'Demo Team',
      bullets: [
        'Designed and built the websocket gateway handling 10k concurrent connections',
        'Implemented Redis-backed presence with 99.9% uptime',
      ],
      links: [{ label: 'GitHub', url: 'https://github.com/example/chat' }],
    },
  ],
  theme: { id: 'classic' },
  header: {
    fullName: 'Test User',
    headline: 'Backend Engineer',
    email: 'test@folio.dev',
    links: [{ label: 'GitHub', url: 'https://github.com/testuser' }],
  },
})
log('commit', committed)

// publish for the public page
const tree2: any = await c.query(api.snapshots.getTree, { resumeId })
const head = tree2.branches.find((b: any) => b.name === 'main').headSnapshotId
try {
  await c.mutation(api.resumes.setUsername, { resumeId, username: 'testuser' })
} catch (e: any) {
  log('setUsername(skip)', e.message?.slice(0, 80))
}
await c.mutation(api.resumes.publish, { resumeId, snapshotId: head })
log('published', head)

console.log(
  JSON.stringify({ teamId, projectId, resumeId, branchId: main._id, done: true }),
)
