import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction } from 'convex/react'
import type { FunctionReturnType } from 'convex/server'
import { Sparkles } from 'lucide-react'
import { api } from '@folio/backend/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { convexErrorData, errorMessage } from '../lib/convexError'

export type ExtractedProject = FunctionReturnType<typeof api.ai.extractProject>

/**
 * Paste-to-fill affordance. Hands the extracted project back to the form —
 * the form owns which fields it applies. Never saves anything itself.
 */
export function AiFillZone({ onFill }: { onFill: (p: ExtractedProject) => void }) {
  const extractProject = useAction(api.ai.extractProject)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [noKey, setNoKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFillClick() {
    setLoading(true)
    setNoKey(false)
    setError(null)
    try {
      onFill(await extractProject({ text }))
    } catch (err) {
      const data = convexErrorData(err)
      if (data && data.message.toLowerCase().includes('no ai key')) setNoKey(true)
      else setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/8 to-sky-500/8 p-3 dark:border-violet-400/25">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-violet-500 dark:text-violet-300" />
        <span className="font-medium text-sm">Fill with AI</span>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste anything about this project — a README, notes, a chat message…"
        className="min-h-24 resize-y bg-background/70 text-sm"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onFillClick}
          loading={loading}
          disabled={!text.trim() || loading}
          className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-sky-500/10 transition-[background-color,box-shadow,scale] hover:from-violet-500/20 hover:to-sky-500/20 active:scale-[0.96] dark:border-violet-400/30"
        >
          <Sparkles className="text-violet-500 dark:text-violet-300" /> Fill with AI
        </Button>
        <span className="text-muted-foreground text-xs text-pretty">
          Fills the fields below — review and edit before saving.
        </span>
      </div>
      {noKey && (
        <p className="text-muted-foreground text-sm">
          No AI key configured.{' '}
          <Link to="/dashboard/settings" className="underline underline-offset-4">
            Add one in Settings
          </Link>{' '}
          to use AI assist.
        </p>
      )}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
