import {
  allPlayerCardDefs,
  dispatch,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  registerPlayerCards,
  type GameState,
} from '@lcg/engine'
import { choose, chooseWithConsent } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { me, patch, withAsset } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

const code = '02229'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function open(
  options: {
    difficulty?: number
    by?: string
    turn?: string | null
    phase?: GameState['phase']
    enemy?: boolean
  } = {},
): GameState {
  const by = options.by ?? 'a'
  let s = holding(code, {
    players: ['a', 'b'],
    engagedWith: by,
    ...(options.enemy ? {} : { enemy: null }),
  })
  s = {
    ...s,
    phase: options.phase ?? s.phase,
    activeTurn: options.turn === undefined ? (s.activeTurn ?? null) : options.turn,
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: i.id === by ? [code] : [],
      actionsRemaining: 3,
      actionsTaken: i.id === 'a' ? 0 : 4,
    })),
  }
  return dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: options.difficulty ?? 0,
    kind: {
      type: 'effect',
      source: 'quick-thinking-test',
      onSuccess: [],
      onFail: [],
      onFailEach: [],
    },
  })
}
const commit = (s: GameState, by = 'a') =>
  chooseWithConsent(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', {
    card: 'Quick Thinking',
  })
const accept = (s: GameState) => choose(s, 'choice.quickThinkingAction')
const extra = (s = open(), by = 'a') => accept(resolve(commit(s, by)))
const options = (s: GameState) => s.pending!.question.choices.map((c) => c.label)

// RR: Skill Test Results, Delayed Effects. The optional effect is created at
// ST.7 but cannot interrupt the current test; it belongs to the committer.
it.each([
  [0, true],
  [2, true],
  [3, false],
  [4, false],
  [5, false],
])('requires success by two against %s', (difficulty, eligible) => {
  let s = resolve(commit(open({ difficulty: Number(difficulty) })))
  if (eligible) {
    expect(s.pending!.question.prompt).toBe('prompt.optional')
    expect(s.skillTest).not.toBeNull()
    s = choose(s, 'choice.skip')
  }
  expect(s.pending).toBeNull()
  expect(me(s).actionsTaken).toBe(0)
})
it('offers no additional action on automatic failure', () => {
  expect(resolve(commit(open()), 'autoFail').pending).toBeNull()
})
it('takes exactly one action after the test ends, without spending an ordinary action', () => {
  let s = extra()
  expect(s.skillTest).toBeNull()
  expect(me(s).discard).toContain(code)
  expect(s.pending!.question.prompt).toBe('prompt.immediateAction')
  const resources = me(s).resources
  s = choose(s, 'action.resource')
  expect(me(s).resources).toBe(resources + 1)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).actionsTaken).toBe(1)
  expect(me(s).completedActions!.count).toBe(1)
  expect(s.immediateActions).toBeUndefined()
  expect(s.pending).toBeNull()
})
it('lets a helper decide and act, then restores the actual performer turn and helper counters', () => {
  let s = resolve(commit(open({ by: 'b' }), 'b'))
  expect(s.pending!.investigator).toBe('b')
  s = accept(s)
  expect(s.activeTurn).toBe('b')
  expect(getInvestigator(s, 'b').actionsTaken).toBe(0)
  s = choose(s, 'action.resource')
  expect(s.activeTurn).toBe('a')
  expect(getInvestigator(s, 'b').actionsRemaining).toBe(3)
  expect(getInvestigator(s, 'b').actionsTaken).toBe(4)
  expect(me(s).actionsTaken).toBe(0)
})
it('also works in mythos without starting an actual turn or allowing fast asset plays', () => {
  let s = extra(patch({ hand: [code, '01030'] })(open({ phase: 'mythos', turn: null })))
  expect(options(s)).not.toContain('action.playFast')
  expect(options(s)).not.toContain('action.endTurn')
  s = choose(s, 'action.resource')
  expect(s.activeTurn).toBeNull()
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).actionsTaken).toBe(0)
})
it.each([
  [2, false],
  [1, true],
])('resolves each of %s copies (doubled: %s) separately', (copies, doubled) => {
  let s = patch({ hand: [...Array(Number(copies)).fill(code), ...(doubled ? ['02026'] : [])] })(
    open(),
  )
  for (let n = 0; n < Number(copies); n++) s = commit(s)
  if (doubled) s = choose(s, 'choice.commit', { card: playerCardDef('02026')!.name })
  s = resolve(s)
  for (let n = 0; n < 2; n++) s = accept(s)
  expect(s.skillTest).toBeNull()
  s = choose(choose(s, 'action.resource'), 'action.resource')
  expect(me(s).actionsTaken).toBe(2)
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.pending).toBeNull()
})
it('chains a second Quick Thinking inside the granted action without losing either action', () => {
  let s = extra(patch({ hand: [code, code] })(open()))
  s = choose(s, 'action.investigate', { location: 'Room A' })
  s = extra(s)
  expect(s.immediateActions).toHaveLength(2)
  s = choose(s, 'action.resource')
  expect(me(s).actionsTaken).toBe(2)
  expect(me(s).actionsRemaining).toBe(3)
  expect(me(s).completedActions!.count).toBe(2)
  expect(s.immediateActions).toBeUndefined()
})
it('preserves movement performed during the actual turn', () => {
  const s = choose(extra(), 'action.move', { location: 'Room B' })
  expect(me(s).location).toBe('B')
  expect(me(s).movedThisTurn).toBe(true)
  expect(me(s).actionsTaken).toBe(1)
})
it('uses normal opportunity attacks for the granted action', () => {
  const s = choose(extra(open({ enemy: true })), 'action.resource')
  expect(me(s).damage).toBe(1)
  expect(me(s).horror).toBe(1)
})
it('does not restore the turn or actions of an investigator defeated during the action', () => {
  let s = open({ enemy: true })
  s = patch({ damage: me(s).health - 1 })(s)
  s = choose(extra(s), 'action.resource')
  expect(me(s).eliminated).toBe(true)
  expect(s.activeTurn).toBeNull()
  expect(me(s).actionsRemaining).toBe(0)
})
it('restores the actual turn after a helper is defeated without giving the helper actions back', () => {
  let s = open({ by: 'b', enemy: true })
  s = patch({ damage: getInvestigator(s, 'b').health - 1 }, 'b')(s)
  s = choose(extra(s, 'b'), 'action.resource')
  expect(getInvestigator(s, 'b').eliminated).toBe(true)
  expect(getInvestigator(s, 'b').actionsRemaining).toBe(0)
  expect(s.activeTurn).toBe('a')
})

