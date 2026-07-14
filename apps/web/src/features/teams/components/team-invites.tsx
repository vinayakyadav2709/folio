import { useState } from 'react'
import { MailIcon, UserPlusIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '../lib/errors'
import { RoleBadge } from './role-badge'

type Role = 'admin' | 'member'

export function TeamInvites({ teamId }: { teamId: Id<'teams'> }) {
  const invites = useQuery(api.invites.listInvites, { teamId })
  const createInvite = useMutation(api.invites.createInvite)
  const revokeInvite = useMutation(api.invites.revokeInvite)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await createInvite({ teamId, email, role })
      setEmail('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function onRevoke(inviteId: Id<'invites'>) {
    setError(null)
    try {
      await revokeInvite({ inviteId })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading font-semibold text-lg">Invites</h2>
        <p className="text-muted-foreground text-sm">
          Invite people by email. They'll appear here until they accept.
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs/5 sm:flex-row sm:items-end"
      >
        <Field className="flex-1">
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
          />
        </Field>
        <Field className="sm:w-36">
          <FieldLabel>Role</FieldLabel>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="member">member</SelectItem>
              <SelectItem value="admin">admin</SelectItem>
            </SelectPopup>
          </Select>
        </Field>
        <Button type="submit" loading={saving} disabled={saving || !email}>
          <UserPlusIcon />
          {saving ? 'Inviting…' : 'Invite'}
        </Button>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}

      {invites === undefined ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : invites.length === 0 ? (
        <p className="text-muted-foreground text-sm">No pending invites.</p>
      ) : (
        <ul className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
          {invites.map((invite) => (
            <li
              key={invite._id}
              className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <MailIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{invite.email}</span>
                  <Badge
                    variant="warning"
                    size="sm"
                    className="font-mono text-[9px] uppercase tracking-wider"
                  >
                    pending
                  </Badge>
                </div>
              </div>
              <RoleBadge role={invite.role} />
              <Button
                size="sm"
                variant="destructive-outline"
                onClick={() => onRevoke(invite._id)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
