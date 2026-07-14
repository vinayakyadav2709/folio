import { useState } from 'react'
import { PlusIcon, UsersRoundIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage, toKebab } from '../lib/errors'

export function CreateTeamDialog({
  triggerLabel = 'Create team',
}: {
  triggerLabel?: string
} = {}) {
  const navigate = useNavigate()
  const createTeam = useMutation(api.teams.createTeam)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function reset() {
    setName('')
    setSlug('')
    setSlugEdited(false)
    setError(null)
    setSaving(false)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const team = await createTeam({ name, slug })
      setOpen(false)
      reset()
      navigate({ to: '/dashboard/teams/$teamId', params: { teamId: team._id } })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          <Button className="active:scale-[0.98] transition-transform">
            <PlusIcon />
            {triggerLabel}
          </Button>
        }
      />
      <DialogPopup>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-foreground shadow-xs/5">
              <UsersRoundIcon className="size-4 opacity-80" />
            </div>
            <div>
              <DialogTitle>Create team</DialogTitle>
              <p className="mt-0.5 text-muted-foreground text-sm">
                You can rename it later in settings.
              </p>
            </div>
          </div>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Name</FieldLabel>
              <Input
                value={name}
                autoFocus
                onChange={(e) => {
                  setName(e.target.value)
                  if (!slugEdited) setSlug(toKebab(e.target.value))
                }}
                placeholder="Acme Inc"
              />
            </Field>
            <Field>
              <FieldLabel>Slug</FieldLabel>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true)
                  setSlug(e.target.value)
                }}
                placeholder="acme-inc"
                className="font-mono"
              />
              {slug && !error && (
                <p className="text-muted-foreground text-xs">
                  Your team lives at{' '}
                  <span className="font-mono text-foreground">
                    /dashboard/teams/{slug}
                  </span>
                </p>
              )}
              {error && <FieldError>{error}</FieldError>}
            </Field>
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" loading={saving} disabled={saving || !name || !slug}>
              {saving ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogPopup>
    </Dialog>
  )
}
