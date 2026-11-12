// RR: Mythos phase 1.4, Replacement Effects, Additional Costs, Seal.
import { expect, it } from 'vitest'
import {
  createGame,
  dispatch,
  getInvestigator,
  playerCardBehavior,
  type ChaosToken,
  type EncounterCard,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { withAsset } from '../dunwich-pilot/testing'
import { cardName } from '../dunwich-pilot/effects'
import '../sealed-tokens/index'
import './index'

const code = '07269'
const enemies: EncounterCard[] = [0, 1, 2].map((n) => ({ ...ghoul, code: 'peace-enemy-' + n }))
function game(bless = 5, players = 2): GameState {
  const initial = throughSetup(
    createGame({
      seed: 6,
      scenario: testScenario(),
      investigators: Array.from({ length: players }, (_, n) => testInvestigator(String(n))),
      interactive: true,
    }),
  )
  return {
    ...initial,
    pending: null,
    queue: [],
    phase: 'mythos',
    encounterDeck: enemies,
    encounterDiscard: [],
    chaosBag: [0, ...Array<ChaosToken>(bless).fill('bless')],
    investigators: initial.investigators.map((i) => ({ ...i, hand: [code], resources: 5 })),
  }
}
const begin = (s: GameState) => dispatch(s, { type: 'BeginMythosEncounterStep' })
const play = (s: GameState) => choose(s, 'ability.playCard', { card: cardName(code) })

it.each([1, 2, 3])(
  'skips only the draw step for %i investigators and pays five blessings',
  (players) => {
    const initial = game(6, players)
    const s = play(begin(initial))
    expect(s.pending).toBeNull()
    expect(s.encounterDeck).toEqual(enemies)
    expect(Object.keys(s.enemies)).toHaveLength(0)
    expect(s.chaosBag).toEqual([0, 'bless'])
    expect(getInvestigator(s, '0')).toMatchObject({ resources: 4, discard: [code] })
    expect(s.investigators.every((i) => i.drewEnemyRound !== s.round)).toBe(true)
  },
)

it('does not offer the event with only four blessings or outside the replacement window', () => {
  const initial = game(4)
  expect(
    playerCardBehavior(code)!.handReactions!(
      initial,
      { type: 'whenMythosEncounterStepBegins' },
      '0',
    ),
  ).toEqual([])
  const s = begin(initial)
  expect(Object.keys(s.enemies)).toHaveLength(2)
  expect(s.chaosBag).toHaveLength(5)
  expect(getInvestigator(s, '0').hand).toEqual([code])
  expect(playerCardBehavior(code)!.canPlay!(game(), '0')).toBe(false)
})

it('can decline the event and draws normally without spending anything', () => {
  let s = begin(game())
  while (s.pending) s = choose(s, 'choice.skip')
  expect(Object.keys(s.enemies)).toHaveLength(2)
  expect(s.chaosBag).toHaveLength(6)
})

it('pays from the bag and sealed cards controlled by another investigator', () => {
  let initial = withAsset(game(4), '07221', { owner: '1' })
  const asset = initial.assets['07221']!
  initial = {
    ...initial,
    sealed: [
      {
        token: 'bless',
        code: asset.code,
        investigator: '1',
        holder: { type: 'asset', id: asset.id },
      },
    ],
  }
  let s = play(begin(initial))
  expect(s.pending?.investigator).toBe('0')
  s = choose(s, 'choice.hallowBlessFromCard', { card: cardName('07221') })
  expect(s.sealed).toEqual([])
  expect(s.assets[asset.id]).toBeUndefined()
  expect(getInvestigator(s, '1').discard).toContain('07221')
  expect(s.chaosBag).toEqual([0])
  expect(s.encounterDeck).toEqual(enemies)
})

it('cannot count tokens held on absent cards or a pending Premonition', () => {
  const initial = game(4)
  const s: GameState = {
    ...initial,
    sealed: [
      {
        token: 'bless',
        code: 'missing',
        investigator: '0',
        holder: { type: 'asset', id: 'missing' },
      },
      { token: 'bless', code: '04199', investigator: '0' },
    ],
  }
  expect(
    playerCardBehavior(code)!.handReactions!(
      { ...s, queue: [{ type: 'MythosEncounterStep' }] },
      { type: 'whenMythosEncounterStepBegins' },
      '0',
    ),
  ).toEqual([])
})

it('preserves doom and the end of Mythos and does not skip the next Mythos', () => {
  let s = play(dispatch(game(), { type: 'MythosPhase' }))
  expect(s.doom).toBe(1)
  expect(s.phaseStep).toBe('mythosEnds')
  expect(s.encounterDeck).toEqual(enemies)
  s = dispatch({ ...s, pending: null, queue: [] }, { type: 'MythosPhase' })
  expect(s.doom).toBe(2)
  expect(Object.keys(s.enemies)).toHaveLength(2)
})

it('round-trips the pending replacement window through JSON', () => {
  const s = play(JSON.parse(JSON.stringify(begin(game()))) as GameState)
  expect(s.encounterDeck).toEqual(enemies)
  expect(s.queue.some((m) => m.type === 'MythosEncounterStep')).toBe(false)
})
