import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, UsersIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { PageFooter } from './chrome'

type PublicTeam = NonNullable<FunctionReturnType<typeof api.portfolio.getPublicTeam>>
type Member = PublicTeam['members'][number]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

function memberLabel(m: Member): string {
  return m.fullName ?? (m.username ? `@${m.username}` : 'Member')
}

export function TeamPortfolio({ data }: { data: PublicTeam }) {
  const { team, members, projects } = data

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

          {members.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {members.map((m, i) => {
                const label = memberLabel(m)
                const inner = (
                  <>
                    <Avatar className="size-6 bg-muted">
                      <AvatarFallback className="text-[10px]">{initials(label)}</AvatarFallback>
                    </Avatar>
                    <span className="flex flex-col leading-tight">
                      <span className="font-medium text-[13px]">{label}</span>
                      {m.headline && (
                        <span className="text-[11px] text-muted-foreground">{m.headline}</span>
                      )}
                    </span>
                  </>
                )
                const className =
                  'inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/40 py-1 pr-3.5 pl-1'
                return m.username ? (
                  <Link
                    key={m.username}
                    to="/u/$username"
                    params={{ username: m.username }}
                    className={`${className} transition-colors hover:border-foreground/25`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span key={`${label}-${i}`} className={className}>
                    {inner}
                  </span>
                )
              })}
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
              <p className="mt-3 text-muted-foreground text-sm">No projects published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {projects.map((project) => (
                <article
                  key={project.slug}
                  className="group relative flex flex-col rounded-2xl border border-border/60 bg-background/40 p-5 transition-colors hover:border-foreground/25"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-pretty font-heading font-semibold text-base leading-snug">
                      <Link
                        to="/p/$teamSlug/$projectSlug"
                        params={{ teamSlug: team.slug, projectSlug: project.slug }}
                        className="before:absolute before:inset-0"
                      >
                        {project.name}
                      </Link>
                    </h3>
                    <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                  </div>

                  {project.subtitle && (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{project.subtitle}</p>
                  )}
                  {project.brief && (
                    <p className="mt-2 line-clamp-3 text-pretty text-sm text-foreground/80 leading-relaxed">
                      {project.brief}
                    </p>
                  )}

                  {(project.demoUrl || project.githubUrl) && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
                      {project.demoUrl && (
                        <a
                          href={project.demoUrl}
                          className="relative z-10 inline-flex items-center gap-1 hover:text-foreground"
                        >
                          Demo
                        </a>
                      )}
                      {project.githubUrl && (
                        <a
                          href={project.githubUrl}
                          className="relative z-10 inline-flex items-center gap-1 hover:text-foreground"
                        >
                          GitHub
                        </a>
                      )}
                    </div>
                  )}
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
