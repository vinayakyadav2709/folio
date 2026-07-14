import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, ExternalLinkIcon, GithubIcon, ImageIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'
import { PageFooter } from './chrome'
import { Markdown } from './markdown'

type PublicProject = NonNullable<FunctionReturnType<typeof api.portfolio.getPublicProject>>

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

export function ProjectView({ data }: { data: PublicProject }) {
  const { project, team, contributors } = data

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <main className="mx-auto max-w-2xl px-6 py-14 sm:px-8">
        {/* Title block */}
        <header className="border-border/60 border-b pb-6">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Project ·{' '}
            <Link
              to="/team/$slug"
              params={{ slug: team.slug }}
              className="text-foreground/70 transition-colors hover:text-foreground"
            >
              {team.name}
            </Link>
          </div>
          <h1 className="mt-2 text-balance font-heading font-bold text-4xl tracking-tight">
            {project.name}
          </h1>
          {project.subtitle && (
            <p className="mt-2 text-pretty text-lg text-muted-foreground leading-relaxed">
              {project.subtitle}
            </p>
          )}
          {project.brief && (
            <p className="mt-3 text-pretty text-sm text-foreground/80 leading-relaxed">
              {project.brief}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-foreground px-3.5 py-1.5 font-medium text-[13px] text-background shadow-xs/5 transition-[background-color,scale] hover:bg-foreground/90 active:scale-[0.97]"
              >
                <ExternalLinkIcon className="size-3.5" />
                Live demo
              </a>
            )}
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-popover px-3.5 py-1.5 font-medium text-[13px] shadow-xs/5 transition-[background-color,scale] hover:bg-accent/50 active:scale-[0.97]"
              >
                <GithubIcon className="size-3.5" />
                GitHub
              </a>
            )}
            {project.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-popover px-3.5 py-1.5 font-medium text-[13px] shadow-xs/5 transition-[background-color,scale] hover:bg-accent/50 active:scale-[0.97]"
              >
                {l.label}
                <ArrowUpRightIcon className="size-3.5 opacity-70" />
              </a>
            ))}
          </div>
        </header>

        {/* Description */}
        {project.description && (
          <Markdown className="mt-8 text-pretty text-[15px] leading-7 [&_p]:my-4">
            {project.description}
          </Markdown>
        )}

        {/* Screenshots */}
        {project.screenshotUrls.length > 0 && (
          <section className="mt-12">
            <SectionHeading Icon={ImageIcon}>Screenshots</SectionHeading>
            <div className="flex flex-col gap-5">
              {project.screenshotUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={`${project.name} screenshot`}
                  loading="lazy"
                  className="w-full rounded-xl bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
              ))}
            </div>
          </section>
        )}

        {/* Contributors */}
        {contributors.length > 0 && (
          <section className="mt-12">
            <SectionHeading>Contributors</SectionHeading>
            <div className="flex flex-col gap-6">
              {contributors.map((c, i) => {
                const label = c.fullName ?? (c.username ? `@${c.username}` : 'Contributor')
                const heading = (
                  <span className="inline-flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted font-medium text-[10px] text-muted-foreground">
                      {initials(label)}
                    </span>
                    <span className="font-heading font-semibold text-[15px]">{label}</span>
                  </span>
                )
                return (
                  <div key={c.username ?? `${label}-${i}`}>
                    {c.username ? (
                      <Link
                        to="/u/$username"
                        params={{ username: c.username }}
                        className="group inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      >
                        {heading}
                        <ArrowUpRightIcon className="size-3.5 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                      </Link>
                    ) : (
                      heading
                    )}
                    {c.bullets.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5 pl-9">
                        {c.bullets.map((b, j) => (
                          <li
                            key={j}
                            className="relative pl-4 text-pretty text-sm text-foreground/90 leading-relaxed"
                          >
                            <span
                              aria-hidden
                              className="absolute top-[0.5em] left-0 size-1.5 rounded-full bg-foreground/25"
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>
      <PageFooter />
    </div>
  )
}

function SectionHeading({
  Icon,
  children,
}: {
  Icon?: typeof ImageIcon
  children: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
        {Icon && <Icon className="mr-1.5 inline size-3 align-[-1px] opacity-70" />}
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-border/70" />
    </div>
  )
}
