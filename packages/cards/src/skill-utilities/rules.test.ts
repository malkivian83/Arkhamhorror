import {
  allPlayerCardDefs,
  canCommitFrom,
  playerCardDef,
  registerPlayerCards,
  type GameState,
  type Message,
  type SkillTestKind,
  type SkillType,
} from '@lcg/engine'
import { choose, chooseWithConsent, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { enemy, resolve } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import approvals from './approvals.json'
import './index'

const effect: SkillTestKind = {
  type: 'effect',
  source: 'utility-test',
  onSuccess: [],
  onFail: [],
  onFailEach: [],
}
function open(
  code: string,
  options: {
    by?: string
    skill?: SkillType
    kind?: 'fight' | 'evade' | 'investigate' | 'parley'
    helperAt?: string
    difficulty?: number
    change?: (s: GameState) => GameState
    tags?: string[]
  } = {},
): GameState {
  const by = options.by ?? 'a'
  let s = holding(code, { players: ['a', 'b', 'c'] })
  s = {
    ...s,
    chaosBag: [0],
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: i.id === by ? [code] : [],
      location: i.id === 'b' ? (options.helperAt ?? 'A') : i.id === 'c' ? 'C' : 'A',
    })),
  }
  const kind: SkillTestKind =
    options.kind === 'fight' || options.kind === 'evade'
      ? { type: options.kind, enemy: enemy(s).id }
      : options.kind === 'investigate'
        ? { type: 'investigate', location: 'A' }
        : effect
  const begin: Message = {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: options.skill ?? 'intellect',
    difficulty: options.difficulty ?? 0,
    kind,
    ...(options.tags
      ? { tags: options.tags }
      : options.kind === 'parley'
        ? { tags: ['parley'] }
        : {}),
  }
  return during(s, options.change ?? ((x) => x), begin)
}
const commit = (s: GameState, code: string, by = 'a') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', {
    card: playerCardDef(code)!.name,
  })
const finished = (s: GameState, code: string, by = 'a') => resolve(commit(s, code, by))

// RR: Skill Tests, Commit Cards, Peril. Remote permission does not waive the
// printed test restriction, icons, or the limit of one card from each helper.
it.each(['fight', 'evade'] as const)('Fighting Lessons helps a remote %s test', (kind) => {
  let s = open('09030', {
    by: 'b',
    helperAt: 'C',
    kind,
    skill: kind === 'fight' ? 'combat' : 'agility',
  })
  expect(canCommitFrom(s, 'b', '09030')).toBe(true)
  s = commit(s, '09030', 'b')
  expect(s.skillTest!.committed).toContainEqual({ code: '09030', by: 'b' })
  expect(canCommitFrom(s, 'b', '12094')).toBe(false)
})
it('Fighting Lessons requires the remote helper to accept the proposed card', () => {
  let s = open('09030', { by: 'b', helperAt: 'C', kind: 'fight', skill: 'combat' })
  s = choose(s, 'choice.commitFrom', { card: 'Fighting Lessons' })
  expect(s.pending!.investigator).toBe('b')
  expect(s.skillTest!.committed).toHaveLength(0)
  s = choose(s, 'choice.skip')
  expect(s.skillTest!.committed).toHaveLength(0)
  expect(s.investigators[1]!.hand).toContain('09030')
})

it('Fighting Lessons rejects other tests and peril despite the remote permission', () => {
  expect(canCommitFrom(open('09030', { by: 'b', helperAt: 'C' }), 'b', '09030')).toBe(false)
  const peril = open('09030', {
    by: 'b',
    helperAt: 'C',
    kind: 'fight',
    skill: 'combat',
    tags: ['peril'],
  })
  expect(canCommitFrom(peril, 'b', '09030')).toBe(false)
})

