import {
  allPlayerCardDefs,
  canCommitFrom,
  dispatch,
  getInvestigator,
  playerCardDef,
  registerPlayerCards,
  registerTreachery,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, chooseWithConsent } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'
import { resolve } from '../basic-abilities/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import approvals from './approvals.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function open(
  code: string,
  options: {
    by?: string
    hand?: string[]
    difficulty?: number
    discard?: boolean
    discardTop?: boolean
  } = {},
): GameState {
  const by = options.by ?? 'a'
  let s = clear({ ...game(['a', 'b']), interactive: true })
  s = {
    ...s,
    chaosBag: [0],
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: i.id === by ? [...(options.discard ? [] : [code]), ...(options.hand ?? [])] : [],
      discard: i.id === by && options.discard ? [code] : [],
      deck: ['01048', '01044', '01045'],
    })),
  }
  return dispatch(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: options.difficulty ?? 0,
    kind: { type: 'effect', source: 'last-chance-test', onSuccess: [], onFail: [], onFailEach: [] },
    ...(options.discardTop ? { commitRule: 'discardTop' as const } : {}),
  })
}
const commit = (s: GameState, code: string, by = 'a') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', {
    card: playerCardDef(code)!.name,
  })
const send = (s: GameState, ...messages: Message[]) => dispatch(clear(s), ...messages)

