import { Outlet, createFileRoute, useChildMatches } from '@tanstack/react-router'
import { ProjectsListScreen } from '@/features/projects'

export const Route = createFileRoute('/dashboard/projects')({
  component: ProjectsRoute,
})

// Layout for /dashboard/projects/*: shows the list at the exact path,
// defers to children (new, $projectId) otherwise.
function ProjectsRoute() {
  const hasChild = useChildMatches().length > 0
  return hasChild ? <Outlet /> : <ProjectsListScreen />
}
