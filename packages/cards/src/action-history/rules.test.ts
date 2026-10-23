import {
  allPlayerCardDefs,
  canCommitFrom,
  dispatch,
  playerCardDef,
  skillTestValue,
  type Action,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { holding } from '../basic-events/testing'
import { resolve } from '../basic-abilities/testing'
import { me, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import './index'

const code = '04150'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
function setup(enemy = false): GameState {
  const s = holding(code, { players: ['a', 'b'], ...(enemy ? {} : { enemy: null }) })
  return {
    ...s,
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: [code],
      actionsRemaining: 10,
      deck: ['01048', '01044'],
    })),
    enemies: Object.fromEntries(
      Object.entries(s.enemies).map(([id, e]) => [id, { ...e, health: 100 }]),
    ),
  }
}
const act = (s: GameState, action: Action = { kind: 'resource' }, by = 'a') =>
  dispatch(clear({ ...s, activeTurn: by }), { type: 'TakeAction', investigator: by, action })
const begin = (s: GameState) =>
  dispatch(clear(s), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty: 0,
    kind: { type: 'effect', source: 'initiative-test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const commit = (s: GameState) => choose(s, 'choice.commit', { card: 'Take the Initiative' })
const preview = (s: GameState) =>
  s.pending!.question.choices.find((c) => c.label === 'choice.commit')?.params?.icons

// RR: Actions, Commit Cards. Count completed actions by everyone this phase,
// not actions paid, not only the committer's turn and not the current action.
it.each([0, 1, 2, 3, 5])('loses icons after %s completed actions in this phase', (count) => {
  let s = setup()
  for (let n = 0; n < count; n++) s = act(s, { kind: 'resource' }, n % 2 ? 'b' : 'a')
  s = begin(s)
  const icons = Math.max(0, 3 - count)
  expect(canCommitFrom(s, 'a', code)).toBe(icons > 0)
  if (icons) {
    expect(preview(s)).toBe(icons)
    expect(skillTestValue(commit(s)).icons).toBe(icons)
  }
})
it('cannot help another investigator even with matching icons', () => {
  const s = begin(setup())
  expect(canCommitFrom(s, 'b', code)).toBe(false)
  const next = dispatch(clear(s), { type: 'CommitCard', investigator: 'b', code })
  expect(next.skillTest!.committed).toEqual([])
})
it('keeps all three icons during the first action until its test has finished', () => {
  let s = act(setup(), { kind: 'investigate' })
  expect(me(s).actionsTaken).toBe(1)
  expect(me(s).completedActions).toBeUndefined()
  expect(preview(s)).toBe(3)
  s = resolve(commit(s))
  expect(me(s).completedActions).toEqual({ phase: s.phase, round: s.round, count: 1 })
})
it('also completes an action when its test fails automatically', () => {
  const s = resolve(act(setup(), { kind: 'investigate' }), 'autoFail')
  expect(me(s).completedActions!.count).toBe(1)
})
it.each(['phase', 'round'] as const)(
  'does not carry completed actions into another %s',
  (boundary) => {
    let s = act(act(act(setup())))
    s = boundary === 'phase' ? { ...s, phase: 'enemy' } : { ...s, round: s.round + 1 }
    expect(preview(begin(s))).toBe(3)
  },
)
it('includes actions of an investigator eliminated later in the phase', () => {
  let s = act(act(setup()), { kind: 'resource' }, 'b')
  s = patch({ eliminated: true, location: null }, 'b')(s)
  expect(preview(begin(s))).toBe(1)
})
it.each([0, 2])(
  'counts an ability costing %s actions once only when it is an action ability',
  (actions) => {
    let s = dispatch(clear(setup()), {
      type: 'UseAbility',
      investigator: 'a',
      key: 'initiative-ability',
      actions,
      provokes: false,
      then: [{ type: 'GainResources', investigator: 'a', amount: 1 }],
    })
    expect(me(s).actionsRemaining).toBe(10 - actions)
    s = begin(s)
    expect(preview(s)).toBe(actions ? 2 : 3)
  },
)
it.each(['draw', 'move', 'play'] as const)('completes a basic %s action', (kind) => {
  const action: Action =
    kind === 'move' ? { kind, to: 'B' } : kind === 'play' ? { kind, card: '01048' } : { kind }
  const s = act(patch({ hand: [code, '01048'] })(setup()), action)
  expect(me(s).completedActions!.count).toBe(1)
})
it('does not count a fast card play as an action', () => {
  const s = dispatch(clear(patch({ hand: [code, '01030'] })(setup())), {
    type: 'PlayCard',
    investigator: 'a',
    code: '01030',
  })
  expect(me(s).completedActions).toBeUndefined()
})
it('counts an immediate action without depending on the restored turn counters', () => {
  let s = dispatch(clear({ ...setup(), activeTurn: 'b' }), {
    type: 'TakeImmediateAction',
    investigator: 'a',
  })
  s = choose(s, 'action.resource')
  expect(s.activeTurn).toBe('b')
  expect(me(s).completedActions!.count).toBe(1)
  expect(me(s).actionsTaken ?? 0).toBe(0)
  expect(preview(begin(s))).toBe(2)
})
it('counts One-Two Punch once after both attacks, keeping the current action out of its tests', () => {
  let s = act(patch({ hand: [code, '60117'] })(setup(true)), { kind: 'play', card: '60117' })
  expect(preview(s)).toBe(3)
  expect(me(s).completedActions).toBeUndefined()
  s = choose(resolve(s), 'choice.fightAgain')
  expect(preview(s)).toBe(3)
  s = resolve(commit(s))
  expect(me(s).completedActions!.count).toBe(1)
  expect(me(s).successfulAttacks!.count).toBe(2)
})
it('restores the pending completion from JSON after a test', () => {
  let s = act(setup(), { kind: 'investigate' })
  expect(s.queue.some((m) => m.type === 'CompleteAction')).toBe(true)
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = resolve(commit(s))
  expect(me(s).completedActions!.count).toBe(1)
})
it('does not apply a late completion to another phase', () => {
  const s = setup()
  const message: Message = {
    type: 'CompleteAction',
    investigator: 'a',
    phase: 'enemy',
    round: s.round,
  }
  expect(me(dispatch(clear(s), message)).completedActions).toBeUndefined()
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
  expect(playerCardDef(code)!.icons).toEqual({ wild: 3 })
})
