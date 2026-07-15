import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { errorMessage } from '../lib/errors'
import { Panel, PanelSection } from './settings-panel'

type Provider = 'anthropic' | 'openai' | 'google'

const providers: {
  id: Provider
  label: string
  monogram: string
  tone: string
}[] = [
  {
    id: 'anthropic',
    label: 'Anthropic',
    monogram: 'AN',
    tone: 'bg-[#d97757] text-white',
  },
  { id: 'openai', label: 'OpenAI', monogram: 'AI', tone: 'bg-foreground text-background' },
  {
    id: 'google',
    label: 'Google',
    monogram: 'GE',
    tone: 'bg-[#4285f4] text-white',
  },
]

export function AiKeysCard() {
  const status = useQuery(api.aiKeys.myKeyStatus)
  const configured = new Set(status?.filter((s) => s.configured).map((s) => s.provider))
  const preferred = providers.find((p) => configured.has(p.id))?.id

  return (
    <Panel>
      <PanelSection
        title="AI keys"
        hint="Bring your own keys. Encrypted at rest with your workspace secret and only ever used server-side — never logged, never returned to the browser. You pay your provider directly."
      >
        <div className="flex flex-col">
          {providers.map((p, i) => (
            <div key={p.id}>
              {i > 0 && <Separator className="my-1" />}
              <ProviderRow
                provider={p.id}
                label={p.label}
                monogram={p.monogram}
                tone={p.tone}
                configured={configured.has(p.id)}
                preferred={p.id === preferred}
              />
            </div>
          ))}
        </div>
      </PanelSection>
    </Panel>
  )
}

function ProviderRow({
  provider,
  label,
  monogram,
  tone,
  configured,
  preferred,
}: {
  provider: Provider
  label: string
  monogram: string
  tone: string
  configured: boolean
  preferred: boolean
}) {
  const setKey = useMutation(api.aiKeys.setKey)
  const removeKey = useMutation(api.aiKeys.removeKey)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await setKey({ provider, apiKey })
      setApiKey('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function onRemove() {
    setError(null)
    setRemoving(true)
    try {
      await removeKey({ provider })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 py-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-mono font-medium text-[11px] tracking-wide ${tone}`}
        >
          {monogram}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{label}</span>
            {preferred && (
              <Badge variant="outline" size="sm" className="font-mono text-[9px] uppercase tracking-[0.18em]">
                Preferred
              </Badge>
            )}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
            {configured ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                Key configured · <span className="tracking-[0.2em]">••••••••••</span>
              </span>
            ) : (
              'No key set'
            )}
          </div>
        </div>
        {configured ? (
          <Button variant="destructive-outline" size="sm" onClick={onRemove} disabled={removing}>
            {removing ? 'Removing…' : 'Remove'}
          </Button>
        ) : (
          <Badge variant="outline" size="sm" className="font-mono text-[9px] uppercase tracking-[0.18em]">
            Not configured
          </Badge>
        )}
      </div>

      {!configured && (
        <form onSubmit={onSave} className="flex items-start gap-2 pl-13">
          <div className="flex-1">
            <label className="sr-only" htmlFor={`ai-key-${provider}`}>
              {label} API key
            </label>
            <Input
              id={`ai-key-${provider}`}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${label} API key`}
              autoComplete="off"
              className="font-mono text-sm"
            />
            {error && <p className="mt-1.5 text-destructive-foreground text-xs">{error}</p>}
          </div>
          <Button type="submit" size="sm" disabled={saving || !apiKey}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      )}
      {configured && error && <p className="pl-13 text-destructive-foreground text-xs">{error}</p>}
    </div>
  )
}
