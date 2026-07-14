import { ConvexError } from 'convex/values'

// Model errors cross the Convex boundary as ConvexError with { tag, message }
// (see packages/backend/convex/lib/errors.ts). Surface the message to the user.
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string }
    if (typeof data?.message === 'string') return data.message
  }
  return 'Something went wrong'
}

export function toKebab(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
