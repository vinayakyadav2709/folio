import { cn } from '@/lib/utils'

export type TeamOption = { _id: string; name: string }

export function TeamPicker({
  teams,
  selectedId,
  onSelect,
}: {
  teams: TeamOption[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (teams.length === 0) return null
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1 shadow-xs/5">
      {teams.map((team) => {
        const active = team._id === selectedId
        return (
          <button
            key={team._id}
            type="button"
            onClick={() => onSelect(team._id)}
            aria-pressed={active}
            className={cn(
              'relative rounded-lg px-3 py-1.5 font-medium text-sm outline-none transition-[color,background-color,box-shadow,scale] duration-150 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]',
              active
                ? 'bg-foreground text-background shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {team.name}
          </button>
        )
      })}
    </div>
  )
}
