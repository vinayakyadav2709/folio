import { ArrowUpRightIcon, ImageIcon } from 'lucide-react'
import type { FunctionReturnType } from 'convex/server'
import type { api } from '@folio/backend/api'
import { PageFooter } from './chrome'
import { Markdown } from './markdown'

type PublicProject = FunctionReturnType<typeof api.projects.getPublicProject>

export function ProjectView({ data }: { data: PublicProject }) {
  const { name, description, links, screenshotUrls } = data

  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <main className="mx-auto max-w-2xl px-6 py-14 sm:px-8">
        {/* Title block */}
        <header className="border-border/60 border-b pb-6">
          <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
            Project
          </div>
          <h1 className="mt-2 text-balance font-heading font-bold text-4xl tracking-tight">
            {name}
          </h1>
          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-foreground/[0.03] px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  {l.label}
                  <ArrowUpRightIcon className="size-3 opacity-70" />
                </a>
              ))}
            </div>
          )}
        </header>

        {/* Body */}
        {description && (
          <Markdown className="mt-8 text-pretty text-[15px] leading-7 [&_p]:my-4">
            {description}
          </Markdown>
        )}

        {/* Screenshot gallery */}
        {screenshotUrls.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.28em]">
                <ImageIcon className="mr-1.5 inline size-3 align-[-1px] opacity-70" />
                Screenshots
              </h2>
              <span aria-hidden className="h-px flex-1 bg-border/70" />
            </div>
            <div className="flex flex-col gap-5">
              {screenshotUrls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt={`${name} screenshot`}
                  loading="lazy"
                  className="w-full rounded-xl bg-muted outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                />
              ))}
            </div>
          </section>
        )}
      </main>
      <PageFooter />
    </div>
  )
}
