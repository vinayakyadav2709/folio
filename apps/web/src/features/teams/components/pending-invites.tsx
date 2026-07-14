import { useState } from 'react'
import { MailPlusIcon } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { RoleBadge } from './role-badge'
import { errorMessage } from '../lib/errors'

export function PendingInvites() {
  const invites = useQuery(api.invites.listMyInvites)
  const accept = useMutation(api.invites.acceptInvite)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!invites || invites.length === 0) return null

  async function onAccept(inviteId: Id<'invites'>) {
    setError(null)
    setBusy(inviteId)
    try {
      await accept({ inviteId })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-info/24 bg-info/[0.04] p-4">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-info/12 text-info-foreground">
          <MailPlusIcon className="size-4" />
        </div>
        <h2 className="font-heading font-semibold text-sm">
          Pending invitation{invites.length > 1 ? 's' : ''}
        </h2>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <ul className="flex flex-col gap-2">
        {invites.map((invite) => (
          <li
            key={invite._id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2 text-muted-foreground">
              Invited as <RoleBadge role={invite.role} />
            </span>
            <Button
              size="sm"
              loading={busy === invite._id}
              disabled={busy === invite._id}
              onClick={() => onAccept(invite._id)}
            >
              {busy === invite._id ? 'Accepting…' : 'Accept'}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
