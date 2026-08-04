import { Effect } from 'effect'

// Pasted job posts (LinkedIn / WhatsApp) carry shortened links that redirect —
// sometimes several hops — to the real ATS posting. This file turns pasted text
// into resolved URLs. No page content is fetched or parsed.

const MAX_URLS = 5
const MAX_HOPS = 5
const TIMEOUT_MS = 8_000
// Shorteners and some ATS hosts 403 the default fetch agent.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const NOISE_HOSTS = new Set([
  'whatsapp.com',
  'chat.whatsapp.com',
  't.me',
  'telegram.me',
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'youtube.com',
  'youtu.be',
])

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s<>"']+/gi) ?? []
  const seen = new Set<string>()
  for (const raw of matches) {
    const url = raw.replace(/[.,;:!?)\]}"'>]+$/, '')
    const host = hostOf(url)
    if (!host || NOISE_HOSTS.has(host) || seen.has(url)) continue
    seen.add(url)
    if (seen.size === MAX_URLS) break
  }
  return [...seen]
}

const isBlockedHost = (hostname: string): boolean => {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (host === 'localhost' || host === 'metadata.google.internal') return true
  if (host.endsWith('.local') || host.endsWith('.internal')) return true
  if (host === '::1' || /^f[cd][0-9a-f]{2}:/.test(host)) return true
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!ipv4) return false
  const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
}

const isSafeUrl = (url: string): boolean => {
  try {
    const u = new URL(url)
    return (u.protocol === 'http:' || u.protocol === 'https:') && !isBlockedHost(u.hostname)
  } catch {
    return false
  }
}

const fetchOnce = async (url: string, signal: AbortSignal): Promise<Response> => {
  const init = {
    redirect: 'manual' as const,
    signal,
    headers: { 'user-agent': USER_AGENT, accept: '*/*' },
  }
  // Plenty of hosts reject HEAD (405/501) or just hang up on it; GET is the fallback.
  try {
    const res = await fetch(url, { ...init, method: 'HEAD' })
    if (res.status !== 405 && res.status !== 501) return res
  } catch {
    /* fall through to GET */
  }
  return fetch(url, { ...init, method: 'GET' })
}

export type ResolvedUrl = { finalUrl: string; hops: string[]; status: number }

// Best-effort: every failure (timeout, DNS, TLS, blocked host, non-2xx) is `null`
// so this can never fail the surrounding action.
export const resolveUrl = (url: string): Effect.Effect<ResolvedUrl | null> =>
  Effect.promise(async () => {
    const signal = AbortSignal.timeout(TIMEOUT_MS)
    const hops: string[] = []
    let current = url
    try {
      for (let i = 0; i <= MAX_HOPS; i++) {
        // Re-checked on every hop, not just the first: a redirect can point inward.
        if (!isSafeUrl(current)) return null
        hops.push(current)
        const res = await fetchOnce(current, signal)
        const location = res.headers.get('location')
        if (res.status >= 300 && res.status < 400 && location) {
          current = new URL(location, current).toString()
          continue
        }
        return res.ok ? { finalUrl: current, hops, status: res.status } : null
      }
      return null
    } catch {
      return null
    }
  })

export const resolveUrls = (
  text: string,
): Effect.Effect<{ url: string; finalUrl: string }[]> =>
  Effect.forEach(
    extractUrls(text),
    (url) =>
      resolveUrl(url).pipe(Effect.map((r) => (r ? { url, finalUrl: r.finalUrl } : null))),
    { concurrency: 3 },
  ).pipe(Effect.map((rs) => rs.filter((r) => r !== null)))
