import { createFileRoute } from '@tanstack/react-router'
import type { Id } from '@folio/backend/dataModel'
import { ProjectDetailScreen } from '@/features/projects'

export const Route = createFileRoute('/dashboard/projects/$projectId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()
  return <ProjectDetailScreen projectId={projectId as Id<'projects'>} />
}
