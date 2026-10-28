import { readFileSync } from 'node:fs'
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { approvedDefinition } from './approved.mjs'
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
test('sideboard definitions match the frozen inventory and reviewed adapters', () => {
  const catalog = read(
    '../../packages/cards/src/catalog/imports/3c8ee4b5d8100766/catalog.json',
  ).cards
  const approvals = read('../../packages/cards/src/stella-sideboard/approvals.json').cards
  const data = read('../../packages/cards/src/data/stella-sideboard.json')
  for (const approval of approvals) {
    const actual = data.find((c) => c.code === approval.code)
    const { customizable, ...base } = actual
    assert.deepEqual(
      base,
      approvedDefinition(
        catalog.find((c) => c.code === approval.code),
        approval,
      ),
    )
    if (customizable) assert.deepEqual(Object.values(customizable), [2, 2, 2, 2, 2, 4, 4])
  }
})
