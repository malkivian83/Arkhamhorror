import {
  availableAbilities,
  dispatch,
  getInvestigator,
  registerPlayerCards,
  registerScenario,
  type ExpeditionPartner,
  type GameState,
} from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { registerExpeditionCompanions } from './companions'

registerExpeditionCompanions()
registerPlayerCards([
  {
    code: 'test-partner-ally',
    name: 'Test ally',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally'],
    health: 5,
    sanity: 5,
  },
])
registerScenario({ id: 'test-partner-resource-ban', cannotGainResources: () => true })

function start(partner: ExpeditionPartner, resolute: boolean, scenario?: string): GameState {
  const created = newTestGame({
    players: ['a', 'b'],
    ...(scenario ? { scenario: { id: scenario } } : {}),
  })
  const game: GameState = {
    ...created,
    pending: null,
    queue: [],
    phase: 'investigation',
    activeTurn: 'a',
    investigators: created.investigators.map((i) => ({
      ...i,
      location: 'A',
      actionsRemaining: 3,
      resources: 5,
      damage: 0,
      horror: 0,
    })),
  }
  return dispatch(
    game,
    { type: 'InitializeExpedition' },
    ...(resolute
      ? [{ type: 'SetExpeditionPartnerStatus' as const, partner, status: 'resolute' as const }]
      : []),
    { type: 'SelectExpeditionPartner', investigator: 'a', partner },
  )
}

const own = (game: GameState) => Object.values(game.assets).find((a) => a.expeditionPartner)!
const inv = (game: GameState) => getInvestigator(game, 'a')
function use(game: GameState, label: string): GameState {
  const ability = availableAbilities(game, 'a').find(
    (a) => a.label === `ability.edgeOfTheEarth.${label}`,
  )!
  expect(ability).toBeDefined()
  return dispatch(game, {
    type: 'UseAbility',
    investigator: 'a',
    key: ability.key,
    actions: ability.actions,
    provokes: ability.provokes,
    then: ability.then,
    ...(ability.costs ? { costs: ability.costs } : {}),
    ...(ability.actionKind ? { actionKind: ability.actionKind } : {}),
  })
}

// Guide, p. 3, «Partner», and the ability printed on both versions of each card.
describe('Expedition companion abilities', () => {
  it.each([
    ['08714', false, 'horror'],
    ['08714', true, 'horror'],
    ['08717', false, 'damage'],
    ['08717', true, 'damage'],
  ] as const)(
    'heals an investigator or another Ally with %s (resolute %s)',
    (partner, resolute, kind) => {
      let game = start(partner, resolute)
      game = dispatch(game, {
        type: 'PutAssetIntoPlay',
        investigator: 'b',
        code: 'test-partner-ally',
      })
      const ally = Object.values(game.assets).find((a) => a.code === 'test-partner-ally')!.id
      game = {
        ...game,
        assets: {
          ...game.assets,
          [ally]: { ...game.assets[ally]!, [kind]: 3 },
          [own(game).id]: { ...own(game), [kind]: 1 },
        },
        investigators: game.investigators.map((i) => ({ ...i, [kind]: i.id === 'b' ? 3 : 0 })),
      }
      const asked = use(game, kind)
      expect(asked.pending?.question.choices.map((choice) => choice.target)).toEqual([
        { type: 'investigator', id: 'b' },
        { type: 'asset', id: ally },
      ])
      expect(own(asked)).toMatchObject({ exhausted: true, uses: 2, [kind]: 1 })
      expect(inv(asked).actionsRemaining).toBe(resolute ? 3 : 2)
      const healed = choose(
        asked,
        kind === 'damage' ? 'choice.edgeOfTheEarth.healDamage' : 'choice.edgeOfTheEarth.healHorror',
        { name: 'Test ally' },
      )
      expect(healed.assets[ally]?.[kind]).toBe(1)
      expect(getInvestigator(healed, 'b')[kind]).toBe(3)
      const healedInvestigator = choose(
        asked,
        kind === 'damage' ? 'choice.edgeOfTheEarth.healDamage' : 'choice.edgeOfTheEarth.healHorror',
        { name: getInvestigator(asked, 'b').name },
      )
      expect(getInvestigator(healedInvestigator, 'b')[kind]).toBe(1)
    },
  )

  it.each([false, true])(
    'uses Eliyah’s printed base agility and only offers movement on success (resolute %s)',
    (resolute) => {
      let game = start('08716', resolute)
      game = dispatch(game, {
        type: 'SpawnEnemy',
        location: 'A',
        engageWith: 'a',
        card: {
          kind: 'enemy',
          code: 'test-partner-enemy',
          name: 'Test enemy',
          fight: 1,
          evade: 5,
          health: 3,
          damage: 1,
          horror: 0,
          traits: [],
          keywords: [],
        },
      })
      game = { ...game, chaosBag: [-1] }
      if (resolute)
        expect(
          availableAbilities({ ...game, activeTurn: 'b' }, 'a').map((a) => a.label),
        ).not.toContain('ability.edgeOfTheEarth.evade')
      const resolved = use(game, 'evade')
      expect(own(resolved)).toMatchObject({ exhausted: true, uses: 2 })
      expect(inv(resolved).actionsRemaining).toBe(resolute ? 3 : 2)
      expect(Object.values(resolved.enemies)[0]?.exhausted).toBe(resolute)
      expect(resolved.pending?.question.prompt).toBe(resolute ? 'prompt.chooseMove' : undefined)
      if (resolute) expect(inv(choose(resolved, 'choice.skip')).location).toBe('A')
    },
  )

  it.each([
    [false, undefined, 7],
    [true, undefined, 8],
    [true, 'test-partner-resource-ban', 7],
  ] as const)(
    'moves resources without treating the move as a gain (resolute %s, scenario %s)',
    (resolute, scenario, resources) => {
      const asked = use(start('08722', resolute, scenario), 'resources')
      expect(asked.pending?.question.choices.map((choice) => choice.params?.amount)).toEqual([
        0, 1, 2, 3,
      ])
      const moved = choose(asked, 'choice.edgeOfTheEarth.takeResources', { amount: 2 })
      expect(own(moved)).toMatchObject({ exhausted: true, uses: 7 })
      expect(inv(moved)).toMatchObject({ resources, actionsRemaining: 2 })
    },
  )
})
