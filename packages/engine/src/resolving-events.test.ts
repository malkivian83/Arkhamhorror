// RR: Event cards are in limbo during resolution, Cannot, Discard Piles, Physical Copies.
import { expect, it } from 'vitest'
import { dispatch } from './engine'
import { registerEnemy, registerPlayerCard, registerPlayerCards } from './content'
import { actualDiscard } from './state'
import { choose, ghoul, newTestGame, spawnAt, throughSetup } from './testing'

registerEnemy({ code: 'limbo-lock', locksEngagedDiscard: true })
registerPlayerCards(
  [
    'limbo-attach',
    'limbo-recover',
    'limbo-remove',
    'limbo-parent',
    'limbo-child',
    'limbo-copy',
    'limbo-return',
  ].map((code) => ({
    code,
    name: code,
    type: 'event',
    class: 'neutral',
    cost: 0,
    traits: [],
  })),
)
registerPlayerCard({
  code: 'limbo-attach',
  play: (_s, by) => [
    { type: 'AttachEventToLocation', investigator: by, code: 'limbo-attach', location: 'A' },
  ],
})
registerPlayerCard({
  code: 'limbo-recover',
  play: (_s, by) =>
    Array.from({ length: 2 }, () => ({
      type: 'DiscardToHand',
      investigator: by,
      code: 'limbo-recover',
    })),
})
registerPlayerCard({
  code: 'limbo-remove',
  play: (_s, by) =>
    Array.from({ length: 2 }, () => ({
      type: 'RemoveFromDiscard',
      investigator: by,
      code: 'limbo-remove',
      playedEvent: true,
    })),
})
registerPlayerCard({
  code: 'limbo-child',
  play: (_s, by) => [
    { type: 'RemoveFromDiscard', investigator: by, code: 'limbo-child', playedEvent: true },
  ],
})
registerPlayerCard({ code: 'limbo-copy', copyEvents: () => ['limbo-return'] })
registerPlayerCard({
  code: 'limbo-return',
  play: (_s, by) => [
    { type: 'DiscardToHand', investigator: by, code: 'limbo-return', playedEvent: true },
  ],
})
registerPlayerCard({
  code: 'limbo-parent',
  play: (_s, by) => [
    {
      type: 'Ask',
      investigator: by,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.pilotTarget',
        alwaysAsk: true,
        choices: [
          {
            label: 'choice.continue',
            then: [
              { type: 'PlayCard', investigator: by, code: 'limbo-child', byEffect: true },
              {
                type: 'RemoveFromDiscard',
                investigator: by,
                code: 'limbo-parent',
                playedEvent: true,
              },
            ],
          },
        ],
      },
    },
  ],
})
function game(code: string, locked: boolean) {
  const s = throughSetup(newTestGame())
  const ready = {
    ...s,
    pending: null,
    queue: [],
    investigators: s.investigators.map((i) => ({ ...i, discard: [code], hand: [code] })),
  }
  return locked ? dispatch(ready, spawnAt('A', { ...ghoul, code: 'limbo-lock' }, 'a')) : ready
}

it('permits attaching the resolving source through a discard lock, preserving an older copy', () => {
  const s = dispatch(game('limbo-attach', true), {
    type: 'PlayCard',
    investigator: 'a',
    code: 'limbo-attach',
    byEffect: true,
  })
  expect(s.investigators[0]!.discard).toEqual(['limbo-attach'])
  expect(Object.values(s.locationAttachments ?? {}).map((a) => a.code)).toEqual(['limbo-attach'])
  expect(s.resolvingPlayerEvents).toBeUndefined()
})

it('does not let a second source removal consume an older locked copy', () => {
  const s = dispatch(game('limbo-remove', true), {
    type: 'PlayCard',
    investigator: 'a',
    code: 'limbo-remove',
    byEffect: true,
  })
  expect(s.investigators[0]!.discard).toEqual(['limbo-remove'])
  expect(s.resolvingPlayerEvents).toBeUndefined()
})

it('recovers only an older physical copy, never the event still resolving', () => {
  const s = dispatch(game('limbo-recover', false), {
    type: 'PlayCard',
    investigator: 'a',
    code: 'limbo-recover',
    byEffect: true,
  })
  expect(s.investigators[0]!.hand).toEqual(['limbo-recover'])
  expect(actualDiscard(s, 'a')).toEqual(['limbo-recover'])
})

it('keeps nested event sources distinct and survives a saved choice state', () => {
  const initial = game('limbo-parent', true)
  const s = {
    ...initial,
    investigators: initial.investigators.map((i) => ({
      ...i,
      hand: ['limbo-parent', 'limbo-child'],
      discard: ['limbo-parent', 'limbo-child'],
    })),
  }
  const play = {
    type: 'PlayCard' as const,
    investigator: 'a',
    code: 'limbo-parent',
    byEffect: true,
  }
  const pending = dispatch(s, play)
  expect(pending.resolvingPlayerEvents).toHaveLength(1)
  const result = choose(pending, 'choice.continue')
  expect(result.investigators[0]!.discard).toEqual(['limbo-parent', 'limbo-child'])
  expect(result.investigators[0]!.hand).toEqual([])
  expect(result.resolvingPlayerEvents).toBeUndefined()
  expect(choose(JSON.parse(JSON.stringify(pending)), 'choice.continue')).toEqual(result)
})

it('returns the physical copied event without recovering an older locked original', () => {
  const initial = game('limbo-copy', true)
  const s = {
    ...initial,
    investigators: initial.investigators.map((i) => ({ ...i, discard: ['limbo-return'] })),
  }
  const result = dispatch(s, {
    type: 'PlayCard',
    investigator: 'a',
    code: 'limbo-copy',
    copyAs: 'limbo-return',
    byEffect: true,
  })
  expect(result.investigators[0]!.hand).toEqual(['limbo-copy'])
  expect(result.investigators[0]!.discard).toEqual(['limbo-return'])
})
