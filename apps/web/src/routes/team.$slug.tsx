import { createFileRoute } from '@tanstack/react-router'
import { api } from '@folio/backend/api'
import { PublicNotFound, TeamPortfolio, loadPublic } from '#/features/portfolio'

export const Route = createFileRoute('/team/$slug')({
  loader: ({ params }) => loadPublic(api.portfolio.getPublicTeam, { slug: params.slug }),
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.team.name} — folio` : 'folio' }],
  }),
  component: () => <TeamPortfolio data={Route.useLoaderData()} />,
  notFoundComponent: PublicNotFound,
})
