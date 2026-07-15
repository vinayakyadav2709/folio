import { Outlet, createFileRoute, useChildMatches } from '@tanstack/react-router'
import type { Id } from '@folio/backend/dataModel'
import { ResumeEditor, type EditorView } from '@/features/editor'
import { VersionTree } from '@/features/version-tree'

export const Route = createFileRoute('/dashboard/resumes/$resumeId')({
  validateSearch: (search: Record<string, unknown>): { branch?: string; view?: 'history' } => {
    const out: { branch?: string; view?: 'history' } = {}
    if (typeof search.branch === 'string' && search.branch) out.branch = search.branch
    if (search.view === 'history') out.view = 'history'
    return out
  },
  component: EditorRoute,
})

// Defers to children (legacy /tree route → redirects here) when one matches.
function EditorRoute() {
  const { resumeId } = Route.useParams()
  const { branch = 'main', view } = Route.useSearch()
  const navigate = Route.useNavigate()
  const hasChild = useChildMatches().length > 0
  if (hasChild) return <Outlet />

  const editorView: EditorView = view === 'history' ? 'history' : 'edit'
  return (
    <ResumeEditor
      resumeId={resumeId as Id<'resumes'>}
      branchName={branch}
      view={editorView}
      onViewChange={(v) =>
        navigate({ search: (prev) => ({ ...prev, view: v === 'history' ? 'history' : undefined }) })
      }
      historyView={<VersionTree resumeId={resumeId} />}
    />
  )
}
