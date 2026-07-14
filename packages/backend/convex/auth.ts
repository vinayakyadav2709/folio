import { betterAuth } from 'better-auth/minimal'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import authConfig from './auth.config'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    // Direct vite origin (fixed port 4100) so tests can bypass the portless proxy
    trustedOrigins: [siteUrl, 'http://127.0.0.1:4100', 'http://localhost:4100'],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [convex({ authConfig })],
  })
}

// Canonical component API — pairs with AuthBoundary on the client.
export const { getAuthUser } = authComponent.clientApi()
