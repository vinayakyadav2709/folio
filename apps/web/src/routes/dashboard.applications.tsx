import { createFileRoute } from '@tanstack/react-router'
import { ApplicationsScreen } from '@/features/jobs'

export const Route = createFileRoute('/dashboard/applications')({
  component: ApplicationsScreen,
})
