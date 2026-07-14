import { createFileRoute } from '@tanstack/react-router'
import { SettingsScreen } from '#/features/settings'

export const Route = createFileRoute('/dashboard/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  return <SettingsScreen />
}
