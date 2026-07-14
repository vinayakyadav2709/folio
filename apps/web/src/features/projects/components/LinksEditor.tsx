import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type Link = { label: string; url: string }

export function LinksEditor({
  links,
  onChange,
}: {
  links: Link[]
  onChange: (links: Link[]) => void
}) {
  function update(i: number, patch: Partial<Link>) {
    onChange(links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  function remove(i: number) {
    onChange(links.filter((_, idx) => idx !== i))
  }
  function add() {
    onChange([...links, { label: '', url: '' }])
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Links</Label>
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            placeholder="Label (e.g. Repo)"
            value={link.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className="w-40"
          />
          <Input
            placeholder="https://…"
            value={link.url}
            onChange={(e) => update(i, { url: e.target.value })}
            className="flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(i)}
            aria-label="Remove link"
          >
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add} className="self-start">
        <Plus /> Add link
      </Button>
    </div>
  )
}
