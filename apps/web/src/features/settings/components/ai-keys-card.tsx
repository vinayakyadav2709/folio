import { useState } from 'react'
import { CheckIcon, ShieldCheckIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '../lib/errors'

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
    <div className="mx-auto w-full max-w-2xl">
      <header>
        <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
          Settings · AI keys
        </div>
        <h1 className="mt-1 font-heading font-semibold text-2xl tracking-tight">
          Bring your own keys
        </h1>
        <p className="mt-1.5 max-w-prose text-pretty text-muted-foreground text-sm leading-relaxed">
          Keys are encrypted at rest and only ever used server-side to call the provider on your
          behalf — you pay your own provider directly.
        </p>
      </header>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-border/60 bg-emerald-500/[0.04] p-4">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="text-muted-foreground text-xs leading-relaxed">
          Encrypted with your workspace secret. We never log key material and never expose it back to
          the browser.
        </div>
      </div>

      <ul className="mt-4 divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
        {providers.map((p) => (
          <ProviderRow
            key={p.id}
            provider={p.id}
            label={p.label}
            monogram={p.monogram}
            tone={p.tone}
            configured={configured.has(p.id)}
            preferred={p.id === preferred}
          />
        ))}
      </ul>
    </div>
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
    <li className="flex flex-col gap-3 p-4">
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
          <Field className="flex-1">
            <FieldLabel className="sr-only">{label} API key</FieldLabel>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`${label} API key`}
              autoComplete="off"
              className="font-mono text-sm"
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <Button type="submit" size="sm" disabled={saving || !apiKey}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </form>
      )}
      {configured && error && (
        <p className="pl-13 text-destructive-foreground text-xs">{error}</p>
      )}
    </li>
  )
}
