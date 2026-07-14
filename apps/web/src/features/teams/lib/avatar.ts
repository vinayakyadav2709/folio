// Avatar helpers for member/team rows — initials + a deterministic tone so the
// same name always gets the same color across renders and sessions.

const TONES = [
  'bg-rose-500/15 text-rose-600 dark:text-rose-300',
  'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  'bg-sky-500/15 text-sky-600 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
  'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300',
  'bg-teal-500/15 text-teal-600 dark:text-teal-300',
]

export function initials(source: string | null | undefined): string {
  const s = (source ?? '').trim()
  if (!s) return '?'
  const parts = s.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function toneFor(seed: string | null | undefined): string {
  const s = seed ?? ''
  let hash = 0
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0
  return TONES[Math.abs(hash) % TONES.length]!
}
