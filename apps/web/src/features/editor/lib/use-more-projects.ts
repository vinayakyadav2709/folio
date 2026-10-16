import { useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Block } from './blocks'

// Published projects on the public portfolio that this resume doesn't list —
// the "7 more projects on my portfolio" number. Undefined until known / if none.
export function useMoreProjects(blocks: Block[]): number | undefined {
  const profile = useQuery(api.profiles.getMyProfile)
  const username = profile?.username
  const pub = useQuery(api.profiles.getPublicProfile, username ? { username } : 'skip')
  const n = pub && pub.projects.length - blocks.filter((b) => b.type === 'project').length
  return n && n > 0 ? n : undefined
}
