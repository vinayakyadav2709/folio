import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, UsersIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { PageFooter } from './chrome'
import { Markdown } from './markdown'

type PublicTeam = FunctionReturnType<typeof api.portfolio.getPublicTeam>

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export function TeamPortfolio({ data }: { data: PublicTeam }) {
  const { team, members, projects } = data
  const named = members.filter((m): m is typeof m & { name: string } => !!m.name)

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <main className="mx-auto max-w-4xl px-6 py-14 sm:px-8">
        {/* Hero */}
        <header>
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Team portfolio
          </div>
          <h1 className="mt-2 text-balance font-heading font-bold text-4xl tracking-tight">
            {team.name}
          </h1>

          {named.length > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex -space-x-2">
                {named.slice(0, 6).map((m) => (
                  <Avatar
                    key={m.name}
                    className="size-9 border-2 border-background bg-muted"
                  >
                    <AvatarFallback className="text-[11px]">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {named.length > 6 && (
                  <div className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-[11px] text-muted-foreground">
                    +{named.length - 6}
                  </div>
                )}
              </div>
              <span className="text-muted-foreground text-sm">
                {named.map((m) => m.name).join(' · ')}
              </span>
            </div>
          )}
        </header>

        {/* Projects */}
        <section className="mt-12">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
              Projects
            </h2>
            <span aria-hidden className="h-px flex-1 bg-border/70" />
            <span className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
              {projects.length}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-border/60 border-dashed bg-background/40 px-6 py-14 text-center">
              <UsersIcon className="mx-auto size-6 text-muted-foreground/60" />
              <p className="mt-3 text-muted-foreground text-sm">
                No projects published yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project._id}
                  className="group relative flex flex-col rounded-2xl border border-border/60 bg-background/40 p-5 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-pretty font-heading font-semibold text-base leading-snug">
                      <Link
                        to="/p/$projectId"
                        params={{ projectId: project._id }}
                        className="before:absolute before:inset-0"
                      >
                        {project.name}
                      </Link>
                    </h3>
                    <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                  </div>

                  {project.description && (
                    <div className="mt-2 line-clamp-3">
                      <Markdown>{project.description}</Markdown>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-3 font-mono text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                      <UsersIcon className="size-3 opacity-70" />
                      {project.contributorIds.length}{' '}
                      {project.contributorIds.length === 1
                        ? 'contributor'
                        : 'contributors'}
                    </span>
                    {project.links.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        className="relative z-10 inline-flex items-center gap-1 hover:text-foreground"
                      >
                        {l.label}
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
