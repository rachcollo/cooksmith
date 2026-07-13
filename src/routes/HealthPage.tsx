import { Panel } from '../components/ui/Panel'
import { useAppConfig } from '../app/providers/appConfigContext'

export function HealthPage() {
  const { appEnvironment, buildCommit } = useAppConfig()

  return (
    <section className="narrow-page" aria-labelledby="health-title">
      <p className="eyebrow">FOUNDATION STATUS</p>
      <h1 id="health-title">The forge is ready.</h1>
      <p>Cooksmith v2 loaded successfully. No production household data is connected.</p>

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
    </section>
  )
}
