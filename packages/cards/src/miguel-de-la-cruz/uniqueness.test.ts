// Unique codes: each approved code once, matching the reproducible data, never in older lots.
import { allPlayerCardDefs } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import data from '../data/miguel-de-la-cruz.json'
import nathaniel from '../data/nathaniel-cho.json'
import harvey from '../data/harvey-walters.json'
import stella from '../data/stella-clark.json'
import reused from '../data/reused-mechanics.json'
import approvals from './approvals.json'
import source from './source-en.json'
import './index'

describe('Miguel de la Cruz lot: no duplicated codes', () => {
  it('approves each code once, only codes of this pack, all reviewed', () => {
    const codes = approvals.cards.map((c) => c.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.every((c) => source.some((card) => card.code === c))).toBe(true)
    expect(approvals.cards.every((c) => c.status === 'verified')).toBe(true)
    expect(data.map((d) => d.code)).toEqual(codes)
  })

  it('introduces codes absent from the related earlier batches', () => {
    const previous = new Set([...nathaniel, ...harvey, ...stella, ...reused].map((c) => c.code))
    for (const card of data) expect(previous.has(card.code), card.code).toBe(false)
    for (const card of source)
      expect(
        allPlayerCardDefs().filter((d) => d.code === card.code),
        card.code,
      ).toHaveLength(1)
  })
})
