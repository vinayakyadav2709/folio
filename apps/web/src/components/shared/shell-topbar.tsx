import { useRouterState } from '@tanstack/react-router'
import { LogOutIcon, MenuIcon } from 'lucide-react'
import { useState } from 'react'
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from '#/components/ui/menu'
import {
  Sheet,
  SheetPopup,
  SheetTrigger,
} from '#/components/ui/sheet'
import { SHELL_NAV, ShellSidebar } from '#/components/shared/shell-sidebar'

interface ShellUser {
  name?: string | null
  email?: string | null
}

function usePageTitle(): string {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  // Longest matching nav prefix wins ('/dashboard' is the fallback).
  const match = [...SHELL_NAV]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) =>
      item.exact ? pathname === item.to : pathname.startsWith(item.to),
    )
  return match?.label ?? 'Home'
}

export function ShellTopbar({
  user,
  onSignOut,
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
}) {
  const [mobileNav, setMobileNav] = useState(false)
  const title = usePageTitle()
  const email = user?.email ?? ''
  const label = user?.name || email || 'Account'
  const initial = (user?.name || email || '?').charAt(0).toUpperCase()

  return (
    <header className="flex h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground md:hidden"
              />
            }
          >
            <MenuIcon className="size-4" />
          </SheetTrigger>
          <SheetPopup side="left" className="w-64 p-0">
            <ShellSidebar onNavigate={() => setMobileNav(false)} />
          </SheetPopup>
        </Sheet>

        <div className="min-w-0">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Workspace
          </div>
          <div className="truncate font-medium text-sm">{title}</div>
        </div>
      </div>

      <Menu>
        <MenuTrigger
          render={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-foreground/[0.05]"
            />
          }
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/10 font-medium text-xs">
            {initial}
          </div>
          <span className="hidden max-w-[16rem] truncate text-muted-foreground text-sm sm:inline">
            {email}
          </span>
        </MenuTrigger>
        <MenuPopup align="end" className="w-56">
          <div className="px-2 py-1.5">
            <div className="truncate font-medium text-sm">{label}</div>
            {email ? (
              <div className="truncate text-muted-foreground text-xs">
                {email}
              </div>
            ) : null}
          </div>
          <MenuSeparator />
          <MenuItem variant="destructive" onClick={onSignOut}>
            <LogOutIcon />
            Sign out
          </MenuItem>
        </MenuPopup>
      </Menu>
    </header>
  )
}
