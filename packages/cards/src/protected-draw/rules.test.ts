import {
  allPlayerCardDefs,
  canCommitFrom,
  dispatch,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, chooseWithConsent } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

const code = '04309'
const normal = [
  '01048',
  '01044',
  '01045',
  '01072',
  '01073',
  '01071',
  '01044',
  '01048',
  '01045',
  '01072',
  '01073',
  '01071',
]
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function open(difficulty = 0, by = 'a'): GameState {
  let s = holding(code, { players: ['a', 'b'], enemy: null })
  s = {
    ...s,
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: i.id === by ? [code] : [],
      deck: [...normal],
      discard: [],
    })),
  }
  return dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty,
    kind: { type: 'effect', source: 'all-in-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
}
const commit = (s: GameState, by = 'a') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: 'All In' })
// RR: Skill Test Results, Max. Each resolution draws the margin up to five.
it.each([
  [0, 5],
  [3, 2],
  [5, 0],
  [6, 0],
])('draws %s difficulty: %s cards', (difficulty, amount) => {
  let s = commit(open(difficulty))
  expect(me(s).hand).toEqual([])
  s = resolve(s)
  expect(me(s).hand).toEqual(normal.slice(0, amount))
  expect(me(s).deck).toEqual(normal.slice(amount))
  expect(me(s).discard).toContain(code)
})
it('draws nothing on automatic failure', () => {
  const s = resolve(commit(open()), 'autoFail')
  expect(me(s).hand).toEqual([])
  expect(me(s).deck).toEqual(normal)
})
// Official All In FAQ (June 2024): neither player draws when helping another.
it('contributes icons to another investigator without drawing for either player', () => {
  let s = commit(open(0, 'b'), 'b')
  expect(s.skillTest!.committed).toHaveLength(1)
  s = resolve(s)
  for (const i of s.investigators) {
    expect(i.hand).toEqual([])
    expect(i.deck).toEqual(normal)
  }
  expect(getInvestigator(s, 'b').discard).toContain(code)
})
it('allows at most one copy across all investigators, including direct messages', () => {
  let s = patch({ hand: [code] }, 'b')(patch({ hand: [code, code] })(open()))
  s = commit(s)
  expect(canCommitFrom(s, 'a', code)).toBe(false)
  expect(canCommitFrom(s, 'b', code)).toBe(false)
  s = dispatch(clear(s), { type: 'CommitCard', investigator: 'b', code })
  expect(s.skillTest!.committed).toHaveLength(1)
})
// RR: Drawing Cards, Weakness, Revelation. Weaknesses count toward the requested
// draw but go back only after the batch, without replacements or revelations.
it.each(['12101', '12009', '12012', '12006'])(
  'returns actual weakness %s without resolving it',
  (weakness) => {
    let s = patch({ deck: [weakness, ...normal] })(commit(open()))
    const resources = me(s).resources
    s = resolve(s)
    expect(me(s).hand).toEqual(normal.slice(0, 4))
    expect(me(s).deck).toHaveLength(normal.length - 3)
    expect(me(s).deck.filter((c) => c === weakness)).toHaveLength(1)
    expect(me(s).resources).toBe(resources)
    expect(me(s).horror).toBe(0)
    expect(Object.keys(s.enemies)).toHaveLength(0)
    expect(Object.keys(s.treacheries)).toHaveLength(0)
  },
)
it('does not remove an older hand copy when returning a drawn copy of the same weakness', () => {
  let s = patch({ hand: ['12006'], deck: ['12006', ...normal] })(commit(open()))
  s = resolve(s)
  expect(me(s).hand.filter((c) => c === '12006')).toHaveLength(1)
  expect(me(s).deck.filter((c) => c === '12006')).toHaveLength(1)
})
it('returns every weakness in a mixed batch exactly once without replacement draws', () => {
  const weaknesses = ['12101', '12009', '12012', '12006']
  const s = resolve(patch({ deck: [...weaknesses, ...normal] })(commit(open())))
  expect(me(s).hand).toEqual(normal.slice(0, 1))
  expect(me(s).deck).toHaveLength(normal.length + weaknesses.length - 1)
  for (const weakness of weaknesses)
    expect(me(s).deck.filter((c) => c === weakness)).toHaveLength(1)
  expect(me(s).resources).toBe(10)
  expect(Object.keys(s.enemies)).toHaveLength(0)
  expect(Object.keys(s.treacheries)).toHaveLength(0)
})
it('keeps ordinary draws resolving weaknesses after the protected draw', () => {
  let s = resolve(patch({ deck: ['12101', ...normal] })(commit(open())))
  const deck = me(s).deck.filter((c) => c !== '12101')
  s = dispatch(clear(patch({ deck: ['12101', ...deck] })(s)), {
    type: 'DrawCards',
    investigator: 'a',
    amount: 1,
  })
  expect(me(s).resources).toBe(0)
  expect(me(s).discard).toContain('12101')
})
it('reshuffles an exhausted deck normally while keeping protected weaknesses aside until the end', () => {
  let s = clear(
    patch({ hand: [], deck: ['12101', normal[0]!], discard: [normal[1]!, normal[2]!] })(open()),
  )
  s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 3, shuffleWeaknesses: true })
  expect(me(s).hand).toHaveLength(2)
  expect(me(s).hand).not.toContain('12101')
  expect(me(s).deck).toHaveLength(2)
  expect(me(s).deck).toContain('12101')
  expect(me(s).horror).toBe(1)
})
it('finishes a short all-weakness draw without redrawing the returned card in a loop', () => {
  const s = dispatch(clear(patch({ hand: [], deck: ['12006'], discard: [] })(open())), {
    type: 'DrawCards',
    investigator: 'a',
    amount: 5,
    shuffleWeaknesses: true,
  })
  expect(me(s).hand).toEqual([])
  expect(me(s).deck).toEqual(['12006'])
  expect(me(s).horror).toBe(1)
})
it('applies the cap separately when Double or Nothing duplicates the result', () => {
  let s = patch({ hand: [code, '02026'] })(open())
  s = choose(commit(s), 'choice.commit', { card: playerCardDef('02026')!.name })
  s = resolve(s)
  expect(me(s).hand).toEqual(normal.slice(0, 10))
  expect(me(s).deck).toEqual(normal.slice(10))
})

