import { Effect } from 'effect'

// Human-readable URL slug from a display name: lowercase, non-alphanumeric runs
// collapse to a single hyphen, no edge hyphens, capped at ~60 chars.
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') // slice may have cut mid-hyphen
}

// First free slug given a "does this slug already exist?" predicate: try the
// base, then base-2, base-3, … No random suffixes — collisions are numbered.
export const uniqueSlug = (
  base: string,
  exists: (slug: string) => Effect.Effect<boolean>,
): Effect.Effect<string> =>
  Effect.gen(function* () {
    const safeBase = base || 'untitled'
    let candidate = safeBase
    let n = 2
    while (yield* exists(candidate)) {
      candidate = `${safeBase}-${n}`
      n += 1
    }
    return candidate
  })
