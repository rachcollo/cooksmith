import { ErrorState } from '../components/ui/ErrorState'

export function NotFoundPage() {
  return (
    <ErrorState
      eyebrow="PAGE NOT FOUND"
      title="Nothing cooking here"
      message="This page does not exist. Head back to the v2 foundation."
      actionLabel="Back to Cooksmith"
      href="/"
    />
  )
}
