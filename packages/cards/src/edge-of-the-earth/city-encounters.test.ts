import {
  availableAbilities,
  availableActions,
  dispatch,
  getInvestigator,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { newCampaign, startScenario } from '../campaign'
import { campaignDefinition } from '../campaign-definition'
import { cityOfTheElderThings } from './city'
import {
  albinoPenguin,
  benign,
  forgottenShoggoth,
  rampagingShoggoth,
  reawakened,
} from './city-encounters'
import { EOTE_CITY } from './ice-and-death-cards'

// The scenario is not in the campaign selector yet: connect its builder for these tests only.
const definition = campaignDefinition('edge-of-the-earth')
const index = definition.scenarios.findIndex(({ id }) => id === EOTE_CITY)
definition.scenarios[index] = { ...definition.scenarios[index]!, build: cityOfTheElderThings }

/** Version III city with Joe at the top-left landscape, no hand and a fixed bag. */
function city(bag: ChaosToken[] = [0]): GameState {
  const campaign = newCampaign('edge-of-the-earth', ['joe'], 'standard')
  const initial = startScenario({ ...campaign, scenarioIndex: 0 }, 45)
  const log = dispatch(
    { ...initial, pending: null, queue: [] },
    { type: 'InitializeExpedition' },
    ...(['08720', '08721', '08717', '08715', '08722', '08716'] as const).map(
      (partner): Message => ({ type: 'SetExpeditionPartnerStatus', partner, status: 'eliminated' }),
    ),
  ).campaignLog!
  let game = throughSetup(startScenario({ ...campaign, log, scenarioIndex: index }, 75))
  while (game.pending?.question.prompt === 'prompt.edgeOfTheEarth.partner')
    game = throughSetup(choose(game, 'choice.edgeOfTheEarth.noPartner'))
  return {
    ...game,
    pending: null,
    queue: [],
    interactive: false,
    chaosBag: bag,
    investigators: game.investigators.map((player) => ({ ...player, hand: [] as string[] })),
  }
}
const me = (game: GameState) => game.investigators[0]!.id
const here = (game: GameState) => getInvestigator(game, me(game)).location!
const enemyOf = (game: GameState, code: string) =>
  Object.values(game.enemies).find((enemy) => enemy.code === code)!

describe('City of the Elder Things encounter cards', () => {
  it('Benign Elder Thing spawns with doom, puts doom on the agenda when defeated, and parleys', () => {
    // Joe Diamond: willpower 2, +1 from the token against difficulty 3.
    let game = city([1])
    const empty = Object.keys(game.locations).find((id) => id !== here(game))!
    game = dispatch(game, { type: 'SpawnEnemy', card: benign, location: empty, engageWith: null })
    expect(enemyOf(game, '08642').doom).toBe(1)
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({ ...player, location: empty })),
    }
    const parley = availableAbilities(game, me(game)).find(({ key }) => key.endsWith(':parley'))!
    game = dispatch(game, ...parley.then)
    expect(Object.values(game.enemies)).toHaveLength(0)
    expect(game.doom).toBe(0)
    game = dispatch(game, { type: 'SpawnEnemy', card: benign, location: empty, engageWith: null })
    game = dispatch(game, { type: 'DefeatEnemy', enemy: enemyOf(game, '08642').id })
    expect(game.doom).toBe(1)
  })

  it('Reawakened Elder Thing takes a key when it engages you and drops it when defeated', () => {
    let game = city()
    game = {
      ...game,
      investigators: game.investigators.map((player) => ({
        ...player,
        keys: ['skull'] as ChaosToken[],
      })),
    }
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: reawakened,
      location: here(game),
      engageWith: me(game),
    })
    const enemy = enemyOf(game, '08643')
    expect(enemy.keys).toEqual(['skull'])
    expect(getInvestigator(game, me(game)).keys).toEqual([])
    const keysBefore = game.locations[here(game)]!.keys ?? []
    game = dispatch(game, { type: 'DefeatEnemy', enemy: enemy.id })
    expect(game.locations[here(game)]!.keys).toEqual([...keysBefore, 'skull'])
  })

  it('Reawakened Elder Thing readies and attacks whoever takes a key at its location', () => {
    let game = city()
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: reawakened,
      location: here(game),
      engageWith: null,
      entersExhausted: true,
    })
    game = dispatch(game, {
      type: 'PlaceKey',
      key: 0,
      on: { type: 'investigator', id: me(game) },
    })
    const enemy = enemyOf(game, '08643')
    expect(enemy).toMatchObject({ exhausted: false })
    expect(getInvestigator(game, me(game)).damage + getInvestigator(game, me(game)).horror).toBe(2)
  })

  it('Dawning of the Truth: 3 horror when failing by 3 or more', () => {
    let game = city([-8])
    game = dispatch(game, {
      type: 'ResolveEncounterCard',
      investigator: me(game),
      card: { kind: 'treachery', code: '08644', name: 'Dawning of the Truth', keywords: [] },
    })
    expect(getInvestigator(game, me(game)).horror).toBe(3)
  })

  it('Crumbling Ruins fails automatically on a token matching a key here', () => {
    let game = city([0])
    const key = game.locations[here(game)]!.keys![0]!
    game = { ...game, chaosBag: [key] }
    game = dispatch(game, {
      type: 'ResolveEncounterCard',
      investigator: me(game),
      card: { kind: 'treachery', code: '08645', name: 'Crumbling Ruins', keywords: [] },
    })
    expect(getInvestigator(game, me(game)).damage).toBe(3)
  })

  it('Frostbitten stays in the threat area and is healed as 1 damage', () => {
    let game = city()
    game = dispatch(game, { type: 'ResolveWeakness', investigator: me(game), code: '08646' })
    const injury = Object.values(game.treacheries).find(({ code }) => code === '08646')!
    expect(injury.placement).toEqual({ type: 'threatArea', investigator: me(game) })
    game = dispatch(game, { type: 'Heal', investigator: me(game), damage: 1, horror: 0 })
    expect(Object.values(game.treacheries).some(({ code }) => code === '08646')).toBe(false)
    expect(getInvestigator(game, me(game)).discard).toContain('08646')
  })

  it('Giant Albino Penguin makes moving out of its location cost 1 more action', () => {
    const base = city()
    const destination = base.locations[here(base)]!.connections[0]!
    const spent = (state: GameState) => {
      const before = getInvestigator(state, me(state)).actionsRemaining
      const moved = dispatch(state, {
        type: 'TakeAction',
        investigator: me(state),
        action: { kind: 'move', to: destination },
      })
      return before - getInvestigator(moved, me(moved)).actionsRemaining
    }
    expect(availableActions(base, me(base))).toContainEqual({ kind: 'move', to: destination })
    expect(spent(base)).toBe(1)
    const guarded = dispatch(base, {
      type: 'SpawnEnemy',
      card: albinoPenguin,
      location: here(base),
      engageWith: null,
    })
    expect(spent(guarded)).toBe(2)
  })

  it('Wuk! Wuk! Wuk! draws a penguin from the encounter deck when none is in play', () => {
    let game = city()
    const penguins = (state: GameState) =>
      state.encounterDeck.filter(({ code }) => code === '08708').length
    const before = penguins(game)
    game = dispatch(game, {
      type: 'ResolveEncounterCard',
      investigator: me(game),
      card: { kind: 'treachery', code: '08709', name: 'Wuk! Wuk! Wuk!', keywords: [] },
    })
    expect(enemyOf(game, '08708')).toBeDefined()
    expect(penguins(game)).toBe(before - 1)
  })

  it('Shoggoths hand out Tekeli-li weaknesses', () => {
    let game = city()
    // A drawn Tekeli-li resolves and goes back to the bottom of its deck.
    const weaknesses = (state: GameState) =>
      state.log.filter(({ key }) => key === 'log.weakness').length
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: forgottenShoggoth,
      location: here(game),
      engageWith: me(game),
    })
    expect(weaknesses(game)).toBe(1)
    game = dispatch(game, {
      type: 'SpawnEnemy',
      card: rampagingShoggoth(1),
      location: here(game),
      engageWith: null,
      entersExhausted: true,
    })
    const before = getInvestigator(game, me(game)).damage
    game = dispatch(game, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
    expect(getInvestigator(game, me(game)).damage).toBeGreaterThanOrEqual(before + 2)
    expect(weaknesses(game)).toBe(2)
    expect(enemyOf(game, '08710').damageTaken).toBe(0)
  })
})
