import { Link, createFileRoute } from '@tanstack/react-router'
import { LayersIcon, GitBranchIcon, FileDownIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { AuthCard } from '@/features/auth'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  const { isAuthenticated } = Route.useRouteContext()
  return (
    <main className="grid min-h-svh grid-cols-1 bg-background text-foreground lg:grid-cols-[minmax(440px,1fr)_1.1fr]">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <BrandRow />
          <div className="mt-12">
            {isAuthenticated ? <SignedIn /> : <AuthCard />}
          </div>
        </div>
      </div>
      <PitchPanel />
    </main>
  )
}

function BrandRow() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span className="font-heading font-semibold text-lg tracking-tight">
        folio
      </span>
      <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.28em]">
        beta
      </span>
    </div>
  )
}

function BrandMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="size-6 text-foreground"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  )
}

function SignedIn() {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="font-heading text-3xl text-balance tracking-tight">
        You're signed in
      </h1>
      <p className="text-muted-foreground text-pretty text-sm">
        Head to your workspace to keep building.
      </p>
      <Button size="lg" className="mt-6 w-full" render={<Link to="/dashboard" />}>
        Go to dashboard
      </Button>
    </div>
  )
}

const FEATURES = [
  {
    icon: LayersIcon,
    title: 'Shared blocks',
    body: 'Projects, experience, and skills live once in a team pool — reuse them everywhere.',
  },
  {
    icon: GitBranchIcon,
    title: 'Resume variants',
    body: 'Compose resumes from references with per-resume overrides. Branch and fork like git.',
  },
  {
    icon: FileDownIcon,
    title: 'One-click export',
    body: 'Render any immutable snapshot to a polished PDF, straight from the browser.',
  },
]

function PitchPanel() {
  return (
    <div className="relative hidden overflow-hidden border-border border-l lg:flex lg:flex-col lg:justify-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            'radial-gradient(60% 50% at 15% 12%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 62%)',
            'radial-gradient(55% 55% at 88% 88%, color-mix(in oklab, var(--foreground) 7%, transparent), transparent 68%)',
          ].join(', '),
        }}
      />
      <div className="relative flex w-full max-w-lg flex-col gap-10 px-16">
        <div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.32em]">
            Team portfolio &amp; resume manager
          </div>
          <h2 className="mt-4 font-heading text-3xl text-balance leading-tight tracking-tight">
            A resume is a composition of shared blocks.
          </h2>
          <p className="mt-3 text-muted-foreground text-pretty text-sm leading-relaxed">
            Pool your team's work once, then assemble tailored resumes from it —
            versioned, live, and export-ready.
          </p>
        </div>

        <Separator />

        <ul className="flex flex-col gap-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-3.5">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background/60 text-foreground">
                <Icon className="size-4.5" />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium text-sm">{title}</span>
                <span className="text-muted-foreground text-sm leading-relaxed">
                  {body}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
