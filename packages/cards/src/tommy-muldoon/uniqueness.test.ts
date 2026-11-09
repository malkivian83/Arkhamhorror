// Every code of this lot is registered once, with exactly this lot's reviewed definition.
// The cross-batch data check lives in scripts/cards-import/tommy-muldoon.test.mjs.
import { allPlayerCardDefs, type PlayerCardDef } from '@lcg/engine'
import { expect, it } from 'vitest'
import data from '../data/tommy-muldoon.json'
import approvals from './approvals.json'
import '../index'

it.each(approvals.cards.map((c) => c.code))('%s is unique across batches and runtime', (code) => {
  const runtime = allPlayerCardDefs().filter((c) => c.code === code)
  expect(runtime).toHaveLength(1)
  expect(runtime[0]).toEqual((data as PlayerCardDef[]).find((c) => c.code === code))
})
