// RR: Fast, Engage, Draw, Enemy Defeat, Massive, Aloof; Taunt 2/3.
import {
  dispatch,
  getInvestigator,
  playableCards,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { sturdy } from '../basic-abilities/testing'
import { patch, me } from '../dunwich-pilot/testing'
import './index'
function open(code: string) {
  return during(
    holding(code, { enemy: null, players: ['a', 'b'] }),
    patch({ deck: ['12088', '12089'] }),
    spawnAt('A', { ...sturdy, name: 'One', keywords: ['aloof'] }, 'b'),
    spawnAt('A', { ...sturdy, name: 'Two' }, 'b'),
  )
}
const play = (s: GameState) => choose(s, 'action.playFast', { card: 'Taunt' })
it.each(['02019', '60130'])('engages a selected subset and draws once per enemy (%s)', (code) => {
  let s = play(open(code))
  s = choose(s, 'action.engage', { enemy: 'One' })
  s = choose(s, 'choice.pilotDone')
  const [one, two] = Object.values(s.enemies)
  expect(one!.engagedWith).toBe('a')
  expect(one!.damageTaken).toBe(code === '60130' ? 1 : 0)
  expect(two!.engagedWith).toBe('b')
  expect(me(s).hand).toEqual(['12088'])
  expect(me(s).resources).toBe(9)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).damage).toBe(0)
})
it('level three defeats an enemy with its damage and still draws for engaging it', () => {
  let s = open('60130')
  const e = Object.values(s.enemies)[0]!
  s = { ...s, enemies: { ...s.enemies, [e.id]: { ...e, damageTaken: 9 } } }
  s = choose(play(s), 'action.engage', { enemy: 'One' })
  expect(s.enemies[e.id]).toBeUndefined()
  expect(me(s).hand).toEqual(['12088'])
})
it('distinguishes own-turn level two from any-window level three, including temporary turns', () => {
  let s = open('02019')
  expect(playableCards({ ...s, activeTurn: 'b' }, 'a', true)).not.toContain('02019')
  s = {
    ...s,
    immediateActions: [{ investigator: 'a', activeTurn: 'b', actionsRemaining: 3, ownTurn: false }],
  }
  expect(playableCards(s, 'a', true)).not.toContain('02019')
  const high = { ...open('60130'), phase: 'enemy' as const, activeTurn: null }
  expect(playableCards(high, 'a', true)).toContain('60130')
})
it('does not offer already engaged, massive or distant enemies', () => {
  let s = open('02019')
  const [one, two] = Object.values(s.enemies)
  s = {
    ...s,
    enemies: {
      [one!.id]: { ...one!, engagedWith: 'a' },
      [two!.id]: { ...two!, keywords: ['massive'] },
    },
  }
  expect(playableCards(s, 'a', true)).not.toContain('02019')
})
it('level three is offered in an actual enemy phase player window', () => {
  const initial = open('60130')
  let s = dispatch(
    { ...initial, pending: null, queue: [], phase: 'enemy', activeTurn: null },
    { type: 'Step', step: 'enemyBegins' },
  )
  s = choose(s, 'ability.playFastFor', { name: 'A', card: 'Taunt' })
  s = choose(s, 'ability.playCard', { card: 'Taunt' })
  expect(s.pending!.question.choices.map((c) => c.label)).toContain('action.engage')
})
it('drawn revelations resolve before the next engagement decision', () => {
  registerPlayerCards([
    { code: 'taunt-revelation', name: 'Revelation', type: 'event', class: 'neutral', traits: [] },
  ])
  registerPlayerCard({
    code: 'taunt-revelation',
    revelation: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 2 }],
  })
  let s = during(open('02019'), patch({ deck: ['taunt-revelation', '12088'] }))
  const partnerHand = [...getInvestigator(s, 'b').hand]
  s = choose(play(s), 'action.engage', { enemy: 'One' })
  expect(me(s).resources).toBe(11)
  expect(me(s).discard).toContain('taunt-revelation')
  expect(getInvestigator(s, 'b').hand).toEqual(partnerHand)
  expect(s.pending!.question.choices.map((c) => c.params?.enemy)).toContain('Two')
})
