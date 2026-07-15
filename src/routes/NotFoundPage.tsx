import { DocumentTitle } from '../app/router/DocumentTitle'
import { ErrorState } from '../components/ui/ErrorState'

export function NotFoundPage() {
  return (
    <>
      <DocumentTitle title="Page not found" />
      <ErrorState
        eyebrow="Page not found"
        title="Nothing cooking here"
        message="This page does not exist. Head back to the Cooksmith home page."
        actionLabel="Back to Cooksmith"
        href="/"
      />
    </>
  )
}
