import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '@folio/backend/dataModel'
import { TeamDetail } from '@/features/teams'

export const Route = createFileRoute('/dashboard/teams/$teamId')({
  component: TeamDetailRoute,
})

function TeamDetailRoute() {
  const { teamId } = Route.useParams()
  return <TeamDetail teamId={teamId as Id<'teams'>} />
}
