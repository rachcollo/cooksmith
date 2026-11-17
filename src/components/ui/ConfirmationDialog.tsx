import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

/** The parent owns completion, errors and closing, including asynchronous actions. */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onOpenChange,
}: ConfirmationDialogProps) {
  const requestClose = (nextOpen: boolean) => {
    if (!busy) onOpenChange(nextOpen)
  }
  return (
    <Dialog open={open} title={title} description={description} onOpenChange={requestClose}>
      <div className="inline">
        <Button
          data-autofocus
          disabled={busy}
          variant="secondary"
          onClick={() => requestClose(false)}
        >
          {cancelLabel}
        </Button>
        <Button busy={busy} tone={destructive ? 'destructive' : 'default'} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
