import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfileForm } from '../lib/use-profile-form'
import { ImportResumeCard } from './import-resume-card'
import { AchievementsPage, ExperiencePage, SkillsPage } from './profile-pool'

// The profile pool, one section per URL — full dashboard pages, not settings
// tabs. Identity, contact and education stay in Settings: they're set once.
const SECTIONS = ['import', 'experience', 'skills', 'achievements'] as const

export type ProfileSectionId = (typeof SECTIONS)[number]

export const isProfileSection = (s: string): s is ProfileSectionId =>
  (SECTIONS as readonly string[]).includes(s)

/**
 * One profile page, chosen by the `$section` route param. Everything these
 * pages edit lives in a single profile row, so the form hook stays here and
 * each page drives only its own save slice.
 */
export function ProfileScreen({ section }: { section: string }) {
  const id: ProfileSectionId = isProfileSection(section) ? section : 'experience'
  const profile = useQuery(api.profiles.getMyProfile)
  const form = useProfileForm(profile)

  // Import owns its whole page: the header action changes with the flow's step
  // (Extract while pasting, Apply while reviewing), so it renders its own
  // PageHeader rather than being wrapped in a fixed one here.
  if (id === 'import') return <ImportResumeCard />

  if (profile === undefined) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (id === 'skills') return <SkillsPage form={form} />
  if (id === 'achievements') return <AchievementsPage form={form} media={profile?.media ?? {}} />
  return <ExperiencePage form={form} media={profile?.media ?? {}} />
}
