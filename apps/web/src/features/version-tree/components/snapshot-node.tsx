import { Handle, Position, type NodeProps } from '@xyflow/react'
import { BotIcon, SendIcon } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { cn } from '#/lib/utils'
import { averageScore, relativeTime } from '../lib/format'
import type { SnapshotNode as SnapshotNodeType } from '../lib/layout'

export function SnapshotNode({ data, selected }: NodeProps<SnapshotNodeType>) {
  return (
    <div
      className={cn(
        'relative w-64 overflow-hidden rounded-xl bg-card px-3 py-2.5 text-left shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_1px_2px_-1px_rgba(0,0,0,0.06),0_2px_4px_0_rgba(0,0,0,0.04)] transition-shadow duration-150 ease-out hover:shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_2px_4px_-1px_rgba(0,0,0,0.08),0_6px_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.08)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.13)]',
        selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
      )}
    >
      <Handle type="target" position={Position.Top} className="!size-2 !border-2 !border-background !bg-muted-foreground/70" />
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 font-medium text-sm leading-snug text-pretty">{data.message}</p>
        {data.isHead && (
          <span className="mt-0.5 shrink-0 rounded-full border border-border/60 bg-background px-1.5 py-px font-mono text-[9px] text-muted-foreground uppercase tracking-[0.15em]">
            head
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground tabular-nums">
        {/* Branch color, matches the legend. */}
        <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: data.color }} />
        <span>{relativeTime(data.creationTime)}</span>
        <span aria-hidden>·</span>
        <span>
          {data.blockCount} block{data.blockCount === 1 ? '' : 's'}
        </span>
      </div>
      {(data.createdByAi || data.sentTo || data.atsScores) && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {data.createdByAi && (
            <Badge size="sm" variant="info" className="gap-1">
              <BotIcon className="size-2.5" /> AI
            </Badge>
          )}
          {data.sentTo && (
            <Badge size="sm" variant="success" className="gap-1">
              <SendIcon className="size-2.5" /> {data.sentTo.company}
            </Badge>
          )}
          {data.atsScores && (
            <Badge size="sm" variant="outline" className="tabular-nums">
              ATS {averageScore(data.atsScores)}
            </Badge>
          )}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!size-2 !border-2 !border-background !bg-muted-foreground/70" />
    </div>
  )
}
