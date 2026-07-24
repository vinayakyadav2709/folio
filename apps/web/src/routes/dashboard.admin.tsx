import { createFileRoute } from '@tanstack/react-router'
import { AdminScreen } from '@/features/admin'

export const Route = createFileRoute('/dashboard/admin')({
  component: AdminScreen,
})