// RR: Skill Tests, ST.2 and ST.4. Printed icons differ by level; weaknesses
// and another same-code physical copy count, but the committed copy does not.
it.each(approvals.cards)(
  '$code previews and contributes its printed icons less the remaining hand',
  ({ code }) => {
    const s = open(code, { hand: [code, '01000'] })
    const expected = playerCardDef(code)!.icons!.wild! - 2
    expect(
      s.pending!.question.choices.find((c) => c.label === 'choice.commit')!.params!.icons,
    ).toBe(expected)
    expect(skillTestValue(commit(s, code)).icons).toBe(expected)
  },
)
it.each(approvals.cards)(
  '$code cannot be committed with no matching icons and never subtracts skill',
  ({ code }) => {
    const n = playerCardDef(code)!.icons!.wild!
    const full = open(code, { hand: Array(n).fill('01000') })
    expect(canCommitFrom(full, 'a', code)).toBe(false)
    let s = commit(open(code), code)
    s = patch({ hand: Array(n + 2).fill('01000') })(s)
    expect(skillTestValue(s).icons).toBe(0)
  },
)
it('icons change with the committer hand, independently of the performer', () => {
  let s = commit(open('11093', { by: 'b', hand: ['01000'] }), '11093', 'b')
  expect(skillTestValue(s).icons).toBe(5)
  s = patch({ hand: Array(8).fill('01000') }, 'a')(s)
  expect(skillTestValue(s).icons).toBe(5)
  s = patch({ hand: ['01000', '11093', '01048'] }, 'b')(s)
  expect(skillTestValue(s).icons).toBe(3)
  s = patch({ hand: [] }, 'b')(s)
  expect(skillTestValue(s).icons).toBe(6)
})
it.each(approvals.cards)(
  '$code requires an empty commitment and blocks hand, helper and discard commitments',
  ({ code }) => {
    let s = commit(open(code), code)
    for (const by of ['a', 'b']) {
      s = patch({ hand: ['12094'], discard: ['12094'] }, by)(s)
      expect(canCommitFrom(s, by, '12094')).toBe(false)
      expect(canCommitFrom(s, by, '12094', 'discard')).toBe(false)
      s = send(
        s,
        { type: 'CommitCard', investigator: by, code: '12094' },
        { type: 'CommitFromDiscard', investigator: by, code: '12094' },
      )
      expect(s.skillTest!.committed).toEqual([{ code, by: 'a' }])
    }
    const existing = open(code)
    for (const by of ['a', 'b']) {
      const occupied = {
        ...existing,
        skillTest: { ...existing.skillTest!, committed: [{ code: '12094', by }] },
      }
      expect(canCommitFrom(occupied, 'a', code)).toBe(false)
      expect(canCommitFrom(occupied, 'a', code, 'discard')).toBe(false)
    }
  },
)
it('a Last Chance committed by a helper also excludes the performer cards', () => {
  let s = commit(open('04036', { by: 'b' }), '04036', 'b')
  s = patch({ hand: ['12094'] })(s)
  expect(canCommitFrom(s, 'a', '12094')).toBe(false)
})
it('discard commitment counts another copy in hand and still respects matching icons', () => {
  let s = open('04036', { discard: true, hand: ['04036'] })
  expect(canCommitFrom(s, 'a', '04036', 'discard')).toBe(true)
  s = send(s, { type: 'CommitFromDiscard', investigator: 'a', code: '04036' })
  expect(skillTestValue(s).icons).toBe(4)
  expect(getInvestigator(s, 'a').hand).toEqual(['04036'])
  const full = open('04036', { discard: true, hand: Array(5).fill('04036') })
  expect(canCommitFrom(full, 'a', '04036', 'discard')).toBe(false)
  expect(
    send(full, { type: 'CommitFromDiscard', investigator: 'a', code: '04036' }).skillTest!
      .committed,
  ).toEqual([])
})
it('Room 245 previews the top discard using its actual zone', () => {
  let s = open('11093', { discard: true, hand: ['11093'], discardTop: true })
  expect(
    s.pending!.question.choices.find((c) => c.label === 'choice.commitFromDiscard')!.params!.icons,
  ).toBe(5)
  s = choose(s, 'choice.commitFromDiscard', { card: 'Last Chance' })
  expect(skillTestValue(s).icons).toBe(5)
})
it('discarding the top deck card before committing does not exclude its same-code hand copy', () => {
  let s = open('04036', { hand: [] })
  s = patch({ deck: ['04036'] })(s)
  s = send(s, { type: 'DiscardTopAndCommit', investigator: 'a' })
  expect(skillTestValue(s).icons).toBe(4)
})
// RR: Skill Test Results. The level-3 reward belongs to the committer and only
// triggers on success while the card remains committed.
it.each(['a', 'b'])('level 3 draws two for committer %s on success', (by) => {
  const s = resolve(commit(open('11093', { by }), '11093', by))
  expect(getInvestigator(s, by).hand).toEqual(['01048', '01044'])
  expect(getInvestigator(s, by).deck).toEqual(['01045'])
  expect(getInvestigator(s, by).discard).toContain('11093')
  expect(getInvestigator(s, by === 'a' ? 'b' : 'a').hand).toEqual([])
})
it('level 0 and a failed level-3 test do not draw', () => {
  for (const [code, difficulty] of [
    ['04036', 0],
    ['11093', 99],
  ] as const) {
    const s = resolve(commit(open(code, { difficulty }), code))
    expect(getInvestigator(s, 'a').hand).toEqual([])
    expect(getInvestigator(s, 'a').deck).toHaveLength(3)
  }
})
it('a level-3 card returned before the result has no success reward', () => {
  let s = commit(open('11093'), '11093')
  s = dispatch(
    { ...s, pending: null },
    { type: 'ReturnCommittedToHand', except: '12094' },
    { type: 'CommitWindow' },
  )
  s = resolve(s)
  expect(getInvestigator(s, 'a').hand).toEqual(['11093'])
  expect(getInvestigator(s, 'a').deck).toHaveLength(3)
})
registerPlayerCards([
  {
    code: 'last-chance-weakness',
    name: 'Last Chance test weakness',
    type: 'treachery',
    class: 'neutral',
    traits: [],
    weakness: 'basicweakness',
  },
])
registerTreachery({
  code: 'last-chance-weakness',
  revelation: (_s, by) => [
    { type: 'TakeDamage', investigator: by, damage: 0, horror: 1, direct: true },
  ],
})
it('level-3 draw resolves a weakness and still draws the second card', () => {
  let s = open('11093')
  s = patch({ deck: ['last-chance-weakness', '01048', '01044'] })(s)
  s = resolve(commit(s, '11093'))
  expect(getInvestigator(s, 'a').hand).toEqual(['01048'])
  expect(getInvestigator(s, 'a').horror).toBe(1)
  expect(getInvestigator(s, 'a').deck).toEqual(['01044'])
})
// RR: Deck Customization. Integration into the real catalog, shop and scenario.
it.each(approvals.cards)('$code has one catalog/shop entry and enters a scenario', ({ code }) => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['pete'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
