import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { AtSignIcon, GraduationCapIcon, KeyIcon, LinkIcon, UserIcon, WrenchIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfileForm } from '../lib/use-profile-form'
import { AiKeysCard } from './ai-keys-card'
import {
  ContactSection,
  EducationSection,
  ProfileSection,
  SkillsSection,
} from './profile-sections'

type SectionId = 'profile' | 'contact' | 'skills' | 'education' | 'ai'

const NAV: { id: SectionId; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'contact', label: 'Contact & links', icon: LinkIcon },
  { id: 'skills', label: 'Skills', icon: WrenchIcon },
  { id: 'education', label: 'Education', icon: GraduationCapIcon },
  { id: 'ai', label: 'AI keys', icon: KeyIcon },
]

export function SettingsScreen() {
  const [active, setActive] = useState<SectionId>('profile')
  const profile = useQuery(api.profiles.getMyProfile)
  const form = useProfileForm(profile)

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 md:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="md:sticky md:top-0 md:self-start md:py-1">
        <div className="flex items-center gap-2 md:hidden">
          <AtSignIcon className="size-4 text-muted-foreground" />
          <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Settings
          </span>
        </div>
        <div className="hidden font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em] md:block">
          Settings
        </div>
        <ul className="mt-3 flex gap-0.5 overflow-x-auto md:mt-4 md:flex-col">
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

      <div className="min-w-0">
        {active === 'ai' ? (
          <AiKeysCard />
        ) : profile === undefined ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : active === 'profile' ? (
          <ProfileSection form={form} username={profile?.username ?? ''} />
        ) : active === 'contact' ? (
          <ContactSection form={form} />
        ) : active === 'skills' ? (
          <SkillsSection form={form} />
        ) : (
          <EducationSection form={form} />
        )}
      </div>
    </div>
  )
}
