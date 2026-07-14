import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@folio/backend/api'
import type { Id } from '@folio/backend/dataModel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDownIcon, DownloadIcon, FileCode2Icon, FileTextIcon } from 'lucide-react'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Menu, MenuItem, MenuPopup, MenuTrigger } from '@/components/ui/menu'
import type { Block, Header, Theme } from '../lib/blocks'
import { errorMessage } from '../lib/errors'

type Kind = 'pdf' | 'latex'

type Props = {
  blocks: Block[]
  header: Header
  theme: Theme
  snapshotId: Id<'snapshots'>
  fileName: string
}

// Exports what's on the canvas (including uncommitted edits); tagSent marks the
// committed head snapshot. Everything PDF-related is dynamically imported so
// @react-pdf/renderer never loads during SSR.
export function ExportMenu({ blocks, header, theme, snapshotId, fileName }: Props) {
  const tagSent = useMutation(api.snapshots.tagSent)
  const [kind, setKind] = useState<Kind | null>(null)
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doExport() {
    setBusy(true)
    setError(null)
    try {
      const snapshot = { blocks, header, theme }
      const exports = await import('@folio/exports')
      if (kind === 'latex') {
        download(
          new Blob([exports.snapshotToLatex(snapshot)], { type: 'application/x-tex' }),
          `${fileName}.tex`,
        )
      } else {
        const PdfDoc = exports.getPdfTheme(theme.id)
        const doc = (<PdfDoc snapshot={snapshot} />) as Parameters<typeof exports.pdf>[0]
        download(await exports.pdf(doc).toBlob(), `${fileName}.pdf`)
      }
      if (company.trim() && role.trim()) {
        await tagSent({ snapshotId, company: company.trim(), role: role.trim() })
      }
      setKind(null)
      setCompany('')
      setRole('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button variant="outline" size="sm">
              <DownloadIcon />
              Export
              <ChevronDownIcon className="text-muted-foreground" />
            </Button>
          }
        />
        <MenuPopup>
          <MenuItem onClick={() => setKind('pdf')}>
            <FileTextIcon className="size-4 text-muted-foreground" />
            PDF
          </MenuItem>
          <MenuItem onClick={() => setKind('latex')}>
            <FileCode2Icon className="size-4 text-muted-foreground" />
            LaTeX (.tex)
          </MenuItem>
        </MenuPopup>
      </Menu>

      <Dialog open={kind !== null} onOpenChange={(open) => !open && setKind(null)}>
        <DialogPopup>
          <DialogHeader>
            <DialogTitle>Export {kind === 'latex' ? 'LaTeX' : 'PDF'}</DialogTitle>
            <DialogDescription>
              Optionally tag this version with where it's going — it shows up in the tree.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel className="flex flex-col gap-4">
            <Field>
              <FieldLabel>Company</FieldLabel>
              <Input value={company} placeholder="Optional" onChange={(e) => setCompany(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Input value={role} placeholder="Optional" onChange={(e) => setRole(e.target.value)} />
            </Field>
            {error && <p className="text-destructive text-sm text-pretty">{error}</p>}
          </DialogPanel>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button onClick={doExport} loading={busy}>
              Download
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  )
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}
