import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Two-letter initials from a display name. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Deterministic hue (0-359) from an arbitrary string seed. */
export function hueFrom(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

// Token-friendly tints that stay legible in both light and dark themes.
const TINTS = [
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
]

export function tintFor(seed: string): string {
  return TINTS[hueFrom(seed) % TINTS.length]
}

/** A single monogram avatar tinted deterministically from the name. */
export function Monogram({ name, className }: { name: string; className?: string }) {
  return (
    <Avatar className={cn('size-8', className)}>
      <AvatarFallback className={cn('font-medium', tintFor(name))}>{initials(name)}</AvatarFallback>
    </Avatar>
  )
}

/** Overlapping stack of monogram avatars with a +N overflow chip. */
export function AvatarStack({
  names,
  max = 4,
  className,
}: {
  names: string[]
  max?: number
  className?: string
}) {
  const shown = names.slice(0, max)
  const extra = names.length - shown.length
  return (
    <div className={cn('flex items-center -space-x-2', className)}>
      {shown.map((n, i) => (
        <Avatar
          key={`${n}-${i}`}
          className="size-7 border-2 border-card"
          style={{ zIndex: max - i }}
        >
          <AvatarFallback className={cn('text-[10px] font-medium', tintFor(n))}>
            {initials(n)}
          </AvatarFallback>
        </Avatar>
      ))}
      {extra > 0 && (
        <div className="z-0 flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted font-medium text-[10px] text-muted-foreground tabular-nums">
          +{extra}
        </div>
      )}
    </div>
  )
}
