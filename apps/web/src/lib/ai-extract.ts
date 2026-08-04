import { ConvexError } from 'convex/values'

// Shared by every "paste something, let AI read it" flow (jobs, resume import).

// Model errors cross the Convex boundary as ConvexError with { tag, message }
// (see packages/backend/convex/lib/errors.ts).
export function errorMessage(err: unknown): string {
  if (err instanceof ConvexError) {
    const data = err.data as { message?: string }
    if (typeof data?.message === 'string') return data.message
  }
  return err instanceof Error ? err.message : 'Something went wrong'
}

// The AI actions fail this way when the user hasn't saved a BYOK key yet.
export function isNoAiKey(err: unknown): boolean {
  return errorMessage(err).toLowerCase().includes('no ai key')
}

// FileReader gives base64 without blowing the stack on big screenshots;
// the action wants the raw payload, so the `data:*;base64,` prefix goes.
export async function fileToBase64(
  file: File,
): Promise<{ data: string; mediaType: string }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), mediaType: file.type }
}

// One `accept` list for every "attach your resume/JD" input.
export const IMPORT_ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.webp,.md,.markdown,.tex,.txt,application/pdf,image/*,text/*'

// Base64 inflates ~33% and Convex caps argument size, so guard before encoding.
const MAX_BYTES = 5 * 1024 * 1024

// file.type is empty or unreliable for .md/.tex, so the extension decides.
const TEXT_EXT = ['md', 'markdown', 'tex', 'txt']
const BINARY_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const formatBytes = (n: number): string =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`

/**
 * Two paths, because text formats need no AI to extract: markdown / LaTeX /
 * plain text is read here and sent as the `text` argument (no base64, no tokens
 * spent on extraction), while PDFs and images go to the model as an inline file
 * part with their real mime type — Gemini reads application/pdf natively, so no
 * PDF library is involved. Throws with a user-facing message when unusable.
 */
export async function readImportFile(
  file: File,
): Promise<{ kind: 'text'; text: string } | { kind: 'file'; data: string; mediaType: string }> {
  if (file.size > MAX_BYTES)
    throw new Error(
      `“${file.name}” is ${formatBytes(file.size)} — the limit is 5 MB. Resume PDFs are usually well under 1 MB.`,
    )
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (TEXT_EXT.includes(ext) || file.type.startsWith('text/'))
    return { kind: 'text', text: await file.text() }
  const mediaType =
    BINARY_TYPE[ext] ??
    (file.type === 'application/pdf' || file.type.startsWith('image/') ? file.type : '')
  if (!mediaType)
    throw new Error(
      `Can’t read “${file.name}”. Supported: PDF, PNG, JPEG, WebP, Markdown, LaTeX and plain text.`,
    )
  return { kind: 'file', ...(await fileToBase64(file)), mediaType }
}
