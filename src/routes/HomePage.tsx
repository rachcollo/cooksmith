import { Check, Compass, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { DocumentTitle } from '../app/router/DocumentTitle'
import { PageHeader } from '../components/layout/PageHeader'
import { ResponsiveGrid, Stack } from '../components/layout/LayoutPrimitives'
import { Button } from '../components/ui/Button'
import { Dialog } from '../components/ui/Dialog'
import { Card } from '../components/ui/Panel'

export function HomePage() {
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <Stack className="home-foundation" gap="large">
      <DocumentTitle title="Home" />
      <PageHeader
        actions={
          <div className="action-group">
            <Link className="button button-primary" to="/pantry">
              Explore the pantry frame
            </Link>
            <Button variant="secondary" onClick={() => setDetailsOpen(true)}>
              About this preview
            </Button>
          </div>
        }
        description="Cooksmith will quietly organise meals, ingredients and shopping. For now, this preview establishes the calm frame those useful tools will share."
        eyebrow="Cooksmith v2 foundation"
        title="Dinner decisions, made lighter."
      />

      <ResponsiveGrid
        className="home-foundation-grid"
        minimum="14rem"
        aria-label="Foundation qualities"
      >
        <Card>
          <Compass aria-hidden="true" />
          <h2>One clear next step</h2>
          <p>Stable routes and restrained actions make it obvious where to go next.</p>
        </Card>
        <Card>
          <ShieldCheck aria-hidden="true" />
          <h2>Safe foundations</h2>
          <p>
            Preview data stays isolated while later household features remain deliberately absent.
          </p>
        </Card>
        <Card>
          <Check aria-hidden="true" />
          <h2>Built to include</h2>
          <p>Keyboard, focus, reduced motion and responsive behaviour are part of the frame.</p>
        </Card>
      </ResponsiveGrid>

      <Dialog
        description="This is a real foundation check, not a working product feature."
        onOpenChange={setDetailsOpen}
        open={detailsOpen}
        title="What this preview proves"
      >
        <Stack>
          <p>
            Cooksmith now has direct routes, accessible navigation, reusable interface patterns and
            automated quality checks for future milestones.
          </p>
          <Button onClick={() => setDetailsOpen(false)}>Got it</Button>
        </Stack>
      </Dialog>
    </Stack>
  )
}
