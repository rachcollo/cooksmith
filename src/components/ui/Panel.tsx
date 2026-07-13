import type { HTMLAttributes } from 'react'

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`panel ${className}`.trim()} {...props} />
}
