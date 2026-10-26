// RR: Fast, Attack of Opportunity, Damage, Simultaneous Effects, Search and Draw.
import {
  registerPlayerCards,
  registerPlayerCard,
  dispatch,
  getInvestigator,
  playerCardDef,
  type GameState,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { sturdy } from '../basic-abilities/testing'
import { me, patch } from '../dunwich-pilot/testing'
import './index'
const blast = (s: GameState, fast: boolean) =>
  choose(s, fast ? 'action.playFast' : 'action.play', { card: 'Dynamite Blast' })
it.each(['50002', '60129'])(
  'level %s costs four, does not provoke and keeps simultaneous damage',
  (code) => {
    let s = during(
      holding(code, { players: ['a', 'b'], enemy: sturdy }),
      patch({ location: 'B' }, 'b'),
      spawnAt('B', sturdy),
    )
    const before = me(s).actionsRemaining
    s = blast(s, code === '60129')
    expect(me(s).damage).toBe(0)
    expect(me(s).horror).toBe(0)
    expect(me(s).resources).toBe(6)
    s = choose(s, 'choice.dynamiteLocation', { location: 'Room B' })
    expect(getInvestigator(s, 'b').damage).toBe(3)
    expect(me(s).damage).toBe(0)
    expect(Object.values(s.enemies).find((e) => e.location === 'B')!.damageTaken).toBe(3)
    expect(me(s).actionsRemaining).toBe(before - (code === '50002' ? 1 : 0))
  },
)
it('filters empty connected locations, retaining damage at the own location', () => {
  const s = blast(holding('50002', { enemy: null }), false)
  expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room A'])
})
it('level three is offered to its owner during a mythos fast window', () => {
  const before = holding('60129', { enemy: null })
  let s = dispatch(
    { ...before, phase: 'mythos', activeTurn: null, pending: null, queue: [] },
    { type: 'Step', step: 'mythosEnds' },
  )
  s = choose(s, 'ability.playFastFor', { name: 'A', card: 'Dynamite Blast' })
  s = choose(s, 'ability.playCard', { card: 'Dynamite Blast' })
  expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room A'])
})
it('No Stone Unturned searches beyond six cards and delegates the choice to the chosen investigator', () => {
  let s = during(
    holding('03307', { enemy: null, players: ['a', 'b'] }),
    patch({ deck: ['12088', '12088', '12088', '12088', '12088', '12088', '12025'], hand: [] }, 'b'),
  )
  s = choose(s, 'action.playFast', { card: 'No Stone Unturned' })
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.takeCard', { card: playerCardDef('12025')!.name })
  expect(getInvestigator(s, 'b').hand).toEqual(['12025'])
  expect(getInvestigator(s, 'b').deck).toHaveLength(6)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).resources).toBe(8)
})
it('No Stone Unturned permits a failed search and excludes distant investigators', () => {
  let s = during(holding('03307', { enemy: null, players: ['a', 'b'] }), (x) =>
    patch({ deck: ['12025'] })(patch({ location: 'C', deck: ['12088'] }, 'b')(x)),
  )
  s = choose(s, 'action.playFast', { card: 'No Stone Unturned' })
  expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(['A'])
  s = choose(s, 'choice.investigator', { name: 'A' })
  s = choose(s, 'choice.skip')
  expect(me(s).deck).toEqual(['12025'])
})

it.each([true, false])(
  'drawing a searched card resolves its revelation, including a weakness: %s',
  (weakness) => {
    const code = weakness ? 'group-search-weakness' : 'group-search-revelation'
    registerPlayerCards([
      {
        code,
        name: code,
        type: 'event',
        class: 'neutral',
        traits: [],
        ...(weakness ? { weakness: 'basic' } : {}),
      },
    ])
    registerPlayerCard({
      code,
      revelation: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 2 }],
    })
    let s = during(
      holding('03307', { enemy: null, players: ['a', 'b'] }),
      patch({ deck: [code], hand: [] }, 'b'),
    )
    const before = getInvestigator(s, 'b').resources
    s = choose(s, 'action.playFast', { card: 'No Stone Unturned' })
    s = choose(s, 'choice.investigator', { name: 'B' })
    s = choose(s, 'choice.takeCard', { card: code })
    expect(getInvestigator(s, 'b').resources).toBe(before + 2)
    expect(getInvestigator(s, 'b').hand).not.toContain(code)
    expect(getInvestigator(s, 'b').discard).toContain(code)
  },
)
