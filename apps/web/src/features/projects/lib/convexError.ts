// ConvexError from the backend carries a structured payload: { tag, message }
// (see packages/backend/convex/lib/errors.ts). This pulls it out safely.
export function convexErrorData(err: unknown): { tag: string; message: string } | null {
  const data = (err as { data?: unknown } | null)?.data
  if (data && typeof data === 'object' && 'tag' in data && 'message' in data) {
    const d = data as { tag: unknown; message: unknown }
    if (typeof d.tag === 'string' && typeof d.message === 'string') {
      return { tag: d.tag, message: d.message }
    }
  }
  return null
}

export function errorMessage(err: unknown): string {
  return convexErrorData(err)?.message ?? (err instanceof Error ? err.message : 'Something went wrong')
}
