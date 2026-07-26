import type { HTMLAttributes } from 'react'

type PanelTone = 'default' | 'feature'

interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone
}

export function Panel({ className = '', tone = 'default', ...props }: PanelProps) {
  return <div className={`panel panel-${tone} ${className}`.trim()} {...props} />
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`panel card ${className}`.trim()} {...props} />
}
