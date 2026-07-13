interface LoadingStateProps {
  fullPage?: boolean
  label?: string
}

export function LoadingState({ fullPage = false, label = 'Loading' }: LoadingStateProps) {
  return (
    <div className={fullPage ? 'state state-full-page' : 'state'} role="status">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
