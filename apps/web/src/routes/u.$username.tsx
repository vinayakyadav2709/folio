import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import { PublicNotFound, ResumeView, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/u/$username')({
  loader: ({ params }) => loadPublic(api.resumes.getPublished, { username: params.username }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.header.fullName} — folio` : 'folio' }],
  }),
  component: () => <ResumeView data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
