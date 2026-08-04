import { useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import type { FunctionArgs, FunctionReturnType } from 'convex/server'
import { ChevronDownIcon, FileTextIcon, ImageIcon, PaperclipIcon, Sparkles, XIcon } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { sortTeams, teamLabel } from '@/components/shared/team-picker'
import {
  IMPORT_ACCEPT,
  errorMessage,
  formatBytes,
  isNoAiKey,
  normalizeKey,
  readImportFile,
} from '@/lib/ai-extract'
import { relativeTime } from '@/lib/relative-time'
import { cn } from '@/lib/utils'
import { PoolBody, SectionRule } from './entry-card'

type Extracted = FunctionReturnType<typeof api.ai.extractResume>
type ProfilePatch = FunctionArgs<typeof api.profiles.updateMyProfile>
type Profile = NonNullable<FunctionReturnType<typeof api.profiles.getMyProfile>>
type ImportRun = FunctionReturnType<typeof api.imports.listMyImports>[number]
type AppliedItem = ImportRun['applied'][number]

/** What happens to one extracted item on apply. */
type Action = 'create' | 'update' | 'skip'

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

const MERGES =
  'Matched entries are updated in place, new ones are added, and anything already on your profile that the resume never mentions is left untouched.'

const eq = (a: string | undefined, b: string | undefined) =>
  !!a && !!b && normalizeKey(a) === normalizeKey(b)

/**
 * Paste a resume → AI extracts it → decide per item → apply.
 *
 * Every extracted item is matched against what already exists (team projects by
 * name, profile entries by their section key) and defaults to *updating* that
 * match, because importing the same resume twice used to mint duplicates —
 * project slugs auto-suffix, so the server can't dedupe on the user's behalf.
 * Profile sections merge into the stored array rather than replacing it.
 *
 * Laid out as a full dashboard page rather than a settings panel: the flow's
 * three states each own the page. The drop surface is the devl `empty-no-files`
 * arrangement (dashed 2xl panel, preview stack, drag highlight); review is the
 * devl `table-issues` row grammar — a hairline-divided list per section, the
 * decision control in a fixed right-hand column — under the `profile-skills`
 * section rules the sibling pool pages use; the apply report is the SaveBar
 * position, sticky at the bottom.
 */
export function ImportResumeCard() {
  const extractResume = useAction(api.ai.extractResume)
  const updateMyProfile = useMutation(api.profiles.updateMyProfile)
  const createProject = useMutation(api.projects.createProject)
  const updateProject = useMutation(api.projects.updateProject)
  const recordImport = useMutation(api.imports.recordImport)
  const history = useQuery(api.imports.listMyImports)
  const teams = useQuery(api.teams.listMyTeams)
  const profile = useQuery(api.profiles.getMyProfile)
  const fileInput = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState('')
  const [attachment, setAttachment] = useState<
    { name: string; size: number; data: string; mediaType: string } | null
  >(null)
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [noAiKey, setNoAiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [extracted, setExtracted] = useState<Extracted | null>(null)
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [overrides, setOverrides] = useState<Record<string, Action>>({})
  const [teamId, setTeamId] = useState<string>('')

  const [progress, setProgress] = useState<string | null>(null)
  const [summary, setSummary] = useState<{ done: string[]; failed: string[] } | null>(null)

  // The teams query may still be loading when extraction finishes, so the
  // first team is the fallback rather than a one-shot default.
  const selectedTeam = teamId || teams?.[0]?._id || ''
  const teamProjects = useQuery(
    api.projects.listTeamProjects,
    selectedTeam ? { teamId: selectedTeam as Id<'teams'> } : 'skip',
  )

  const has = (key: string) => checked.has(key)
  const setKeys = (keys: string[], on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev)
      for (const k of keys) if (on) next.add(k)
      else next.delete(k)
      return next
    })

  const existing = {
    skills: profile?.skills ?? [],
    education: profile?.education ?? [],
    experience: profile?.experience ?? [],
    achievements: profile?.achievements ?? [],
  }

  // Matches recompute from the live queries, so switching team re-matches
  // projects for free — no effect, no stale state.
  const projectMatches = useMemo(
    () =>
      (extracted?.projects ?? []).map((p) =>
        teamProjects?.find((q) => eq(q.name, p.name)),
      ),
    [extracted, teamProjects],
  )

  const matches: Record<string, readonly (string | undefined)[]> = extracted
    ? {
        skills: extracted.skills.map(
          (s) => existing.skills.find((x) => same.skills(s, x))?.category,
        ),
        education: extracted.education.map(
          (ed) => existing.education.find((x) => same.education(ed, x))?.school,
        ),
        experience: extracted.experience.map(
          (x) => existing.experience.find((y) => same.experience(x, y))?.company,
        ),
        achievements: extracted.achievements.map(
          (a) => existing.achievements.find((x) => same.achievements(a, x))?.title,
        ),
        projects: projectMatches.map((m) => m?.name),
      }
    : {}

  const matchOf = (id: string, i: number) => matches[id]?.[i]

  /** Override wins, else update-when-matched. A stale "update" with no match
   *  (team switched) degrades to create rather than silently doing nothing. */
  function actionOf(id: string, i: number): Action {
    const chosen = overrides[`${id}:${i}`]
    if (chosen === 'update' && !matchOf(id, i)) return 'create'
    return chosen ?? (matchOf(id, i) ? 'update' : 'create')
  }
  const setAction = (key: string, action: Action) =>
    setOverrides((prev) => ({ ...prev, [key]: action }))
  const setSectionActions = (id: string, count: number, on: boolean) =>
    setOverrides((prev) => {
      const next = { ...prev }
      for (let i = 0; i < count; i++) {
        if (on) delete next[`${id}:${i}`]
        else next[`${id}:${i}`] = 'skip'
      }
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
      setChecked(new Set(SCALARS.filter((s) => result[s.key]).map((s) => s.key as string)))
      setOverrides({})
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
    setOverrides({})
    setSource('')
    setAttachment(null)
    setSummary(null)
    setError(null)
  }

  const pickedProjects =
    extracted && selectedTeam
      ? extracted.projects.flatMap((p, i) =>
          actionOf('projects', i) === 'skip'
            ? []
            : [{ project: p, target: actionOf('projects', i) === 'update' ? projectMatches[i] : undefined }],
        )
      : []

  const skippedCount = extracted
    ? (['skills', 'education', 'experience', 'achievements', 'projects'] as const).reduce(
        (n, id) => n + extracted[id].filter((_, i) => actionOf(id, i) === 'skip').length,
        0,
      )
    : 0

  /** Merged section arrays: existing entries stay, matches are replaced in
   *  place, the rest is appended. `undefined` when nothing is going in, so the
   *  key never reaches the mutation and the stored array is left alone. */
  function buildPatch(e: Extracted): ProfilePatch {
    const patch: ProfilePatch = {}
    for (const { key } of SCALARS) if (has(key) && e[key]) patch[key] = e[key]

    const skills = merge(e.skills, existing.skills, 'skills', actionOf, same.skills, (s) => s)
    // Media lives only on the stored entry — an update must not drop it.
    const education = merge(
      e.education,
      existing.education,
      'education',
      actionOf,
      same.education,
      (ed, prev) => ({ ...ed, mediaIds: prev?.mediaIds }),
    )
    const experience = merge(
      e.experience,
      existing.experience,
      'experience',
      actionOf,
      same.experience,
      (x, prev) => ({ ...x, mediaIds: prev?.mediaIds }),
    )
    const achievements = merge(
      e.achievements,
      existing.achievements,
      'achievements',
      actionOf,
      same.achievements,
      (a, prev) => ({ ...a, mediaIds: prev?.mediaIds }),
    )

    if (skills) patch.skills = skills
    if (education) patch.education = education
    if (experience) patch.experience = experience
    if (achievements) patch.achievements = achievements
    return patch
  }

  /**
   * The profile half of the import record, read off the *same* `has` / `actionOf`
   * decisions `buildPatch` reads, so history can never claim something the patch
   * did not carry. Pushed only once the profile mutation has actually landed.
   */
  function appliedProfileItems(e: Extracted): AppliedItem[] {
    const items: AppliedItem[] = SCALARS.filter((s) => has(s.key) && e[s.key]).map((s) => ({
      section: s.group,
      key: s.key,
      label: `${s.label}: ${e[s.key]}`,
      action: profile?.[s.key] ? ('update' as const) : ('create' as const),
    }))
    for (const section of ['skills', 'education', 'experience', 'achievements'] as const) {
      const describeItem = describe[section] as (item: unknown) => { key: string; label: string }
      e[section].forEach((item, i) => {
        const action = actionOf(section, i)
        if (action === 'skip') return
        const { key, label } = describeItem(item)
        items.push({ section, key: normalizeKey(key), label, action })
      })
    }
    return items
  }

  async function onApply() {
    if (!extracted) return
    const patch = buildPatch(extracted)
    const projects = pickedProjects
    const done: string[] = []
    const failed: string[] = []
    // Provenance, recorded only for writes that actually succeeded.
    const applied: AppliedItem[] = []
    setSummary(null)

    if (Object.keys(patch).length) {
      setProgress('Updating profile…')
      try {
        await updateMyProfile(patch)
        done.push('Updated profile')
        applied.push(...appliedProfileItems(extracted))
      } catch (err) {
        failed.push(`Profile: ${errorMessage(err)}`)
      }
    }

    let created = 0
    let updated = 0
    for (const [i, { project: p, target }] of projects.entries()) {
      setProgress(
        `${target ? 'Updating' : 'Creating'} project ${i + 1} of ${projects.length} — ${p.name}`,
      )
      const fields = {
        name: p.name,
        description: p.description,
        subtitle: p.subtitle,
        brief: p.brief,
        demoUrl: p.demoUrl,
        githubUrl: p.githubUrl,
        startDate: p.startDate,
        endDate: p.endDate,
      }
      try {
        if (target) {
          await updateProject({ projectId: target._id, ...fields })
          updated++
        } else {
          await createProject({ teamId: selectedTeam as Id<'teams'>, ...fields })
          created++
        }
        applied.push({
          section: 'projects',
          key: normalizeKey(p.name),
          label: p.name,
          action: target ? 'update' : 'create',
        })
      } catch (err) {
        failed.push(`Project “${p.name}”: ${errorMessage(err)}`)
      }
    }
    if (created) done.push(`created ${created} project${created === 1 ? '' : 's'}`)
    if (updated) done.push(`updated ${updated} project${updated === 1 ? '' : 's'}`)
    if (skippedCount) done.push(`skipped ${skippedCount}`)

    // History is a nicety, the data is already written — a failure here is
    // reported alongside the rest rather than thrown.
    if (applied.length) {
      try {
        await recordImport({ source: attachment?.name ?? 'Pasted text', applied })
      } catch (err) {
        failed.push(`Import history: ${errorMessage(err)}`)
      }
    }

    setProgress(null)
    setSummary({ done, failed })
  }

  const nothingChecked =
    !extracted || (Object.keys(buildPatch(extracted)).length === 0 && pickedProjects.length === 0)

  if (!extracted) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Import"
          actions={
            <Button
              type="button"
              onClick={onExtract}
              loading={extracting}
              disabled={extracting || (!source.trim() && !attachment)}
              className="active:scale-[0.96]"
            >
              <Sparkles />
              {extracting ? 'Reading…' : 'Extract'}
            </Button>
          }
        />

        <PoolBody>
          {/* devl `empty-no-files`: one dashed surface owns the whole step, and
              the drop target is the surface — not just the textarea inside it. */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void takeFile(e.dataTransfer.files[0])
            }}
            className={cn(
              'flex animate-entry flex-col gap-5 rounded-2xl border-2 border-dashed p-5 transition-colors duration-200 sm:p-8',
              dragging
                ? 'border-violet-500/60 bg-violet-500/[0.05] dark:border-violet-400/60'
                : 'border-border/70 bg-card/20 hover:border-border',
            )}
          >
            <div className="flex flex-col items-center text-center">
              <PreviewStack />
              <h2 className="mt-5 text-balance font-heading font-semibold text-lg">
                Drop a resume here, or paste it below
              </h2>
              <p className="mt-1.5 max-w-md text-pretty text-muted-foreground text-sm leading-relaxed">
                AI pulls out your details, skills, education, experience, achievements and projects.
                You review every item before anything is written.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-5 active:scale-[0.96]"
                onClick={() => fileInput.current?.click()}
              >
                <PaperclipIcon /> {attachment ? 'Choose another file' : 'Choose a file'}
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
            </div>

            {attachment && (
              // devl `modals-upload-files` row: glyph tile, name over size, remove.
              <div className="flex animate-entry items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-2.5">
                {attachment.mediaType.startsWith('image/') ? (
                  <img
                    src={`data:${attachment.mediaType};base64,${attachment.data}`}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg object-cover outline outline-black/10 dark:outline-white/10"
                  />
                ) : (
                  <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-foreground/[0.06] outline outline-black/10 dark:outline-white/10">
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
                  className="active:scale-[0.96]"
                  onClick={() => setAttachment(null)}
                >
                  <XIcon />
                </Button>
              </div>
            )}

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
              placeholder="Paste your resume — or drop a PDF, image, Markdown or LaTeX file anywhere on this panel."
              className="min-h-56 resize-y rounded-xl bg-background/60 text-sm"
            />

            <p className="text-center font-mono text-[11px] text-muted-foreground leading-relaxed">
              PDF · PNG · JPEG · Markdown · LaTeX · text, up to 5 MB · read with your own AI key ·
              nothing is saved until you review and apply
            </p>

            {noAiKey && (
              <p className="text-center text-muted-foreground text-sm">
                No AI key configured. Add one under{' '}
                <Link to="/dashboard/settings" className="underline underline-offset-4">
                  AI keys
                </Link>{' '}
                to use the importer.
              </p>
            )}
            {error && <p className="text-center text-destructive-foreground text-sm">{error}</p>}
          </div>

          {history && history.length > 0 && <ImportHistory runs={history} />}
        </PoolBody>
      </div>
    )
  }

  const e = extracted
  const scalars = SCALARS.filter((s) => e[s.key])
  const identity = scalars.filter((s) => s.group === 'identity')
  const links = scalars.filter((s) => s.group === 'links')
  const itemSection = { matchOf, actionOf, setAction, setSectionActions }
  const applying = progress !== null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import"
        actions={
          <>
            <Button type="button" variant="ghost" onClick={reset} disabled={applying}>
              Start over
            </Button>
            <Button
              type="button"
              onClick={onApply}
              loading={applying}
              disabled={applying || nothingChecked}
              className="active:scale-[0.96]"
            >
              Apply
            </Button>
          </>
        }
      />

      <PoolBody>
        <p className="max-w-2xl text-pretty text-muted-foreground text-sm leading-relaxed">
          Each item can be added as new, used to update the entry it matches, or skipped. {MERGES}
        </p>

        {identity.length > 0 && (
          <CheckSection
            title="Identity"
            keys={identity.map((s) => s.key)}
            checked={checked}
            setKeys={setKeys}
          >
            {identity.map((s) => (
              <Row key={s.key} as="label">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                    {s.label}
                  </span>
                  <span className="text-sm">{e[s.key]}</span>
                </span>
                <Checkbox
                  checked={has(s.key)}
                  onCheckedChange={(value) => setKeys([s.key], value === true)}
                  className="mt-1 shrink-0"
                />
              </Row>
            ))}
          </CheckSection>
        )}

        {links.length > 0 && (
          <CheckSection
            title="Links"
            keys={links.map((s) => s.key)}
            checked={checked}
            setKeys={setKeys}
          >
            {links.map((s) => (
              <Row key={s.key} as="label">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                    {s.label}
                  </span>
                  <span className="truncate font-mono text-[11px]">{e[s.key]}</span>
                </span>
                <Checkbox
                  checked={has(s.key)}
                  onCheckedChange={(value) => setKeys([s.key], value === true)}
                  className="mt-1 shrink-0"
                />
              </Row>
            ))}
          </CheckSection>
        )}

        <ItemSection
          {...itemSection}
          id="skills"
          title="Skills"
          items={e.skills}
          render={(s) => (
            <>
              <span className="font-medium text-sm">{s.category}</span>
              <span className="text-pretty text-muted-foreground text-sm">
                {s.items.join(' · ')}
              </span>
            </>
          )}
        />

        <ItemSection
          {...itemSection}
          id="education"
          title="Education"
          items={e.education}
          render={(ed) => (
            <>
              <span className="font-medium text-sm">{ed.school}</span>
              <span className="text-pretty text-muted-foreground text-sm">
                {[ed.degree, ed.location, dates(ed.startDate, ed.endDate), ed.gpa && `GPA ${ed.gpa}`]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </>
          )}
        />

        <ItemSection
          {...itemSection}
          id="experience"
          title="Experience"
          items={e.experience}
          render={(x) => (
            <>
              <span className="font-medium text-sm">
                {[x.role, x.company].filter(Boolean).join(' · ')}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {[x.location, dates(x.startDate, x.endDate)].filter(Boolean).join(' · ')}
              </span>
              {x.bullets.length > 0 && (
                <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-pretty text-muted-foreground text-sm">
                  {x.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        />

        <ItemSection
          {...itemSection}
          id="achievements"
          title="Achievements"
          note="Attached media stays on the entries it belongs to."
          items={e.achievements}
          render={(a) => (
            <>
              <span className="font-medium text-sm">{a.title}</span>
              {a.description && (
                <span className="text-pretty text-muted-foreground text-sm">{a.description}</span>
              )}
              {a.date && (
                <span className="font-mono text-[11px] text-muted-foreground">{a.date}</span>
              )}
            </>
          )}
        />

        <ItemSection
          {...itemSection}
          id="projects"
          title="Projects"
          note="Matched projects are updated in place; the rest are added and stay private until you publish them."
          items={e.projects}
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
                <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                  Team
                </span>
                <Select
                  value={selectedTeam}
                  onValueChange={(value) => setTeamId(value as string)}
                  items={Object.fromEntries(teams.map((t) => [t._id, teamLabel(t)]))}
                >
                  <SelectTrigger size="sm" className="max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {sortTeams(teams).map((t) => (
                      <SelectItem key={t._id} value={t._id}>
                        {teamLabel(t)}
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
                <span className="text-pretty text-muted-foreground text-sm">{p.subtitle}</span>
              )}
              <span className="line-clamp-3 text-pretty text-muted-foreground text-sm">
                {p.brief || p.description}
              </span>
            </>
          )}
        />
      </PoolBody>

      <ApplyReport progress={progress} summary={summary} />
    </div>
  )
}

/** devl `empty-no-files` preview stack — the drop surface's only ornament. */
function PreviewStack() {
  return (
    <div aria-hidden className="relative h-16 w-24">
      <span className="-rotate-12 -translate-x-4 absolute top-2 left-1/2 flex h-14 w-10 origin-bottom items-center justify-center rounded-lg border border-border bg-background">
        <ImageIcon className="size-4 text-muted-foreground" />
      </span>
      <span className="-translate-x-1/2 absolute top-0 left-1/2 flex h-14 w-10 origin-bottom items-center justify-center rounded-lg border border-border bg-background">
        <FileTextIcon className="size-4 text-muted-foreground" />
      </span>
      <span className="absolute top-2 left-1/2 flex h-14 w-10 origin-bottom translate-x-1 rotate-12 items-center justify-center rounded-lg border border-border bg-background">
        <FileTextIcon className="size-4 text-muted-foreground" />
      </span>
    </div>
  )
}

const SECTION_ORDER: readonly AppliedItem['section'][] = [
  'identity',
  'links',
  'skills',
  'education',
  'experience',
  'achievements',
  'projects',
]

/**
 * "What did I already take?" — the record of past import runs, under the drop
 * surface where the question gets asked. Same hairline-divided list grammar as
 * the review step; each run opens to show the items it wrote, grouped by
 * section. `<details>` does the disclosure, so there is no state to hold.
 */
function ImportHistory({ runs }: { runs: readonly ImportRun[] }) {
  return (
    <section className="flex animate-entry flex-col gap-3">
      <SectionRule label="Previous imports" count={runs.length} />
      <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
        {runs.map((run) => (
          <ImportRunRow key={run._id} run={run} />
        ))}
      </div>
    </section>
  )
}

function ImportRunRow({ run }: { run: ImportRun }) {
  const created = run.applied.filter((a) => a.action === 'create').length
  const updated = run.applied.length - created
  const tally = [created && `${created} created`, updated && `${updated} updated`]
    .filter(Boolean)
    .join(' · ')

  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-foreground/[0.02] [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-sm">{run.source}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {relativeTime(run.at)}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          {tally}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-2.5 px-4 pt-1 pb-3.5">
        {SECTION_ORDER.map((section) => {
          const items = run.applied.filter((a) => a.section === section)
          if (items.length === 0) return null
          return (
            <div key={section} className="flex flex-col gap-0.5">
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-[0.25em]">
                {section}
              </span>
              <span className="text-pretty text-muted-foreground text-sm">
                {items.map((a) => a.label).join(' · ')}
              </span>
            </div>
          )
        })}
      </div>
    </details>
  )
}

/**
 * The apply step's report, in the SaveBar position the sibling pool pages use —
 * sticky at the bottom of the page, present only while there is something to
 * say. The primary action itself lives in the page header.
 */
function ApplyReport({
  progress,
  summary,
}: {
  progress: string | null
  summary: { done: string[]; failed: string[] } | null
}) {
  if (!progress && !summary) return null
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-2 border-border/60 border-t bg-background/85 py-3 backdrop-blur">
      <div className="flex items-center gap-2.5">
        {progress && <Spinner className="size-3.5 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 font-mono text-[10px] text-muted-foreground uppercase tabular-nums tracking-[0.25em]">
          {progress ?? (summary?.done.length ? summary.done.join(' · ') : 'Nothing applied')}
        </span>
      </div>
      {summary && summary.failed.length > 0 && (
        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-pretty text-destructive-foreground text-sm">
          {summary.failed.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function dates(start?: string, end?: string) {
  return [start, end].filter(Boolean).join(' – ')
}

/**
 * Per-section identity. Education and experience only compare the secondary
 * field when both sides actually have one, so a hand-typed "MIT" still matches
 * the resume's "MIT — BSc" instead of spawning a second row.
 */
const same = {
  skills: (a: Extracted['skills'][number], b: Profile['skills'][number]) =>
    eq(a.category, b.category),
  education: (a: Extracted['education'][number], b: Profile['education'][number]) =>
    eq(a.school, b.school) && (!a.degree || !b.degree || eq(a.degree, b.degree)),
  experience: (
    a: Extracted['experience'][number],
    b: NonNullable<Profile['experience']>[number],
  ) => eq(a.company, b.company) && (!a.role || !b.role || eq(a.role, b.role)),
  achievements: (
    a: Extracted['achievements'][number],
    b: NonNullable<Profile['achievements']>[number],
  ) => eq(a.title, b.title),
}

/**
 * How one item is written into the import record: `key` is the field `same.*`
 * matches on (so a later run can attribute an entry back to the import that
 * wrote it), `label` is what the history list shows.
 */
const describe: {
  [K in 'skills' | 'education' | 'experience' | 'achievements']: (
    item: Extracted[K][number],
  ) => { key: string; label: string }
} = {
  skills: (s) => ({ key: s.category, label: s.category }),
  education: (ed) => ({
    key: ed.school,
    label: [ed.school, ed.degree].filter(Boolean).join(' — '),
  }),
  experience: (x) => ({
    key: x.company,
    label: [x.role, x.company].filter(Boolean).join(' · '),
  }),
  achievements: (a) => ({ key: a.title, label: a.title }),
}

/**
 * Existing array + extracted items → the array to store. Matched entries are
 * replaced where they sit (order preserved), new ones appended, skipped ones
 * ignored. Returns undefined when nothing was applied so the caller can omit
 * the key entirely and leave the stored section alone.
 */
function merge<E, T>(
  items: readonly E[],
  existing: readonly T[],
  id: string,
  actionOf: (id: string, i: number) => Action,
  same: (e: E, t: T) => boolean,
  to: (e: E, prev: T | undefined) => T,
): T[] | undefined {
  const out = [...existing]
  let touched = false
  items.forEach((item, i) => {
    const action = actionOf(id, i)
    if (action === 'skip') return
    const at = action === 'update' ? out.findIndex((x) => same(item, x)) : -1
    if (at >= 0) out[at] = to(item, out[at])
    else out.push(to(item, undefined))
    touched = true
  })
  return touched ? out : undefined
}

/**
 * Shell shared by both flavours of section. The section rule carries the tally
 * and the master control at its far edge; the rows below are one hairline-
 * divided list (devl `table-issues`) so a section reads as a table on a wide
 * canvas instead of a stack of settings fields.
 */
function SectionShell({
  title,
  note,
  on,
  total,
  onToggleAll,
  disabled,
  header,
  children,
}: {
  title: string
  note?: string
  on: number
  total: number
  onToggleAll: (value: boolean) => void
  disabled?: boolean
  header?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section
      className={cn('flex animate-entry flex-col gap-3', disabled && 'opacity-60')}
    >
      <SectionRule label={title} count={total}>
        <span className="font-mono text-[10px] text-muted-foreground uppercase tabular-nums tracking-[0.25em]">
          {on}/{total}
        </span>
        <Checkbox
          checked={on === total && on > 0}
          indeterminate={on > 0 && on < total}
          disabled={disabled}
          onCheckedChange={(value) => onToggleAll(value === true)}
          aria-label={`Select all ${title}`}
        />
      </SectionRule>
      {note && <p className="text-pretty text-muted-foreground text-xs">{note}</p>}
      {header}
      <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/30">
        {children}
      </div>
    </section>
  )
}

/** One list row: content column, then the fixed decision column on the right. */
function Row({
  as = 'div',
  className,
  children,
}: {
  as?: 'div' | 'label'
  className?: string
  children: React.ReactNode
}) {
  const Tag = as
  return (
    <Tag
      className={cn(
        'flex items-start gap-4 px-4 py-3 transition-colors duration-150 hover:bg-foreground/[0.02]',
        as === 'label' && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

// Scalar fields have nothing to match against, so they keep plain checkboxes.
function CheckSection({
  title,
  keys,
  checked,
  setKeys,
  children,
}: {
  title: string
  keys: string[]
  checked: ReadonlySet<string>
  setKeys: (keys: string[], on: boolean) => void
  children: React.ReactNode
}) {
  return (
    <SectionShell
      title={title}
      on={keys.filter((k) => checked.has(k)).length}
      total={keys.length}
      onToggleAll={(value) => setKeys(keys, value)}
    >
      {children}
    </SectionShell>
  )
}

const ACTIONS: readonly { value: Action; label: string }[] = [
  { value: 'create', label: 'New' },
  { value: 'update', label: 'Update' },
  { value: 'skip', label: 'Skip' },
]

/**
 * One control per row instead of a checkbox *and* a skip: "Skip" is the only
 * way to leave an item out, so there is never a checked-but-skipped row to
 * reason about. The section checkbox drives that same control — clearing it
 * skips every row, ticking it restores each row's default.
 */
function ActionPicker({
  value,
  matched,
  disabled,
  onChange,
}: {
  value: Action
  matched: boolean
  disabled?: boolean
  onChange: (action: Action) => void
}) {
  return (
    <div className="inline-flex shrink-0 self-start overflow-hidden rounded-lg border border-border/60">
      {ACTIONS.map(({ value: action, label }, i) => {
        const unavailable = disabled || (action === 'update' && !matched)
        return (
          <button
            key={action}
            type="button"
            disabled={unavailable}
            aria-pressed={value === action}
            onClick={() => onChange(action)}
            className={cn(
              'min-h-8 px-2.5 py-1.5 font-mono text-[11px] transition-colors duration-150',
              i > 0 && 'border-border/60 border-l',
              value === action
                ? 'bg-foreground/[0.08] text-foreground'
                : 'text-muted-foreground hover:bg-foreground/[0.04]',
              unavailable && 'cursor-not-allowed opacity-40 hover:bg-transparent',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function ItemSection<T>({
  id,
  title,
  note,
  items,
  render,
  matchOf,
  actionOf,
  setAction,
  setSectionActions,
  disabled,
  header,
}: {
  id: string
  title: string
  note?: string
  items: readonly T[]
  render: (item: T) => React.ReactNode
  matchOf: (id: string, i: number) => string | undefined
  actionOf: (id: string, i: number) => Action
  setAction: (key: string, action: Action) => void
  setSectionActions: (id: string, count: number, on: boolean) => void
  disabled?: boolean
  header?: React.ReactNode
}) {
  if (items.length === 0) return null
  const on = items.filter((_, i) => actionOf(id, i) !== 'skip').length

  return (
    <SectionShell
      title={title}
      note={note}
      on={on}
      total={items.length}
      onToggleAll={(value) => setSectionActions(id, items.length, value)}
      disabled={disabled}
      header={header}
    >
      {items.map((item, i) => {
        const match = matchOf(id, i)
        const action = actionOf(id, i)
        return (
          <Row key={i} className={cn(action === 'skip' && 'opacity-50')}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {render(item)}
              {match && (
                <span className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                  matches «{match}»
                </span>
              )}
            </span>
            <ActionPicker
              value={action}
              matched={!!match}
              disabled={disabled}
              onChange={(next) => setAction(`${id}:${i}`, next)}
            />
          </Row>
        )
      })}
    </SectionShell>
  )
}
