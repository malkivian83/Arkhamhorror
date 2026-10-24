import {
  actBehavior,
  agendaBehavior,
  availableAbilities,
  availableActions,
  cardCost,
  createGame,
  enemyBehavior,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, startScenario } from '../campaign'
import '../index'
import {
  A_PHANTOM_OF_TRUTH,
  aPhantomOfTruth,
  CODES,
  locationCards,
  organistDraped,
  organistHopeless,
  PARANOIA,
  stealthyByakhee,
} from './a-phantom-of-truth'
import { SETS, swiftByakhee } from './encounter-sets'
import { carcosaCount } from './log'
import { afterTheOath } from './phantom-playthrough.test'

const IDS = ['a', 'b', 'c', 'd']
type Mod = (s: GameState) => GameState

function game(
  players = 1,
  difficulty: Difficulty = 'standard',
  notes: string[] = [],
  values: Record<string, string> = {},
  seed = 3,
): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: aPhantomOfTruth({
        difficulty,
        seed,
        log: { notes, crossedOut: [], values, chaosTokens: [], investigators: {} },
      }),
      campaignLog: {
        notes,
        crossedOut: [],
        values,
        chaosTokens: [],
        investigators: Object.fromEntries(
          IDS.slice(0, players).map((id) => [
            id,
            { xp: 0, physicalTrauma: 0, mentalTrauma: 0, storyAssets: [] },
          ]),
        ),
      },
    }),
  )
  for (
    let n = 0;
    n < 20 && state.pending && state.pending.question.prompt !== 'prompt.chooseAction';
    n++
  )
    state = choose(state, labels(state)[0]!, state.pending.question.choices[0]!.params)
  return state
}
const CONVICTION = ['carcosaConviction']
const convinced = { carcosaConviction: '2' }

const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })
const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })
/** Pone en juego (revelados) Lugares de la otra copia, en lugar de los de la partida. */
const withLocations =
  (...codes: string[]): Mod =>
  (s) => {
    const locations = { ...s.locations }
    for (const code of codes) {
      const card = locationCards[code]!
      const twin = Object.keys(locations).find(
        (id) => id !== code && locationCards[id]?.symbol === card.symbol,
      )
      if (twin) delete locations[twin]
      locations[code] = { ...card, revealed: true, clues: card.clueValue }
    }
    return { ...s, locations }
  }
const reveal = (...locations: string[]): Message[] =>
  locations.map((location) => ({ type: 'RevealLocation', location }))
const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
const behavior = () => scenarioBehavior(A_PHANTOM_OF_TRUTH)!
const here = (state: GameState, id = 'a') => getInvestigator(state, id).location!
const spawn = (card: EnemyCard, location: string, engageWith: string | null = null): Message => ({
  type: 'SpawnEnemy',
  card: { ...card },
  location,
  engageWith,
})
const draw = (card: EncounterCard, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card,
})
const treacheryOf = (code: string, traits: string[] = []): EncounterCard => ({
  kind: 'treachery',
  code,
  name: code,
  traits,
  keywords: [],
})
function readAll(state: GameState, pick: (ls: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = s.pending.question.choices[pick(labels(s))]!
    s = choose(s, choice.label, choice.params)
  }
  return s
}
const finishWith = (state: GameState, ...messages: Message[]) => {
  let s = during(state, (x) => x, ...messages)
  for (let n = 0; n < 30 && !s.outcome && s.pending; n++) s = choose(s, labels(s)[0]!)
  return s
}

