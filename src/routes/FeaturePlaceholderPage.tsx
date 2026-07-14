import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'

import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { PageSection, Stack } from '../components/layout/LayoutPrimitives'
import { EmptyState } from '../components/ui/EmptyState'

interface FeaturePlaceholderPageProps {
  description: string
  eyebrow: string
  icon: LucideIcon
  nextActionLabel?: string
  nextActionPath?: string
  placeholderMessage: string
  placeholderTitle: string
  title: string
}

export function FeaturePlaceholderPage({
  description,
  eyebrow,
  icon: Icon,
  nextActionLabel = 'Return home',
  nextActionPath = '/',
  placeholderMessage,
  placeholderTitle,
  title,
}: FeaturePlaceholderPageProps) {
  return (
    <Stack gap="large">
      <DocumentTitle title={title} />
      <PageHeader description={description} eyebrow={eyebrow} title={title} />
      <PageSection>
        <EmptyState
          action={
            <Link className="button button-primary" to={nextActionPath}>
              {nextActionLabel}
            </Link>
          }
          message={placeholderMessage}
          title={placeholderTitle}
        />
        <Icon className="placeholder-icon" aria-hidden="true" />
      </PageSection>
    </Stack>
  )
}
