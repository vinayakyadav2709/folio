import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouteContext,
} from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import type { ConvexReactClient } from 'convex/react'

import appCss from '../styles.css?url'
import { authClient } from '#/lib/auth-client'
import { getToken } from '#/lib/auth-server'

const getAuth = createServerFn({ method: 'GET' }).handler(async () => {
  // A stale/invalid session cookie makes getToken throw (HTTPError) —
  // treat any failure as signed-out instead of 500ing the whole app.
  try {
    return await getToken()
  } catch {
    return null
  }
})

// Root beforeLoad runs on EVERY navigation, but the SSR token is only needed
// for the initial document + hydration — after that ConvexBetterAuthProvider
// owns auth reactively. Cache on the client so tab switches never wait on a
// server round trip. Sign-in/out do full reloads, which resets this.
let clientAuth: { isAuthenticated: boolean; token: string | null } | null = null

export const Route = createRootRouteWithContext<{
  convexClient: ConvexReactClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'folio' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  beforeLoad: async () => {
    if (typeof document !== 'undefined' && clientAuth) return clientAuth
    const token = (await getAuth()) ?? null
    const auth = { isAuthenticated: !!token, token }
    if (typeof document !== 'undefined') clientAuth = auth
    return auth
  },
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  const context = useRouteContext({ from: Route.id })
  return (
    <ConvexBetterAuthProvider
      client={context.convexClient}
      authClient={authClient}
      initialToken={context.token}
    >
      <Outlet />
    </ConvexBetterAuthProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
