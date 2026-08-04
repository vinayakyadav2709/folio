import { useState } from 'react'
import { CheckIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// ponytail: first entry is the default model for that provider.
const models: Record<Provider, { id: string; label: string }[]> = {
  anthropic: [
    { id: 'claude-sonnet-5', label: 'Sonnet 5 — balanced' },
    { id: 'claude-opus-5', label: 'Opus 5 — most capable' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 — fastest, cheapest' },
    { id: 'claude-fable-5', label: 'Fable 5' },
  ],
  openai: [
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5.6', label: 'GPT-5.6 Sol — most capable' },
    { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra — balanced' },
    { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna — cheapest' },
  ],
  google: [
    { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite — cheap, free tier' },
    { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — cheapest' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash — newest' },
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash — most capable' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro — expensive' },
  ],
}

export function AiKeysCard() {
  const status = useQuery(api.aiKeys.myKeyStatus)
  const configured = new Set(status?.filter((s) => s.configured).map((s) => s.provider))
  const chosen = new Map(status?.map((s) => [s.provider, s.model]))
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
                model={chosen.get(p.id)}
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
  model,
  preferred,
}: {
  provider: Provider
  label: string
  monogram: string
  tone: string
  configured: boolean
  model: string | undefined
  preferred: boolean
}) {
  const setKey = useMutation(api.aiKeys.setKey)
  const removeKey = useMutation(api.aiKeys.removeKey)
  const setModel = useMutation(api.aiKeys.setModel)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [pendingModel, setPendingModel] = useState<string | null>(null)
  const options = models[provider]

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

  async function onModelChange(value: string) {
    setError(null)
    setPendingModel(value)
    try {
      await setModel({ provider, model: value || undefined })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      // Convex resolves the mutation only once local queries reflect it.
      setPendingModel(null)
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

      {configured && (
        <div className="flex items-center gap-2.5 pl-13">
          <span className="font-mono text-[11px] text-muted-foreground">Model</span>
          <Select
            value={pendingModel ?? model ?? ''}
            onValueChange={(value) => void onModelChange(value as string)}
            disabled={pendingModel !== null}
            items={Object.fromEntries([
              ['', `Default (${options[0].id})`],
              ...options.map((m) => [m.id, m.label]),
            ])}
          >
            <SelectTrigger size="sm" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="">Default ({options[0].id})</SelectItem>
              {options.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {pendingModel !== null && (
            <span className="font-mono text-[11px] text-muted-foreground">Saving…</span>
          )}
        </div>
      )}

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
