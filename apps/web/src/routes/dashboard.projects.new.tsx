import { createFileRoute } from '@tanstack/react-router'
import { NewProjectScreen } from '@/features/projects'

export const Route = createFileRoute('/dashboard/projects/new')({
  component: NewProjectScreen,
})
