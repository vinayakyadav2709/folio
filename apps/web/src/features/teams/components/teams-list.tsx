import { UsersRoundIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
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
import { CopyLinkButton } from '@/components/shared/copy-link-button'
import { PageHeader } from '@/components/shared/page-header'
import { CreateTeamDialog } from './create-team-dialog'
import { RoleBadge } from './role-badge'
import { PendingInvites } from './pending-invites'

export function TeamsList() {
  const teams = useQuery(api.teams.listMyTeams)

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title="Teams"
        description={
          teams === undefined
            ? 'Loading your teams…'
            : `${teams.length} ${teams.length === 1 ? 'team' : 'teams'}`
        }
        actions={<CreateTeamDialog />}
      />

      <PendingInvites />

      {teams === undefined ? (
        <div className="rounded-xl border bg-card p-2 shadow-xs/5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border bg-card shadow-xs/5">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRoundIcon aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Create your first team.</EmptyTitle>
              <EmptyDescription>
                Teams are where you pool projects, experience, and skills, then
                compose them into resumes together.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <CreateTeamDialog triggerLabel="Create your first team" />
              <p className="pt-1 text-muted-foreground text-xs">
                You can rename or leave a team anytime.
              </p>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs/5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="ps-4">Team</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-px pe-4" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team._id} className="group cursor-pointer">
                  <TableCell className="ps-4">
                    <div className="flex items-center gap-3">
                      <Avatar className={`size-8 rounded-lg ${toneFor(team._id)}`}>
                        <AvatarFallback className="rounded-lg bg-transparent font-medium text-[11px]">
                          {initials(team.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Link
                        to="/dashboard/teams/$teamId"
                        params={{ teamId: team._id }}
                        className="font-medium after:absolute after:inset-0 after:content-[''] group-hover:underline"
                      >
                        {team.name}
                      </Link>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">
                    {team.slug}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={team.role} />
                  </TableCell>
                  <TableCell className="pe-4 text-right">
                    {/* Above the row's full-cover Link overlay so it's clickable. */}
                    <CopyLinkButton
                      path={`/team/${team.slug}`}
                      label="Copy link"
                      size="xs"
                      variant="ghost"
                      className="relative z-10 text-muted-foreground"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
