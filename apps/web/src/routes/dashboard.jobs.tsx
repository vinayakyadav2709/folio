import { createFileRoute } from '@tanstack/react-router'
import { JobsScreen } from '@/features/jobs'

export const Route = createFileRoute('/dashboard/jobs')({
  component: JobsScreen,
})