registerPlayerCards([
  {
    code: 'all-in-revelation',
    name: 'Ordinary revelation',
    type: 'event',
    class: 'neutral',
    traits: [],
  },
  { code: 'all-in-observer', name: 'Draw observer', type: 'asset', class: 'neutral', traits: [] },
])
registerPlayerCard({
  code: 'all-in-revelation',
  revelation: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 1 }],
})
registerPlayerCard({
  code: 'all-in-observer',
  forced: (_s, t, self): Message[] =>
    t.type === 'afterDrawCard' && t.card === normal[0] && t.investigator === self.owner
      ? [
          {
            type: 'Ask',
            investigator: self.owner,
            question: {
              kind: 'chooseOne',
              alwaysAsk: true,
              prompt: 'prompt.pilotTarget',
              choices: [{ label: 'choice.skip', then: [] }],
            },
          },
        ]
      : [],
})
it('still resolves non-weakness revelations from the same batch', () => {
  let s = patch({ deck: ['12101', 'all-in-revelation', ...normal] })(commit(open()))
  const resources = me(s).resources
  s = resolve(s)
  expect(me(s).resources).toBe(resources + 1)
  expect(me(s).discard).toContain('all-in-revelation')
  expect(me(s).deck).toContain('12101')
})
it('restores a pending batch from JSON without losing or duplicating its held weaknesses', () => {
  let s = clear(
    withAsset(
      patch({ hand: [], deck: ['12101', normal[0]!, normal[1]!, normal[2]!] })(open()),
      'all-in-observer',
    ),
  )
  s = dispatch(s, { type: 'DrawCards', investigator: 'a', amount: 3, shuffleWeaknesses: true })
  expect(s.pending!.question.prompt).toBe('prompt.pilotTarget')
  expect(s.queue.some((m) => m.type === 'DrawCards' && m.drawnWeaknesses?.includes('12101'))).toBe(
    true,
  )
  const restored = JSON.parse(JSON.stringify(s)) as GameState
  const result = choose(restored, 'choice.skip')
  expect(result).toEqual(choose(s, 'choice.skip'))
  expect(me(result).hand).toEqual(normal.slice(0, 2))
  expect(me(result).deck.filter((c) => c === '12101')).toHaveLength(1)
})
// RR: Deck Customization. Integration with real catalog, shop and scenario.
it('has one catalog/shop entry and enters a legal investigator scenario', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 6
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
  expect(playerCardDef(code)!.commitLimit).toBe(1)
})
