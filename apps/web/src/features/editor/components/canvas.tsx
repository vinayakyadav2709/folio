import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LayersIcon } from 'lucide-react'
import { BlockCard } from './block-card'
import { reorder, type Block } from '../lib/blocks'

export function Canvas({
  blocks,
  onChange,
}: {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor))

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const from = blocks.findIndex((b) => b.id === active.id)
    const to = blocks.findIndex((b) => b.id === over.id)
    if (from >= 0 && to >= 0) onChange(reorder(blocks, from, to))
  }

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 border-dashed px-8 py-16 text-center">
        <span className="flex size-10 items-center justify-center rounded-lg border border-border/60 bg-card text-muted-foreground">
          <LayersIcon className="size-4.5" />
        </span>
        <div>
          <p className="font-medium text-sm">Empty resume</p>
          <p className="mt-1 text-muted-foreground text-sm text-pretty">
            Add a project or a blank block from the library on the left.
          </p>
        </div>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-3">
          {blocks.map((block, i) => (
            <SortableBlock
              key={block.id}
              block={block}
              onChange={(next) => onChange(blocks.map((b, j) => (j === i ? next : b)))}
              onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function SortableBlock({
  block,
  onChange,
  onRemove,
}: {
  block: Block
  onChange: (block: Block) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-10 opacity-90 drop-shadow-xl' : undefined}
    >
      <BlockCard
        block={block}
        onChange={onChange}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
