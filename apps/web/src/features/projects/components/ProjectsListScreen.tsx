import { useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { FolderPlus, Plus, Users } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { PageHeader } from '@/components/shared/page-header'
import { useSelectedTeam } from '../lib/useSelectedTeam'
import { AvatarStack, hueFrom, initials } from './avatars'
import { TeamPicker } from './TeamPicker'

function firstLine(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find(Boolean) ?? ''
}

export function ProjectsListScreen() {
  const teams = useQuery(api.teams.listMyTeams)
  const [selectedId, select] = useSelectedTeam()

  // Fall back to the first team when nothing is remembered (or the remembered
  // team is gone).
  const activeId =
    teams && teams.length > 0
      ? (teams.find((t) => t._id === selectedId)?._id ?? teams[0]._id)
      : null

  useEffect(() => {
    if (activeId && activeId !== selectedId) select(activeId)
  }, [activeId, selectedId, select])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        actions={
          <Button className="active:scale-[0.96]" render={<Link to="/dashboard/projects/new" />}>
            <Plus /> Add project
          </Button>
        }
      />

      {teams === undefined ? (
        <div className="grid place-items-center py-20">
          <Spinner />
        </div>
      ) : teams.length === 0 ? (
        <Empty className="rounded-2xl border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No teams yet</EmptyTitle>
            <EmptyDescription>
              Create or join a team first — projects live in a team's shared pool.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <TeamPicker teams={teams} selectedId={activeId} onSelect={select} />
          {activeId && <ProjectGrid teamId={activeId as Id<'teams'>} />}
        </>
      )}
    </div>
  )
}

function ProjectGrid({ teamId }: { teamId: Id<'teams'> }) {
  const projects = useQuery(api.projects.listTeamProjects, { teamId })
  const team = useQuery(api.teams.getTeam, { teamId })

  const nameOf = (userId: string) => {
    const m = team?.members.find((mm) => mm.userId === userId)
    return m?.name ?? m?.email ?? 'Unknown'
  }

  if (projects === undefined)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )

  if (projects.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderPlus aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No projects yet</EmptyTitle>
          <EmptyDescription>
            Add the first project to this team's pool — you can reuse it across every resume.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/dashboard/projects/new" />}>
            <Plus /> Add project
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const preview = firstLine(p.description)
        const contributorNames = p.contributorIds.map(nameOf)
        const h1 = hueFrom(p.name)
        const h2 = (h1 + 42) % 360
        return (
          <Card
            key={p._id}
            render={<Link to="/dashboard/projects/$projectId" params={{ projectId: p._id }} />}
            className="group cursor-pointer overflow-hidden transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
          >
            <div
              className="relative flex h-24 items-center justify-center"
              style={{
                background: `radial-gradient(120% 120% at 25% 15%, hsl(${h1} 75% 62% / 0.34), transparent 55%), radial-gradient(120% 120% at 85% 85%, hsl(${h2} 70% 55% / 0.28), transparent 55%), color-mix(in srgb, var(--muted) 62%, transparent)`,
              }}
            >
              <span className="font-heading font-semibold text-3xl text-foreground/25 tracking-tight transition-transform duration-200 group-hover:scale-105">
                {initials(p.name)}
              </span>
            </div>
            <CardHeader className="gap-1.5">
              <CardTitle className="font-heading text-base text-balance">{p.name}</CardTitle>
              <CardDescription className="line-clamp-2 text-pretty">
                {preview || 'No description yet'}
              </CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto justify-between border-t">
              <div className="flex items-center gap-2">
                {contributorNames.length > 0 ? (
                  <AvatarStack names={contributorNames} />
                ) : null}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {p.contributorIds.length} contributor{p.contributorIds.length === 1 ? '' : 's'}
                </span>
              </div>
              <span className="max-w-[45%] truncate text-muted-foreground text-xs">
                by {nameOf(p.ownerId)}
              </span>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