// Guía ES p. 19, "Preparación".
describe('A Phantom of Truth: setup', () => {
  for (const players of [1, 2, 3, 4])
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
      it(`${players} investigator(s), ${difficulty}`, () => {
        const state = game(players, difficulty)
        expect(Object.keys(state.locations)).toHaveLength(10)
        for (const pair of [
          [CODES.montmartreA, CODES.montmartreB],
          [CODES.operaGarnierA, CODES.operaGarnierB],
          [CODES.leMaraisA, CODES.leMaraisB],
        ])
          expect(pair.filter((c) => state.locations[c])).toHaveLength(1)
        expect(state.investigators.every((i) => i.location === CODES.gareDOrsay)).toBe(true)
        // Con más (o igual) Dudas: sin Soles gemelos ni Sombra acechante; acto 1 v. I.
        expect(state.encounterDeck).toHaveLength(34 - 5)
        expect(state.encounterDeck.some((c) => c.code === CODES.twinSuns)).toBe(false)
        expect(state.encounterDeck.some((c) => c.code === SETS.huntingShadow)).toBe(false)
        expect(state.acts.map((a) => a.code)).toEqual([CODES.conspiracyV1, CODES.pursuingShadows])
        expect(state.acts[0]!.clueThreshold).toBe(2)
        // Sueño 1: Alma perdida en cada mazo y en el registro.
        for (const i of state.investigators) {
          expect([...i.deck, ...i.hand]).toContain(CODES.lostSoul)
          expect(state.campaignLog!.investigators[i.id]!.storyAssets).toContain(CODES.lostSoul)
        }
      })

  it('with more Conviction: no Black Stars Rise or False Lead, act 1 v. II', () => {
    const state = game(1, 'standard', CONVICTION, convinced)
    expect(state.encounterDeck).toHaveLength(34 - 4)
    expect(state.encounterDeck.some((c) => c.code === SETS.blackStarsRise)).toBe(false)
    expect(state.encounterDeck.some((c) => c.code === SETS.falseLead)).toBe(false)
    expect(state.acts.map((a) => a.code)).toEqual([CODES.conspiracyV2, CODES.stalkedByShadows])
  })

  it('Jordan’s Information: 3 extra resources and starting at Montparnasse', () => {
    const state = game(2, 'standard', ['carcosaInterviewedJordan'])
    for (const i of state.investigators) {
      expect(i.location).toBe(CODES.montparnasse)
      expect(i.resources).toBe(8)
    }
  })

  it('Dreams 4 and 7: mental trauma and Paranoia for a chosen investigator', () => {
    const state = game(2, 'standard', ['carcosaSlewTheMonsters', 'carcosaPoliceSuspicious'])
    for (const id of ['a', 'b']) expect(state.campaignLog!.investigators[id]!.mentalTrauma).toBe(1)
    const paranoid = state.investigators.filter((i) =>
      state.campaignLog!.investigators[i.id]!.storyAssets.includes(PARANOIA),
    )
    expect(paranoid).toHaveLength(1)
  })

  it('Dream 10: choosing Dream 11 marks a Conviction and switches to act 1 v. II', () => {
    const state = game(1, 'standard', [], { carcosaChasingTheStranger: '4', carcosaDoubt: '1' })
    // El primer Sueño 10 elegido por defecto es el 11 (Convicción): 1 Duda, 1 Convicción.
    expect(carcosaCount(state.campaignLog, 'conviction')).toBe(1)
    expect(state.acts[0]!.code).toBe(CODES.conspiracyV1)
    const twelve = game(1, 'standard', [], {
      carcosaChasingTheStranger: '4',
      carcosaConviction: '1',
    })
    expect(carcosaCount(twelve.campaignLog, 'conviction')).toBe(2)
    expect(twelve.acts[0]!.code).toBe(CODES.conspiracyV2)
    expect(twelve.encounterDeck.some((c) => c.code === CODES.twinSuns)).toBe(true)
    expect(twelve.encounterDeck.some((c) => c.code === SETS.falseLead)).toBe(false)
  })
})

