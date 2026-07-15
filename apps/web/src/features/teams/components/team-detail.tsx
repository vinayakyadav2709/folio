import { useEffect, useState } from 'react'
import { CheckIcon, EllipsisIcon, PencilIcon, TrashIcon, XIcon } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { PageHeader } from '@/components/shared/page-header'
import { Input } from '@/components/ui/input'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
} from '@/components/ui/menu'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { initials, toneFor } from '../lib/avatar'
import { errorMessage } from '../lib/errors'
import { ConfirmDialog } from './confirm-dialog'
import { RoleBadge } from './role-badge'
import { TeamInvites } from './team-invites'

export function TeamDetail({ teamId }: { teamId: Id<'teams'> }) {
  const data = useQuery(api.teams.getTeam, { teamId })
  const me = useQuery(api.auth.getAuthUser)

  if (data === undefined || me === undefined) {
    return (
      <div className="flex w-full flex-col gap-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    )
  }

  const myId = (me as { _id: string } | null)?._id
  const isAdmin = data.members.some((m) => m.userId === myId && m.role === 'admin')

  return (
    <div className="flex w-full flex-col gap-10">
      <TeamHeader team={data.team} isAdmin={isAdmin} />

      <Members teamId={teamId} members={data.members} isAdmin={isAdmin} myId={myId} />

      {isAdmin && (
        <>
          <Separator />
          <TeamInvites teamId={teamId} />
        </>
      )}

      <Separator />
      <LeaveTeam teamId={teamId} teamName={data.team.name} />
    </div>
  )
}

type TeamData = NonNullable<ReturnType<typeof useQuery<typeof api.teams.getTeam>>>

function TeamHeader({ team, isAdmin }: { team: TeamData['team']; isAdmin: boolean }) {
  const updateTeam = useMutation(api.teams.updateTeam)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(team.name)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setName(team.name), [team.name])

  async function onSave() {
    setError(null)
    try {
      await updateTeam({ teamId: team._id, name })
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <PageHeader
      eyebrow="Team"
      title={
        <>
          <Avatar className={`size-11 rounded-xl ${toneFor(team._id)}`}>
            <AvatarFallback className="rounded-xl bg-transparent font-semibold text-sm">
              {initials(team.name)}
            </AvatarFallback>
          </Avatar>
          {isAdmin && editing ? (
            <span className="flex items-center gap-2">
              <Input
                value={name}
                autoFocus
                onChange={(e) => setName(e.target.value)}
                className="h-9 max-w-xs"
              />
              <Button size="icon-sm" onClick={onSave} disabled={!name} aria-label="Save name">
                <CheckIcon />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Cancel"
                onClick={() => {
                  setName(team.name)
                  setError(null)
                  setEditing(false)
                }}
              >
                <XIcon />
              </Button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {team.name}
              {isAdmin && (
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Rename team"
                  onClick={() => setEditing(true)}
                >
                  <PencilIcon />
                </Button>
              )}
            </span>
          )}
        </>
      }
      meta={
        <>
          <p className="font-mono text-muted-foreground text-sm">{team.slug}</p>
          {error && <p className="mt-1 text-destructive text-sm">{error}</p>}
        </>
      }
      actions={<CopyLinkButton path={`/team/${team.slug}`} label="Copy team link" />}
    />
  )
}

function Members({
  teamId,
  members,
  isAdmin,
  myId,
}: {
  teamId: Id<'teams'>
  members: TeamData['members']
  isAdmin: boolean
  myId: string | undefined
}) {
  const removeMember = useMutation(api.teams.removeMember)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<TeamData['members'][number] | null>(null)
  const [removing, setRemoving] = useState(false)

  async function onConfirmRemove() {
    if (!pending) return
    setError(null)
    setRemoving(true)
    try {
      await removeMember({ teamId, userId: pending.userId })
      setPending(null)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setRemoving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-heading font-semibold text-lg">Members</h2>
          <p className="text-muted-foreground text-sm">
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </p>
        </div>
      </div>
      {error && !pending && <p className="text-destructive text-sm">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="ps-4">Member</TableHead>
              <TableHead>Role</TableHead>
              {isAdmin && <TableHead className="w-px pe-4" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isSelf = member.userId === myId
              return (
                <TableRow key={member.userId}>
                  <TableCell className="ps-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`size-8 ${toneFor(member.userId)}`}>
                        <AvatarFallback className="bg-transparent font-medium text-[11px]">
                          {initials(member.name ?? member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.name ?? '—'}</span>
                          {isSelf && (
                            <Badge
                              variant="outline"
                              size="sm"
                              className="font-mono text-[9px] uppercase tracking-wider"
                            >
                              you
                            </Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {member.email ?? '—'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={member.role} />
                      {member.username && (
                        <CopyLinkButton
                          path={`/u/${member.username}`}
                          label="Copy profile"
                          size="xs"
                          variant="ghost"
                          className="text-muted-foreground"
                        />
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="pe-4 text-right">
                      {!isSelf && (
                        <Menu>
                          <MenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Actions for ${member.name ?? member.email ?? 'member'}`}
                              />
                            }
                          >
                            <EllipsisIcon />
                          </MenuTrigger>
                          <MenuPopup align="end">
                            <MenuItem variant="destructive" onClick={() => setPending(member)}>
                              <TrashIcon /> Remove from team
                            </MenuItem>
                          </MenuPopup>
                        </Menu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(next) => {
          if (!next) {
            setPending(null)
            setError(null)
          }
        }}
        title="Remove member?"
        description={
          <>
            <span className="font-medium text-foreground">
              {pending?.name ?? pending?.email ?? 'This member'}
            </span>{' '}
            will lose access to this team. You can invite them again later.
          </>
        }
        confirmLabel="Remove"
        onConfirm={onConfirmRemove}
        loading={removing}
        error={error}
      />
    </section>
  )
}

function LeaveTeam({ teamId, teamName }: { teamId: Id<'teams'>; teamName: string }) {
  const navigate = useNavigate()
  const leaveTeam = useMutation(api.teams.leaveTeam)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)

  async function onLeave() {
    setError(null)
    setLeaving(true)
    try {
      await leaveTeam({ teamId })
      navigate({ to: '/dashboard/teams' })
    } catch (err) {
      setError(errorMessage(err))
      setLeaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-destructive/24 bg-destructive/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-semibold text-sm">Leave team</h2>
          <p className="text-muted-foreground text-sm">
            You will lose access to this team's projects and resumes.
          </p>
        </div>
        <Button variant="destructive-outline" onClick={() => setOpen(true)} disabled={leaving}>
          Leave team
        </Button>
      </div>
      {error && !open && <p className="text-destructive text-sm">{error}</p>}

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setError(null)
        }}
        title="Leave this team?"
        description={
          <>
            You will leave{' '}
            <span className="font-medium text-foreground">{teamName}</span> and lose
            access to its projects and resumes. An admin will need to invite you back.
          </>
        }
        confirmLabel={leaving ? 'Leaving…' : 'Leave team'}
        onConfirm={onLeave}
        loading={leaving}
        error={error}
      />
    </section>
  )
}
