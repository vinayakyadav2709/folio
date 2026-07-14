import { Outlet, createFileRoute, useChildMatches } from '@tanstack/react-router'
import type { Id } from '@folio/backend/dataModel'
import { ResumeEditor } from '@/features/editor'

export const Route = createFileRoute('/dashboard/resumes/$resumeId')({
  validateSearch: (search: Record<string, unknown>): { branch?: string } =>
    typeof search.branch === 'string' && search.branch ? { branch: search.branch } : {},
  component: EditorRoute,
})

// Defers to children (the tree route) when one matches.
function EditorRoute() {
  const { resumeId } = Route.useParams()
  const { branch = 'main' } = Route.useSearch()
  const hasChild = useChildMatches().length > 0
  if (hasChild) return <Outlet />
  return <ResumeEditor resumeId={resumeId as Id<'resumes'>} branchName={branch} />
}
