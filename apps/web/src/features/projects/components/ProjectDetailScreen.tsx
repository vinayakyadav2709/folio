import { useState } from 'react'
import { Link as RouterLink, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Check, Github, Globe, Link2, Pencil, Trash2 } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/shared/page-header'
import { errorMessage } from '../lib/convexError'
import { Monogram } from './avatars'
import { ContributionSection } from './ContributionSection'
import { Markdown } from './Markdown'
import { Screenshots } from './Screenshots'

export function ProjectDetailScreen({ projectId }: { projectId: Id<'projects'> }) {
  const project = useQuery(api.projects.getProject, { projectId })
  const me = useQuery(api.auth.getAuthUser)
  const team = useQuery(api.teams.getTeam, project ? { teamId: project.teamId } : 'skip')

  const updateProject = useMutation(api.projects.updateProject)
  const deleteProject = useMutation(api.projects.deleteProject)
  const navigate = useNavigate()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [brief, setBrief] = useState('')
  const [description, setDescription] = useState('')
  const [demoUrl, setDemoUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  if (project === undefined)
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )

  const meId: string | null = (me as { _id?: string } | null | undefined)?._id ?? null
  const myRole = team?.members.find((m) => m.userId === meId)?.role
  const canDelete = project.ownerId === meId || myRole === 'admin'

  const nameOf = (userId: string) => {
    const m = team?.members.find((mm) => mm.userId === userId)
    return m?.name ?? m?.email ?? 'Unknown'
  }

  function startEdit() {
    setName(project!.name)
    setSubtitle(project!.subtitle ?? '')
    setBrief(project!.brief ?? '')
    setDescription(project!.description)
    setDemoUrl(project!.demoUrl ?? '')
    setGithubUrl(project!.githubUrl ?? '')
    setError(null)
    setEditing(true)
  }

  async function onSave() {
    setSaving(true)
    setError(null)
    try {
      await updateProject({
        projectId,
        name: name.trim(),
        description,
        subtitle: subtitle.trim() || undefined,
        brief: brief.trim() || undefined,
        demoUrl: demoUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
      })
      setEditing(false)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    try {
      await deleteProject({ projectId })
      navigate({ to: '/dashboard/projects' })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  function copyShareLink() {
    if (!team?.team.slug || !project?.slug) return
    navigator.clipboard
      .writeText(`${window.location.origin}/p/${team.team.slug}/${project.slug}`)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
  }

  return (
    <div className="flex flex-col gap-6">
      {editing ? (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="font-heading text-base">Edit project</CardTitle>
            </CardHeader>
            <CardPanel className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-subtitle">Subtitle</Label>
                <Input
                  id="edit-subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="One line — e.g. Realtime collaborative editor"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-brief">Brief</Label>
                <Textarea
                  id="edit-brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="One-paragraph summary of what this is."
                  className="min-h-20 resize-y text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-72 resize-y font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-demo">Demo URL</Label>
                <Input
                  id="edit-demo"
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://myapp.dev"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-github">GitHub URL</Label>
                <Input
                  id="edit-github"
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/you/project"
                />
              </div>
              {error && <p className="text-destructive text-sm">{error}</p>}
              <div className="flex gap-2">
                <Button
                  className="active:scale-[0.96]"
                  onClick={onSave}
                  loading={saving}
                  disabled={!name.trim() || saving}
                >
                  Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </CardPanel>
          </Card>

          <Card className="lg:sticky lg:top-6">
            <CardHeader className="border-b">
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
                <p className="text-muted-foreground text-sm">Preview appears here.</p>
              )}
            </CardPanel>
          </Card>
        </div>
      ) : (
        <>
          <PageHeader
            eyebrow={
              <RouterLink
                to="/dashboard/projects"
                className="transition-colors hover:text-foreground"
              >
                ← Projects
              </RouterLink>
            }
            title={
              <>
                <Monogram name={project.name} className="size-11 shrink-0" />
                {project.name}
              </>
            }
            description={
              <>
                {project.subtitle && (
                  <span className="block text-pretty">{project.subtitle}</span>
                )}
                <span className="block">
                  Owned by{' '}
                  <span className="text-foreground">{nameOf(project.ownerId)}</span>
                </span>
              </>
            }
            actions={
              <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-1 shadow-xs/5">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyShareLink}
                className="transition-[color,background-color,scale] active:scale-[0.96]"
              >
                {copied ? <Check className="text-emerald-500" /> : <Link2 />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={startEdit}
                className="active:scale-[0.96]"
              >
                <Pencil /> Edit
              </Button>
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-[0.96]"
                      >
                        <Trash2 /> Delete
                      </Button>
                    }
                  />
                  <AlertDialogPopup>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the project and everyone's contributions on it. This can't be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogClose render={<Button variant="outline">Cancel</Button>} />
                      <AlertDialogClose
                        render={
                          <Button variant="destructive" onClick={onDelete}>
                            Delete
                          </Button>
                        }
                      />
                    </AlertDialogFooter>
                  </AlertDialogPopup>
                </AlertDialog>
              )}
              </div>
            }
          />

          {error && <p className="text-destructive text-sm">{error}</p>}

          {(project.demoUrl || project.githubUrl) && (
            <div className="flex flex-wrap gap-2">
              {project.demoUrl && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-xs/5 transition-[color,background-color,box-shadow] hover:border-foreground/15 hover:bg-accent"
                >
                  <Globe className="size-3.5 text-muted-foreground" /> Live demo
                </a>
              )}
              {project.githubUrl && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-sm shadow-xs/5 transition-[color,background-color,box-shadow] hover:border-foreground/15 hover:bg-accent"
                >
                  <Github className="size-3.5 text-muted-foreground" /> GitHub
                </a>
              )}
            </div>
          )}

          {project.brief && (
            <p className="text-pretty text-muted-foreground leading-relaxed">{project.brief}</p>
          )}

          <Card>
            <CardPanel className="py-5">
              {project.description.trim() ? (
                <Markdown>{project.description}</Markdown>
              ) : (
                <p className="text-muted-foreground text-sm">No description yet.</p>
              )}
            </CardPanel>
          </Card>

          <Screenshots
            projectId={projectId}
            storageIds={project.screenshotIds}
            urls={project.screenshotUrls}
          />
        </>
      )}

      {/* Contributions are personal, not project metadata — hide while editing. */}
      {!editing && (
        <ContributionSection
          projectId={projectId}
          contributions={project.contributions}
          meId={meId}
          nameOf={nameOf}
        />
      )}
    </div>
  )
}
