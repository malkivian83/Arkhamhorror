import {
  availableAbilities,
  availableActions,
  getInvestigator,
  playableCards,
  totalDoom,
  type EncounterCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { CODES } from './curtain-call'
import { ENCOUNTER_SETS, SETS } from './encounter-sets'
import {
  ability,
  applyFirst,
  game,
  placeAt,
  prep,
  putInPlay,
  resolveTest,
  update,
  withBag,
} from './testing'

const ALL = Object.values(ENCOUNTER_SETS).flat()
const cardOf = (code: string): EncounterCard => ({ ...ALL.find((c) => c.code === code)! })
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: cardOf(code),
})
const treacheryOf = (state: GameState, code: string) =>
  Object.values(state.treacheries).find((t) => t.code === code)
const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
/** Un evento y un apoyo de jugador registrados, para las restricciones de juego. */
const EVENT = '12043' // Unbridled Knowledge (coste 1)
const ASSET = '12115' // Dr. Henry Armitage (coste 3)

// Guía de El camino a Carcosa p. 2, "Nueva palabra clave: Oculto"; Delirios.
describe('Delusions: Whispers in Your Head (hidden)', () => {
  it('goes secretly to the hand: counts as in the threat area, only its owner sees its ability', () => {
    let state = during(game(2), keep, draw(SETS.whispersDoubt))
    const whispers = treacheryOf(state, SETS.whispersDoubt)!
    expect(whispers).toMatchObject({
      hidden: true,
      placement: { type: 'threatArea', investigator: 'a' },
    })
    expect(state.encounterDiscard.some((c) => c.code === SETS.whispersDoubt)).toBe(false)
    expect(ability(state, ':discard').actions).toBe(2)
    expect(availableAbilities(state, 'b').some((a) => a.key.startsWith(whispers.id))).toBe(false)
    // Solo la propia carta la descarta; descartes al azar o de otros efectos no la tocan.
    state = during(
      state,
      keep,
      { type: 'DiscardRandomFromHand', investigator: 'a', amount: 5 },
      { type: 'DiscardTreachery', treachery: whispers.id },
    )
    expect(state.treacheries[whispers.id]).toBeDefined()
    state = during(state, keep, ...ability(state, ':discard').then)
    expect(state.treacheries[whispers.id]).toBeUndefined()
    expect(state.encounterDiscard.some((c) => c.code === SETS.whispersDoubt)).toBe(true)
  })

  it('Doubt: you cannot play events', () => {
    let state = prep(game(), [update('a', { hand: [EVENT], resources: 5 })])
    const before = playableCards(state, 'a', false)
    state = during(state, keep, draw(SETS.whispersDoubt))
    expect(playableCards(state, 'a', false)).toEqual(before.filter((c) => c !== EVENT))
  })

  it('Dread: you cannot move more than once each turn', () => {
    let state = prep(game(), [putInPlay(CODES.lobby, CODES.balcony)], draw(SETS.whispersDread))
    expect(availableActions(state, 'a').some((a) => a.kind === 'move')).toBe(true)
    state = choose(state, 'action.move', { location: 'Lobby' })
    expect(availableActions(state, 'a').some((a) => a.kind === 'move')).toBe(false)
    state = during(state, keep, { type: 'MoveTo', investigator: 'a', location: CODES.balcony })
    expect(getInvestigator(state, 'a').location).toBe(CODES.lobby)
  })

  it('Anxiety: you cannot trigger fast abilities', () => {
    let state = prep(game(), [putInPlay(CODES.boxOffice), placeAt(CODES.boxOffice)])
    const fast = (s: GameState) => availableAbilities(s, 'a').filter((a) => a.actions === 0).length
    state = during(state, keep, {
      type: 'PlaceLocationTokens',
      location: CODES.boxOffice,
      doom: 0,
    })
    state = during(state, keep, draw(SETS.whispersAnxiety))
    expect(fast(state)).toBe(0)
    expect(availableAbilities(state, 'a').some((a) => a.actions > 0)).toBe(true)
  })

  it('Dismay: you cannot commit skill cards to skill tests', () => {
    const SKILL = '12039' // Deduction ([intellect])
    let state = prep(
      game(),
      [update('a', { hand: [SKILL] }), withBag(0)],
      draw(SETS.whispersDismay),
    )
    state = choose(state, 'action.investigate', { location: 'Theatre' })
    expect(labels(state)).not.toContain('choice.commit')
  })

  it('Descent into Madness: with 3+ horror you lose 1 action', () => {
    // La oleada roba una carta que no cambia las acciones.
    const empty = (s: GameState): GameState => ({
      ...s,
      encounterDeck: [cardOf(SETS.spiritsTorment)],
      encounterDiscard: [],
    })
    let state = prep(game(), [empty], draw(SETS.descentIntoMadness))
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(3)
    state = prep(state, [empty, update('a', { horror: 3 })], draw(SETS.descentIntoMadness))
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(2)
    expect(cardOf(SETS.descentIntoMadness).keywords).toContain('surge')
  })
})

