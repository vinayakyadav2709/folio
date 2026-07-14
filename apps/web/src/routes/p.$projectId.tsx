import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { ProjectView, PublicNotFound, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/p/$projectId')({
  loader: ({ params }) =>
    loadPublic(api.projects.getPublicProject, { projectId: params.projectId as Id<'projects'> }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} — folio` : 'folio' }],
  }),
  component: () => <ProjectView data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
