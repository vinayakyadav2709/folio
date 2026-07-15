import { useRouterState } from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { useState } from 'react'
import { Sheet, SheetPopup, SheetTrigger } from '#/components/ui/sheet'
import {
  ProfileMenu,
  SHELL_NAV,
  ShellSheetNav,
} from '#/components/shared/shell-sidebar'

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
  return match?.label ?? 'Dashboard'
}

/**
 * The mobile-only top bar (`< md`). The desktop rail collapses here into a
 * hamburger sheet plus the current page title and the shared profile menu.
 */
export function ShellMobileBar({
  user,
  onSignOut,
}: {
  user: ShellUser | null | undefined
  onSignOut: () => void
}) {
  const [mobileNav, setMobileNav] = useState(false)
  const title = usePageTitle()

  return (
    <header className="flex h-[3.25rem] shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet open={mobileNav} onOpenChange={setMobileNav}>
          <SheetTrigger
            render={
              <button
                type="button"
                aria-label="Open navigation"
                className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
              />
            }
          >
            <MenuIcon className="size-4" />
          </SheetTrigger>
          <SheetPopup side="left" className="w-64 p-0">
            <ShellSheetNav onNavigate={() => setMobileNav(false)} />
          </SheetPopup>
        </Sheet>

        <div className="truncate font-medium text-sm">{title}</div>
      </div>

      <ProfileMenu user={user} onSignOut={onSignOut} side="bottom" />
    </header>
  )
}
