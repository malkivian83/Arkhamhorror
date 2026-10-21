import { dispatch, registerPlayerCards } from '@lcg/engine'
import { choose, during, spawnAt, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch, withAsset } from '../dunwich-pilot/testing'
// RR: Costs; Fight; Remaining Sanity. Pay before computing the attack modifier.
it('Meat Cleaver pays horror, recalculates the bonus, then optionally heals on defeat', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ horror: 4 })(s), '12077'),
    spawnAt('A', { ...ghoul, fight: 5, health: 2 }, 'a'),
  )
  s = choose(s, 'ability.classicCleaverPaid')
  s = choose(s, 'choice.classicCleaverHeal')
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(me(s).horror).toBe(4)
  expect(me(s).actionsRemaining).toBe(2)
})
registerPlayerCards([
  {
    code: 'title-limit-a',
    name: 'Synthetic shared title',
    type: 'skill',
    class: 'neutral',
    traits: [],
    icons: { intellect: 1 },
    commitLimit: 1,
  },
  {
    code: 'title-limit-b',
    name: 'Synthetic shared title',
    type: 'skill',
    class: 'neutral',
    traits: [],
    icons: { intellect: 1 },
  },
])
// RR: Max. Maxima apply by title across editions, including a lower-level edition.
it.each([
  ['title-limit-a', 'title-limit-b'],
  ['title-limit-b', 'title-limit-a'],
])('enforces the title maximum when %s is committed first', (first, second) => {
  let s = during(game(), (s) => ({ ...patch({ hand: [first, second] })(s), interactive: true }))
  s = choose(s, 'action.investigate')
  s = choose(s, 'choice.commit')
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.commit')).toBe(false)
  const next = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'CommitCard', investigator: 'a', code: second },
  )
  expect(next.skillTest!.committed).toHaveLength(1)
})

// RR: Costs may be assigned to assets; only the investigator's remaining sanity changes the modifier.
it('assigning the optional horror to an ally does not increase the cleaver combat bonus', () => {
  let s = during(
    game(),
    (s) => withAsset(withAsset(patch({ horror: 4, hand: [] })(s), '12077'), '02033'),
    spawnAt('A', { ...ghoul, fight: 5, health: 2 }, 'a'),
  )
  s = choose(s, 'ability.classicCleaverPaid')
  s = choose(s, 'choice.assignToAsset', { card: 'Peter Sylvestre' })
  expect(s.assets['02033']!.horror).toBe(1)
  expect(me(s).horror).toBe(4)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(0)
})
it('an ordinary cleaver defeat can heal without paying additional horror', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ horror: 1, hand: [] })(s), '12077'),
    spawnAt('A', { ...ghoul, health: 1 }, 'a'),
  )
  s = choose(s, 'ability.fightWith', { card: 'Meat Cleaver' })
  s = choose(s, 'choice.classicCleaverHeal')
  expect(me(s).horror).toBe(0)
})
it('does not offer cleaver recovery when the enemy survives', () => {
  let s = during(
    game(),
    (s) => withAsset(patch({ horror: 1, hand: [] })(s), '12077'),
    spawnAt('A', { ...ghoul, health: 8 }, 'a'),
  )
  s = choose(s, 'ability.classicCleaverPaid')
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  expect(me(s).horror).toBe(2)
  expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
})