describe('A Phantom of Truth: agendas and acts', () => {
  it('with more Conviction, doom on other cards subtracts from the agenda', () => {
    const thresholdDoom = agendaBehavior(CODES.theFirstNight)!.thresholdDoom!
    const doubt = prep(
      game(),
      [],
      { type: 'PlaceDoom', amount: 2 },
      spawn(organistDraped, here(game())),
    )
    const withEnemyDoom = (s: GameState) => {
      const e = Object.values(s.enemies)[0]!
      return { ...s, enemies: { ...s.enemies, [e.id]: { ...e, doom: 1 } } }
    }
    expect(thresholdDoom(withEnemyDoom(doubt))).toBe(3)
    const conviction = prep(
      game(1, 'standard', CONVICTION, convinced),
      [],
      { type: 'PlaceDoom', amount: 2 },
      spawn(organistHopeless, CODES.notreDame),
    )
    expect(thresholdDoom(withEnemyDoom(conviction))).toBe(1)
  })

  it('act 1 (v. I) by clues: The Organist (Draped in Mystery) spawns at the lead’s location', () => {
    let state = prep(game(2), [update('a', { clues: 4 })])
    state = readAll(prep(state, [], ...actBehavior(CODES.conspiracyV1)!.onAdvance!(state)))
    const organist = enemyOf(state, CODES.organistDraped)!
    expect(organist.location).toBe(CODES.gareDOrsay)
    expect(getInvestigator(state, 'a').horror).toBe(0)
  })

  it('act 1 by doom at the end of the round: 2 horror each and the farthest location', () => {
    let state = prep(game(2), [], { type: 'PlaceDoom', amount: 3 })
    const forced = behavior().forced!(state, { type: 'roundEnds' })
    expect(forced).toHaveLength(2)
    state = readAll(prep(state, [], ...forced))
    expect(state.actIndex).toBe(1)
    expect(getInvestigator(state, 'a').horror).toBe(2)
    const organist = enemyOf(state, CODES.organistDraped)!
    expect([CODES.canalSaintMartin, CODES.pereLachaise]).toContain(organist.location)
  })

  it('The Organist cannot be damaged or defeated', () => {
    const state = prep(game(), [], spawn(organistDraped, CODES.gareDOrsay))
    const organist = enemyOf(state, CODES.organistDraped)!
    expect(behavior().enemyImmune!(state, organist)).toBe(true)
    expect(enemyBehavior(CODES.organistDraped)!.wouldBeDefeated!(state, organist)).toEqual([])
  })

  it('Draped in Mystery: at the end of the enemy phase it moves away (or disengages)', () => {
    let state = prep(game(), [], spawn(organistDraped, CODES.gardensOfLuxembourg))
    const organist = enemyOf(state, CODES.organistDraped)!
    const forced = enemyBehavior(CODES.organistDraped)!.forced!(
      state,
      { type: 'enemyPhaseEnds' },
      organist,
    )
    state = readAll(prep(state, [], ...forced))
    expect([CODES.montparnasse, CODES.notreDame]).toContain(
      enemyOf(state, CODES.organistDraped)!.location,
    )
  })

  it('Hopeless, I Defied Him: hunts again once per round and then does not attack', () => {
    let state = prep(
      game(),
      [(s) => ({ ...s, phase: 'enemy' })],
      spawn(organistHopeless, CODES.canalSaintMartin),
    )
    const spawned = enemyOf(state, CODES.organistHopeless)!
    // Aparecer no es moverse por Cazador.
    expect(spawned.noAttackRound).toBeUndefined()
    const organist = { ...spawned, huntedRound: state.round }
    const trigger = {
      type: 'enemyEntersLocation',
      enemy: organist.id,
      location: organist.location,
    } as const
    const inEnemyPhase = (s: GameState): GameState => ({ ...s, phase: 'enemy' })
    const forced = enemyBehavior(CODES.organistHopeless)!.forced!(
      inEnemyPhase(state),
      trigger,
      organist,
    )
    expect(forced.map((m) => m.type)).toEqual([
      'SetScenarioMeta',
      'EnemySkipsAttacks',
      'HuntersMove',
    ])
    state = prep(state, [(s) => ({ ...s, phase: 'enemy' })], ...forced.slice(0, 2))
    expect(
      enemyBehavior(CODES.organistHopeless)!.forced!(inEnemyPhase(state), trigger, organist),
    ).toEqual([])
    expect(state.enemies[organist.id]!.noAttackRound).toBe(state.round)
  })

  it('Pursuing Shadows: clues on The Organist after attacking it; 3 per investigator → R1', () => {
    let state = prep(
      game(1),
      [update('a', { clues: 3 }), (s) => ({ ...s, actIndex: 1 })],
      spawn(organistDraped, CODES.gareDOrsay, 'a'),
    )
    const organist = enemyOf(state, CODES.organistDraped)!
    const reactions = behavior().reactions!(state, {
      type: 'afterSkillTest',
      investigator: 'a',
      kind: 'fight',
      succeeded: true,
      margin: 1,
      enemy: organist.id,
    })
    expect(reactions).toHaveLength(1)
    state = prep(state, [], ...reactions[0]!.then)
    expect(state.enemies[organist.id]!.clues).toBe(1)
    const objective = actBehavior(CODES.pursuingShadows)!.objectiveMet!
    expect(objective(state)).toBe(false)
    state = prep(state, [
      (s) => ({
        ...s,
        enemies: { ...s.enemies, [organist.id]: { ...s.enemies[organist.id]!, clues: 3 } },
      }),
    ])
    expect(objective(state)).toBe(true)
    expect(actBehavior(CODES.pursuingShadows)!.onAdvance!(state)).toEqual([
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
    ])
    const meeting = game(1, 'standard', ['carcosaSecretMeeting'])
    expect(actBehavior(CODES.pursuingShadows)!.onAdvance!(meeting)).toEqual([
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } },
    ])
  })

  it('Stalked by Shadows: spend 1 clue per investigator to place doom or evade The Organist', () => {
    let state = prep(
      game(2, 'standard', CONVICTION, convinced),
      [update('a', { clues: 1 }), update('b', { clues: 1 }), (s) => ({ ...s, actIndex: 1 })],
      spawn(organistHopeless, CODES.gareDOrsay, 'a'),
    )
    const ability = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.phantom.stalked',
    )!
    expect(ability.limit).toEqual({ per: 'round', group: true })
    state = readAll(choose(state, ability.label, ability.params), (ls) =>
      ls.indexOf('choice.phantom.evadeOrganist'),
    )
    expect(enemyOf(state, CODES.organistHopeless)!.engagedWith).toBeNull()
    expect(state.investigators.reduce((n, i) => n + i.clues, 0)).toBe(0)
  })

  it('agendas 1–2: everyone disengages and The Organist moves away; Jordan spawns', () => {
    let state = prep(
      game(1),
      [],
      spawn(organistDraped, CODES.gareDOrsay, 'a'),
      spawn(stealthyByakhee, CODES.gareDOrsay, 'a'),
    )
    state = readAll(prep(state, [], ...agendaBehavior(CODES.theSecondNight)!.onAdvance!(state)))
    expect(Object.values(state.enemies).every((e) => e.engagedWith === null)).toBe(true)
    expect(enemyOf(state, CODES.organistDraped)!.location).not.toBe(
      getInvestigator(state, 'a').location,
    )
    expect(enemyOf(state, '03066b')?.location).toBe(CODES.montparnasse)
  })

  it('agenda 3: with Doubt R3; with Conviction the act 2 outcome', () => {
    expect(agendaBehavior(CODES.theThirdNight)!.onAdvance!(game())).toEqual([
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
    ])
    expect(
      agendaBehavior(CODES.theThirdNight)!.onAdvance!(
        game(1, 'standard', [...CONVICTION, 'carcosaSecretMeeting'], convinced),
      ),
    ).toEqual([{ type: 'EndScenario', outcome: { type: 'resolution', resolution: 2 } }])
  })
})

