import { type FormEvent, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { authClient } from '#/lib/auth-client'

export const Route = createFileRoute('/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const router = useRouter()
  const { token, error: linkError } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [done, setDone] = useState(false)

  const invalidLink = !token || linkError

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!token) return
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)
    const newPassword = form.get('password') as string
    const { error } = await authClient.resetPassword({ newPassword, token })
    setPending(false)
    if (error) {
      setError(error.message ?? 'Could not reset your password')
      return
    }
    setDone(true)
    await router.invalidate()
  }

  return (
    <main className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl text-balance tracking-tight">
            {done ? 'Password updated' : 'Choose a new password'}
          </h1>
          <p className="text-muted-foreground text-pretty text-sm">
            {done
              ? 'You can now sign in with your new password.'
              : invalidLink
                ? 'This reset link is invalid or has expired. Request a new one to continue.'
                : 'Enter a new password for your account.'}
          </p>
        </div>

        {done || invalidLink ? (
          <Button
            size="lg"
            className="mt-8 w-full"
            render={<Link to="/" />}
          >
            {done ? 'Go to sign in' : 'Back to sign in'}
          </Button>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="reset-password">New password</FieldLabel>
              <InputGroup>
                <InputGroupInput
                  id="reset-password"
                  name="password"
                  type={reveal ? 'text' : 'password'}
                  required
                  minLength={8}
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

            <Button
              type="submit"
              size="lg"
              loading={pending}
              className="mt-1 w-full"
            >
              Reset password
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
