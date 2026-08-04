import { UsersIcon } from 'lucide-react'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type TeamOption = { _id: string; name: string; personal?: boolean }

export const ALL_TEAMS = 'all'

/** The personal team is the private default home, so it always leads the list. */
export function sortTeams<T extends { personal?: boolean }>(teams: readonly T[]): T[] {
  return [...teams].sort((a, b) => Number(b.personal ?? false) - Number(a.personal ?? false))
}

/** Label a team in any picker — the personal one is marked as the private option. */
export function teamLabel(team: TeamOption): string {
  return team.personal ? `${team.name} · Personal` : team.name
}

/**
 * Compact team selector — the devl filter-toolbar scoped-select pattern.
 * `allOption` adds an "All teams" entry for filtering contexts (the projects
 * list); leave it off where a single concrete team is required (new project).
 */
export function TeamPicker({
  teams,
  selectedId,
  onSelect,
  allOption = false,
  className,
}: {
  teams: TeamOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  allOption?: boolean
  className?: string
}) {
  if (teams.length === 0) return null
  const items = [
    ...(allOption ? [{ value: ALL_TEAMS, label: 'All teams' }] : []),
    ...sortTeams(teams).map((t) => ({ value: t._id, label: teamLabel(t) })),
  ]
  return (
    <Select
      items={items}
      value={selectedId ?? undefined}
      onValueChange={(v) => {
        if (v) onSelect(v)
      }}
    >
      <SelectTrigger className={cn('w-56 max-w-full', className)} size="sm">
        <UsersIcon className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectPopup>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectPopup>
    </Select>
  )
}
