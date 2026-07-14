import { useEffect, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useAction, useMutation, useQuery } from 'convex/react'
import { FileText, Sparkles } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { convexErrorData, errorMessage } from '../lib/convexError'
import { useSelectedTeam } from '../lib/useSelectedTeam'
import { Markdown } from './Markdown'
import { TeamPicker } from './TeamPicker'

export function NewProjectScreen() {
  const teams = useQuery(api.teams.listMyTeams)
  const [remembered, select] = useSelectedTeam()
  const createProject = useMutation(api.projects.createProject)
  const generateDescription = useAction(api.ai.generateDescription)
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [brief, setBrief] = useState('')
  const [description, setDescription] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiNoKey, setAiNoKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const teamId =
    teams && teams.length > 0
      ? (teams.find((t) => t._id === remembered)?._id ?? teams[0]._id)
      : null

  useEffect(() => {
    if (teamId && teamId !== remembered) select(teamId)
  }, [teamId, remembered, select])

  async function onGenerate() {
    setAiLoading(true)
    setAiNoKey(false)
    setError(null)
    try {
      const text = await generateDescription({ name, notes: description })
      setDescription(text)
    } catch (err) {
      const data = convexErrorData(err)
      if (data && data.message.toLowerCase().includes('no ai key')) setAiNoKey(true)
      else setError(errorMessage(err))
    } finally {
      setAiLoading(false)
    }
  }

  async function onSave() {
    if (!teamId || !name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const projectId = await createProject({
        teamId: teamId as Id<'teams'>,
        name: name.trim(),
        description,
        subtitle: subtitle.trim() || undefined,
        brief: brief.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
      })
      navigate({ to: '/dashboard/projects/$projectId', params: { projectId } })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  if (teams === undefined)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  if (teams.length === 0) {
    return (
      <Empty className="rounded-2xl border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No teams yet</EmptyTitle>
          <EmptyDescription>Create or join a team before adding projects.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Link
            to="/dashboard/projects"
            className="text-muted-foreground text-xs transition-colors hover:text-foreground"
          >
            ← Projects
          </Link>
          <h1 className="font-heading font-semibold text-2xl text-balance">New project</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" render={<Link to="/dashboard/projects" />}>
            Cancel
          </Button>
          <Button
            className="active:scale-[0.96]"
            onClick={onSave}
            loading={saving}
            disabled={!name.trim() || saving}
          >
            Create project
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left pane — the editor form */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="font-heading text-base">Details</CardTitle>
            <CardDescription>Team, name, and a Markdown description.</CardDescription>
          </CardHeader>
          <CardPanel className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Team</Label>
              <TeamPicker teams={teams} selectedId={teamId} onSelect={select} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Project name"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-subtitle">Subtitle</Label>
              <Input
                id="project-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="One line — e.g. Realtime collaborative editor"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-brief">Brief</Label>
              <Textarea
                id="project-brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="One-paragraph summary of what this is."
                className="min-h-20 resize-y text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="project-description">Description</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onGenerate}
                  loading={aiLoading}
                  disabled={!name.trim() || aiLoading}
                  className="border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-sky-500/10 transition-[background-color,box-shadow,scale] hover:from-violet-500/20 hover:to-sky-500/20 active:scale-[0.96] dark:border-violet-400/30"
                >
                  <Sparkles className="text-violet-500 dark:text-violet-300" /> Generate with AI
                </Button>
              </div>
              {aiNoKey && (
                <p className="text-muted-foreground text-sm">
                  No AI key configured.{' '}
                  <Link to="/dashboard/settings" className="underline underline-offset-4">
                    Add one in Settings
                  </Link>{' '}
                  to use AI assist.
                </p>
              )}
              <Textarea
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write Markdown — headings, lists, code blocks…"
                className="min-h-72 resize-y font-mono text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-demo">Demo URL</Label>
              <Input
                id="project-demo"
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://myapp.dev"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="project-github">GitHub URL</Label>
              <Input
                id="project-github"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/you/project"
              />
            </div>

            {error && <p className="text-destructive text-sm">{error}</p>}
          </CardPanel>
        </Card>

        {/* Right pane — live preview */}
        <Card className="lg:sticky lg:top-6">
          <CardHeader className="flex-row items-center gap-2 border-b">
            <FileText className="size-4 text-muted-foreground" />
            <CardTitle className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.2em]">
              Live preview
            </CardTitle>
          </CardHeader>
          <CardPanel className="min-h-72">
            {name.trim() && (
              <h2 className="mb-4 font-heading font-semibold text-xl text-balance">{name}</h2>
            )}
            {description.trim() ? (
              <Markdown>{description}</Markdown>
            ) : (
              <p className="text-muted-foreground text-sm">
                Your formatted description will appear here as you type.
              </p>
            )}
          </CardPanel>
        </Card>
      </div>
    </div>
  )
}
