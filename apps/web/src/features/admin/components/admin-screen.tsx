import { type FormEvent, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@folio/backend/api'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
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
  const users = useQuery(
    api.adminAuth.listUsers,
    isAdmin ? {} : 'skip',
  )
  const resetPw = useMutation(api.adminAuth.resetUserPassword)

  const [selected, setSelected] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  function select(email: string) {
    setSelected(email)
    setNewPassword('')
    setError(null)
    setDone(null)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selected) return
    setError(null)
    setDone(null)
    setPending(true)
    try {
      await resetPw({ email: selected, newPassword })
      setDone(selected)
      setNewPassword('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  if (isAdmin === undefined) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <PageHeader title="Reset a password" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isAdmin === false) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
        <PageHeader title="Reset a password" />
        <p className="text-muted-foreground text-sm">Not authorized.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8">
      <PageHeader title="Reset a password" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        {/* User list */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sm">Users</h2>
            <span className="text-muted-foreground text-xs">
              {users ? `${users.length} total` : ''}
            </span>
          </div>

          {users === undefined ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground text-sm">No users yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {users.map((u) => {
                const active = u.email === selected
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => select(u.email)}
                      aria-pressed={active}
                      className={[
                        'flex w-full flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors',
                        active
                          ? 'border-primary/50 bg-primary/[0.06]'
                          : 'border-border/60 hover:border-border hover:bg-foreground/[0.03]',
                      ].join(' ')}
                    >
                      <span className="font-medium text-sm">
                        {u.name ?? '—'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {u.email}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Reset panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selected === null ? (
            <p className="rounded-xl border border-border/60 border-dashed px-4 py-6 text-muted-foreground text-sm">
              Select a user to reset their password.
            </p>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex flex-col gap-4 rounded-xl border border-border/60 p-4"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">
                  Resetting password for
                </span>
                <span className="break-all font-medium text-sm">{selected}</span>
              </div>

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

              <Button type="submit" loading={pending} className="w-full">
                Reset password
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
