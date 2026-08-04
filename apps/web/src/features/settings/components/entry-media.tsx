import { useRef, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { FileTextIcon, PaperclipIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { errorMessage } from '../lib/errors'
import type { MediaMap } from '../lib/use-profile-form'

const MAX_MEDIA_BYTES = 5 * 1024 * 1024
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

// Certificates, diplomas, photos and screenshots for one profile entry
// (achievement, education or experience). Uploads land in storage immediately
// (we need a storage id), but the row only becomes real on the page's Save —
// removal likewise just drops the id, and the server GCs the blob when the
// shorter list is saved.
export function EntryMedia({
  ids,
  media,
  onChange,
  label = 'Media',
}: {
  ids: Id<'_storage'>[]
  media: MediaMap
  onChange: (ids: Id<'_storage'>[]) => void
  label?: string
}) {
  const generateUploadUrl = useMutation(api.profiles.generateUploadUrl)
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Freshly uploaded files aren't in the server's `media` map until the page
  // saves, so keep a local preview keyed by the same storage id.
  const [local, setLocal] = useState<MediaMap & Record<string, { name?: string }>>({})

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    if (file.size > MAX_MEDIA_BYTES) {
      setError(`“${file.name}” is ${formatSize(file.size)} — the limit is 5 MB.`)
      return
    }
    setUploading(true)
    setError(null)
    try {
      const uploadUrl = await generateUploadUrl({})
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      const { storageId } = (await res.json()) as { storageId: Id<'_storage'> }
      setLocal((m) => ({
        ...m,
        [storageId]: {
          url: URL.createObjectURL(file),
          contentType: file.type,
          size: file.size,
          name: file.name,
        },
      }))
      onChange([...ids, storageId])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {ids.map((id) => {
          const item = local[id] ?? media[id]
          const isImage = item?.contentType?.startsWith('image/') ?? false
          return (
            <div
              key={id}
              className="group relative flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-background/60 text-center shadow-xs/5"
            >
              {item && isImage ? (
                <img
                  src={item.url}
                  alt={label}
                  className="size-full object-cover outline outline-1 -outline-offset-1 outline-black/10 transition-transform duration-300 group-hover:scale-[1.04] dark:outline-white/10"
                />
              ) : item ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex size-full flex-col items-center justify-center gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                >
                  <FileTextIcon className="size-5 opacity-70" />
                  <span className="line-clamp-1 w-full break-all text-[10px] leading-tight">
                    {local[id]?.name ?? 'PDF'}
                  </span>
                  <span className="text-[10px] tabular-nums opacity-70">{formatSize(item.size)}</span>
                </a>
              ) : (
                <span className="text-[10px] text-muted-foreground">Uploading…</span>
              )}
              <Button
                size="icon-xs"
                variant="destructive"
                aria-label="Remove media"
                className="absolute top-1 right-1 opacity-0 shadow-sm transition-[opacity,scale] group-hover:opacity-100 focus-visible:opacity-100 active:scale-[0.96]"
                onClick={() => onChange(ids.filter((x) => x !== id))}
              >
                <XIcon />
              </Button>
            </div>
          )
        })}
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={uploading}
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="active:scale-[0.96]"
        >
          <PaperclipIcon /> Add media
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFile}
        />
      </div>
      {error && <p className="text-destructive-foreground text-xs">{error}</p>}
    </div>
  )
}
