import { Link } from '@tanstack/react-router'
import {
  ArrowUpRightIcon,
  FileTextIcon,
  GithubIcon,
  GlobeIcon,
  LinkedinIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'
import { PageFooter } from './chrome'

type Profile = FunctionReturnType<typeof api.profiles.getPublicProfile>

export function PortfolioView({ data }: { data: Profile }) {
  const { username, fullName, headline } = data
  const { email, phone, location } = data
  const { githubUrl, linkedinUrl, websiteUrl } = data
  const { skills, education, projects, resumes } = data

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <main className="mx-auto max-w-3xl px-6 py-14 sm:px-8">
        {/* Hero */}
        <header className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 left-0 h-[calc(100%-0.75rem)] w-1 rounded-full bg-foreground/15"
          />
          <div className="pl-5">
            <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
              @{username}
            </div>
            <h1 className="mt-2 text-balance font-heading font-bold text-4xl tracking-tight sm:text-[2.75rem] sm:leading-[1.05]">
              {fullName ?? username}
            </h1>
            {headline && (
              <p className="mt-2 max-w-prose text-pretty text-lg text-muted-foreground leading-relaxed">
                {headline}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {email && (
                <Chip Icon={MailIcon} href={`mailto:${email}`}>
                  {email}
                </Chip>
              )}
              {phone && (
                <Chip Icon={PhoneIcon} href={`tel:${phone}`}>
                  {phone}
                </Chip>
              )}
              {location && <Chip Icon={MapPinIcon}>{location}</Chip>}
              {githubUrl && (
                <Chip Icon={GithubIcon} href={githubUrl}>
                  GitHub
                </Chip>
              )}
              {linkedinUrl && (
                <Chip Icon={LinkedinIcon} href={linkedinUrl}>
                  LinkedIn
                </Chip>
              )}
              {websiteUrl && (
                <Chip Icon={GlobeIcon} href={websiteUrl}>
                  Website
                </Chip>
              )}
            </div>
          </div>
        </header>

        <div className="mt-14 flex flex-col gap-12">
          {/* Skills */}
          {skills.length > 0 && (
            <Section heading="Skills">
              <div className="flex flex-col gap-4">
                {skills.map((group) => (
                  <div key={group.category} className="flex flex-col gap-2 sm:flex-row sm:gap-5">
                    <div className="shrink-0 pt-1 font-heading font-semibold text-[13px] sm:w-40">
                      {group.category}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item}
                          className="rounded-md border border-border/70 bg-foreground/[0.03] px-2 py-0.5 text-[12px] text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <Section heading="Education">
              <div className="flex flex-col gap-6">
                {education.map((ed, i) => (
                  <div key={`${ed.school}-${i}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="text-pretty font-heading font-semibold text-[15px]">
                        {ed.school}
                      </h3>
                      {(ed.startDate || ed.endDate) && (
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.12em] tabular-nums">
                          {[ed.startDate, ed.endDate].filter(Boolean).join(' – ')}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
                      {ed.degree && <span>{ed.degree}</span>}
                      {ed.degree && ed.location && <span aria-hidden>·</span>}
                      {ed.location && <span>{ed.location}</span>}
                      {ed.gpa && <span className="tabular-nums">· GPA {ed.gpa}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <Section heading="Projects" count={projects.length}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {projects.map((p) => (
                  <article
                    key={`${p.teamSlug}/${p.slug}`}
                    className="group relative flex flex-col rounded-2xl border border-border/60 bg-background/40 p-5 transition-colors hover:border-foreground/25"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-pretty font-heading font-semibold text-base leading-snug">
                        <Link
                          to="/p/$teamSlug/$projectSlug"
                          params={{ teamSlug: p.teamSlug, projectSlug: p.slug }}
                          className="before:absolute before:inset-0"
                        >
                          {p.name}
                        </Link>
                      </h3>
                      <ArrowUpRightIcon className="size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                    </div>
                    {p.subtitle && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{p.subtitle}</p>
                    )}
                    {p.brief && (
                      <p className="mt-2 line-clamp-3 text-pretty text-sm text-foreground/80 leading-relaxed">
                        {p.brief}
                      </p>
                    )}
                    {(p.demoUrl || p.githubUrl) && (
                      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] text-muted-foreground">
                        {p.demoUrl && (
                          <a
                            href={p.demoUrl}
                            className="relative z-10 inline-flex items-center gap-1 hover:text-foreground"
                          >
                            Demo
                          </a>
                        )}
                        {p.githubUrl && (
                          <a
                            href={p.githubUrl}
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
            </Section>
          )}

          {/* Resumes */}
          {resumes.length > 0 && (
            <Section heading="Resumes" count={resumes.length}>
              <div className="flex flex-col gap-2">
                {resumes.map((r) => (
                  <Link
                    key={r.slug}
                    to="/u/$username/$resumeSlug"
                    params={{ username, resumeSlug: r.slug }}
                    className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-foreground/25"
                  >
                    <FileTextIcon className="size-4 shrink-0 text-muted-foreground/70" />
                    <span className="font-heading font-medium text-sm">{r.name}</span>
                    <ArrowUpRightIcon className="ml-auto size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  )
}

function Section({
  heading,
  count,
  children,
}: {
  heading: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
          {heading}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-border/70" />
        {count !== undefined && (
          <span className="font-mono text-[11px] text-muted-foreground/70 tabular-nums">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  )
}

function Chip({
  Icon,
  href,
  children,
}: {
  Icon: typeof MailIcon
  href?: string
  children: React.ReactNode
}) {
  const className =
    'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-foreground/[0.03] px-2.5 py-1 text-[12px] text-muted-foreground transition-colors'
  const content = (
    <>
      <Icon className="size-3 shrink-0 opacity-70" />
      {children}
    </>
  )
  return href ? (
    <a href={href} className={`${className} hover:border-foreground/30 hover:text-foreground`}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  )
}
