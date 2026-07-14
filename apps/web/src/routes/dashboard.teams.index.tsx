import { createFileRoute } from '@tanstack/react-router'
import { TeamsList } from '@/features/teams'

export const Route = createFileRoute('/dashboard/teams/')({
  component: TeamsList,
})
