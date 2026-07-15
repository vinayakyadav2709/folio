import { UsersIcon } from 'lucide-react'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type TeamOption = { _id: string; name: string }

export const ALL_TEAMS = 'all'

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
    ...teams.map((t) => ({ value: t._id, label: t.name })),
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
