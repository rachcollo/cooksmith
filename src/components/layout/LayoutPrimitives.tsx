import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function PageContainer({ className = '', ...props }: LayoutProps) {
  return <div className={`page-container ${className}`.trim()} {...props} />
}

export function PageSection({ className = '', ...props }: LayoutProps) {
  return <section className={`page-section ${className}`.trim()} {...props} />
}

interface StackProps extends LayoutProps {
  gap?: 'small' | 'medium' | 'large'
}

export function Stack({ className = '', gap = 'medium', ...props }: StackProps) {
  return <div className={`stack stack-${gap} ${className}`.trim()} {...props} />
}

export function Inline({ className = '', ...props }: LayoutProps) {
  return <div className={`inline ${className}`.trim()} {...props} />
}

interface ResponsiveGridProps extends LayoutProps {
  minimum?: string
}

export function ResponsiveGrid({
  className = '',
  minimum = '16rem',
  style,
  ...props
}: ResponsiveGridProps) {
  return (
    <div
      className={`responsive-grid ${className}`.trim()}
      style={{ '--grid-minimum': minimum, ...style } as CSSProperties}
      {...props}
    />
  )
}
