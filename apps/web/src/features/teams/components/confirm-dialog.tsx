import type React from 'react'
import { TriangleAlertIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

// Controlled confirm dialog for destructive team actions (remove member, leave).
// The action stays with the caller — this only gates it behind a confirm step
// and surfaces any error the caller reports back.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading = false,
  confirmDisabled = false,
  error,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  confirmDisabled?: boolean
  error?: string | null
  /** Extra body between the description and the footer, e.g. a confirm input. */
  children?: React.ReactNode
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3 text-left">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <TriangleAlertIcon className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        {children && <div className="px-6">{children}</div>}
        {error && (
          <p className="px-6 text-destructive text-sm">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" type="button" />}>
            Cancel
          </AlertDialogClose>
          <Button
            type="button"
            variant="destructive"
            loading={loading}
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  )
}
