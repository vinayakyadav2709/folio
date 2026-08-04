import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Block } from '../lib/blocks'
import { errorMessage } from '../lib/errors'

// Rewrites project + experience bullets against a job description. Applies to
// local editor state only — the user reviews in the preview and commits.
export function TailorPanel({
  blocks,
  onBlocks,
}: {
  blocks: Block[]
  onBlocks: (blocks: Block[]) => void
}) {
  const jobs = useQuery(api.jobs.listJobs, {})
  const tailor = useAction(api.ai.tailorBlocks)
  const [jobId, setJobId] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targets = blocks.filter((b) => b.type === 'project' || b.type === 'experience')
  const jobDescription = pasted.trim() || jobs?.find((j) => j._id === jobId)?.description || ''

  async function onTailor() {
    setLoading(true)
    setError(null)
    try {
      const out = await tailor({
        jobDescription,
        blocks: targets.map((b) => ({
          id: b.id,
          type: b.type,
          title: b.title,
          subtitle: b.subtitle,
          bullets: b.bullets,
        })),
      })
      const byId = new Map(out.map((b) => [b.id, b.bullets]))
      onBlocks(blocks.map((b) => (byId.has(b.id) ? { ...b, bullets: byId.get(b.id)! } : b)))
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Select
        value={jobId}
        onValueChange={(value) => setJobId(value as string)}
        items={Object.fromEntries((jobs ?? []).map((j) => [j._id, `${j.role} — ${j.company}`]))}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder="Pick a saved job" />
        </SelectTrigger>
        <SelectPopup>
          {(jobs ?? []).map((j) => (
            <SelectItem key={j._id} value={j._id}>
              {j.role} — {j.company}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      <Textarea
        size="sm"
        value={pasted}
        placeholder="…or paste a job description"
        onChange={(e) => setPasted(e.target.value)}
      />
      <Button
        size="sm"
        variant="outline"
        className="self-start transition-[background-color,box-shadow,scale] active:scale-[0.96]"
        loading={loading}
        disabled={loading || !jobDescription || targets.length === 0}
        onClick={onTailor}
      >
        <SparklesIcon /> Tailor bullets
      </Button>
      {targets.length === 0 && (
        <p className="text-muted-foreground text-xs text-pretty">
          Add a project or experience block first.
        </p>
      )}
      {error && (
        <p className="text-destructive text-xs text-pretty">
          {error.toLowerCase().includes('no ai key') ? (
            <>
              No AI key configured.{' '}
              <Link to="/dashboard/settings" className="underline underline-offset-4">
                Add one in Settings
              </Link>{' '}
              to use AI assist.
            </>
          ) : (
            error
          )}
        </p>
      )}
    </div>
  )
}
