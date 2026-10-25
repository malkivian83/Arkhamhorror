// RR: Revelation, Discard, Weakness.
import { dispatch, type EncounterCard } from '@lcg/engine'
import { expect, it } from 'vitest'
import { clear, lola, LOLA, makeGame, withLola } from './testing'

const crisis = (): EncounterCard => ({
  kind: 'treachery',
  code: '03019',
  name: 'Crisis of Identity',
  traits: ['Madness'],
  keywords: [],
})

it('discards her assets of her role, then her role becomes the class of her top card', () => {
  let s = withLola(clear(makeGame()), { role: 'guardian', deck: ['12034', '12073'] })
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: LOLA, code: '12020' })
  s = dispatch(clear(s), { type: 'PutAssetIntoPlay', investigator: LOLA, code: '12087' })
  s = dispatch(clear(s), { type: 'ResolveEncounterCard', investigator: LOLA, card: crisis() })
  const codes = Object.values(s.assets).map((a) => a.code)
  expect(codes).not.toContain('12020') // Machete (Guardián): descartado
  expect(codes).toContain('12087') // Fedora (neutral): se queda
  expect(lola(s).discard).toEqual(expect.arrayContaining(['12020', '12034']))
  expect(lola(s).role).toBe('seeker')
})

it('a weakness on top of her deck makes her role neutral', () => {
  let s = withLola(clear(makeGame()), { role: 'rogue', deck: ['12104', '12034'] })
  s = dispatch(s, { type: 'ResolveEncounterCard', investigator: LOLA, card: crisis() })
  expect(lola(s).role).toBe('neutral')
})
