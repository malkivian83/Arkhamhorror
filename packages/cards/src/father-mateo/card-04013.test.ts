// RR: Seal, Modifiers, Triggered Abilities, Leaves Play.
import { dispatch, playableCards } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import {
  clear,
  CODEX_OF_AGES,
  effectTest,
  makeGame,
  MATEO,
  mateo,
  succeeded,
  withCodex,
  withMateo,
} from './testing'

const ready = () => withMateo(clear(makeGame(false, ['elderSign', 0])), { hand: [] })
const codexId = (s: ReturnType<typeof ready>) =>
  Object.values(s.assets).find((a) => a.code === CODEX_OF_AGES)!.id

it('seals the [elder_sign] token when it enters play and gives +1 [willpower] while sealed', () => {
  const s = withCodex(ready())
  expect(s.chaosBag).toEqual([0])
  expect(s.sealed).toEqual([
    expect.objectContaining({ token: 'elderSign', holder: { type: 'asset', id: codexId(s) } }),
  ])
  // Voluntad 4 + 1 contra 5, con la ficha 0.
  let t = dispatch(s, effectTest(5))
  t = choose(t, 'choice.skip')
  expect(succeeded(t)).toBe('log.testSuccess')
  const plain = withMateo(clear(makeGame(false, [0])), { hand: [] })
  expect(succeeded(dispatch(plain, effectTest(5)))).toBe('log.testFailure')
})

it('may be discarded to resolve the sealed [elder_sign] instead of revealing a token', () => {
  let s = dispatch(withCodex(ready()), effectTest(12))
  expect(labels(s)).toContain('ability.resolveSealed')
  s = choose(s, 'ability.resolveSealed')
  while (s.pending) s = choose(s, labels(s)[0]!)
  expect(succeeded(s)).toBe('log.testSuccess')
  expect(Object.values(s.assets).some((a) => a.code === CODEX_OF_AGES)).toBe(false)
  expect(mateo(s).discard).toContain(CODEX_OF_AGES)
  expect([...s.chaosBag].sort()).toEqual([0, 'elderSign'].sort())
  expect(s.sealed ?? []).toEqual([])
})

it('also replaces a reveal outside a skill test (Premonition then seals the [elder_sign])', () => {
  let s = withMateo(withCodex(ready()), { hand: ['12064'], resources: 5 })
  s = dispatch(s, { type: 'PlayCard', investigator: MATEO, code: '12064' })
  expect(labels(s)).toContain('ability.resolveSealed')
  s = choose(s, 'ability.resolveSealed')
  expect(Object.values(s.assets).some((a) => a.code === CODEX_OF_AGES)).toBe(false)
  expect(s.sealed).toEqual([expect.objectContaining({ token: 'elderSign', code: '12064' })])
  expect(s.chaosBag).toEqual([0])
})

it('Seal is a cost: it cannot be played without the [elder_sign] in the bag', () => {
  const s = withMateo(ready(), { hand: [CODEX_OF_AGES], resources: 5 })
  expect(playableCards(s, MATEO, false)).toContain(CODEX_OF_AGES)
  expect(playableCards({ ...s, chaosBag: [0] }, MATEO, false)).not.toContain(CODEX_OF_AGES)
})

it('returns the sealed token to the bag when it leaves play', () => {
  let s = withCodex(ready())
  s = dispatch(s, { type: 'DiscardAsset', asset: codexId(s) })
  expect([...s.chaosBag].sort()).toEqual([0, 'elderSign'].sort())
  expect(s.sealed ?? []).toEqual([])
})
