// RR: Discard from Hand, Reactions, Uses, Your Turn, Costs.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  registerScenario,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { game, patch, withAsset, me } from '../dunwich-pilot/testing'
import './index'
import { open, commit, resolve } from '../skill-tricks/testing'
const start = () =>
  withAsset(
    withAsset(
      patch({ hand: ['01088', '01089', '01090'], resources: 5 })({
        ...game(['a', 'b']),
        pending: null,
        queue: [],
      }),
      '11083',
    ),
    '11089',
  )
const discard = (s: GameState) =>
  dispatch(s, { type: 'DiscardFromHand', investigator: 'a', card: '01088' })
it('discarding from hand offers both exhausted-cost reactions once and cashes all supplies even exhausted', () => {
  let s = discard(start())
  s = choose(s, 'ability.gainResource', { card: 'Lawrence Carlisle' })
  s = choose(s, 'choice.chargedCharge', { card: 'Ample Supplies' })
  expect(me(s).resources).toBe(6)
  expect(s.assets['11089']).toMatchObject({ uses: 3, exhausted: true })
  const a = s.assets['11089']!,
    ability = playerCardBehavior(a.code)!.abilities!(s, a, 'a')[0]!
  s = dispatch({ ...s, pending: null, queue: [] }, ...(ability.costs ?? []), ...ability.then)
  expect(me(s).resources).toBe(9)
  expect(s.assets['11089']).toBeUndefined()
})
it('Lawrence only reacts during his controller’s turn; Ample Supplies works outside it', () => {
  const s = discard({ ...start(), activeTurn: 'b' })
  expect(s.pending!.question.choices.some((c) => c.label === 'ability.gainResource')).toBe(false)
  expect(s.pending!.question.choices.some((c) => c.label === 'choice.chargedCharge')).toBe(true)
})
it('other investigators discarding and absent cards never offer the reactions', () => {
  const s = start()
  for (const m of [
    { type: 'DiscardFromHand', investigator: 'b', card: '01088' },
    { type: 'DiscardFromHand', investigator: 'a', card: 'absent' },
  ] as Message[]) {
    const next = dispatch(s, m)
    expect(next.pending).toBeNull()
    expect(next.assets['11089']!.uses).toBe(2)
  }
})
it.each(['choose', 'random', 'type', 'size'])(
  '%s batch produces one complete discard notification, preserving duplicate copies',
  (kind) => {
    const seen: string[][] = []
    registerScenario({
      id: 'discard-batch-' + kind,
      forced: (_s, t) => {
        if (t.type === 'afterHandDiscard') seen.push(t.cards)
        return []
      },
    })
    let s: GameState = {
      ...patch({ hand: kind === 'size' ? Array(10).fill('01088') : ['01088', '01088', '01089'] })(
        start(),
      ),
      scenarioId: 'discard-batch-' + kind,
    }
    s = dispatch(
      s,
      kind === 'choose'
        ? { type: 'ChooseDiscardFromHand', investigator: 'a', amount: 2 }
        : kind === 'random'
          ? { type: 'DiscardRandomFromHand', investigator: 'a', amount: 9 }
          : kind === 'type'
            ? { type: 'DiscardCardsOfType', investigator: 'a', cardType: 'event', all: true }
            : { type: 'CheckHandSize', investigator: 'a' },
    )
    while (s.pending?.question.choices.some((c) => c.label === 'choice.discard'))
      s = choose(s, 'choice.discard', { card: '01088' })
    expect(seen).toHaveLength(1)
    expect(seen[0]!.length).toBe(kind === 'random' ? 3 : 2)
    expect(seen[0]!.filter((c) => c === '01088').length).toBe(2)
  },
)
it('playing an event and discarding a resolved committed skill do not count as hand discards', () => {
  let s = patch({ hand: ['01088', '03239'] })(start())
  s = dispatch(s, { type: 'PlayCard', investigator: 'a', code: '03239' })
  expect(s.assets['11083']!.exhausted).toBe(false)
  expect(s.assets['11089']!.exhausted).toBe(false)
  s = resolve(commit(withAsset(withAsset(open('combat', ['01093']), '11083'), '11089'), '01093'))
  expect(s.assets['11083']!.exhausted).toBe(false)
  expect(s.assets['11089']!.exhausted).toBe(false)
})
