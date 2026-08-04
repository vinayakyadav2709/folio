import { useId, useState } from 'react'
import { useMutation } from 'convex/react'
import { ExternalLinkIcon } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Switch } from '@/components/ui/switch'
import { CopyLinkButton } from '@/components/shared/copy-link-button'

/**
 * Publishing a project is the same idea as publishing a resume, so it wears the
 * same clothes: the green dot pill from `resume-card`, plus the public path in
 * mono. Unpublished is the default — the project still feeds resume blocks, it
 * just has no public page.
 */

// The public URL for a project, or null when it isn't addressable yet.
export function publicProjectPath(
  teamSlug: string | undefined,
  projectSlug: string | undefined,
): string | null {
  return teamSlug && projectSlug ? `/p/${teamSlug}/${projectSlug}` : null
}

export function PublishPill({ published }: { published: boolean }) {
  return published ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/8 px-2 py-0.5 text-[10px] text-success-foreground dark:bg-success/16">
      <span className="size-1.5 rounded-full bg-success" aria-hidden />
      published
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/40" aria-hidden />
      resume-only
    </span>
  )
}

export function PublishToggle({
  projectId,
  published,
  path,
}: {
  projectId: Id<'projects'>
  published: boolean
  path: string | null
}) {
  const updateProject = useMutation(api.projects.updateProject)
  const [error, setError] = useState<string | null>(null)
  const id = useId()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Switch
          id={id}
          checked={published}
          onCheckedChange={(next) => {
            setError(null)
            updateProject({ projectId, published: next }).catch(() =>
              setError("Couldn't change visibility — try again."),
            )
          }}
        />
        <label htmlFor={id} className="cursor-pointer select-none font-medium text-sm">
          Public page
        </label>
        <PublishPill published={published} />
      </div>

      {published &&
        (path ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={path}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-mono text-muted-foreground text-xs transition-colors hover:text-foreground"
            >
              <ExternalLinkIcon className="size-3.5 shrink-0" />
              {path}
            </a>
            <CopyLinkButton path={path} size="xs" variant="ghost" />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-pretty">
            No shareable link yet — rename or save the project once to generate its URL.
          </p>
        ))}

      {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
    </div>
  )
}
