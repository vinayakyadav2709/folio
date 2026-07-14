// Temp CDP screenshot script (deleted after use). Run: bun e2e-shots.mts
import { spawn } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const OUT = '/tmp/claude-1000/-home-falcon-Projects-portfolioManager/a87a608e-dc40-4b69-8a7e-464c9519fd2b/scratchpad/shots'
mkdirSync(OUT, { recursive: true })

// session cookie from the curl jar
const jar = readFileSync('/tmp/claude-1000/e2e-jar.txt', 'utf8')
const line = jar.split('\n').find((l) => l.includes('better-auth.session_token'))!
const parts = line.split('\t')
const cookie = { name: parts[5], value: parts[6] }

const ids = {
  team: 'k576w1004268he0var53y6hbe98adb3h',
  project: 'js76fh8zavhcw85zwy3t0sjnmx8acyk4',
  resume: 'jx77z6jfbeknb3gy1qs3d9ktxx8ad2jb',
}
const B = 'http://127.0.0.1:4100'
const PAGES: Array<[string, string, number]> = [
  ['01-landing', `${B}/`, 2500],
  ['02-dashboard-home', `${B}/dashboard`, 3000],
  ['03-teams', `${B}/dashboard/teams`, 3000],
  ['04-team-detail', `${B}/dashboard/teams/${ids.team}`, 3000],
  ['05-projects', `${B}/dashboard/projects`, 3500],
  ['06-project-new', `${B}/dashboard/projects/new`, 3000],
  ['07-project-detail', `${B}/dashboard/projects/${ids.project}`, 3500],
  ['08-resumes', `${B}/dashboard/resumes`, 3000],
  ['09-editor', `${B}/dashboard/resumes/${ids.resume}`, 4500],
  ['10-version-tree', `${B}/dashboard/resumes/${ids.resume}/tree`, 4500],
  ['11-settings', `${B}/dashboard/settings`, 3000],
  ['12-public-resume', `${B}/u/testuser`, 2500],
  ['13-public-team', `${B}/team/demo-team`, 2500],
  ['14-public-project', `${B}/p/${ids.project}`, 2500],
]

const chrome = spawn(
  '/usr/lib64/chromium-browser/chromium-browser',
  [
    '--headless=new',
    '--remote-debugging-port=9777',
    '--window-size=1920,1080',
    '--hide-scrollbars',
    '--no-first-run',
    `--user-data-dir=/tmp/claude-1000/chrome-e2e-profile`,
    'about:blank',
  ],
  { stdio: 'ignore' },
)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// wait for devtools
let targets: any = null
for (let i = 0; i < 40; i++) {
  try {
    targets = await (await fetch('http://127.0.0.1:9777/json/list')).json()
    if (targets.length) break
  } catch {}
  await sleep(500)
}
if (!targets?.length) throw new Error('chrome devtools not up')

const ws = new WebSocket(targets[0].webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let msgId = 0
const pending = new Map<number, (v: any) => void>()
const events: Record<string, () => void> = {}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data as string)
  if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id) }
  if (m.method && events[m.method]) events[m.method]()
}
const cdp = (method: string, params: any = {}) =>
  new Promise<any>((res) => {
    const id = ++msgId
    pending.set(id, res)
    ws.send(JSON.stringify({ id, method, params }))
  })

await cdp('Network.enable')
await cdp('Page.enable')
await cdp('Network.setCookie', { name: cookie.name, value: cookie.value, url: B })

for (const [name, url, settle] of PAGES) {
  const loaded = new Promise<void>((res) => { events['Page.loadEventFired'] = res })
  await cdp('Page.navigate', { url })
  await Promise.race([loaded, sleep(15000)])
  await sleep(settle)
  const shot = await cdp('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${OUT}/${name}.png`, Buffer.from(shot.result.data, 'base64'))
  console.log('captured', name)
}

ws.close()
chrome.kill()
console.log('DONE', OUT)