describe('A Phantom of Truth: chaos tokens', () => {
  const effect = (state: GameState, token: 'skull' | 'cultist' | 'tablet' | 'elderThing') =>
    behavior().tokenEffect!(state, token, 'a')

  it('skull: -X doom in play (max 5 on Standard)', () => {
    const state = prep(game(), [], { type: 'PlaceDoom', amount: 7 })
    expect(effect(state, 'skull').modifier).toBe(-5)
    expect(
      effect(prep(game(1, 'hard'), [], { type: 'PlaceDoom', amount: 7 }), 'skull').modifier,
    ).toBe(-7)
  })

  it('cultist: unengaged Byakhee move toward the nearest investigator', () => {
    let state = prep(game(), [], spawn(stealthyByakhee, CODES.notreDame))
    state = readAll(prep(state, [], ...effect(state, 'cultist').onFail!))
    expect([CODES.gardensOfLuxembourg, CODES.montparnasse]).toContain(
      enemyOf(state, CODES.stealthyByakhee)!.location,
    )
  })

  it('tablet: skill cards committed lose their icons', () => {
    let state = prep(game(), [update('a', { hand: ['01089'] }), withBag('tablet')], {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
    })
    state = choose(state, 'choice.commit', { card: 'Guts' })
    const before = skillTestValue(state).total
    state = choose(state, 'choice.revealToken')
    expect(skillTestValue(state).total).toBe(before - 2)
  })

  it('elder thing: lose 1 resource for each point you failed by', () => {
    let state = prep(game(), [withBag('elderThing')], {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 4,
      kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
    })
    state = readAll(resolveTest(state))
    // 3 de voluntad - 2 = 1 contra 4: falla por 3.
    expect(getInvestigator(state, 'a').resources).toBe(2)
  })
})

