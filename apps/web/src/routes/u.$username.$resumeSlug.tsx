import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import { PublicNotFound, ResumeView, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/u/$username/$resumeSlug')({
  loader: ({ params }) =>
    loadPublic(api.portfolio.getPublicResume, {
      username: params.username,
      resumeSlug: params.resumeSlug,
    }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.name} — folio` : 'folio' }],
  }),
  component: () => <ResumeView data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
