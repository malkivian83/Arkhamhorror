// RR: Discard Pile, In Play, Weakness, Cannot, Fast, Attack of Opportunity.
// True Survivor FAQ: return as many Innate skills as possible, up to three.
import {
  playableCards,
  registerPlayerCards,
  registerTreachery,
  type GameState,
  type Treachery,
  type TreacheryPlacement,
} from '@lcg/engine'
import { choose, during, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding, sturdy } from '../basic-events/testing'
import { me, patch } from '../dunwich-pilot/testing'
import './index'

registerPlayerCards([
  {
    code: 'group-innate',
    name: 'Innate skill',
    type: 'skill',
    class: 'neutral',
    traits: ['Innate'],
  },
  {
    code: 'group-practiced',
    name: 'Practiced skill',
    type: 'skill',
    class: 'neutral',
    traits: ['Practiced'],
  },
  {
    code: 'group-innate-event',
    name: 'Innate event',
    type: 'event',
    class: 'neutral',
    traits: ['Innate'],
  },
])

it.each([1, 2, 3, 4])('True Survivor returns %s available copies, capped at three', (count) => {
  let s = during(
    holding('03273', { enemy: null }),
    patch({
      discard: [
        ...Array<string>(count).fill('group-innate'),
        'group-practiced',
        'group-innate-event',
      ],
    }),
  )
  s = choose(s, 'action.play', { card: 'True Survivor' })
  for (let n = 0; n < Math.min(count, 3); n++) {
    expect(s.pending!.question.choices.some((c) => c.label === 'choice.skip')).toBe(false)
    s = choose(s, 'choice.takeCard', { card: 'Innate skill' })
  }
  expect(me(s).hand.filter((code) => code === 'group-innate')).toHaveLength(Math.min(count, 3))
  expect(me(s).discard.filter((code) => code === 'group-innate')).toHaveLength(
    Math.max(0, count - 3),
  )
  expect(me(s).discard).toEqual(
    expect.arrayContaining(['group-practiced', 'group-innate-event', '03273']),
  )
  expect(me(s).resources).toBe(7)
  expect(me(s).actionsRemaining).toBe(2)
})

it('True Survivor cannot be played without an Innate skill in its own discard pile', () => {
  const s = during(
    holding('03273', { enemy: null }),
    patch({ discard: ['group-innate-event', 'group-practiced'] }),
  )
  expect(playableCards(s, 'a', false)).not.toContain('03273')
})

const treachery = (
  id: string,
  placement: TreacheryPlacement,
  extra: Partial<Treachery> = {},
): Treachery => ({
  id,
  code: id,
  name: id,
  kind: 'treachery',
  keywords: [],
  placement,
  ...extra,
})

function field(s: GameState): GameState {
  const elite = Object.values(s.enemies).find((e) => e.traits?.includes('Elite'))!
  return {
    ...s,
    treacheries: Object.fromEntries(
      [
        treachery('group-remote', { type: 'threatArea', investigator: 'b' }),
        treachery('group-location', { type: 'location', location: 'B' }),
        treachery('group-agenda', { type: 'agenda' }),
        treachery(
          'group-owned-weakness',
          { type: 'threatArea', investigator: 'a' },
          { owner: 'a' },
        ),
        treachery('group-hidden', { type: 'threatArea', investigator: 'a' }, { hidden: true }),
        treachery('group-limbo', { type: 'limbo' }),
        treachery('group-elite', { type: 'enemy', enemy: elite.id }),
        treachery('group-protected', { type: 'agenda' }),
      ].map((t) => [t.id, t]),
    ),
  }
}
registerTreachery({ code: 'group-protected', cannotDiscard: true, revelation: () => [] })

it.each(['53009', '04313'])(
  'Alter Fate %s discards remote treacheries and respects restrictions',
  (code) => {
    let s = during(
      holding(code, { enemy: null, players: ['a', 'b'] }),
      (s) => s,
      spawnAt('B', { ...sturdy, traits: ['Elite'] }, null),
    )
    s = during(s, field)
    s = choose(s, code === '04313' ? 'action.playFast' : 'action.play', { card: 'Alter Fate' })
    expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
      'group-remote',
      'group-location',
      'group-agenda',
    ])
    s = choose(s, 'choice.groupedTreachery', { card: 'group-remote' })
    expect(s.treacheries['group-remote']).toBeUndefined()
    expect(s.encounterDiscard.some((c) => c.code === 'group-remote')).toBe(true)
    expect(s.treacheries['group-owned-weakness']).toBeDefined()
    expect(me(s).resources).toBe(code === '04313' ? 9 : 7)
    expect(me(s).actionsRemaining).toBe(code === '04313' ? 3 : 2)
  },
)

it.each(['53009', '04313'])('Alter Fate %s is unavailable without a legal treachery', (code) => {
  const s = holding(code, { enemy: null })
  expect(playableCards(s, 'a', code === '04313')).not.toContain(code)
})
