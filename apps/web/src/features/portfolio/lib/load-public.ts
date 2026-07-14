import { notFound } from '@tanstack/react-router'
import { ConvexHttpClient } from 'convex/browser'
import { ConvexError } from 'convex/values'
import type { FunctionArgs, FunctionReference, FunctionReturnType } from 'convex/server'

// Anonymous HTTP client — public pages fetch in the route loader so content
// lands in the SSR HTML. No auth: the react client's expectAuth would block
// signed-out visitors, so we deliberately do NOT use useQuery here.
const client = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL as string)

// Run a public query, mapping the backend's NotFound ConvexError to a
// TanStack notFound() so the route renders its 404 component.
export async function loadPublic<Q extends FunctionReference<'query'>>(
  query: Q,
  args: FunctionArgs<Q>,
): Promise<FunctionReturnType<Q>> {
  try {
    return await client.query(query, args)
  } catch (err) {
    const tag = err instanceof ConvexError ? (err.data as { tag?: string })?.tag : undefined
    if (tag === 'NotFound') throw notFound()
    // A malformed id in the URL fails Convex arg validation before the
    // query runs — for a public share link that's a bad URL, i.e. a 404.
    if (err instanceof Error && err.message.includes('ArgumentValidationError')) throw notFound()
    throw err
  }
}
