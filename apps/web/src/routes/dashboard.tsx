import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { AuthBoundary } from '@convex-dev/better-auth/react'
import { api } from '@folio/backend/api'
import { ShellRail } from '#/components/shared/shell-sidebar'
import { ShellMobileBar } from '#/components/shared/shell-topbar'
import { WarmQueries } from '#/components/shared/warm-queries'
import { authClient } from '#/lib/auth-client'

// getAuthUser throws only when the session is invalid — for this query any
// error means "not signed in" (per the AuthBoundary docs pattern).
const isAuthError = (_error: unknown) => true

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => {
    if (!context.isAuthenticated) {
      throw redirect({ to: '/' })
    }
  },
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <AuthBoundary
      onUnauth={() => {
        window.location.href = '/'
      }}
      authClient={authClient}
      getAuthUserFn={api.auth.getAuthUser}
      isAuthError={isAuthError}
    >
      <DashboardShell />
    </AuthBoundary>
  )
}

function DashboardShell() {
  const user = useQuery(api.auth.getAuthUser)

  async function signOut() {
    await authClient.signOut()
    // expectAuth requires a full reload on sign-out (per @convex-dev/better-auth docs)
    window.location.href = '/'
  }

  return (
    <div className="flex h-svh bg-background text-foreground">
      <WarmQueries />
      <ShellRail user={user} onSignOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellMobileBar user={user} onSignOut={signOut} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-6 py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
