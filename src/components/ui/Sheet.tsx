import type { ReactNode } from 'react'

import { ModalSurface } from './ModalSurface'

interface SheetProps {
  children: ReactNode
  description?: string
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}

export function Sheet(props: SheetProps) {
  return <ModalSurface variant="sheet" {...props} />
}
