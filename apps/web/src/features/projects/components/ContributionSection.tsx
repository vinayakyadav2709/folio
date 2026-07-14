import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardPanel } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '../lib/convexError'
import { Monogram } from './avatars'

type Contribution = { userId: string; bullets: string[] }

export function ContributionSection({
  projectId,
  contributions,
  meId,
  nameOf,
}: {
  projectId: Id<'projects'>
  contributions: Contribution[]
  meId: string | null
  nameOf: (userId: string) => string
}) {
  const upsert = useMutation(api.contributions.upsertMyContribution)
  const remove = useMutation(api.contributions.deleteMyContribution)

  const mine = contributions.find((c) => c.userId === meId)
  const others = contributions.filter((c) => c.userId !== meId)

  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText((mine?.bullets ?? []).join('\n'))
  }, [mine?.bullets])

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      const bullets = text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      await upsert({ projectId, bullets })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading font-semibold text-lg">My contribution</h2>
        <p className="text-muted-foreground text-sm">
          Your personal bullets on this shared project — one per line.
        </p>
      </div>

      <Card className="border-primary/25 bg-primary/[0.03] ring-1 ring-primary/10">
        <CardPanel className="flex flex-col gap-3 py-5">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Built the auth service\nDesigned the onboarding flow'}
            className="min-h-32 resize-y bg-background"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={onSave}
              loading={saving}
              disabled={saving}
              size="sm"
              className="active:scale-[0.96]"
            >
              Save my bullets
            </Button>
            {mine && (
              <Button
                variant="destructive-outline"
                size="sm"
                className="active:scale-[0.96]"
                onClick={() => remove({ projectId }).catch((err) => setError(errorMessage(err)))}
              >
                Delete
              </Button>
            )}
          </div>
        </CardPanel>
      </Card>

      {others.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
            Other contributors · {others.length}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((c) => (
              <Card key={c.userId}>
                <CardPanel className="flex gap-3 py-4">
                  <Monogram name={nameOf(c.userId)} className="size-8 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{nameOf(c.userId)}</p>
                    {c.bullets.length > 0 ? (
                      <ul className="mt-1.5 flex flex-col gap-1 text-muted-foreground text-sm">
                        {c.bullets.map((b, i) => (
                          <li key={i} className="flex gap-2 text-pretty">
                            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-muted-foreground text-xs">No bullets yet.</p>
                    )}
                  </div>
                </CardPanel>
              </Card>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
