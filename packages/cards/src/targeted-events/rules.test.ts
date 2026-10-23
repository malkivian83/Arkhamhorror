import {
  allPlayerCardDefs,
  playableCards,
  playerCardDef,
  registerTreachery,
  type GameState,
  type Treachery,
} from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding, play } from '../basic-events/testing'
import { me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import approvals from './approvals.json'
import './index'

registerTreachery({ code: 'reasoning-locked', cannotDiscard: true, revelation: () => [] })
const terror = (
  id: string,
  placement: Treachery['placement'],
  changes: Partial<Treachery> = {},
): Treachery => ({
  id,
  code: id,
  kind: 'treachery',
  name: id,
  traits: ['Terror'],
  keywords: [],
  placement,
  ...changes,
})
const threat = (id: string, by = 'a', changes: Partial<Treachery> = {}) =>
  terror(id, { type: 'threatArea', investigator: by }, changes)
function open(
  code = '03191',
  options: {
    clues?: number
    horror?: number
    otherHorror?: number
    otherLocation?: string
    treacheries?: Treachery[]
    enemy?: boolean
  } = {},
): GameState {
  const s = holding(code, {
    players: ['a', 'b', 'c'],
    ...(options.enemy ? { engagedWith: 'b' } : { enemy: null }),
  })
  return during(s, (x) => ({
    ...patch(
      { location: 'C', hand: [], horror: 0 },
      'c',
    )(
      patch(
        { horror: options.otherHorror ?? 0, location: options.otherLocation ?? 'A', hand: [] },
        'b',
      )(patch({ clues: options.clues ?? 1, horror: options.horror ?? 0 })(x)),
    ),
    treacheries: Object.fromEntries((options.treacheries ?? []).map((t) => [t.id, t])),
  }))
}
const discard = (s: GameState, card: string) => choose(s, 'ability.discardTreachery', { card })
const heal = (s: GameState, name = 'A') => choose(s, 'ability.healHorror', { card: name, n: 2 })

// RR: Play Restrictions, Choose, Healing. Level 0 requires a clue and lets the
// chosen investigator decide; spending a clue is not part of either event.
it('level 0 requires a clue, an eligible target and two resources', () => {
  const none = open()
  expect(playableCards(none, 'a', false)).not.toContain('03191')
  expect(playableCards(open('03191', { clues: 0, horror: 3 }), 'a', false)).not.toContain('03191')
  expect(playableCards(open('03191', { horror: 3 }), 'a', false)).toContain('03191')
  expect(
    playableCards(patch({ resources: 1 })(open('03191', { horror: 3 })), 'a', false),
  ).not.toContain('03191')
})
it('level 0 heals up to two horror, pays its cost/action and preserves the clue', () => {
  const before = open('03191', { horror: 1 })
  const after = play(before, '03191')
  expect(me(after)).toMatchObject({
    horror: 0,
    clues: 1,
    resources: 8,
    actionsRemaining: me(before).actionsRemaining - 1,
  })
  expect(me(after).discard).toContain('03191')
})
it('level 0 lets the chosen investigator decide between healing and discarding their Terror', () => {
  let s = play(open('03191', { otherHorror: 3, treacheries: [threat('terror-b', 'b')] }), '03191')
  expect(s.pending!.investigator).toBe('b')
  expect(s.pending!.question.choices.map((c) => c.label)).toEqual([
    'ability.healHorror',
    'ability.discardTreachery',
  ])
  s = heal(s, 'B')
  expect(s.investigators[1]!.horror).toBe(1)
  expect(s.treacheries['terror-b']).toBeDefined()
})
it('level 0 chooses an investigator before that investigator chooses a Terror', () => {
  let s = play(
    open('03191', {
      horror: 3,
      otherHorror: 1,
      treacheries: [threat('one-b', 'b'), threat('two-b', 'b')],
    }),
    '03191',
  )
  expect(s.pending!.investigator).toBe('a')
  s = choose(s, 'choice.investigator', { name: 'B' })
  expect(s.pending!.investigator).toBe('b')
  s = discard(s, 'two-b')
  expect(s.treacheries['two-b']).toBeUndefined()
  expect(s.treacheries['one-b']).toBeDefined()
  expect(s.investigators[1]!.horror).toBe(1)
})
it('level 0 sends a discarded player weakness to its owner rather than encounter discard', () => {
  const before = open('03191', { treacheries: [threat('owner-terror', 'b', { owner: 'b' })] })
  const s = play(before, '03191')
  expect(s.investigators[1]!.discard).toContain('owner-terror')
  expect(s.encounterDiscard.some((c) => c.code === 'owner-terror')).toBe(false)
})
it('level 0 excludes distant or eliminated investigators, location cards, non-Terrors and cannot-discard cards', () => {
  let s = open('03191', {
    otherHorror: 3,
    otherLocation: 'C',
    treacheries: [
      threat('remote', 'b'),
      terror('location', { type: 'location', location: 'A' }),
      threat('wrong-trait', 'a', { traits: ['Curse'] }),
      threat('locked', 'a', { code: 'reasoning-locked' }),
    ],
  })
  expect(playableCards(s, 'a', false)).not.toContain('03191')
  s = patch({ location: 'A', eliminated: true }, 'b')(s)
  expect(playableCards(s, 'a', false)).not.toContain('03191')
})

// RR: For Each, Choose, Location. The upgrade makes separate resolutions and
// can discard Terror treacheries attached to a location or an enemy there.
it.each([0, 1, 2, 3, 4])('level 4 resolves once per clue up to three (clues=%s)', (clues) => {
  const before = open('52003', { clues, horror: 7 })
  if (clues === 0) {
    expect(playableCards(before, 'a', false)).not.toContain('52003')
    return
  }
  const s = play(before, '52003')
  expect(me(s).horror).toBe(7 - 2 * Math.min(3, clues))
  expect(me(s).clues).toBe(clues)
  expect(me(s).resources).toBe(8)
})
it('level 4 can split three resolutions between healing and different Terror placements', () => {
  let s = play(
    open('52003', {
      clues: 5,
      horror: 3,
      treacheries: [
        threat('threat-b', 'b'),
        terror('location-a', { type: 'location', location: 'A' }),
        terror('remote-c', { type: 'location', location: 'C' }),
        terror('limbo', { type: 'limbo' }),
      ],
    }),
    '52003',
  )
  expect(s.pending!.investigator).toBe('a')
  expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
    'A',
    'threat-b',
    'location-a',
  ])
  s = heal(s)
  s = discard(s, 'location-a')
  s = discard(s, 'threat-b')
  expect(me(s).horror).toBe(1)
  expect(Object.keys(s.treacheries)).toEqual(['remote-c', 'limbo'])
  expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
})
it('level 4 chooses the healing recipient itself, including another investigator here', () => {
  let s = play(open('52003', { clues: 1, horror: 1, otherHorror: 3 }), '52003')
  expect(s.pending!.investigator).toBe('a')
  s = heal(s, 'B')
  expect(s.investigators[1]!.horror).toBe(1)
  expect(me(s).horror).toBe(1)
})
it('level 4 discards a Terror attached to an enemy at your location, unlike level 0', () => {
  let s = open('52003', { enemy: true })
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, (x) => ({
    ...x,
    treacheries: { attachment: terror('attachment', { type: 'enemy', enemy: enemy.id }) },
  }))
  expect(playableCards(patch({ hand: ['03191'] })(s), 'a', false)).not.toContain('03191')
  s = play(s, '52003')
  expect(s.treacheries.attachment).toBeUndefined()
  expect(s.enemies[enemy.id]).toBeDefined()
})
it('level 4 re-evaluates targets and ends when no effect remains', () => {
  const s = play(open('52003', { clues: 3, treacheries: [threat('only-terror')] }), '52003')
  expect(s.treacheries['only-terror']).toBeUndefined()
  expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
  expect(me(s).clues).toBe(3)
})
it('level 4 fixes the repetition count when played and cannot discard protected Terrors', () => {
  let s = play(
    open('52003', {
      clues: 1,
      horror: 2,
      treacheries: [threat('allowed'), threat('locked', 'a', { code: 'reasoning-locked' })],
    }),
    '52003',
  )
  expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain('locked')
  s = patch({ clues: 5 })(s)
  s = heal(s)
  expect(s.treacheries.allowed).toBeDefined()
  expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
})
it('level 4 excludes remote, limbo, non-Terror and protected targets', () => {
  const s = open('52003', {
    otherHorror: 2,
    otherLocation: 'C',
    treacheries: [
      threat('remote', 'b'),
      terror('limbo', { type: 'limbo' }),
      terror('wrong-location', { type: 'location', location: 'C' }),
      threat('non-terror', 'a', { traits: ['Omen'] }),
      threat('locked', 'a', { code: 'reasoning-locked' }),
    ],
  })
  expect(playableCards(s, 'a', false)).not.toContain('52003')
})
// RR: Deck Customization, Campaign Upgrades. One entry per code in the real shop.
it.each(approvals.cards)('$code has one catalog/shop entry and enters a scenario', ({ code }) => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['joe'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  expect(playerCardDef(code)!.xp).toBe(code === '52003' ? 4 : 0)
})
