import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

import { IconButton } from './IconButton'

interface ModalSurfaceProps {
  children: ReactNode
  description?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  variant: 'dialog' | 'sheet'
}

export function ModalSurface({
  children,
  description,
  onOpenChange,
  open,
  title,
  variant,
}: ModalSurfaceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null
      dialog.showModal()
      const focusTarget = dialog.querySelector<HTMLElement>(
        '[data-autofocus], button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      focusTarget?.focus()
    }

    if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleClose = () => {
      onOpenChange(false)
      returnFocusRef.current?.focus()
    }
    const handleCancel = (event: Event) => {
      event.preventDefault()
      dialog.close()
    }

    dialog.addEventListener('close', handleClose)
    dialog.addEventListener('cancel', handleCancel)

    return () => {
      dialog.removeEventListener('close', handleClose)
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [onOpenChange])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`modal-surface modal-${variant}`}
      ref={dialogRef}
    >
      <div className="modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <IconButton aria-label={`Close ${title}`} onClick={() => dialogRef.current?.close()}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
