import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { GraduationCapIcon, KeyIcon, LinkIcon, LogOutIcon, UserIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'
import { useProfileForm } from '../lib/use-profile-form'
import { AiKeysCard } from './ai-keys-card'
import { SignOutSection } from './sign-out-section'
import { ContactSection, EducationSection, ProfileSection } from './profile-sections'

// Settings holds the set-once stuff. The resume content that churns —
// experience, skills, achievements, import — lives in the sidebar's Profile
// group at /dashboard/profile; education stays here, it rarely changes.
type SectionId = 'profile' | 'contact' | 'education' | 'ai' | 'signout'

const NAV: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'contact', label: 'Contact & links', icon: LinkIcon },
  { id: 'education', label: 'Education', icon: GraduationCapIcon },
  { id: 'ai', label: 'AI keys', icon: KeyIcon },
  { id: 'signout', label: 'Sign out', icon: LogOutIcon },
]

export function SettingsScreen() {
  const [active, setActive] = useState<SectionId>('profile')
  const profile = useQuery(api.profiles.getMyProfile)
  const form = useProfileForm(profile)

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader
        title="Settings"
      />
      <div className="grid flex-1 content-start gap-10 md:grid-cols-[200px_minmax(0,1fr)] md:content-stretch">
      <aside className="md:sticky md:top-0 md:self-start md:py-1">
        <ul className="flex gap-0.5 overflow-x-auto md:flex-col">
          {NAV.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setActive(id)}
                className={`flex w-full items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  active === id
                    ? 'bg-foreground/[0.06] text-foreground'
                    : 'text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground'
                }`}
              >
                <Icon className="size-4 opacity-70" />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-col">
        {active === 'ai' ? (
          <AiKeysCard />
        ) : active === 'signout' ? (
          <SignOutSection />
        ) : profile === undefined ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : active === 'contact' ? (
          <ContactSection form={form} />
        ) : active === 'education' ? (
          <EducationSection form={form} media={profile?.media ?? {}} />
        ) : (
          <ProfileSection form={form} username={profile?.username ?? ''} />
        )}
      </div>
      </div>
    </div>
  )
}
