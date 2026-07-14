// Shared bits for the public (no-chrome) share pages.

export function PageFooter() {
  return (
    <footer className="mx-auto max-w-3xl px-8 pt-10 pb-10 text-center font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em] print:hidden">
      built with{' '}
      <a
        href="/"
        className="font-medium text-foreground transition-colors hover:text-foreground/70"
      >
        folio
      </a>
    </footer>
  )
}

export function PublicNotFound() {
  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground antialiased">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse at center, black 35%, transparent 75%)',
        }}
      />
      <main className="relative mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.4em]">
          Status · 404
        </div>
        <div className="font-heading font-bold text-[clamp(6rem,20vw,13rem)] leading-none tracking-tighter">
          <span className="bg-gradient-to-b from-foreground to-foreground/30 bg-clip-text text-transparent">
            404
          </span>
        </div>
        <h1 className="mt-8 max-w-md text-balance font-heading text-2xl leading-tight md:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 max-w-sm text-balance text-muted-foreground text-sm">
          This page doesn’t exist, or it hasn’t been published yet.
        </p>
        <a
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-input bg-popover px-4 py-2 text-sm shadow-xs/5 transition-[background-color,scale] hover:bg-accent/50 active:scale-[0.96]"
        >
          Go to folio
        </a>
      </main>
    </div>
  )
}
