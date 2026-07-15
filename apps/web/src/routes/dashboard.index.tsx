import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  ArrowRightIcon,
  FileTextIcon,
  FolderKanbanIcon,
  UsersIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { api } from '@folio/backend/api'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { CopyLinkButton } from '#/components/shared/copy-link-button'
import { PageHeader } from '#/components/shared/page-header'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardHome,
})

interface QuickLink {
  to: string
  title: string
  description: string
  Icon: ComponentType<{ className?: string }>
}

const QUICK_LINKS: QuickLink[] = [
  {
    to: '/dashboard/teams',
    title: 'Teams',
    description: 'Manage your teams and the people you build resumes with.',
    Icon: UsersIcon,
  },
  {
    to: '/dashboard/projects',
    title: 'Projects',
    description: 'The shared pool of projects, experience, and skills.',
    Icon: FolderKanbanIcon,
  },
  {
    to: '/dashboard/resumes',
    title: 'Resumes',
    description: 'Compose, edit, and version resumes from your blocks.',
    Icon: FileTextIcon,
  },
]

function DashboardHome() {
  const user = useQuery(api.auth.getAuthUser)
  const profile = useQuery(api.profiles.getMyProfile)
  const firstName = user?.name?.split(' ')[0] ?? null

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Dashboard"
        title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        description="Jump into a section to keep building your portfolio."
        actions={
          profile?.username ? (
            <CopyLinkButton
              path={`/u/${profile.username}`}
              label="Copy profile link"
            />
          ) : profile !== undefined ? (
            <Link
              to="/dashboard/settings"
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            >
              Claim a username to share your profile →
            </Link>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group rounded-lg no-underline outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
          >
            <Card className="h-full transition-colors group-hover:border-foreground/20 group-hover:bg-foreground/[0.02]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex size-9 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground">
                    <link.Icon className="size-4.5" />
                  </div>
                  <ArrowRightIcon className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardTitle className="mt-3">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
