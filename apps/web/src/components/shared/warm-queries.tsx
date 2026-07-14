import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'

// Mounted once in the dashboard shell (which persists across tab switches).
// Convex's useQuery cache lives only while a subscription exists — holding
// these here keeps the tabs' queries live, so remounting a tab renders
// instantly from cache instead of showing skeletons.
export function WarmQueries() {
  const teams = useQuery(api.teams.listMyTeams)
  useQuery(api.resumes.listMyResumes)
  useQuery(api.profiles.getMyProfile)
  useQuery(api.aiKeys.myKeyStatus)
  useQuery(api.invites.listMyInvites)
  return (
    <>
      {teams?.map((t) => (
        <WarmTeamProjects key={t._id} teamId={t._id} />
      ))}
    </>
  )
}

function WarmTeamProjects({ teamId }: { teamId: Id<'teams'> }) {
  useQuery(api.projects.listTeamProjects, { teamId })
  return null
}
