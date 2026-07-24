import { type FormEvent, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group'
import { authClient } from '#/lib/auth-client'

type Mode = 'signIn' | 'signUp' | 'forgot'

export function AuthCard() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signIn')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [reveal, setReveal] = useState(false)
  const [sent, setSent] = useState(false)

  const isSignUp = mode === 'signUp'
  const isForgot = mode === 'forgot'

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setSent(false)
  }

  async function onForgotSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const email = new FormData(e.currentTarget).get('email') as string
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setPending(false)
    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }
    // Always show success — the server does not reveal whether the email exists.
    setSent(true)
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const password = form.get('password') as string
    const name = (form.get('name') as string) ?? ''
    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })
    setPending(false)
    if (error) {
      setError(error.message ?? 'Something went wrong')
      return
    }
    await router.invalidate()
    window.location.href = '/dashboard'
  }

  if (isForgot) {
    return (
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-3xl text-balance tracking-tight">
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-muted-foreground text-pretty text-sm">
            {sent
              ? 'If an account exists for that email, we sent a link to reset your password.'
              : "Enter your email and we'll send you a reset link."}
          </p>
        </div>

        {!sent && (
          <form onSubmit={onForgotSubmit} className="mt-8 flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="forgot-email">Email</FieldLabel>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                autoComplete="email"
                nativeInput
              />
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
              Send reset link
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-muted-foreground text-sm">
          <button
            type="button"
            onClick={() => switchMode('signIn')}
            className="cursor-pointer text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
          >
            Back to sign in
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-3xl text-balance tracking-tight">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground text-pretty text-sm">
          {isSignUp
            ? 'Start building resumes from shared team blocks.'
            : 'Sign in to your team workspace.'}
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {isSignUp && (
          <Field>
            <FieldLabel htmlFor="auth-name">Name</FieldLabel>
            <Input
              id="auth-name"
              name="name"
              type="text"
              required
              placeholder="Ada Lovelace"
              autoComplete="name"
              nativeInput
            />
          </Field>
        )}

        <Field>
          <FieldLabel htmlFor="auth-email">Email</FieldLabel>
          <Input
            id="auth-email"
            name="email"
            type="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            nativeInput
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="auth-password">Password</FieldLabel>
            {!isSignUp && (
              <button
                type="button"
                onClick={() => switchMode('forgot')}
                className="cursor-pointer text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Forgot password?
              </button>
            )}
          </div>
          <InputGroup>
            <InputGroupInput
              id="auth-password"
              name="password"
              type={reveal ? 'text' : 'password'}
              required
              minLength={8}
              placeholder={isSignUp ? 'At least 8 characters' : '••••••••'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
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

        <Button type="submit" size="lg" loading={pending} className="mt-1 w-full">
          {isSignUp ? 'Create account' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-8 text-center text-muted-foreground text-sm">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => switchMode(isSignUp ? 'signIn' : 'signUp')}
          className="cursor-pointer text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded"
        >
          {isSignUp ? 'Sign in' : 'Sign up'}
        </button>
      </p>
    </div>
  )
}