it.each(['investigate', 'parley'] as const)(
  'Contemplative has no icons, helps from a connecting location and adds a clue to the performer on %s',
  (kind) => {
    let s = open('11088', { by: 'b', helperAt: 'B', kind })
    expect(canCommitFrom(s, 'b', '11088')).toBe(true)
    s = finished(s, '11088', 'b')
    expect(me(s).clues).toBe(kind === 'investigate' ? 2 : 1)
    expect(s.investigators[1]!.clues).toBe(0)
    expect(s.investigators[1]!.discard).toContain('11088')
  },
)
it('Contemplative rejects distant locations, combat and peril and gives no clue after failure', () => {
  expect(
    canCommitFrom(open('11088', { by: 'b', helperAt: 'C', kind: 'investigate' }), 'b', '11088'),
  ).toBe(false)
  expect(canCommitFrom(open('11088', { kind: 'fight', skill: 'combat' }), 'a', '11088')).toBe(false)
  expect(
    canCommitFrom(
      open('11088', { by: 'b', helperAt: 'B', kind: 'parley', tags: ['parley', 'peril'] }),
      'b',
      '11088',
    ),
  ).toBe(false)
  const failed = finished(open('11088', { kind: 'parley', difficulty: 99 }), '11088')
  expect(me(failed).clues).toBe(0)
})

// RR: Search, Draw. A synthetic non-event Insight verifies the type filter,
// rather than relying on the current pool having only Insight events.
it('Establish Motive searches only six cards for an Insight event, drawn by the performer', () => {
  registerPlayerCards([
    {
      code: 'test-insight-asset',
      name: 'Test Insight',
      type: 'asset',
      class: 'neutral',
      traits: ['Insight'],
      slots: [],
      cost: 0,
    },
  ])
  let s = open('60268', {
    by: 'b',
    change: patch({
      deck: ['test-insight-asset', '01036', '12094', '12094', '12094', '12094', '01064'],
    }),
  })
  s = finished(s, '60268', 'b')
  expect(s.pending!.investigator).toBe('a')
  expect(
    s
      .pending!.question.choices.filter((c) => c.label === 'choice.takeCard')
      .map((c) => c.params?.card),
  ).toEqual(['Mind over Matter'])
  s = choose(s, 'choice.takeCard', { card: 'Mind over Matter' })
  expect(me(s).hand).toContain('01036')
  expect(me(s).deck).toHaveLength(6)
  expect(s.investigators[1]!.hand).toHaveLength(0)
})
it('Establish Motive may fail to find, shuffles, and does not search after failure', () => {
  let s = finished(open('60268', { change: patch({ deck: ['01036', '12094'] }) }), '60268')
  s = choose(s, 'choice.skip')
  expect(me(s).hand).toHaveLength(0)
  expect(me(s).deck).toHaveLength(2)
  const failed = finished(
    open('60268', { difficulty: 99, change: patch({ deck: ['01036'] }) }),
    '60268',
  )
  expect(me(failed).deck).toEqual(['01036'])
  expect(failed.pending!.question.prompt).not.toBe('prompt.searchToHand')
})

it("Literary Analysis replenishes a secret on another investigator's nearby Tome, up to its printed value", () => {
  let s = open('60269', {
    by: 'b',
    change: (x) =>
      withAsset(withAsset(x, '60208', { owner: 'a', uses: 4 }), '60208', {
        id: 'second-tome',
        owner: 'b',
        uses: 2,
      }),
  })
  s = finished(s, '60269', 'b')
  expect(s.pending!.investigator).toBe('b')
  s = choose(s, 'choice.assignToAsset', { card: 'Encyclopedia' })
  expect(s.assets['60208']!.uses).toBe(5)
  expect(s.assets['second-tome']!.uses).toBe(2)
})
it('Literary Analysis ignores full, distant and non-Tome assets and failure', () => {
  const withTargets = (s: GameState) =>
    withAsset(
      withAsset(withAsset(withAsset(s, '60209', { uses: 0 }), '60208', { uses: 5 }), '01042'),
      '60208',
      {
        id: 'remote-tome',
        owner: 'c',
        uses: 1,
      },
    )
  const s = finished(open('60269', { change: withTargets }), '60269')
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.assignToAsset')).toBe(false)
  const failed = finished(
    open('60269', { difficulty: 99, change: (x) => withAsset(x, '60208', { uses: 1 }) }),
    '60269',
  )
  expect(failed.assets['60208']!.uses).toBe(1)
})

// RR: Deck Customization, Campaign Upgrades. Real shop and scenario integration.
it.each(approvals.cards)('$code has one catalog/shop entry and enters a scenario', ({ code }) => {
  const investigator =
    playerCardDef(code)!.class === 'guardian'
      ? 'daniela'
      : playerCardDef(code)!.class === 'survivor'
        ? 'pete'
        : 'joe'
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', [investigator], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
