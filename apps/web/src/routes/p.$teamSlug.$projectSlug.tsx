import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import { ProjectView, PublicNotFound, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/p/$teamSlug/$projectSlug')({
  loader: ({ params }) =>
    loadPublic(api.portfolio.getPublicProject, {
      teamSlug: params.teamSlug,
      projectSlug: params.projectSlug,
    }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.project.name} — folio` : 'folio' }],
  }),
  component: () => <ProjectView data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
