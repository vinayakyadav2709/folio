import { type FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/shared/page-header'

// The backend raises ConvexError with a { tag, message } payload; pull the
// message out safely without reaching into a sibling feature.
function errorMessage(err: unknown): string {
  const data = (err as { data?: unknown } | null)?.data
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message
    if (typeof message === 'string') return message
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}

export function AdminScreen() {
  const isAdmin = useQuery(api.adminAuth.amISiteAdmin)
  const resetPw = useMutation(api.adminAuth.resetUserPassword)

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setDone(null)
    setPending(true)
    try {
      await resetPw({ email, newPassword })
      setDone(email)
      setNewPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader title="Reset a password" />

      {isAdmin === undefined ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : isAdmin === false ? (
        <p className="text-muted-foreground text-sm">Not authorized.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="admin-email">Email</FieldLabel>
            <Input
              id="admin-email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="off"
              nativeInput
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="admin-password">New password</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="admin-password"
                name="newPassword"
                type={reveal ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                nativeInput
              />
              <InputGroupAddon align="inline-end">
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  aria-label={reveal ? 'Hide password' : 'Show password'}
                  className="cursor-pointer rounded p-1 text-muted-foreground transition-[color,scale] hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {reveal ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </InputGroupAddon>
            </InputGroup>
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/36 bg-destructive/8 px-3 py-2 text-destructive-foreground text-sm"
            >
              {error}
            </p>
          )}

          {done && (
            <p className="rounded-lg border border-border/60 bg-foreground/[0.03] px-3 py-2 text-foreground text-sm">
              Password reset for {done}
            </p>
          )}

          <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
            Reset password
          </Button>
        </form>
      )}
    </div>
  )
}
