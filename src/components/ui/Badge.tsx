import type { HTMLAttributes } from 'react'

type BadgeTone = 'neutral' | 'positive' | 'attention'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ className = '', tone = 'neutral', ...props }: BadgeProps) {
  return <span className={`badge badge-${tone} ${className}`.trim()} {...props} />
}
