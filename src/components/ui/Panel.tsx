import type { HTMLAttributes } from 'react'

export function Panel({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`panel ${className}`.trim()} {...props} />
}

export function Card({ className = '', ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={`panel card ${className}`.trim()} {...props} />
}
