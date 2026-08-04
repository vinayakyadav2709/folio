import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useConvex, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import {
  BriefcaseIcon,
  ContactIcon,
  GraduationCapIcon,
  ImportIcon,
  PlusIcon,
  WandSparklesIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BLANK_TYPES,
  headerFromProfile,
  newBlock,
  newEducationBlock,
  newExperienceBlock,
  newProjectBlock,
  newSkillsBlock,
  type Block,
  type Header,
} from '../lib/blocks'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em]">
      {children}
    </h2>
  )
}

// Shared style for the dashed "pull this in" rows.
const PULL_ITEM =
  'flex items-center gap-2 rounded-lg border border-border/70 border-dashed px-2.5 py-1.5 text-left text-muted-foreground text-sm transition-colors hover:border-border hover:bg-foreground/[0.04] hover:text-foreground'

export function BlockLibrary({
  onAdd,
  onApplyHeader,
}: {
  onAdd: (block: Block) => void
  onApplyHeader: (header: Header) => void
}) {
  const convex = useConvex()
  const teams = useQuery(api.teams.listMyTeams)
  const me = useQuery(api.auth.getAuthUser)
  const profile = useQuery(api.profiles.getMyProfile)
  const [pickedTeam, setPickedTeam] = useState<Id<'teams'> | null>(null)
  const teamId = pickedTeam ?? teams?.[0]?._id ?? null
  const projects = useQuery(api.projects.listTeamProjects, teamId ? { teamId } : 'skip')
  const [adding, setAdding] = useState<string | null>(null)

  // Fetch my contribution bullets on demand — one query per add, not per render.
  async function addProject(projectId: Id<'projects'>) {
    setAdding(projectId)
    try {
      const detail = await convex.query(api.projects.getProject, { projectId })
      const myId = (me as { _id?: string } | null)?._id
      const mine = detail.contributions.find((c) => c.userId === myId)
      onAdd(newProjectBlock(detail, mine?.bullets ?? []))
    } finally {
      setAdding(null)
    }
  }

  return (
    <aside className="flex flex-col gap-3">
      <SectionLabel>Team projects</SectionLabel>
      {teams === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-7 w-full rounded-md" />
          <Skeleton className="h-7 w-3/4 rounded-md" />
        </div>
      ) : teams.length > 0 ? (
        <>
          <Select
            value={teamId}
            onValueChange={(value) => setPickedTeam(value as Id<'teams'>)}
            items={Object.fromEntries(teams.map((t) => [t._id, t.name]))}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder="Pick a team" />
            </SelectTrigger>
            <SelectPopup>
              {teams.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          {projects === undefined ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-4/5 rounded-md" />
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col gap-0.5">
              {projects.map((p) => (
                <li
                  key={p._id}
                  className="group flex items-center justify-between gap-1 rounded-md px-2 py-1 transition-colors hover:bg-foreground/[0.04]"
                >
                  <span className="truncate text-sm" title={p.name}>
                    {p.name}
                  </span>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label={`Add ${p.name}`}
                    className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground group-hover:text-foreground"
                    loading={adding === p._id}
                    onClick={() => addProject(p._id)}
                  >
                    <PlusIcon />
                  </Button>
                </li>
              ))}
              {projects.length === 0 && (
                <li className="px-2 py-1 text-muted-foreground text-sm text-pretty">
                  No projects yet
                </li>
              )}
            </ul>
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-sm text-pretty">
          Join a team to pull in shared projects.
        </p>
      )}

      <Separator className="my-1" />
      <SectionLabel>From your profile</SectionLabel>
      {profile === undefined ? (
        <Skeleton className="h-7 w-full rounded-md" />
      ) : profile === null ? (
        <p className="text-muted-foreground text-sm text-pretty">
          <Link
            to="/dashboard/profile/$section"
            params={{ section: 'experience' }}
            className="underline underline-offset-2"
          >
            Set up your profile
          </Link>{' '}
          to pull in your header, education, and skills.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => {
              onApplyHeader(headerFromProfile(profile))
              for (const entry of profile.experience ?? []) onAdd(newExperienceBlock(entry))
              for (const entry of profile.education) onAdd(newEducationBlock(entry))
              if (profile.skills.length > 0) onAdd(newSkillsBlock(profile.skills))
            }}
            className={PULL_ITEM}
          >
            <ImportIcon className="size-3.5 shrink-0" />
            Add everything
          </button>
          <button
            type="button"
            onClick={() => onApplyHeader(headerFromProfile(profile))}
            className={PULL_ITEM}
            title="Fill the resume header (name, email, phone, links) from your profile"
          >
            <ContactIcon className="size-3.5 shrink-0" />
            Contact info
          </button>
          {(profile.experience ?? []).map((entry, i) => (
            <button
              key={`x${i}`}
              type="button"
              onClick={() => onAdd(newExperienceBlock(entry))}
              className={PULL_ITEM}
            >
              <BriefcaseIcon className="size-3.5 shrink-0" />
              <span className="truncate" title={entry.company}>
                {entry.company || 'Experience'}
              </span>
            </button>
          ))}
          {profile.education.map((entry, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onAdd(newEducationBlock(entry))}
              className={PULL_ITEM}
            >
              <GraduationCapIcon className="size-3.5 shrink-0" />
              <span className="truncate" title={entry.school}>
                {entry.school || 'Education'}
              </span>
            </button>
          ))}
          {profile.skills.length > 0 && (
            <button
              type="button"
              onClick={() => onAdd(newSkillsBlock(profile.skills))}
              className={PULL_ITEM}
            >
              <WandSparklesIcon className="size-3.5 shrink-0" />
              Skills
            </button>
          )}
          {profile.education.length === 0 &&
            profile.skills.length === 0 &&
            (profile.experience ?? []).length === 0 && (
              <p className="text-muted-foreground text-sm text-pretty">
                Add experience and skills in{' '}
                <Link
            to="/dashboard/profile/$section"
            params={{ section: 'experience' }}
            className="underline underline-offset-2"
          >
                  your profile
                </Link>
                .
              </p>
            )}
        </div>
      )}

      <Separator className="my-1" />
      <SectionLabel>Blank blocks</SectionLabel>
      <div className="flex flex-col gap-1.5">
        {BLANK_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(newBlock(type))}
            className="flex items-center gap-2 rounded-lg border border-border/70 border-dashed px-2.5 py-1.5 text-muted-foreground text-sm capitalize transition-colors hover:border-border hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <PlusIcon className="size-3.5" />
            {type}
          </button>
        ))}
      </div>
    </aside>
  )
}
