import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  AtSignIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  SettingsIcon,
  UsersIcon,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { api } from '@folio/backend/api'
import { CopyLinkButton } from '#/components/shared/copy-link-button'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '#/components/ui/menu'
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'

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

interface ShellUser {
  name?: string | null
  email?: string | null
}

// Base classes shared by every rail button so hover / active / press feedback
// stays consistent. size-10 keeps a comfortable 40px hit area; the active
// indicator is a `before` pseudo pinned to the rail's left edge.
const RAIL_ITEM =
  'group relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,scale] hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.96]'
const RAIL_ITEM_ACTIVE =
  "relative flex size-10 items-center justify-center rounded-lg bg-foreground/[0.08] text-foreground transition-[color,background-color,scale] active:scale-[0.96] before:absolute before:top-1/2 before:-left-[11px] before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-foreground before:content-['']"

/**
 * The compact desktop navigation rail — icon-only with tooltips and a bottom
 * profile menu. Hidden below `md`, where {@link ShellMobileBar} takes over.
 */
export function ShellRail({
  user,
  onSignOut,
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
}) {
  return (
    <aside className="hidden h-full min-h-0 w-16 shrink-0 flex-col items-center border-r border-border/60 bg-foreground/[0.02] py-3 md:flex">
      <Link
        to="/dashboard"
        activeOptions={{ exact: true }}
        aria-label="folio home"
        className="flex size-9 items-center justify-center rounded-lg bg-foreground text-background transition-transform active:scale-[0.96]"
      >
        <span className="font-heading text-base leading-none">f</span>
      </Link>

      <div className="my-3 h-px w-7 bg-border/60" />

      <TooltipProvider delay={200}>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {SHELL_NAV.map((item) => (
            <Tooltip key={item.to}>
              <TooltipTrigger
                render={
                  <Link
                    to={item.to}
                    aria-label={item.label}
                    activeOptions={{ exact: item.exact ?? false }}
                    className={RAIL_ITEM}
                    activeProps={{ className: RAIL_ITEM_ACTIVE }}
                  />
                }
              >
                <item.Icon className="size-[1.15rem]" />
              </TooltipTrigger>
              <TooltipPopup side="right" sideOffset={8}>
                {item.label}
              </TooltipPopup>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>

      <div className="mt-2 flex flex-col items-center">
        <ProfileMenu user={user} onSignOut={onSignOut} side="right" />
      </div>
    </aside>
  )
}

/**
 * The account avatar + menu. Placed at the foot of the rail on desktop and in
 * the mobile bar. Surfaces the signed-in email, a copy-profile-link action
 * (username from `profiles.getMyProfile`, via the shared CopyLinkButton),
 * a Settings link, and Sign out.
 */
export function ProfileMenu({
  user,
  onSignOut,
  side = 'bottom',
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
  side?: 'right' | 'bottom'
}) {
  const profile = useQuery(api.profiles.getMyProfile)
  const email = user?.email ?? ''
  const label = user?.name || email || 'Account'
  const initial = (user?.name || email || '?').charAt(0).toUpperCase()

  return (
    <Menu>
      <MenuTrigger
        render={
          <button
            type="button"
            aria-label="Account menu"
            className="flex size-9 items-center justify-center rounded-full bg-foreground font-medium text-[13px] text-background ring-1 ring-border/40 transition-transform hover:opacity-90 active:scale-[0.96]"
          />
        }
      >
        {initial}
      </MenuTrigger>
      <MenuPopup side={side} align="end" sideOffset={8} className="w-60">
        <div className="px-2 py-1.5">
          <div className="truncate font-medium text-sm">{label}</div>
          {email ? (
            <div className="truncate text-muted-foreground text-xs">{email}</div>
          ) : null}
        </div>
        <MenuSeparator />
        {profile?.username ? (
          <div className="px-1 py-0.5">
            <CopyLinkButton
              path={`/u/${profile.username}`}
              label="Copy profile link"
              variant="ghost"
              className="w-full justify-start font-normal text-foreground"
            />
          </div>
        ) : profile !== undefined ? (
          <MenuItem render={<Link to="/dashboard/settings" />}>
            <AtSignIcon />
            Claim a username
          </MenuItem>
        ) : null}
        <MenuItem render={<Link to="/dashboard/settings" />}>
          <SettingsIcon />
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem variant="destructive" onClick={onSignOut}>
          <LogOutIcon />
          Sign out
        </MenuItem>
      </MenuPopup>
    </Menu>
  )
}

/**
 * Labeled vertical nav for the mobile sheet — the rail's icons plus their
 * labels. `onNavigate` lets the sheet close itself on selection.
 */
export function ShellSheetNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
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
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
                activeProps={{
                  className:
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm bg-foreground/[0.06] text-foreground font-medium',
                }}
              >
                <item.Icon className="size-4 opacity-70" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
