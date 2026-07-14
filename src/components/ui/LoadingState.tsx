interface LoadingStateProps {
  fullPage?: boolean
  label?: string
  size?: 'small' | 'medium'
}

export function LoadingState({
  fullPage = false,
  label = 'Loading',
  size = 'medium',
}: LoadingStateProps) {
  return (
    <div
      aria-live="polite"
      className={fullPage ? 'state state-full-page' : 'state state-loading'}
      role="status"
    >
      <span className={`spinner spinner-${size}`} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
