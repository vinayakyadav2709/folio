import { createFileRoute, redirect } from '@tanstack/react-router'
import { ProfileScreen, isProfileSection } from '#/features/settings'

export const Route = createFileRoute('/dashboard/profile/$section')({
  beforeLoad: ({ params }) => {
    if (!isProfileSection(params.section)) {
      throw redirect({ to: '/dashboard/profile/$section', params: { section: 'experience' } })
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  return <ProfileScreen section={Route.useParams().section} />
}
