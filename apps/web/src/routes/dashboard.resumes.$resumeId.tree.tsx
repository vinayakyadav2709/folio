import { createFileRoute } from '@tanstack/react-router'
import { VersionTree } from '#/features/version-tree'

export const Route = createFileRoute('/dashboard/resumes/$resumeId/tree')({
  component: TreePage,
})

function TreePage() {
  const { resumeId } = Route.useParams()
  // Break out of the dashboard shell's max-w container for a full-bleed canvas.
  return (
    <div className="-mx-6 -my-8 h-[calc(100vh-3.25rem)]">
      <VersionTree resumeId={resumeId} />
    </div>
  )
}
