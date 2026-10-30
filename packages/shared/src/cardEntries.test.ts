import { expect, it } from 'vitest'
import { applyInput, registerPlayerCards, type GameState, type Message } from '@lcg/engine'
import { newTestGame, throughSetup, ghoul, spawnAt } from '@lcg/engine/testing'
import { createCardEntries } from './cardEntries'

registerPlayerCards([
  {
    code: 'entry-ally',
    name: 'Entry Ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    health: 2,
    sanity: 2,
  },
])
function resolve(messages: Message[], initial = throughSetup(newTestGame())) {
  const start: GameState = {
    ...initial,
    queue: [],
    pending: {
      investigator: 'a',
      question: { kind: 'chooseOne', prompt: 'test', choices: [{ label: 'test', then: messages }] },
    },
  }
  const collector = createCardEntries()
  const state = applyInput(start, { investigator: 'a', choice: 0 }, collector.observe)
  return { state, cards: collector.finish() }
}
// RR Enter Play: direct effects are entries too; cards already in play only move/control.
it('captures direct enemies, assets, placed allies and stories in execution order', () => {
  const { cards } = resolve([
    spawnAt('A', ghoul),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: 'entry-ally' },
    {
      type: 'PlaceAsset',
      code: 'entry-ally',
      name: 'Placed Ally',
      placement: { type: 'location', location: 'B' },
    },
    { type: 'PutStoryIntoPlay', code: 'story-entry', name: 'Story Entry' },
  ])
  expect(cards.map((c) => c.code)).toEqual([
    'test-ghoul',
    'entry-ally',
    'entry-ally',
    'story-entry',
  ])
  expect(cards.map((c) => c.target?.split(':')[0])).toEqual(['enemy', 'asset', 'placed', 'story'])
})
it('merges a drawn enemy with its exact destination instead of showing it twice', () => {
  const { cards } = resolve([
    { type: 'Log', key: 'log.encounter', params: { name: 'A', card: 'Ghoul', code: ghoul.code } },
    spawnAt('A', ghoul),
  ])
  expect(cards).toHaveLength(1)
  expect(cards[0]).toMatchObject({
    reason: 'draw',
    code: ghoul.code,
    target: expect.stringMatching(/^enemy:/),
  })
})
it('retains cards that enter and leave in the same command', () => {
  const first = resolve([spawnAt('B', ghoul)])
  const enemy = Object.values(first.state.enemies)[0]!
  const result = resolve(
    [
      spawnAt('C', { ...ghoul, code: 'temporary' }),
      { type: 'RemoveEnemyFromGame', enemy: enemy.id },
    ],
    first.state,
  )
  expect(result.cards.some((c) => c.code === 'temporary')).toBe(true)
  const s = throughSetup(newTestGame()),
    collector = createCardEntries()
  collector.observe(
    s,
    { type: 'Log', key: 'test' },
    {
      ...s,
      assets: {
        temp: {
          id: 'temp',
          code: 'entry-ally',
          owner: 'a',
          exhausted: false,
          uses: 0,
          damage: 0,
          horror: 0,
        },
      },
    },
  )
  const after = {
    ...s,
    assets: {
      temp: {
        id: 'temp',
        code: 'entry-ally',
        owner: 'a',
        exhausted: false,
        uses: 0,
        damage: 0,
        horror: 0,
      },
    },
  }
  collector.observe(after, { type: 'Log', key: 'test' }, s)
  expect(collector.finish()).toEqual([
    expect.objectContaining({ code: 'entry-ally', target: 'asset:temp' }),
  ])
})
it('keeps face-down identities hidden and presents their revealed face', () => {
  const first = resolve([
    {
      type: 'PlaceAsset',
      code: 'entry-ally',
      name: 'Secret',
      faceDown: true,
      placement: { type: 'location', location: 'A' },
    },
  ])
  expect(first.cards).toEqual([])
  const placed = Object.values(first.state.placedAssets!)[0]!
  const flipped = resolve([{ type: 'FlipPlacedAsset', placed: placed.id }], first.state)
  expect(flipped.cards).toEqual([
    expect.objectContaining({ reason: 'reveal', code: 'entry-ally', from: 'player' }),
  ])
})
it('does not present taking control of an already revealed ally as another entry', () => {
  const first = resolve([
    {
      type: 'PlaceAsset',
      code: 'entry-ally',
      name: 'Ally',
      placement: { type: 'location', location: 'A' },
    },
  ])
  const placed = Object.values(first.state.placedAssets!)[0]!
  const result = resolve(
    [{ type: 'TakeControlOfPlaced', placed: placed.id, investigator: 'a', noSlot: true }],
    first.state,
  )
  expect(Object.values(result.state.assets).some((a) => a.code === 'entry-ally')).toBe(true)
  expect(result.cards).toEqual([])
})
it('shows revealing a location using the visible face and preserves unknown backs', () => {
  const s = throughSetup(newTestGame()),
    collector = createCardEntries()
  const hidden = {
    ...s,
    locations: {
      ...s.locations,
      '01111': {
        ...s.locations.A!,
        id: '01111',
        name: 'Secret front',
        unrevealedName: 'Visible back',
        revealed: false,
      },
    },
  }
  collector.observe(s, { type: 'Log', key: 'test' }, hidden)
  expect(collector.finish()[0]).toMatchObject({ code: '01111', name: 'Visible back', back: true })
  collector.observe(
    hidden,
    { type: 'RevealLocation', location: '01111' },
    {
      ...hidden,
      locations: { ...hidden.locations, '01111': { ...hidden.locations['01111'], revealed: true } },
    },
  )
  expect(collector.finish()[1]).toMatchObject({
    name: 'Secret front',
    reason: 'reveal',
    back: false,
  })
})
