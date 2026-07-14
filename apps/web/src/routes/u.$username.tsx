import { Outlet, createFileRoute } from '@tanstack/react-router'
import { PublicNotFound } from '#/features/portfolio'

// Layout for /u/$username/*: each child owns its own loader (index = portfolio,
// $resumeSlug = resume) so no data is fetched twice.
export const Route = createFileRoute('/u/$username')({
  component: Outlet,
  notFoundComponent: PublicNotFound,
})
