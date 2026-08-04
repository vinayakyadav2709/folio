import { useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import type { FunctionArgs, FunctionReturnType } from 'convex/server'
import { FileTextIcon, PaperclipIcon, Sparkles, XIcon } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  IMPORT_ACCEPT,
  errorMessage,
  formatBytes,
  isNoAiKey,
  readImportFile,
} from '@/lib/ai-extract'
import { Panel, PanelSection } from './settings-panel'

type Extracted = FunctionReturnType<typeof api.ai.extractResume>
type ProfilePatch = FunctionArgs<typeof api.profiles.updateMyProfile>

const SCALARS = [
  { key: 'fullName', label: 'Full name', group: 'identity' },
  { key: 'headline', label: 'Headline', group: 'identity' },
  { key: 'email', label: 'Email', group: 'identity' },
  { key: 'phone', label: 'Phone', group: 'identity' },
  { key: 'location', label: 'Location', group: 'identity' },
  { key: 'githubUrl', label: 'GitHub', group: 'links' },
  { key: 'linkedinUrl', label: 'LinkedIn', group: 'links' },
  { key: 'websiteUrl', label: 'Website', group: 'links' },
] as const

const ARRAYS = ['skills', 'education', 'experience', 'achievements'] as const

const REPLACES = 'Applying this replaces this whole section of your profile.'

/**
 * Paste a resume → AI extracts it → tick what you want → apply.
 *
 * Everything is opt-in-by-default but individually removable: profile array
 * sections are a full overwrite server-side, so what is ticked here is exactly
 * what the section becomes. Projects go through createProject instead and land
 * unpublished.
 */