describe('Evil Portents', () => {
  it.each([
    ['choice.placeDoom', 1, 0],
    ['choice.horrorPerPointFailed', 0, 3],
  ])('Black Stars Rise: failing by 3 lets you choose %s', (choice, doom, horror) => {
    let state = prep(game(), [withBag(-2)], draw(SETS.blackStarsRise))
    state = resolveTest(state)
    state = choose(state, choice)
    expect(state.doom).toBe(doom)
    expect(getInvestigator(state, 'a').horror).toBe(horror)
  })

  it('Spires of Carcosa: 2 doom on your location count for the agenda; investigating removes it', () => {
    let state = prep(game(), [withBag(0)], draw(SETS.spiresOfCarcosa))
    const spires = treacheryOf(state, SETS.spiresOfCarcosa)!
    expect(spires.placement).toEqual({ type: 'location', location: CODES.theatre })
    expect(state.locations[CODES.theatre]!.doom).toBe(2)
    expect(totalDoom(state)).toBe(2)
    for (const remaining of [1, 0]) {
      state = during(state, keep, ...ability(state, ':investigate').then)
      state = resolveTest(state)
      expect(state.locations[CODES.theatre]!.doom).toBe(remaining)
      expect(getInvestigator(state, 'a').clues).toBe(0)
    }
    expect(state.treacheries[spires.id]).toBeUndefined()
  })

  it('Spires of Carcosa is discarded when the agenda advances and removes the doom', () => {
    let state = during(game(), keep, draw(SETS.spiresOfCarcosa))
    state = during(state, keep, { type: 'PlaceDoom', amount: 4 }, { type: 'CheckAgenda' })
    expect(state.agendaIndex).toBe(1)
    expect(state.locations[CODES.theatre]!.doom ?? 0).toBe(0)
    expect(treacheryOf(state, SETS.spiresOfCarcosa)).toBeUndefined()
  })

  it('Twisted to His Will: surge without doom; otherwise willpower (doom in play)', () => {
    let state = during(game(), keep, draw(SETS.twistedToHisWill))
    expect(state.skillTest).toBeNull()
    state = prep(
      state,
      [withBag(-2)],
      { type: 'PlaceDoom', amount: 2 },
      draw(SETS.twistedToHisWill),
    )
    expect(state.skillTest?.difficulty).toBe(2)
    const hand = getInvestigator(state, 'a').hand.length
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand - 2)
  })
})

describe('Hauntings', () => {
  it('Poltergeist ignores attack damage; banishing it by parley deals encounter damage', () => {
    let state = prep(game(), [withBag(0)], draw(SETS.poltergeist))
    const geist = enemyOf(state, SETS.poltergeist)!
    expect(geist.engagedWith).toBe('a')
    state = during(state, keep, {
      type: 'DamageEnemy',
      enemy: geist.id,
      amount: 3,
      by: 'a',
      source: { attack: true },
    })
    expect(state.enemies[geist.id]!.damageTaken).toBe(0)
    state = during(state, keep, ...ability(state, ':parley').then)
    expect(state.skillTest?.difficulty).toBe(3)
    state = resolveTest(state)
    expect(state.enemies[geist.id]!.damageTaken).toBe(1)
    state = during(state, keep, {
      type: 'DamageEnemy',
      enemy: geist.id,
      amount: 1,
      source: { traits: ['Spell'] },
    })
    expect(state.enemies[geist.id]).toBeUndefined()
  })

  it("Spirit's Torment: leaving costs 1 horror or 1 action; a clue discards it", () => {
    let state = prep(game(), [putInPlay(CODES.lobby)], draw(SETS.spiritsTorment))
    const torment = treacheryOf(state, SETS.spiritsTorment)!
    expect(torment.placement).toEqual({ type: 'location', location: CODES.theatre })
    expect(availableAbilities(state, 'a').some((a) => a.key.startsWith(torment.id))).toBe(false)
    state = choose(state, 'action.move', { location: 'Lobby' })
    expect(labels(state)).toEqual(['choice.takeHorror', 'choice.loseAction'])
    state = choose(state, 'choice.loseAction')
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(1)
    state = prep(state, [placeAt(CODES.theatre), update('a', { clues: 1 })])
    state = during(
      state,
      keep,
      ...(ability(state, ':discard').costs ?? []),
      ...ability(state, ':discard').then,
    )
    expect(state.treacheries[torment.id]).toBeUndefined()
    expect(state.locations[CODES.theatre]!.clues).toBe(1)
  })
})

