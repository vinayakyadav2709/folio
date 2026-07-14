import { BotIcon } from 'lucide-react'
import type { TreeBranch } from '../lib/layout'

export function BranchLegend({ branches }: { branches: TreeBranch[] }) {
  return (
    <div className="absolute top-3 left-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1.5">
      {branches.map((b) => (
        <span
          key={b._id}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-2.5 py-1 font-medium text-xs shadow-xs backdrop-blur"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: b.color }}
            aria-hidden
          />
          {b.name}
          {b.createdByAi && (
            <BotIcon className="size-3 text-muted-foreground" aria-label="AI-created" />
          )}
        </span>
      ))}
    </div>
  )
}
