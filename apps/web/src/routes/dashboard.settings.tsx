import { createFileRoute } from '@tanstack/react-router'
import { AiKeysCard } from '#/features/settings'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return <AiKeysCard />
}
