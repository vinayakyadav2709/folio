import { Link } from '@tanstack/react-router'
import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { span, timeline } from '../lib/timeline'
import type { Entry, Profile } from '../lib/timeline'
import { TimelineGraph } from './timeline-graph'

const GROUPS = ['Work', 'Projects', 'Awards', 'Education'] as const

// p.cv-style public page. Styling lives in styles.css under `.pf`.
export function PortfolioView({ data }: { data: Profile }) {
  const { username, fullName, headline, email, githubUrl, linkedinUrl, websiteUrl } = data
  const resume = data.resumes[0]
  const rows = timeline(data)
  const [theme, setTheme] = useTheme()
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const stack = data.skills.filter((g) => g.items.length > 0)
  const toggle = (key: string, v?: boolean) => setOpen((o) => ({ ...o, [key]: v ?? !o[key] }))
  const [active, setActive] = useState<string[]>([])

  // Two-way hover link with the graph (awards aren't on it).
  const link = (r: Entry) =>
    r.group === 'Awards'
      ? {}
      : {
          id: `pf-${r.key}`,
          'data-on': active.includes(r.key) || undefined,
          onMouseEnter: () => setActive([r.key]),
          onMouseLeave: () => setActive([]),
          onFocus: () => setActive([r.key]),
          onBlur: () => setActive([]),
        }
  // Clicking a graph item opens its row and brings it into view.
  const pick = (key: string) => {
    toggle(key, true)
    const el = document.getElementById(`pf-${key}`)
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches
    el?.scrollIntoView({ block: 'center', behavior: smooth ? 'smooth' : 'auto' })
    el?.focus({ preventScroll: true })
  }

  const row = (r: Entry) =>
    r.project ? (
      <Link
        key={r.key}
        to="/p/$teamSlug/$projectSlug"
        params={{ teamSlug: r.project.teamSlug, projectSlug: r.project.slug }}
        className="pf-row"
        {...link(r)}
      >
        <Cells r={r} mark="[↗]" />
      </Link>
    ) : r.detail?.length ? (
      <Expand key={r.key} r={r} open={!!open[r.key]} onToggle={() => toggle(r.key)} rowProps={link(r)}>
        <ul>
          {r.detail.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Expand>
    ) : (
      <div key={r.key} className="pf-row cursor-default" {...link(r)}>
        <Cells r={r} mark="" />
      </div>
    )

  return (
    <div className="pf flex min-h-svh px-6 py-8 sm:px-10 sm:py-10" data-theme={theme ?? undefined}>
        <main className="flex min-w-0 flex-col min-[1200px]:max-w-[calc(50vw-140px)]">
          <header>
            <h1>{fullName ?? username}</h1>
            {headline && <p className="text-pretty">{headline}</p>}
          </header>

          <div className="pf-grid mt-6">
            {GROUPS.map((g) => {
              const group = rows.filter((r) => r.group === g)
              return group.length === 0 ? null : (
                <Fragment key={g}>
                  <div className="pf-label">{g}</div>
                  {group.map(row)}
                  <div className="pf-gap" />
                </Fragment>
              )
            })}

            {stack.length > 0 && <div className="pf-label">Stack</div>}
            {stack.map((g) => (
              <Expand
                key={g.category}
                r={{ name: g.category }}
                wide={g.items.join(', ')}
                open={!!open[g.category]}
                onToggle={() => toggle(g.category)}
              >
                {g.items.join(', ')}.
              </Expand>
            ))}
            {stack.length > 0 && <div className="pf-gap" />}

            {resume && (
              <Link
                to="/u/$username/$resumeSlug"
                params={{ username, resumeSlug: resume.slug }}
                className="pf-row"
              >
                <Cells r={{ name: 'Resume' }} mark="[↓]" />
              </Link>
            )}
            {email && <Email email={email} />}
            {githubUrl && <Out href={githubUrl} name="GitHub" />}
            {linkedinUrl && <Out href={linkedinUrl} name="LinkedIn" />}
            {websiteUrl && <Out href={websiteUrl} name="Website" />}
          </div>

          <footer className="mt-auto pt-16">
            <button
              type="button"
              className="cursor-pointer"
              onClick={() => setTheme(effective(theme) === 'dark' ? 'light' : 'dark')}
            >
              Theme
            </button>
          </footer>
        </main>
        {/* Fixed so the spine (44px into the graph = SPINE) sits exactly at 50vw. */}
        <aside className="fixed top-10 left-[calc(50vw-44px)] hidden h-[calc(100svh-5rem)] w-28 min-[1200px]:block">
          <TimelineGraph entries={rows} active={active} onHover={setActive} onPick={pick} />
        </aside>
    </div>
  )
}

// `wide` replaces kind + dates with one truncated faded line (stack rows).
function Cells({ r, mark, wide }: { r: Partial<Entry>; mark: string; wide?: string }) {
  return (
    <>
      <span className="pf-name">{r.name}</span>
      {wide ? (
        <span className="pf-wide">{wide}</span>
      ) : (
        <>
          <span className="pf-kind">{r.kind}</span>
          <span className="pf-date">{r.from || r.to ? span(r) : ''}</span>
        </>
      )}
      <span className="pf-mark" aria-hidden>
        {mark}
      </span>
    </>
  )
}

function Expand({
  r,
  open,
  onToggle,
  wide,
  rowProps,
  children,
}: {
  r: Partial<Entry>
  wide?: string
  rowProps?: object
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="pf-item">
      <button type="button" className="pf-row" aria-expanded={open} onClick={onToggle} {...rowProps}>
        <Cells r={r} wide={wide} mark={open ? '[-]' : '[+]'} />
      </button>
      <div className="pf-panel" data-open={open} inert={!open}>
        <div>
          <div className="pf-prose">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Email({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  return (
    <Expand
      r={{ name: 'Email' }}
      open={open}
      onToggle={() => {
        setOpen(!open)
        if (!open)
          navigator.clipboard?.writeText(email).then(
            () => setCopied(true),
            () => {},
          )
      }}
    >
      <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
        {email}
      </a>
      {copied && <span> — copied</span>}
    </Expand>
  )
}

function Out({ href, name }: { href: string; name: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="pf-row">
      <Cells r={{ name }} mark="[↗]" />
    </a>
  )
}

type Theme = 'light' | 'dark'
const effective = (t: Theme | null): Theme =>
  t ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

// Per-viewer choice; null = follow the OS (handled in CSS, so SSR is right).
function useTheme() {
  const [theme, set] = useState<Theme | null>(null)
  useEffect(() => {
    try {
      const t = localStorage.getItem('pf-theme')
      if (t === 'light' || t === 'dark') set(t)
    } catch {}
  }, [])
  const save = (t: Theme) => {
    set(t)
    try {
      localStorage.setItem('pf-theme', t)
    } catch {}
  }
  return [theme, save] as const
}