describe('A Phantom of Truth: locations', () => {
  it('Opéra Garnier doubles committed icons (03212) or your base skill (03213)', () => {
    const test = (location: string) =>
      behavior().skillDoubling!(game(), {
        kind: { type: 'investigate', location },
      } as never)
    expect(test(CODES.operaGarnierA)).toEqual({ icons: true })
    expect(test(CODES.operaGarnierB)).toEqual({ base: true })
    const state = prep(game(), [withLocations(CODES.operaGarnierB), placeAt(CODES.operaGarnierB)], {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 6,
      kind: { type: 'investigate', location: CODES.operaGarnierB },
    })
    // 3 de intelecto duplicado.
    expect(skillTestValue(state).total).toBe(6)
  })

  it('Père Lachaise and Le Marais (03218): you cannot leave until the end of the round', () => {
    let state = prep(
      game(),
      [withLocations(CODES.leMaraisB), placeAt(CODES.notreDame)],
      ...reveal(CODES.notreDame),
    )
    state = readAll(
      prep(state, [], { type: 'MoveTo', investigator: 'a', location: CODES.leMaraisB }),
    )
    expect(behavior().cannotLeave!(state, 'a')).toBe(true)
    expect(availableActions(state, 'a').some((a) => a.kind === 'move')).toBe(false)
    expect(behavior().cannotLeave!({ ...state, round: state.round + 1 }, 'a')).toBe(false)
  })

  it('Gare d’Orsay: spend 1 resource to move to any Rail location', () => {
    let state = game()
    const rail = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.phantom.gareDOrsay',
    )!
    state = choose(state, rail.label, rail.params)
    expect(labels(state).every((l) => l === 'choice.location')).toBe(true)
    state = choose(state, 'choice.location', { location: 'Notre-Dame' })
    state = readAll(state)
    expect(getInvestigator(state, 'a').location).toBe(CODES.notreDame)
    expect(getInvestigator(state, 'a').resources).toBe(4)
  })

  it('Notre-Dame: enemies get -1 fight and +1 evade', () => {
    const state = game()
    const at = (location: string, exhausted = false) =>
      ({ ...stealthyByakhee, location, exhausted }) as never
    expect(behavior().enemyStat!(state, at(CODES.notreDame), 'fight')).toBe(-1)
    expect(behavior().enemyStat!(state, at(CODES.notreDame), 'evade')).toBe(1)
    // Byakhee sigiloso: -3 de combate agotado.
    expect(behavior().enemyStat!(state, at(CODES.gareDOrsay, true), 'fight')).toBe(-3)
  })

  it('Montparnasse: discard a card to gain resources per [willpower] icon', () => {
    let state = prep(
      game(),
      [placeAt(CODES.montparnasse), update('a', { hand: ['01089'] })],
      ...reveal(CODES.montparnasse),
    )
    const ability = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.phantom.montparnasse',
    )!
    state = readAll(choose(state, ability.label, ability.params))
    expect(getInvestigator(state, 'a').resources).toBe(5 + 2)
  })

  it('Gardens of Luxembourg: Byakhee treat it as connected while an investigator is there', () => {
    const state = prep(game(), [placeAt(CODES.gardensOfLuxembourg)])
    const byakhee = { ...stealthyByakhee } as never
    expect(behavior().enemyConnections!(state, CODES.canalSaintMartin, byakhee)).toEqual([
      CODES.gardensOfLuxembourg,
    ])
    expect(
      behavior().enemyConnections!(state, CODES.canalSaintMartin, { ...organistDraped } as never),
    ).toEqual([])
  })

  it('Grand Guignol: after revealing it, 2 horror or reshuffle your hand', () => {
    let state = prep(game(), [placeAt(CODES.grandGuignol)], ...reveal(CODES.grandGuignol))
    expect(labels(state)).toEqual(['choice.phantom.guignolHorror', 'choice.phantom.guignolShuffle'])
    state = readAll(choose(state, 'choice.phantom.guignolHorror'))
    expect(getInvestigator(state, 'a').horror).toBe(2)
  })
})