describe('Cult of the Yellow Sign', () => {
  it('Fanatic spawns at the revealed location with most clues, takes one, and yields them on defeat', () => {
    let state = prep(
      game(),
      [
        putInPlay(CODES.lobby, CODES.balcony),
        (s) => ({
          ...s,
          locations: {
            ...s.locations,
            [CODES.lobby]: { ...s.locations[CODES.lobby]!, clues: 2 },
            [CODES.balcony]: { ...s.locations[CODES.balcony]!, clues: 1 },
          },
        }),
      ],
      draw(SETS.fanatic),
    )
    const fanatic = enemyOf(state, SETS.fanatic)!
    expect(fanatic).toMatchObject({ location: CODES.lobby, clues: 1, engagedWith: null })
    expect(state.locations[CODES.lobby]!.clues).toBe(1)
    state = during(state, keep, { type: 'DefeatEnemy', enemy: fanatic.id, by: 'a' })
    expect(getInvestigator(state, 'a').clues).toBe(1)
  })

  it('Agent of the King takes a clue after attacking you', () => {
    let state = prep(game(), [update('a', { clues: 2 })], draw(SETS.agentOfTheKing))
    const agent = enemyOf(state, SETS.agentOfTheKing)!
    state = during(state, keep, {
      type: 'Forced',
      trigger: { type: 'afterEnemyAttack', enemy: agent.id, investigator: 'a' },
    })
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(state.enemies[agent.id]!.clues).toBe(1)
    state = during(state, keep, { type: 'DefeatEnemy', enemy: agent.id, by: 'a' })
    expect(getInvestigator(state, 'a').clues).toBe(2)
    expect(state.victoryDisplay).toContain(SETS.agentOfTheKing)
  })

  it("The King's Edict: cultists take a clue and fight better this round; none moved means surge", () => {
    let state = prep(
      game(),
      [
        putInPlay(CODES.lobby),
        (s) => ({
          ...s,
          locations: { ...s.locations, [CODES.lobby]: { ...s.locations[CODES.lobby]!, clues: 2 } },
        }),
      ],
      draw(SETS.fanatic),
    )
    const fanatic = enemyOf(state, SETS.fanatic)!
    state = prep(state, [withBag(0), placeAt(CODES.lobby)], draw(SETS.theKingsEdict))
    expect(state.enemies[fanatic.id]!.clues).toBe(2)
    state = choose(state, 'action.fight', { enemy: 'Fanatic' })
    expect(state.skillTest?.difficulty).toBe(5)
    // Sin pistas que mover, gana oleada: roba otra carta de encuentros.
    const deck = game().encounterDeck.length
    const surged = during(game(), keep, draw(SETS.theKingsEdict))
    expect(surged.encounterDeck.length).toBe(deck - 1)
  })
})

describe('Striking Fear and Rats', () => {
  it('Rotting Remains: 1 horror per point failed', () => {
    const state = resolveTest(prep(game(), [withBag(-2)], draw(SETS.rottingRemains)))
    expect(getInvestigator(state, 'a').horror).toBe(2)
  })

  it('Frozen in Fear: the first move, fight or evade each round costs 1 more action', () => {
    let state = prep(game(), [putInPlay(CODES.lobby)], draw(SETS.frozenInFear))
    state = choose(state, 'action.move', { location: 'Lobby' })
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(1)
    state = choose(state, 'action.move', { location: 'Theatre' })
    expect(getInvestigator(state, 'a').actionsRemaining).toBe(0)
  })

  it('Frozen in Fear: at the end of your turn, willpower (3) discards it', () => {
    let state = prep(game(), [withBag(0)], draw(SETS.frozenInFear))
    state = during(state, keep, {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    state = resolveTest(state)
    expect(treacheryOf(state, SETS.frozenInFear)).toBeUndefined()
  })

  it('Dissonant Voices: no assets or events until the end of the round', () => {
    let state = prep(game(), [update('a', { hand: [EVENT, ASSET], resources: 9 })])
    expect(playableCards(state, 'a', false).sort()).toEqual([EVENT, ASSET].sort())
    state = during(state, keep, draw(SETS.dissonantVoices))
    expect(playableCards(state, 'a', false)).toEqual([])
    state = during(state, keep, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(treacheryOf(state, SETS.dissonantVoices)).toBeUndefined()
    expect(playableCards(state, 'a', false).sort()).toEqual([EVENT, ASSET].sort())
  })

  it('Swarm of Rats is a hunter that engages whoever draws it', () => {
    const state = during(game(), keep, draw(SETS.swarmOfRats))
    expect(enemyOf(state, SETS.swarmOfRats)).toMatchObject({
      engagedWith: 'a',
      fight: 1,
      health: 1,
      evade: 3,
      keywords: ['hunter'],
    })
  })
})

export { applyFirst }
