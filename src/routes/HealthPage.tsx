import { Panel } from '../components/ui/Panel'
import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { Stack } from '../components/layout/LayoutPrimitives'
import { useAppConfig } from '../app/providers/appConfigContext'

export function HealthPage() {
  const { appEnvironment, buildCommit } = useAppConfig()

  return (
    <Stack className="narrow-page" gap="large">
      <DocumentTitle title="Foundation status" />
      <PageHeader
        description="Cooksmith v2 loaded successfully. No production household data is connected."
        eyebrow="Foundation status"
        title="The forge is ready."
      />
      <Panel>
        <dl className="status-list">
          <div>
            <dt>Application</dt>
            <dd>Cooksmith v2</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{appEnvironment}</dd>
          </div>
          <div>
            <dt>Shell</dt>
            <dd>Ready</dd>
          </div>
          {buildCommit ? (
            <div>
              <dt>Build</dt>
              <dd>{buildCommit.slice(0, 12)}</dd>
            </div>
          ) : null}
        </dl>
      </Panel>
    </Stack>
  )
}
