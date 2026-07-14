import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import { PortfolioView, PublicNotFound, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/u/$username/')({
  loader: ({ params }) => loadPublic(api.profiles.getPublicProfile, { username: params.username }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.fullName ?? loaderData.username} — folio` : 'folio' }],
  }),
  component: () => <PortfolioView data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
