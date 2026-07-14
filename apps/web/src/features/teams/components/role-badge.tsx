import { ShieldIcon, UserIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type Role = 'admin' | 'member'

export function RoleBadge({ role }: { role: Role | string }) {
  if (role === 'admin') {
    return (
      <Badge variant="outline" className="gap-1 capitalize">
        <ShieldIcon className="size-3" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 capitalize">
      <UserIcon className="size-3" />
      {role}
    </Badge>
  )
}
