import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  AtSignIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
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

// Collapsed-rail buttons: size-10 keeps a comfortable 40px hit area; the
// active indicator is a `before` pseudo pinned to the rail's left edge.
const RAIL_ITEM =
  'group relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,scale] hover:bg-foreground/[0.06] hover:text-foreground active:scale-[0.96]'
const RAIL_ITEM_ACTIVE =
  "relative flex size-10 items-center justify-center rounded-lg bg-foreground/[0.08] text-foreground transition-[color,background-color,scale] active:scale-[0.96] before:absolute before:top-1/2 before:-left-[11px] before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-foreground before:content-['']"

// Expanded (workspace-rail) items: icon + label rows.
const WIDE_ITEM =
  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-foreground/[0.03] hover:text-foreground'
const WIDE_ITEM_ACTIVE =
  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm bg-foreground/[0.06] font-medium text-foreground'

const RAIL_PREF_KEY = 'folio-rail-expanded'

/**
 * The desktop navigation rail. Expandable: the wide state is the devl.dev
 * workspace-rail (labeled nav, workspace header, user footer); the collapsed
 * state is the mini icon rail with tooltips. Preference persists per device.
 * Hidden below `md`, where {@link ShellMobileBar} takes over.
 */
export function ShellRail({
  user,
  onSignOut,
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  useEffect(() => {
    const stored = window.localStorage.getItem(RAIL_PREF_KEY)
    if (stored !== null) setExpanded(stored === '1')
  }, [])
  const toggle = () => {
    setExpanded((v) => {
      window.localStorage.setItem(RAIL_PREF_KEY, v ? '0' : '1')
      return !v
    })
  }

  return (
    <aside
      className={`hidden h-full min-h-0 shrink-0 flex-col border-r border-border/60 bg-foreground/[0.02] transition-[width] duration-200 md:flex ${
        expanded ? 'w-60' : 'w-16'
      }`}
    >
      {/* Header: mark + name when wide, mark only when collapsed. */}
      <div
        className={`flex h-[3.4rem] shrink-0 items-center border-b border-border/60 ${
          expanded ? 'justify-between px-3' : 'justify-center'
        }`}
      >
        <Link
          to="/dashboard"
          activeOptions={{ exact: true }}
          aria-label="folio home"
          className="flex items-center gap-2.5 transition-transform active:scale-[0.97]"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-background">
            <span className="font-heading text-base leading-none">f</span>
          </span>
          {expanded && <span className="font-heading text-base tracking-tight">folio</span>}
        </Link>
        {expanded && <RailToggle expanded onToggle={toggle} />}
      </div>

      {expanded ? (
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {SHELL_NAV.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.exact ?? false }}
                  className={WIDE_ITEM}
                  activeProps={{ className: WIDE_ITEM_ACTIVE }}
                >
                  <item.Icon className="size-4 opacity-70" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <TooltipProvider delay={200}>
          <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
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
      )}

      {/* Footer: workspace-rail user row when wide, avatar-only when collapsed. */}
      <div
        className={
          expanded
            ? 'border-t border-border/60 px-2 py-2'
            : 'flex flex-col items-center gap-1 border-t border-border/60 py-2'
        }
      >
        {!expanded && <RailToggle expanded={false} onToggle={toggle} />}
        <ProfileMenu user={user} onSignOut={onSignOut} side="right" expanded={expanded} />
      </div>
    </aside>
  )
}

function RailToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const Icon = expanded ? PanelLeftCloseIcon : PanelLeftIcon
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,scale] hover:bg-foreground/[0.05] hover:text-foreground active:scale-[0.94]"
    >
      <Icon className="size-4" />
    </button>
  )
}

/**
 * The account menu. Trigger is the full user row (avatar + name + email) when
 * the rail is expanded — the workspace-rail footer — or just the avatar when
 * collapsed / in the mobile bar. Surfaces the signed-in identity, a
 * copy-profile-link action, a Settings link, and Sign out.
 */
export function ProfileMenu({
  user,
  onSignOut,
  side = 'bottom',
  expanded = false,
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
  side?: 'right' | 'bottom'
  expanded?: boolean
}) {
  const profile = useQuery(api.profiles.getMyProfile)
  const email = user?.email ?? ''
  const label = user?.name || email || 'Account'
  const initial = (user?.name || email || '?').charAt(0).toUpperCase()

  return (
    <Menu>
      <MenuTrigger
        render={
          expanded ? (
            <button
              type="button"
              aria-label="Account menu"
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.04]"
            />
          ) : (
            <button
              type="button"
              aria-label="Account menu"
              className="flex size-9 items-center justify-center rounded-full bg-foreground font-medium text-[13px] text-background ring-1 ring-border/40 transition-transform hover:opacity-90 active:scale-[0.96]"
            />
          )
        }
      >
        {expanded ? (
          <>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground font-medium text-[12px] text-background ring-1 ring-border/40">
              {initial}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-sm">{label}</span>
              {email ? (
                <span className="block truncate text-muted-foreground text-xs">{email}</span>
              ) : null}
            </span>
          </>
        ) : (
          initial
        )}
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