describe('A Phantom of Truth: more locations', () => {
  it('Montmartre (03209): play a revealed asset from the top of a deck, paying its cost', () => {
    let state = prep(game(2), [
      withLocations(CODES.montmartreA),
      placeAt(CODES.montmartreA),
      update('b', { deck: ['01087', 'b-x'] }),
    ])
    const reveal = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.phantom.montmartreReveal',
    )!
    expect(reveal.limit).toEqual({ per: 'round', group: true })
    state = choose(state, reveal.label, reveal.params)
    state = choose(state, 'choice.phantom.playRevealed', { card: 'Flashlight' })
    state = readAll(state)
    expect(Object.values(state.assets).some((a) => a.code === '01087' && a.owner === 'a')).toBe(
      true,
    )
    expect(getInvestigator(state, 'b').deck).not.toContain('01087')
    expect(getInvestigator(state, 'a').resources).toBe(5 - 2)
  })

  it('Montmartre (03210): spend 1 resource to add 1 ammo', () => {
    let state = prep(game(), [withLocations(CODES.montmartreB), placeAt(CODES.montmartreB)], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '01016',
    })
    const add = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.phantom.montmartreUses',
    )!
    const before = Object.values(state.assets)[0]!.uses ?? 0
    state = readAll(choose(state, add.label, add.params))
    expect(Object.values(state.assets)[0]!.uses).toBe(before + 1)
    expect(getInvestigator(state, 'a').resources).toBe(4)
  })

  it('Le Marais (03217): draw 1 card when your turn begins there (group limit)', () => {
    const state = prep(game(), [withLocations(CODES.leMaraisA), placeAt(CODES.leMaraisA)])
    const [reaction] = behavior().reactions!(state, { type: 'turnBegins', investigator: 'a' })
    expect(reaction!.limit).toEqual({ per: 'round', group: true })
    expect(reaction!.then).toEqual([{ type: 'DrawCards', investigator: 'a', amount: 1 }])
  })

  it('Canal Saint-Martin: after evading an enemy there, move it to a connecting location', () => {
    let state = prep(
      game(),
      [placeAt(CODES.canalSaintMartin)],
      spawn(stealthyByakhee, CODES.canalSaintMartin),
    )
    const byakhee = enemyOf(state, CODES.stealthyByakhee)!
    const [reaction] = behavior().reactions!(state, {
      type: 'afterEvade',
      investigator: 'a',
      enemy: byakhee.id,
    })
    state = readAll(prep(state, [], ...reaction!.then))
    expect(state.enemies[byakhee.id]!.location).not.toBe(CODES.canalSaintMartin)
  })

  it('Swift Byakhee keeps hunting until it reaches its prey, then does not attack', () => {
    let state = prep(
      game(),
      [(s) => ({ ...s, phase: 'enemy' })],
      spawn(swiftByakhee, CODES.canalSaintMartin),
    )
    state = readAll(prep(state, [(s) => ({ ...s, phase: 'enemy' })], { type: 'HuntersMove' }))
    const swift = enemyOf(state, SETS.swiftByakhee)!
    expect(swift.location).toBe(CODES.gareDOrsay)
    expect(swift.noAttackRound).toBe(state.round)
  })
})

