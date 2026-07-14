import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { ImagePlus, Upload, X } from 'lucide-react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import { errorMessage } from '../lib/convexError'

export function Screenshots({
  projectId,
  storageIds,
  urls,
}: {
  projectId: Id<'projects'>
  storageIds: Id<'_storage'>[]
  urls: string[]
}) {
  const generateUploadUrl = useMutation(api.projects.generateScreenshotUploadUrl)
  const addScreenshot = useMutation(api.projects.addScreenshot)
  const removeScreenshot = useMutation(api.projects.removeScreenshot)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl({ projectId })
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      await addScreenshot({ projectId, storageId })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-lg">Screenshots</h2>
        <Button
          size="sm"
          variant="outline"
          loading={uploading}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="active:scale-[0.96]"
        >
          <Upload /> Upload
        </Button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {urls.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urls.map((url, i) => (
            <div
              key={url}
              className="group relative overflow-hidden rounded-xl border bg-muted shadow-xs/5"
            >
              <img
                src={url}
                alt="Screenshot"
                className="aspect-video w-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 group-hover:scale-[1.03] dark:outline-white/10"
              />
              {storageIds[i] && (
                <Button
                  size="icon-sm"
                  variant="destructive"
                  className="absolute top-1.5 right-1.5 opacity-0 shadow-sm transition-[opacity,scale] group-hover:opacity-100 active:scale-[0.96]"
                  aria-label="Remove screenshot"
                  onClick={() =>
                    removeScreenshot({ projectId, storageId: storageIds[i] }).catch((err) =>
                      setError(errorMessage(err)),
                    )
                  }
                >
                  <X />
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-card/40 px-6 py-10 text-center text-muted-foreground text-sm transition-colors hover:border-foreground/20 hover:bg-accent/40"
        >
          <ImagePlus className="size-6 opacity-70" />
          Add screenshots to show off this project.
        </button>
      )}
    </section>
  )
}
