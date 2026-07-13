import { Link } from 'react-router-dom'

import { Panel } from '../components/ui/Panel'

export function HomePage() {
  return (
    <section className="hero" aria-labelledby="home-title">
      <p className="eyebrow">COOKSMITH V2 FOUNDATION</p>
      <h1 id="home-title">A calmer way to answer, “What’s for dinner?”</h1>
      <p className="hero-copy">
        The new foundation is ready for the approved household, pantry, recipe and planning
        milestones. Those features are not connected yet.
      </p>

      <div className="hero-actions">
        <Link className="button button-primary" to="/health">
          Check foundation status
        </Link>
      </div>

      <Panel className="next-step-panel">
        <p className="eyebrow">WHAT HAPPENS NEXT</p>
        <h2>The useful bits come next, one dependable layer at a time.</h2>
        <p>
          This preview proves the v2 shell, routing, accessibility and quality gates without
          pretending later product features already work.
        </p>
      </Panel>
    </section>
  )
}
