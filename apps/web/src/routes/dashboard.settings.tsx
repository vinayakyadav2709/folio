import { createFileRoute } from '@tanstack/react-router'
import { AiKeysCard, ProfileCard } from '#/features/settings'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="flex flex-col gap-14 py-2">
      <ProfileCard />
      <AiKeysCard />
    </div>
  )
}
