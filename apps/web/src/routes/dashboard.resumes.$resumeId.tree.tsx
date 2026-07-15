import { createFileRoute, redirect } from '@tanstack/react-router'

// The version tree now lives on the editor page as the "History" view. Keep this
// path as a thin redirect so old links don't 404.
export const Route = createFileRoute('/dashboard/resumes/$resumeId/tree')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/dashboard/resumes/$resumeId',
      params: { resumeId: params.resumeId },
      search: { view: 'history' },
    })
  },
})
