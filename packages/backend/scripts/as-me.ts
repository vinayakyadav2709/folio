// Run a task as yourself against a folio deployment, through the normal
// auth-checked public API (no temporary deploys, no internal functions).
//
//   bun scripts/as-me.ts scripts/tasks/<task>.ts            # prod
//   SITE=http://127.0.0.1:4100 CONVEX_URL=<dev .convex.cloud> bun scripts/as-me.ts <task>
//
// Prompts for email + password; they are sent only to SITE's sign-in endpoint
// and never stored. A task default-exports `async ({ client, api }) => …`.
import path from 'node:path'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../convex/_generated/api'

const SITE = process.env.SITE ?? 'https://folio.gandivalabs.com'
const CONVEX_URL = process.env.CONVEX_URL ?? 'https://giddy-dogfish-683.convex.cloud'

const taskPath = process.argv[2]
if (!taskPath) throw new Error('usage: bun scripts/as-me.ts <task.ts>')
const task = (await import(Bun.pathToFileURL(path.resolve(taskPath)).href)).default

// Read a line without echoing it (for the password).
function readHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) return Promise.resolve(prompt(question) ?? '') // piped input
  process.stdout.write(question)
  return new Promise((resolve) => {
    let input = ''
    process.stdin.setRawMode(true)
    process.stdin.resume()
    const onData = (buf: Buffer) => {
      for (const ch of buf.toString('utf8')) {
        if (ch === '\r' || ch === '\n') {
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdin.off('data', onData)
          process.stdout.write('\n')
          return resolve(input)
        }
        if (ch === '\u0003') process.exit(130) // Ctrl-C
        input = ch === '\u007f' ? input.slice(0, -1) : input + ch
      }
    }
    process.stdin.on('data', onData)
  })
}

const email = prompt(`Email for ${SITE}:`)?.trim()
const password = await readHidden('Password: ')
if (!email || !password) throw new Error('email and password are required')

const signIn = await fetch(`${SITE}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: SITE },
  body: JSON.stringify({ email, password }),
})
if (!signIn.ok) throw new Error(`sign-in failed: ${signIn.status} ${await signIn.text()}`)
const cookie = signIn.headers
  .getSetCookie()
  .map((c) => c.split(';')[0])
  .join('; ')

const tokenRes = await fetch(`${SITE}/api/auth/convex/token`, { headers: { Cookie: cookie, Origin: SITE } })
const { token } = (await tokenRes.json()) as { token?: string }
if (!token) throw new Error(`could not get a Convex token: ${tokenRes.status}`)

const client = new ConvexHttpClient(CONVEX_URL)
client.setAuth(token)
const me = await client.query(api.profiles.getMyProfile, {})
console.log(`Signed in as ${me?.fullName ?? email} (@${me?.username ?? '?'}) on ${SITE}\n`)

await task({ client, api })
console.log('\nDone.')
