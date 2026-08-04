import { useEffect } from 'react'
import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
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

// Every user gets a personal team, but a query can't write — so the shell
// creates it once. Gated on listMyTeams having loaded with no personal team in
// it, so it fires only for a user who doesn't have one yet (and the mutation is
// idempotent anyway). The subscription is already held by WarmQueries.
function usePersonalTeam() {
  const teams = useQuery(api.teams.listMyTeams)
  const ensurePersonalTeam = useMutation(api.teams.ensurePersonalTeam)
  const missing = teams !== undefined && !teams.some((t) => t.personal)
  useEffect(() => {
    if (missing) void ensurePersonalTeam({})
  }, [missing, ensurePersonalTeam])
}

function DashboardShell() {
  const user = useQuery(api.auth.getAuthUser)
  usePersonalTeam()

  return (
    <div className="flex h-svh bg-background text-foreground">
      <WarmQueries />
      <ShellRail user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <ShellMobileBar user={user} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full w-full flex-col px-6 py-8 lg:px-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
