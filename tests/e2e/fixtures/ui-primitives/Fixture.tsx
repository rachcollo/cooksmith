import { useState } from 'react'

import { ConfirmationDialog } from '../../../../src/components/ui/ConfirmationDialog'
import { Dialog } from '../../../../src/components/ui/Dialog'
import { NumericField } from '../../../../src/components/ui/NumericField'
import { Sheet } from '../../../../src/components/ui/Sheet'
import { parseNumericFieldValue } from '../../../../src/components/ui/numericFieldValue'
import '../../../../src/styles/tokens.css'
import '../../../../src/styles/global.css'
import '../../../../src/styles/layout.css'
import '../../../../src/styles/components.css'

export function Fixture() {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [saved, setSaved] = useState('Nothing saved')
  const Surface = new URLSearchParams(location.search).has('sheet') ? Sheet : Dialog
  return (
    <main>
      <h1>Primitive interaction fixture</h1>
      <button onClick={() => setOpen(true)}>Edit amount</button>
      <p role="status">{saved}</p>
      <Surface open={open} title="Edit amount" onOpenChange={() => setConfirm(true)}>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const result = parseNumericFieldValue(
              String(new FormData(event.currentTarget).get('amount')),
              { required: true, max: 99999 },
            )
            if (result.valid) {
              setSaved(String(result.value))
              setOpen(false)
            }
          }}
        >
          <NumericField
            label="Amount"
            name="amount"
            data-autofocus
            required
            max={99999}
            onValueChange={() => {}}
          />
          <button>Save amount</button>
        </form>
      </Surface>
      <ConfirmationDialog
        open={confirm}
        title="Discard changes?"
        description="Your draft will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onOpenChange={setConfirm}
        onConfirm={() => {
          setConfirm(false)
          setOpen(false)
        }}
      />
    </main>
  )
}
