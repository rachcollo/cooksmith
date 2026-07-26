import '@testing-library/jest-dom/vitest'

import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Parallel integration files can take longer than Testing Library's one-second default to
// complete route-level lazy imports on shared CI runners. Keep retries bounded while allowing
// observable UI state enough time to settle under normal contention.
configure({ asyncUtilTimeout: 3_000 })

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
}

if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

afterEach(() => cleanup())
