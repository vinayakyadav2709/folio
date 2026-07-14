import { LinkIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import { groupSections } from '@folio/exports'
import type { api } from '@folio/backend/api'
import { PageFooter } from './chrome'

type Published = FunctionReturnType<typeof api.resumes.getPublished>

export function ResumeView({ data }: { data: Published }) {
  const { header, blocks, theme } = data
  const accent = theme.accentColor
  const sections = groupSections(blocks)
  const accentStyle = accent ? { color: accent } : undefined

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <article className="mx-auto max-w-3xl px-6 py-14 sm:px-8 print:py-8">
        {/* Header */}
        <header className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 left-0 h-[calc(100%-0.75rem)] w-1 rounded-full bg-foreground/15 print:bg-foreground/40"
            style={accent ? { backgroundColor: accent } : undefined}
          />
          <div className="pl-5">
            <h1
              className="text-pretty font-heading font-bold text-4xl tracking-tight sm:text-[2.75rem] sm:leading-[1.05]"
              style={accentStyle}
            >
              {header.fullName}
            </h1>
            {header.headline && (
              <p className="mt-2 max-w-prose text-pretty text-lg text-muted-foreground leading-relaxed">
                {header.headline}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {header.email && (
                <ContactChip Icon={MailIcon} href={`mailto:${header.email}`}>
                  {header.email}
                </ContactChip>
              )}
              {header.phone && (
                <ContactChip Icon={PhoneIcon} href={`tel:${header.phone}`}>
                  {header.phone}
                </ContactChip>
              )}
              {header.location && (
                <ContactChip Icon={MapPinIcon}>{header.location}</ContactChip>
              )}
              {header.links.map((l) => (
                <ContactChip key={l.url} Icon={LinkIcon} href={l.url}>
                  {l.label}
                </ContactChip>
              ))}
            </div>
          </div>
        </header>

        {/* Sections */}
        <div className="mt-12 flex flex-col gap-10">
          {sections.map((section) => (
            <section key={section.type} className="break-inside-avoid">
              {section.heading && (
                <div className="mb-4 flex items-center gap-3">
                  <h2
                    className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]"
                    style={accentStyle}
                  >
                    {section.heading}
                  </h2>
                  <span
                    aria-hidden
                    className="h-px flex-1 bg-border/70"
                    style={accent ? { backgroundColor: `${accent}33` } : undefined}
                  />
                </div>
              )}
              <div className="flex flex-col gap-6">
                {section.blocks.map((block) => (
                  <div key={block.id} className="break-inside-avoid">
                    {(block.title || block.dateRange) && (
                      <div className="flex items-baseline justify-between gap-4">
                        {block.title && (
                          <h3 className="text-pretty font-heading font-semibold text-[15px]">
                            {block.title}
                          </h3>
                        )}
                        {block.dateRange && (
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.12em] tabular-nums">
                            {block.dateRange}
                          </span>
                        )}
                      </div>
                    )}
                    {block.subtitle && (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {block.subtitle}
                      </p>
                    )}
                    {block.bullets.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {block.bullets.map((b, i) => (
                          <li
                            key={i}
                            className="relative pl-4 text-pretty text-sm text-foreground/90 leading-relaxed"
                          >
                            <span
                              aria-hidden
                              className="absolute top-[0.5em] left-0 size-1.5 rounded-full bg-foreground/25"
                              style={accent ? { backgroundColor: accent } : undefined}
                            />
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                    {block.links && block.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {block.links.map((l) => (
                          <ContactChip key={l.url} Icon={LinkIcon} href={l.url}>
                            {l.label}
                          </ContactChip>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
      <PageFooter />
    </div>
  )
}

function ContactChip({
  Icon,
  href,
  children,
}: {
  Icon: typeof MailIcon
  href?: string
  children: React.ReactNode
}) {
  const className =
    'inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-foreground/[0.03] px-2.5 py-1 text-[12px] text-muted-foreground transition-colors print:border-border'
  const content = (
    <>
      <Icon className="size-3 shrink-0 opacity-70" />
      {children}
    </>
  )
  if (href) {
    return (
      <a
        href={href}
        className={`${className} hover:border-foreground/30 hover:text-foreground`}
        style={undefined}
      >
        {content}
      </a>
    )
  }
  return <span className={className}>{content}</span>
}