describe('A Phantom of Truth: encounter cards', () => {
  it('Torturous Chords: +1 cost per resource-bearing copy, then loses 1 resource', () => {
    let state = prep(
      game(),
      [withBag(-8), update('a', { hand: ['01089', '01016'] })],
      draw(treacheryOf(CODES.torturousChords)),
    )
    state = readAll(resolveTest(state))
    const chords = Object.values(state.treacheries).find((t) => t.code === CODES.torturousChords)!
    expect(chords.placement.type).toBe('threatArea')
    expect(chords.tokens).toBeGreaterThan(0)
    expect(cardCost(state, 'a', '01016')).toBe(5)
    const forced = behavior().forced!(state, {
      type: 'afterPlayCard',
      investigator: 'a',
      code: '01016',
    })
    expect(forced).toEqual([{ type: 'AddTreacheryTokens', treachery: chords.id, amount: -1 }])
  })

  it('Twin Suns: remove 1 doom from the agenda or take horror per point', () => {
    let state = prep(
      game(),
      [withBag(-8)],
      { type: 'PlaceDoom', amount: 1 },
      draw(treacheryOf(CODES.twinSuns)),
    )
    state = readAll(resolveTest(state))
    expect(state.doom).toBe(0)
  })

  it('Deadly Fate: discard to an enemy, then draw it or be attacked', () => {
    let state = prep(
      game(),
      [
        withBag(-8),
        (s) => ({
          ...s,
          encounterDeck: [treacheryOf(SETS.falseLead), { ...swiftByakhee }, ...s.encounterDeck],
        }),
      ],
      draw(treacheryOf(CODES.deadlyFate)),
    )
    state = resolveTest(state)
    expect(labels(state)).toEqual(['choice.phantom.drawEnemy', 'choice.phantom.enemyAttacks'])
    state = readAll(choose(state, 'choice.phantom.enemyAttacks'))
    expect(getInvestigator(state, 'a').damage).toBe(1)
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(state.encounterDiscard.map((c) => c.code)).toContain(SETS.swiftByakhee)
  })

  it('Lost Soul: with Doubt, intellect against your willpower', () => {
    let state = prep(game(), [withBag(-8)], draw(treacheryOf(CODES.lostSoul)))
    expect(state.skillTest?.skill).toBe('intellect')
    expect(state.skillTest?.difficulty).toBe(3)
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('Hunted by Byakhee: a revealed Byakhee is drawn', () => {
    let state = prep(
      game(),
      [withBag(-8), (s) => ({ ...s, encounterDeck: [{ ...swiftByakhee }, ...s.encounterDeck] })],
      draw(treacheryOf(SETS.huntedByByakhee)),
    )
    state = readAll(resolveTest(state))
    expect(enemyOf(state, SETS.swiftByakhee)).toBeDefined()
  })
})

describe('A Phantom of Truth: resolutions', () => {
  const start = (notes: string[] = []) => readAll(startScenario(afterTheOath(1, notes), 5))

  it('no resolution: the gaze of the Phantom and 2 elder thing tokens', () => {
    const campaign = afterTheOath(1)
    const state = finishWith(start(), { type: 'EndScenario', outcome: { type: 'noResolution' } })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaGazeOfThePhantom')
    expect(next.log.chaosTokens.filter((t) => t === 'elderThing')).toHaveLength(2)
  })

  it('R2: Nigel Engram found, 1 mental trauma and 2 bonus experience', () => {
    const campaign = afterTheOath(1)
    const state = finishWith(start(), {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 2 },
    })
    const next = finishScenario(campaign, state)
    const record = Object.values(next.log.investigators)[0]!
    expect(next.log.notes).toContain('carcosaFoundNigelEngram')
    expect(record.mentalTrauma).toBe(1)
    expect(record.xp).toBe(2)
    expect(next.log.chaosTokens.filter((t) => t === 'tablet')).toHaveLength(2)
  })

  it('R1 and R3, with Jordan Perry slain', () => {
    const campaign = afterTheOath(1)
    const one = finishWith(
      during(start(), (s) => ({ ...s, victoryDisplay: [...s.victoryDisplay, '03066b'] })),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
    )
    const next = finishScenario(campaign, one)
    expect(next.log.notes).toEqual(
      expect.arrayContaining(['carcosaFoundNigelsHome', 'carcosaSlainJordan']),
    )
    const three = finishWith(start(), {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 3 },
    })
    expect(finishScenario(campaign, three).log.notes).toContain('carcosaUnableToFindNigel')
  })
})
