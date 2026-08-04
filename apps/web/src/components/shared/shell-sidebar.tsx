import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import {
  AtSignIcon,
  AwardIcon,
  BriefcaseIcon,
  Building2Icon,
  ClipboardListIcon,
  FileTextIcon,
  FolderKanbanIcon,
  LayoutDashboardIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  SettingsIcon,
  ShieldIcon,
  SparklesIcon,
  UsersIcon,
  WrenchIcon,
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

// Rail nav, grouped like the devl.dev workspace-rail: ungrouped primary items
// first, then labeled sections. Account-level destinations live in FOOTER_NAV
// below, pinned to the bottom rather than in this scrolling flow.
export const SHELL_NAV_GROUPS: { label?: string; items: NavItem[] }[] = [
  {
    items: [{ to: '/dashboard', label: 'Dashboard', exact: true, Icon: LayoutDashboardIcon }],
  },
  {
    // The profile pool — the content that feeds every resume, and the stuff
    // that changes most often, so it lives above the workspace.
    label: 'Profile',
    items: [
      { to: '/dashboard/profile/import', label: 'Import', Icon: SparklesIcon },
      { to: '/dashboard/profile/experience', label: 'Experience', Icon: Building2Icon },
      { to: '/dashboard/profile/skills', label: 'Skills', Icon: WrenchIcon },
      { to: '/dashboard/profile/achievements', label: 'Achievements', Icon: AwardIcon },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { to: '/dashboard/projects', label: 'Projects', Icon: FolderKanbanIcon },
      { to: '/dashboard/resumes', label: 'Resumes', Icon: FileTextIcon },
    ],
  },
  {
    label: 'Jobs',
    items: [
      { to: '/dashboard/jobs', label: 'Job search', Icon: BriefcaseIcon },
      { to: '/dashboard/applications', label: 'Applications', Icon: ClipboardListIcon },
    ],
  },
]

// Account-level rather than workspace content, so these are pinned to the rail
// footer above the profile row instead of sitting in the scrolling tab flow.
const FOOTER_NAV: NavItem[] = [
  { to: '/dashboard/teams', label: 'Teams', Icon: UsersIcon },
  { to: '/dashboard/settings', label: 'Settings', Icon: SettingsIcon },
]

// Flat list for route-title matching.
export const SHELL_NAV: NavItem[] = [...SHELL_NAV_GROUPS.flatMap((g) => g.items), ...FOOTER_NAV]

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
  'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm bg-foreground/[0.06] text-foreground'

// The devl workspace-rail group label: mono, tiny, uppercase, wide-tracked.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 mb-1 flex items-center justify-between px-2">
      <span className="font-mono text-[9px] text-muted-foreground/70 uppercase tracking-[0.25em]">
        {children}
      </span>
    </div>
  )
}

const RAIL_PREF_KEY = 'folio-rail-expanded'

/**
 * The desktop navigation rail. Expandable: the wide state is the devl.dev
 * workspace-rail (labeled nav, workspace header, user footer); the collapsed
 * state is the mini icon rail with tooltips. Preference persists per device.
 * Hidden below `md`, where {@link ShellMobileBar} takes over.
 */
export function ShellRail({ user }: { user: ShellUser | null | undefined }) {
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
          {SHELL_NAV_GROUPS.map((group, gi) => (
            <div key={group.label ?? gi}>
              {group.label && <SectionLabel>{group.label}</SectionLabel>}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
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
            </div>
          ))}
        </nav>
      ) : (
        <TooltipProvider delay={200}>
          <nav className="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3">
            {SHELL_NAV_GROUPS.map((group, gi) => (
              <div key={group.label ?? gi} className="flex flex-col items-center gap-1">
                {gi > 0 && <div className="my-1 h-px w-8 bg-border/60" />}
                {group.items.map((item) => (
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
              </div>
            ))}
          </nav>
        </TooltipProvider>
      )}

      {/* Footer: workspace-rail user row when wide, avatar-only when collapsed.
          Settings reads as the last nav item, so the rule sits between it and
          the account row — the identity block is what's being set apart. */}
      <div
        className={
          expanded ? 'px-2 pb-2' : 'flex flex-col items-center gap-1 pb-2'
        }
      >
        {!expanded && <RailToggle expanded={false} onToggle={toggle} />}
        {FOOTER_NAV.map((item) =>
          expanded ? (
            <Link
              key={item.to}
              to={item.to}
              className={WIDE_ITEM}
              activeProps={{ className: WIDE_ITEM_ACTIVE }}
            >
              <item.Icon className="size-4 opacity-70" />
              {item.label}
            </Link>
          ) : (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              className={RAIL_ITEM}
              activeProps={{ className: RAIL_ITEM_ACTIVE }}
            >
              <item.Icon className="size-[18px]" />
            </Link>
          ),
        )}
        <div
          className={
            expanded
              ? 'mt-2 border-border/60 border-t pt-2'
              : 'mt-1 flex w-full flex-col items-center border-border/60 border-t pt-2'
          }
        >
          <ProfileMenu user={user} side="top" expanded={expanded} />
        </div>
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
 * copy-profile-link action. Settings and Sign out are rail/settings pages now,
 * so the menu stays a single-purpose identity surface.
 */
export function ProfileMenu({
  user,
  side = 'bottom',
  expanded = false,
}: {
  user: ShellUser | null | undefined
  side?: 'right' | 'bottom' | 'top'
  expanded?: boolean
}) {
  const profile = useQuery(api.profiles.getMyProfile)
  const isAdmin = useQuery(api.adminAuth.amISiteAdmin)
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
      {/* The trigger is pinned to the bottom of the rail, so a popup anchored
          to its end has almost no `--available-height` and the menu clamps —
          clipping "Sign out" against the border. Opening upward from the
          trigger gives it the whole rail height instead. */}
      <MenuPopup
        side={side}
        align={side === 'top' ? 'start' : 'end'}
        sideOffset={8}
        className="w-60"
      >
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
        {isAdmin === true ? (
          <MenuItem render={<Link to="/dashboard/admin" />}>
            <ShieldIcon />
            Admin
          </MenuItem>
        ) : null}
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
        {SHELL_NAV_GROUPS.map((group, gi) => (
          <div key={group.label ?? gi}>
            {group.label && <SectionLabel>{group.label}</SectionLabel>}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
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
          </div>
        ))}
      </nav>
    </div>
  )
}