export function ImportResumeCard() {
  const extractResume = useAction(api.ai.extractResume)
  const updateMyProfile = useMutation(api.profiles.updateMyProfile)
  const createProject = useMutation(api.projects.createProject)
  const teams = useQuery(api.teams.listMyTeams)
  const fileInput = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState('')
  const [attachment, setAttachment] = useState<
    { name: string; size: number; data: string; mediaType: string } | null
  >(null)
  const [extracting, setExtracting] = useState(false)
  const [noAiKey, setNoAiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [teamId, setTeamId] = useState<string>('')

  const [progress, setProgress] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ done: string[]; failed: string[] } | null>(null)

  // The teams query may still be loading when extraction finishes, so the
  // first team is the fallback rather than a one-shot default.
  const selectedTeam = teamId || teams?.[0]?._id || ''

  const has = (key: string) => checked.has(key)
  const setKeys = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev)
      for (const k of keys) if (on) next.add(k)
      else next.delete(k)
      return next
    })

  // Markdown / LaTeX / plain text lands in the textarea so it can be read and
  // edited before extracting; PDFs and images ride along as an attachment.
  async function takeFile(file: File | undefined | null) {
    if (!file) return
    setError(null)
    try {
      const read = await readImportFile(file)
      if (read.kind === 'text') {
        setSource(read.text)
        setAttachment(null)
      } else {
        setAttachment({ name: file.name, size: file.size, ...read })
      }
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function onExtract() {
    if (!source.trim() && !attachment) return
    setExtracting(true)
    setError(null)
    setNoAiKey(false)
    try {
      const result = await extractResume({
        text: source.trim() || undefined,
        file: attachment ? { data: attachment.data, mediaType: attachment.mediaType } : undefined,
      })
      setExtracted(result)
      setChecked(new Set(allKeys(result)))
      setSummary(null)
    } catch (err) {
      if (isNoAiKey(err)) setNoAiKey(true)
      else setError(errorMessage(err))
    } finally {
      setExtracting(false)
    }
  }

  function reset() {
    setExtracted(null)
    setChecked(new Set())
    setSource('')
    setAttachment(null)
    setSummary(null)
    setError(null)
  }

  // Item keys are `${section}:${index}`, so selecting a section is a filter.
  const sel = (id: string) => (_: unknown, i: number) => has(`${id}:${i}`)

  const pickedProjects =
    extracted && selectedTeam ? extracted.projects.filter(sel('projects')) : []

  function buildPatch(e: Extracted): ProfilePatch {
    const patch: ProfilePatch = {}
    for (const { key } of SCALARS) if (has(key) && e[key]) patch[key] = e[key]
    const skills = e.skills.filter(sel('skills'))
    const education = e.education.filter(sel('education'))
    const experience = e.experience.filter(sel('experience'))
    const achievements = e.achievements.filter(sel('achievements'))
    if (skills.length) patch.skills = skills
    if (education.length) patch.education = education
    if (experience.length) patch.experience = experience
    if (achievements.length) patch.achievements = achievements
    return patch
  }

  async function onApply() {
    if (!extracted) return
    const patch = buildPatch(extracted)
    const projects = pickedProjects
    const done: string[] = []
    const failed: string[] = []
    setSummary(null)

    if (Object.keys(patch).length) {
      setProgress('Updating profile…')
      try {
        await updateMyProfile(patch)
        done.push('Updated profile')
      } catch (err) {
        failed.push(`Profile: ${errorMessage(err)}`)
      }
    }

    let created = 0
    for (const [i, p] of projects.entries()) {
      setProgress(`Creating project ${i + 1} of ${projects.length} — ${p.name}`)
      try {
        await createProject({
          teamId: selectedTeam as Id<'teams'>,
          name: p.name,
          description: p.description,
          subtitle: p.subtitle,
          brief: p.brief,
          demoUrl: p.demoUrl,
          githubUrl: p.githubUrl,
          startDate: p.startDate,
          endDate: p.endDate,
        })
        created++
      } catch (err) {
        failed.push(`Project “${p.name}”: ${errorMessage(err)}`)
      }
    }
    if (created) done.push(`created ${created} project${created === 1 ? '' : 's'}`)

    setProgress(null)
    setSummary({ done, failed })
  }

  const nothingChecked =
    !extracted || (Object.keys(buildPatch(extracted)).length === 0 && pickedProjects.length === 0)

  if (!extracted) {
    return (
      <Panel>
        <PanelSection
          title="Import a resume"
          hint="Paste your resume, or upload a PDF, image, Markdown or LaTeX file. AI pulls out your details, skills, education, experience, achievements and projects. You review everything before anything is written."
        >
          <div className="flex flex-col gap-2.5 rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/[0.06] to-sky-500/[0.06] p-3 dark:border-violet-400/25">
            <Textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              onPaste={(e) => {
                const file = e.clipboardData.files[0]
                if (file) {
                  e.preventDefault()
                  void takeFile(file)
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void takeFile(e.dataTransfer.files[0])
              }}
              placeholder="Paste your resume — or drop a PDF, image, Markdown or LaTeX file here."
              className="min-h-48 resize-y bg-background/60 text-sm"
            />

            {attachment && (
              <div className="flex items-center gap-2.5 rounded-lg border bg-background/60 p-2">
                {attachment.mediaType.startsWith('image/') ? (
                  <img
                    src={`data:${attachment.mediaType};base64,${attachment.data}`}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-md object-cover outline outline-black/10 dark:outline-white/10"
                  />
                ) : (
                  <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md bg-foreground/[0.04] outline outline-black/10 dark:outline-white/10">
                    <FileTextIcon className="size-5 text-muted-foreground" />
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{attachment.name}</span>
                  <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                    {formatBytes(attachment.size)}
                  </span>
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove ${attachment.name}`}
                  onClick={() => setAttachment(null)}
                >
                  <XIcon />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="transition-transform active:scale-[0.96]"
                onClick={() => fileInput.current?.click()}
              >
                <PaperclipIcon /> {attachment ? 'Choose another file' : 'Upload a file'}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept={IMPORT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  void takeFile(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExtract}
                loading={extracting}
                disabled={extracting || (!source.trim() && !attachment)}
                className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-sky-500/10 transition-[background-color,scale] hover:from-violet-500/20 hover:to-sky-500/20 active:scale-[0.96] dark:border-violet-400/30"
              >
                <Sparkles className="text-violet-500 dark:text-violet-300" />
                {extracting ? 'Reading…' : 'Extract'}
              </Button>
            </div>

            <p className="font-mono text-[11px] text-muted-foreground leading-relaxed">
              PDF · PNG · JPEG · Markdown · LaTeX · text, up to 5 MB · read with your own AI key ·
              nothing is saved until you review and apply
            </p>

            {noAiKey && (
              <p className="text-muted-foreground text-sm">
                No AI key configured. Add one under{' '}
                <Link
                  to="/dashboard/settings"
                  className="underline underline-offset-4"
                >
                  AI keys
                </Link>{' '}
                to use the importer.
              </p>
            )}
            {error && <p className="text-destructive-foreground text-sm">{error}</p>}
          </div>
        </PanelSection>
      </Panel>
    )
  }

  const e = extracted
  const scalars = SCALARS.filter((s) => e[s.key])
  const identity = scalars.filter((s) => s.group === 'identity')
  const links = scalars.filter((s) => s.group === 'links')

  return (
    <Panel>
      <PanelSection
        title="Review"
        hint="Untick anything you don't want. Ticked sections are written exactly as shown."
      >
        <div className="flex flex-col gap-6">
          {identity.length > 0 && (
            <Section
              title="Identity"
              keys={identity.map((s) => s.key)}
              checked={checked}
              setKeys={setKeys}
            >
              {identity.map((s) => (
                <Row key={s.key} checked={has(s.key)} onChange={(on) => setKeys([s.key], on)}>
                  <span className="font-mono text-[11px] text-muted-foreground">{s.label}</span>
                  <span className="text-sm">{e[s.key]}</span>
                </Row>
              ))}
            </Section>
          )}

          {links.length > 0 && (
            <Section
              title="Links"
              keys={links.map((s) => s.key)}
              checked={checked}
              setKeys={setKeys}
            >
              {links.map((s) => (
                <Row key={s.key} checked={has(s.key)} onChange={(on) => setKeys([s.key], on)}>
                  <span className="font-mono text-[11px] text-muted-foreground">{s.label}</span>
                  <span className="truncate font-mono text-[11px]">{e[s.key]}</span>
                </Row>
              ))}
            </Section>
          )}

          <ItemSection
            id="skills"
            title="Skills"
            note={REPLACES}
            items={e.skills}
            checked={checked}
            setKeys={setKeys}
            render={(s) => (
              <>
                <span className="font-medium text-sm">{s.category}</span>
                <span className="text-muted-foreground text-sm">{s.items.join(' · ')}</span>
              </>
            )}
          />

          <ItemSection
            id="education"
            title="Education"
            note={REPLACES}
            items={e.education}
            checked={checked}
            setKeys={setKeys}
            render={(ed) => (
              <>
                <span className="font-medium text-sm">{ed.school}</span>
                <span className="text-muted-foreground text-sm">
                  {[ed.degree, ed.location, dates(ed.startDate, ed.endDate), ed.gpa && `GPA ${ed.gpa}`]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </>
            )}
          />

          <ItemSection
            id="experience"
            title="Experience"
            note={REPLACES}
            items={e.experience}
            checked={checked}
            setKeys={setKeys}
            render={(x) => (
              <>
                <span className="font-medium text-sm">
                  {[x.role, x.company].filter(Boolean).join(' · ')}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {[x.location, dates(x.startDate, x.endDate)].filter(Boolean).join(' · ')}
                </span>
                {x.bullets.length > 0 && (
                  <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-muted-foreground text-sm">
                    {x.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                )}
              </>
            )}
          />

          <ItemSection
            id="achievements"
            title="Achievements"
            note={REPLACES}
            items={e.achievements}
            checked={checked}
            setKeys={setKeys}
            render={(a) => (
              <>
                <span className="font-medium text-sm">{a.title}</span>
                {a.description && (
                  <span className="text-muted-foreground text-sm">{a.description}</span>
                )}
                {a.date && (
                  <span className="font-mono text-[11px] text-muted-foreground">{a.date}</span>
                )}
              </>
            )}
          />

          {e.projects.length > 0 && (
            <ItemSection
              id="projects"
              title="Projects"
              note="Added alongside your existing projects — nothing is replaced. Imported projects stay private until you publish them."
              items={e.projects}
              checked={checked}
              setKeys={setKeys}
              disabled={!selectedTeam}
              header={
                teams === undefined ? null : teams.length === 0 ? (
                  <p className="text-muted-foreground text-xs">
                    Projects need a team.{' '}
                    <Link to="/dashboard/teams" className="underline underline-offset-4">
                      Create one first
                    </Link>
                    , then import again.
                  </p>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-muted-foreground">Team</span>
                    <Select
                      value={selectedTeam}
                      onValueChange={(value) => setTeamId(value as string)}
                      items={Object.fromEntries(teams.map((t) => [t._id, t.name]))}
                    >
                      <SelectTrigger size="sm" className="max-w-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectPopup>
                        {teams.map((t) => (
                          <SelectItem key={t._id} value={t._id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectPopup>
                    </Select>
                  </div>
                )
              }
              render={(p) => (
                <>
                  <span className="font-medium text-sm">{p.name}</span>
                  {p.subtitle && (
                    <span className="text-muted-foreground text-sm">{p.subtitle}</span>
                  )}
                  <span className="line-clamp-3 text-muted-foreground text-sm">
                    {p.brief || p.description}
                  </span>
                </>
              )}
            />
          )}
        </div>
      </PanelSection>

      <PanelSection title="Apply" hint="One write for the profile, then one project at a time.">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onApply}
              loading={progress !== null}
              disabled={progress !== null || nothingChecked}
            >
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={reset} disabled={progress !== null}>
              Start over
            </Button>
            {progress && (
              <span className="font-mono text-[11px] text-muted-foreground">{progress}</span>
            )}
          </div>

          {summary && (
            <div className="flex flex-col gap-1.5 rounded-lg border p-3">
              <p className="font-mono text-[11px] text-muted-foreground">
                {summary.done.length ? summary.done.join(' · ') : 'Nothing applied'}
              </p>
              {summary.failed.length > 0 && (
                <>
                  <Separator className="my-0.5" />
                  <p className="font-mono text-[11px] text-destructive-foreground uppercase tracking-[0.18em]">
                    Failed
                  </p>
                  <ul className="flex list-disc flex-col gap-0.5 pl-4 text-destructive-foreground text-sm">
                    {summary.failed.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </PanelSection>
    </Panel>
  )
}

function dates(start?: string, end?: string) {
  return [start, end].filter(Boolean).join(' – ')
}

function allKeys(e: Extracted): string[] {
  const keys = SCALARS.filter((s) => e[s.key]).map((s) => s.key as string)
  for (const id of [...ARRAYS, 'projects'] as const)
    keys.push(...e[id].map((_, i) => `${id}:${i}`))
  return keys
}

// A titled group with a master checkbox that mirrors (and drives) its rows.
function Section({
  title,
  note,
  keys,
  checked,
  setKeys,
  disabled,
  header,
  children,
}: {
  title: string
  note?: string
  keys: string[]
  checked: ReadonlySet<string>
  setKeys: (keys: string[], on: boolean) => void
  disabled?: boolean
  header?: React.ReactNode
  children: React.ReactNode
}) {
  const on = keys.filter((k) => checked.has(k)).length

  return (
    <section className={disabled ? 'opacity-60' : undefined}>
      <div className="flex items-center gap-2.5">
        <Checkbox
          checked={on === keys.length && on > 0}
          indeterminate={on > 0 && on < keys.length}
          disabled={disabled}
          onCheckedChange={(value) => setKeys(keys, value === true)}
          aria-label={`Select all ${title}`}
        />
        <h3 className="font-medium text-sm">{title}</h3>
        <span className="font-mono text-[11px] text-muted-foreground">
          {on}/{keys.length}
        </span>
      </div>
      {note && (
        <p className="mt-1 pl-7 font-mono text-[11px] text-muted-foreground leading-relaxed">
          {note}
        </p>
      )}
      {header && <div className="mt-2.5 pl-7">{header}</div>}
      <div className="mt-2 flex flex-col divide-y divide-border/60 border-border/60 border-t pl-7">
        {children}
      </div>
    </section>
  )
}

function Row({
  checked,
  onChange,
  disabled,
  children,
}: {
  checked: boolean
  onChange: (on: boolean) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 py-2 transition-colors hover:bg-foreground/[0.02]">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">{children}</span>
    </label>
  )
}

function ItemSection<T>({
  id,
  title,
  note,
  items,
  checked,
  setKeys,
  render,
  disabled,
  header,
}: {
  id: string
  title: string
  note: string
  items: readonly T[]
  checked: ReadonlySet<string>
  setKeys: (keys: string[], on: boolean) => void
  render: (item: T) => React.ReactNode
  disabled?: boolean
  header?: React.ReactNode
}) {
  if (items.length === 0) return null
  const keys = items.map((_, i) => `${id}:${i}`)

  return (
    <Section
      title={title}
      note={note}
      keys={keys}
      checked={checked}
      setKeys={setKeys}
      disabled={disabled}
      header={header}
    >
      {items.map((item, i) => (
        <Row
          key={i}
          checked={checked.has(keys[i])}
          disabled={disabled}
          onChange={(on) => setKeys([keys[i]], on)}
        >
          {render(item)}
        </Row>
      ))}
    </Section>
  )
}
