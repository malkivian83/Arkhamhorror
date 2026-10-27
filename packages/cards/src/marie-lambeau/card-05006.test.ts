// RR: Additional Actions, Doom, Elder Sign.
import {
  availableAbilities,
  availableActions,
  dispatch,
  playerCardDef,
  type Action,
} from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { clear, effectTest, makeGame, MARIE, marie, withMarie } from './testing'

const SHRIVELLING = '01060'
const RITE_OF_SEEKING = '02028'
const EMERGENCY_CACHE = '01088'
const plays = (actions: Action[]) => actions.flatMap((a) => (a.kind === 'play' ? [a.card] : []))

/** Su turno sin acciones normales, con la mano y la perdición indicadas. */
const spent = (doom: number) =>
  withMarie(clear(makeGame()), {
    actionsRemaining: 0,
    resources: 10,
    hand: [SHRIVELLING, EMERGENCY_CACHE],
    doom,
  })

it('starts with her printed statistics and her signatures', () => {
  const i = marie(makeGame())
  expect(i.skills).toEqual({ willpower: 4, intellect: 4, combat: 1, agility: 3 })
  expect([i.health, i.sanity]).toEqual([6, 8])
  expect(playerCardDef(MARIE)!.signatures).toEqual(['05018', '05019'])
})

it('with doom on her cards, an additional action plays Spell cards only', () => {
  expect(availableActions(spent(0), MARIE)).toEqual([])
  const s = spent(1)
  expect(plays(availableActions(s, MARIE))).toEqual([SHRIVELLING])
  const after = dispatch(s, {
    type: 'TakeAction',
    investigator: MARIE,
    action: { kind: 'play', card: SHRIVELLING },
  })
  expect(Object.values(after.assets).some((a) => a.code === SHRIVELLING)).toBe(true)
  expect(marie(after).traitActionUsed).toBe(true)
  expect(availableActions(after, MARIE)).toEqual([])
})

it('the additional action is spent first and also activates Spell [action] abilities', () => {
  let s = withMarie(spent(1), { actionsRemaining: 1 })
  s = dispatch(s, {
    type: 'TakeAction',
    investigator: MARIE,
    action: { kind: 'play', card: SHRIVELLING },
  })
  expect(marie(s).actionsRemaining).toBe(1)
  s = withMarie(spent(1), { hand: [] })
  s = dispatch(s, { type: 'PutAssetIntoPlay', investigator: MARIE, code: RITE_OF_SEEKING })
  const rite = Object.values(s.assets).find((a) => a.code === RITE_OF_SEEKING)!
  expect(availableAbilities(s, MARIE).some((a) => a.key.startsWith(`${rite.id}:`))).toBe(true)
  expect(availableAbilities(withMarie(s, { doom: 0 }), MARIE)).toEqual([])
})

it('losing actions takes her standard actions first, then the Spell action (FAQ)', () => {
  let s = withMarie(spent(1), { actionsRemaining: 2 })
  s = dispatch(s, { type: 'LoseActions', investigator: MARIE, amount: 2 })
  expect(plays(availableActions(s, MARIE))).toEqual([SHRIVELLING])
  s = dispatch(withMarie(s, { actionsRemaining: 1 }), {
    type: 'LoseActions',
    investigator: MARIE,
    amount: 2,
  })
  expect(marie(s).traitActionUsed).toBe(true)
  expect(availableActions(s, MARIE)).toEqual([])
})

it('elder sign: +1 and she may add or remove 1 doom on a card she controls', () => {
  let s = withMarie(clear(makeGame(false, ['elderSign'])), { hand: [] })
  s = dispatch(s, effectTest(5))
  expect(s.pending?.question.prompt).toBe('prompt.marie.doom')
  s = choose(s, 'choice.marie.addDoom', { card: 'Marie Lambeau' })
  expect(s.log.some((e) => e.key === 'log.testSuccess')).toBe(true)
  expect(marie(s).doom).toBe(1)
  s = dispatch(s, effectTest(5))
  expect(labels(s)).toContain('choice.marie.removeDoom')
  s = choose(s, 'choice.marie.removeDoom', { card: 'Marie Lambeau' })
  expect(marie(s).doom ?? 0).toBe(0)
})
