import { Outlet, createFileRoute, useChildMatches } from '@tanstack/react-router'
import { ResumesList } from '@/features/editor'

export const Route = createFileRoute('/dashboard/resumes')({
  component: ResumesRoute,
})

// Layout for /dashboard/resumes/*: shows the list at the exact path,
// defers to children ($resumeId, …) otherwise.
function ResumesRoute() {
  const hasChild = useChildMatches().length > 0
  return hasChild ? <Outlet /> : <ResumesList />
}
