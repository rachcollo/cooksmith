import type { HTMLAttributes } from 'react'

type TagTone = 'neutral' | 'lilac' | 'lime' | 'slate'

interface TagProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  label: string
  tone?: TagTone
}

export function Tag({ className = '', label, tone = 'neutral', ...props }: TagProps) {
  return (
    <span className={`tag tag-${tone} ${className}`.trim()} {...props}>
      {label}
    </span>
  )
}
