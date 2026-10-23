// RR: Fast, Player Windows, Actions, Attack of Opportunity; Swift Reflexes.
import {
  allPlayerCardDefs,
  dispatch,
  getInvestigator,
  playableCards,
  playerCardBehavior,
  type GameState,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'
const code = '05156'
const clear = (s: GameState): GameState => ({ ...s, queue: [], pending: null })
const open = () => holding(code, { enemy: null, players: ['a', 'b'] })
const play = (s: GameState) => choose(s, 'action.playFast', { card: 'Swift Reflexes' })
it('pays two resources, discards the fast event and takes exactly one action on the actual turn', () => {
  let s = open()
  const before = getInvestigator(s, 'a')
  s = play(s)
  expect(s.pending!.question.prompt).toBe('prompt.immediateAction')
  expect(getInvestigator(s, 'a').resources).toBe(before.resources - 2)
  expect(getInvestigator(s, 'a').discard).toContain(code)
  s = choose(s, 'action.resource')
  expect(getInvestigator(s, 'a').resources).toBe(before.resources - 1)
  expect(getInvestigator(s, 'a').actionsRemaining).toBe(before.actionsRemaining)
  expect(getInvestigator(s, 'a').completedActions!.count).toBe(1)
  expect(s.immediateActions).toBeUndefined()
})
it('offers the owner consent during another investigator turn and restores that turn', () => {
  const initial = patch({ actionsRemaining: 3 }, 'b')(open())
  let s = dispatch(clear({ ...initial, activeTurn: 'b' }), {
    type: 'PlayerWindow',
    investigator: 'b',
  })
  s = choose(s, 'ability.playFastFor', {
    name: getInvestigator(s, 'a').name,
    card: 'Swift Reflexes',
  })
  expect(s.pending!.investigator).toBe('a')
  s = choose(s, 'ability.playCard', { card: 'Swift Reflexes' })
  expect(s.activeTurn).toBe('a')
  expect(s.pending!.question.prompt).toBe('prompt.immediateAction')
  const b = getInvestigator(s, 'b')
  s = choose(s, 'action.resource')
  expect(s.activeTurn).toBe('b')
  expect(getInvestigator(s, 'b')).toEqual(b)
  expect(getInvestigator(s, 'a').actionsRemaining).toBe(
    getInvestigator(initial, 'a').actionsRemaining,
  )
})
it.each(['mythos', 'enemy', 'upkeep'] as const)('rejects the %s phase', (phase) => {
  expect(playableCards({ ...clear(open()), phase }, 'a', true)).not.toContain(code)
})
it('requires an active turn and resources, with no ordinary play action', () => {
  const s = clear(open())
  expect(playableCards(s, 'a', false)).not.toContain(code)
  expect(playableCards({ ...s, activeTurn: null }, 'a', true)).not.toContain(code)
  expect(playableCards(patch({ resources: 1 })(s), 'a', true)).not.toContain(code)
})
it('blocks the whole action, even after its test ends, then permits the next between-action window', () => {
  const s = clear(open())
  const complete = {
    type: 'CompleteAction' as const,
    investigator: 'b',
    phase: s.phase,
    round: s.round,
  }
  const during = { ...s, queue: [complete] }
  expect(playableCards(during, 'a', true)).not.toContain(code)
  const after = dispatch({ ...during, queue: [] }, complete)
  expect(playableCards(after, 'a', true)).toContain(code)
})
it('excludes the event during a real investigate test and offers it after the action completes', () => {
  let s = choose(open(), 'action.investigate')
  expect(s.skillTest).toBeTruthy()
  expect(s.queue.some((m) => m.type === 'CompleteAction')).toBe(true)
  expect(playableCards(s, 'a', true)).not.toContain(code)
  s = resolve(s, 0)
  expect(s.skillTest).toBeNull()
  expect(s.queue.some((m) => m.type === 'CompleteAction')).toBe(false)
  expect(playableCards(s, 'a', true)).toContain(code)
})
it('does not open another fast window inside an immediate action', () => {
  let s = dispatch(clear(open()), { type: 'TakeImmediateAction', investigator: 'b' })
  expect(playerCardBehavior(code)!.canPlay!(s, 'a')).toBe(false)
  s = choose(s, 'action.resource')
  expect(playableCards(s, 'a', true)).toContain(code)
})
it('retains normal opportunity attacks on the granted action', () => {
  let s = holding(code)
  const before = getInvestigator(s, 'a').damage
  s = choose(play(s), 'action.resource')
  expect(getInvestigator(s, 'a').damage).toBeGreaterThan(before)
})
it('appears once in catalog and shop and starts in a legal deck', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
