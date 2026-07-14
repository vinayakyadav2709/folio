import { Link } from '@tanstack/react-router'
import {
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  to: string
  label: string
  exact?: boolean
  Icon: ComponentType<{ className?: string }>
}

export const SHELL_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Home', exact: true, Icon: LayoutDashboardIcon },
  { to: '/dashboard/teams', label: 'Teams', Icon: UsersIcon },
  { to: '/dashboard/projects', label: 'Projects', Icon: FolderKanbanIcon },
  { to: '/dashboard/resumes', label: 'Resumes', Icon: FileTextIcon },
  { to: '/dashboard/settings', label: 'Settings', Icon: SettingsIcon },
]

/**
 * The dashboard nav surface. Rendered persistently on desktop and inside the
 * mobile sheet. `onNavigate` lets the mobile sheet close itself on selection.
 */
export function ShellSidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-foreground/[0.02]">
      <div className="flex h-[3.25rem] shrink-0 items-center gap-2.5 border-b border-border/60 px-4">
        <div className="flex size-6 items-center justify-center rounded-md bg-foreground text-background">
          <span className="font-heading text-sm leading-none">f</span>
        </div>
        <span className="font-heading text-base tracking-tight">folio</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {SHELL_NAV.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={onNavigate}
                activeOptions={{ exact: item.exact ?? false }}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                activeProps={{
                  className:
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm bg-foreground/[0.06] text-foreground font-medium',
                }}
              >
                <item.Icon className="size-4 opacity-70" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-border/60 px-3 py-2.5">
        <div className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-[0.25em]">
          Portfolio Manager
        </div>
      </div>
    </aside>
  )
}
