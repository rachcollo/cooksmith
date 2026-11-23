import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { flushSync } from 'react-dom'

import { IconButton } from './IconButton'

function restoreFocus(dialog: HTMLDialogElement, target: HTMLElement | null) {
  const restore = () => {
    if (!dialog.open && target?.isConnected && !target.closest('dialog:not([open])')) {
      target.focus()
    }
  }
  restore()
  // A parent and its confirmation can close in the same commit. Wait for both
  // native top-layer entries to be removed before retrying the parent's trigger.
  queueMicrotask(restore)
}

interface ModalSurfaceProps {
  children: ReactNode
  description?: string
  /** Close requests do not close the native surface until open becomes false. */
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
      const focusTarget =
        dialog.querySelector<HTMLElement>('[data-autofocus]:not([disabled])') ??
        dialog.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
      focusTarget?.focus()
    }

    if (!open && dialog.open) {
      dialog.close()
      restoreFocus(dialog, returnFocusRef.current)
    }
  }, [open])

  const requestClose = () => {
    // Apply the parent's synchronous decision within the native interaction.
    // Only the controlled open effect may close; a veto leaves it untouched.
    flushSync(() => onOpenChange(false))
  }

  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) {
        dialog.close()
        restoreFocus(dialog, returnFocusRef.current)
      }
    }
  }, [])

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={`modal-surface modal-${variant}`}
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        // React propagates cancel through nested surfaces, unlike the native event.
        event.stopPropagation()
        requestClose()
      }}
    >
      <div className="modal-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <IconButton aria-label={`Close ${title}`} onClick={requestClose}>
          <X aria-hidden="true" />
        </IconButton>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
