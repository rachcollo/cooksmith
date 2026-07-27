import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const stylesDirectory = join(process.cwd(), 'src', 'styles')
const styleFiles = readdirSync(stylesDirectory).filter((file) => file.endsWith('.css'))
const styles = styleFiles
  .map((file) => readFileSync(join(stylesDirectory, file), 'utf8'))
  .join('\n')

describe('Orchard style tokens', () => {
  it('uses the canonical British colour token namespace without compatibility aliases', () => {
    expect(styles).not.toMatch(/--color-[a-z0-9-]+/)
    expect(styles).not.toMatch(/--(?:temp|legacy|compat)-[a-z0-9-]+/i)
  })

  it('does not reference undefined shared tokens', () => {
    const definitions = new Set(
      [...styles.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]),
    )
    const customPropertyOverrides = new Set([
      '--grid-minimum',
      '--list-row-accent',
      '--photo-frame-accent',
      '--photo-frame-position',
      '--photo-frame-ratio',
      '--photo-frame-shape',
    ])
    const references = [
      ...new Set([...styles.matchAll(/var\((--[a-z0-9-]+)/g)].map((match) => match[1])),
    ]

    expect(
      references.filter(
        (reference) => !definitions.has(reference) && !customPropertyOverrides.has(reference),
      ),
    ).toEqual([])
  })
})
