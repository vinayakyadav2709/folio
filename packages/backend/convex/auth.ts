import { betterAuth } from 'better-auth/minimal'
import { createClient, type GenericCtx } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import authConfig from './auth.config'
import { components } from './_generated/api'
import type { DataModel } from './_generated/dataModel'

const siteUrl = process.env.SITE_URL!

export const authComponent = createClient<DataModel>(components.betterAuth)

// Deliver the password-reset link. Uses Resend's HTTP API directly (no SDK).
// Set RESEND_API_KEY (and optionally RESET_PASSWORD_FROM) to send real mail;
// without a key we log the link so local/dev reset still works.
async function sendResetPasswordEmail(to: string, url: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn(`[reset-password] RESEND_API_KEY unset — dev link for ${to}: ${url}`)
    return
  }
  const from = process.env.RESET_PASSWORD_FROM ?? 'folio <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Reset your folio password',
      html:
        `<p>We received a request to reset your folio password.</p>` +
        `<p><a href="${url}">Reset your password</a></p>` +
        `<p>This link expires in 1 hour. If you didn't request it, you can ignore this email.</p>`,
    }),
  })
  if (!res.ok) {
    // Don't leak the reset URL into logs on failure — just the status.
    throw new Error(`Resend send failed: ${res.status}`)
  }
}

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    // Direct vite origin (fixed port 4100) so tests can bypass the portless proxy
    trustedOrigins: [siteUrl, 'http://127.0.0.1:4100', 'http://localhost:4100'],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendResetPasswordEmail(user.email, url)
      },
    },
    plugins: [convex({ authConfig })],
  })
}

// Canonical component API — pairs with AuthBoundary on the client.
export const { getAuthUser } = authComponent.clientApi()
