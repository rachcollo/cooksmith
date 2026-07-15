import type { ReactNode } from 'react'

import { ModalSurface } from './ModalSurface'

interface DialogProps {
  children: ReactNode
  description?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function Dialog(props: DialogProps) {
  return <ModalSurface variant="dialog" {...props} />
}