registerPlayerCards([
  { code: 'immediate-cost', name: 'Two-cost action', type: 'asset', class: 'neutral', traits: [] },
  { code: 'immediate-nest', name: 'Nested action', type: 'asset', class: 'neutral', traits: [] },
])
registerPlayerCard({
  code: 'immediate-cost',
  abilities: (_s, self) => [
    {
      key: self.id + ':two',
      label: 'ability.drawCards',
      params: { card: 'Two-cost action' },
      actions: 2,
      provokes: false,
      then: [{ type: 'GainResources', investigator: self.owner, amount: 1 }],
    },
  ],
})
registerPlayerCard({
  code: 'immediate-nest',
  abilities: (_s, self) => [
    {
      key: self.id + ':nested',
      label: 'ability.drawCards',
      params: { card: self.id },
      actions: 1,
      provokes: false,
      then: [{ type: 'TakeImmediateAction', investigator: self.owner === 'a' ? 'b' : 'a' }],
    },
  ],
})
// RR: Additional Costs, As If. The free action pays one action cost. Extra
// costs may use ordinary actions only during the actor's actual turn.
it('can pay a two-action cost using one ordinary action during the actual turn', () => {
  const s = choose(extra(withAsset(open(), 'immediate-cost')), 'ability.drawCards', {
    card: 'Two-cost action',
  })
  expect(me(s).actionsRemaining).toBe(2)
  expect(me(s).actionsTaken).toBe(1)
})
it('cannot spend another turn actions to pay a two-action cost outside the actual turn', () => {
  const s = extra(withAsset(open({ turn: null }), 'immediate-cost'))
  expect(options(s)).not.toContain('ability.drawCards')
})
it('accounts for a continuous action grant when paying an additional cost', () => {
  let s = withAsset(withAsset(clear(open()), 'immediate-cost'), '01048')
  s = dispatch({ ...s, activeTurn: null }, { type: 'BeginTurn', investigator: 'a' })
  expect(me(s).actionsRemaining).toBe(4)
  s = dispatch(clear(s), { type: 'TakeImmediateAction', investigator: 'a' })
  s = choose(s, 'ability.drawCards', { card: 'Two-cost action' })
  expect(me(s).actionsRemaining).toBe(3)
  expect(s.turnActionGrants![0]!.remaining).toBe(0)
  s = dispatch(clear(s), { type: 'DiscardAsset', asset: '01048' })
  expect(me(s).actionsRemaining).toBe(3)
})
it('does not restore an actual turn ended by Pay Day during the extra action', () => {
  let s = extra(patch({ hand: [code, '04233'] })(open()))
  s = choose(s, 'action.play', { card: 'Pay Day' })
  expect(s.activeTurn).toBeNull()
  expect(me(s).actionsRemaining).toBe(0)
  expect(me(s).actionsTaken).toBe(1)
  s = dispatch(clear(s), { type: 'PlayerWindow', investigator: 'a' })
  expect(s.pending).toBeNull()
})
it('ignores end-your-turn effects outside the actor actual turn', () => {
  const original = open({ by: 'b' })
  let s = extra(patch({ hand: [code, '04233'] }, 'b')(original), 'b')
  const resources = getInvestigator(s, 'b').resources
  s = choose(s, 'action.play', { card: 'Pay Day' })
  expect(s.activeTurn).toBe('a')
  expect(getInvestigator(s, 'b').resources).toBe(resources + 1)
  expect(getInvestigator(s, 'b').actionsTaken).toBe(4)
  expect(s.phaseStep).toBe(original.phaseStep)
})
it('preserves an actual turn end through nested actions by two investigators', () => {
  let s = patch({ hand: [code, '04233'] })(open())
  s = withAsset(withAsset(s, 'immediate-nest', { id: 'nest-a' }), 'immediate-nest', {
    id: 'nest-b',
    owner: 'b',
  })
  s = extra(s)
  s = choose(s, 'ability.drawCards', { card: 'nest-a' })
  s = choose(s, 'ability.drawCards', { card: 'nest-b' })
  expect(s.immediateActions).toHaveLength(3)
  s = choose(s, 'action.play', { card: 'Pay Day' })
  expect(s.activeTurn).toBeNull()
  expect(me(s).actionsRemaining).toBe(0)
  expect(getInvestigator(s, 'b').actionsRemaining).toBe(3)
  expect(s.immediateActions).toBeUndefined()
})
it('resumes a saved pending action and also preserves legacy frame budgets', () => {
  const s = extra()
  const restored = JSON.parse(JSON.stringify(s)) as GameState
  expect(choose(restored, 'action.resource')).toEqual(choose(s, 'action.resource'))
  const legacy = patch({ actionsRemaining: 0, actionsTaken: 1 })(clear(open()))
  const resumed = dispatch(
    {
      ...legacy,
      skillTest: null,
      immediateActions: [
        { investigator: 'a', activeTurn: 'a', actionsRemaining: 3, actionsTaken: 0 },
      ],
    },
    { type: 'RestoreImmediateAction' },
  )
  expect(me(resumed).actionsRemaining).toBe(3)
  expect(me(resumed).actionsTaken).toBe(0)
})
// RR: Deck Customization. Real catalog, shop and scenario integration.
it('has one catalog/shop entry and enters a legal investigator deck', () => {
  expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
  let c = newCampaign('brethren-of-ash', ['jenny'], 'easy')
  const id = c.investigators[0]!.id
  c.log.investigators[id]!.xp = 5
  expect(purchaseOptions(c, id).filter((o) => o.code === code)).toHaveLength(1)
  c = purchase(c, id, code, { remove: c.investigators[0]!.deck.find(isStandard)! })
  const i = startScenario(c, 3, false).investigators[0]!
  expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
})
