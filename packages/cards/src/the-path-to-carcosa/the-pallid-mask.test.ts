import {
  actBehavior,
  applyInput,
  agendaBehavior,
  availableAbilities,
  availableActions,
  createGame,
  enemyBehavior,
  getInvestigator,
  scenarioBehavior,
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
import { ghoulMinion, SETS } from './encounter-sets'
import { carcosaCount } from './log'
import { afterThePhantom } from './pallid-playthrough.test'
import { THE_MAN_IN_THE_PALLID_MASK, theManInThePallidMask } from './the-man-in-the-pallid-mask'
import {
  adjacent,
  catacombsDocent,
  CODES,
  corpseDweller,
  specterOfDeath,
  THE_PALLID_MASK,
  thePallidMask,
} from './the-pallid-mask'

const IDS = ['a', 'b', 'c', 'd']
type Mod = (s: GameState) => GameState

function game(
  players = 1,
  notes: string[] = [],
  difficulty: Difficulty = 'standard',
  seed = 3,
): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: thePallidMask({
        difficulty,
        seed,
        log: { notes, crossedOut: [], values: {}, chaosTokens: [], investigators: {} },
      }),
      campaignLog: {
        notes,
        crossedOut: [],
        values: {},
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

const update =
  (id: string, changes: Partial<GameState['investigators'][number]>): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...changes } : i)),
  })
const placeAt =
  (...where: string[]): Mod =>
  (s) => ({
    ...s,
    investigators: s.investigators.map((i, n) => ({ ...i, location: where[n] ?? i.location })),
  })
const withBag =
  (...tokens: GameState['chaosBag']): Mod =>
  (s) => ({ ...s, chaosBag: tokens })
const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
const behavior = () => scenarioBehavior(THE_PALLID_MASK)!
const enemyOf = (state: GameState, code: string) =>
  Object.values(state.enemies).find((e) => e.code === code)
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
const treacheryOf = (code: string): EncounterCard => ({
  kind: 'treachery',
  code,
  name: code,
  traits: [],
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
/** Pone la carta superior del mazo de Catacumbas indicada (para fijar qué sale). */
const deckTop =
  (...ids: string[]): Mod =>
  (s) => ({
    ...s,
    scenarioDecks: {
      ...s.scenarioDecks,
      catacombs: [...ids, ...(s.scenarioDecks?.catacombs ?? []).filter((id) => !ids.includes(id))],
    },
  })
const position = (state: GameState, id: string) => state.locations[id]?.position

// Guía ES p. 22, "Preparación".
describe('The Pallid Mask: setup', () => {
  for (const players of [1, 2, 3, 4])
    it(`${players} investigator(s): they entered on their own and start at the Gate to Hell`, () => {
      const state = game(players, ['carcosaFoundNigelsHome'])
      const gate = state.locations[CODES.theGateToHell]!
      expect(gate.position).toEqual([0, 0])
      expect(gate.revealed).toBe(true)
      expect(state.investigators.every((i) => i.location === CODES.theGateToHell)).toBe(true)
      // La Puerta pone en juego 2 Catacumbas, arriba y abajo.
      const placed = adjacent(state, CODES.theGateToHell)
      expect(placed.map((id) => position(state, id)).sort()).toEqual([
        [0, -1],
        [0, 1],
      ])
      expect(state.scenarioDecks?.catacombs).toHaveLength(13 - 2)
      // Las 5 últimas: la Tumba, el Pasadizo y otras 3.
      const bottom = state.scenarioDecks!.catacombs!.slice(-5)
      expect(bottom).toEqual(expect.arrayContaining([CODES.tombOfShadows, CODES.blockedPassage]))
      expect(state.campaignLog!.notes).toContain('carcosaEnteredTheCatacombs')
      expect(state.encounterDeck).toHaveLength(15 + 7 + 4 + 4)
    })

  it('awoke inside: a random Catacombs location (never the Tomb or the Passage) starts', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const state = game(1, ['carcosaGazeOfThePhantom'], 'standard', seed)
      const start = Object.values(state.locations).find(
        (l) => l.position?.[0] === 0 && l.position[1] === 0,
      )!
      expect([CODES.tombOfShadows, CODES.blockedPassage]).not.toContain(start.id)
      expect(state.campaignLog!.notes).toContain('carcosaAwokeInTheCatacombs')
    }
  })

  it('The Man in the Pallid Mask leaves his bearer’s deck and is set aside', () => {
    const campaign = afterThePhantom(2)
    const state = readAll(startScenario(campaign, 4))
    const bearer = campaign.investigators[0]!.id
    const me = getInvestigator(state, bearer)
    expect([...me.deck, ...me.hand]).not.toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(state.setAside.some((c) => c.code === THE_MAN_IN_THE_PALLID_MASK)).toBe(true)
  })

  it('Haruko’s Information: an adjacent Catacombs location is revealed', () => {
    const state = game(1, ['carcosaFoundNigelsHome', 'carcosaInterviewedHaruko'])
    const revealed = adjacent(state, CODES.theGateToHell).filter(
      (id) => state.locations[id]!.revealed,
    )
    expect(revealed).toHaveLength(1)
  })
})

describe('The Pallid Mask: the catacombs', () => {
  it('entering unrevealed Catacombs costs 1 clue per investigator from your location', () => {
    let state = game(2, ['carcosaFoundNigelsHome'])
    const [up] = adjacent(state, CODES.theGateToHell).filter((id) => !state.locations[id]!.revealed)
    const moves = () =>
      availableActions(state, 'a').flatMap((a) => (a.kind === 'move' ? [a.to] : []))
    expect(moves()).not.toContain(up)
    state = prep(state, [update('a', { clues: 1 }), update('b', { clues: 1 })])
    expect(moves()).toContain(up)
    state = readAll(prep(state, [], { type: 'MoveTo', investigator: 'a', location: up! }))
    expect(getInvestigator(state, 'a').location).toBe(up)
    expect(getInvestigator(state, 'a').clues + getInvestigator(state, 'b').clues).toBe(0)
  })

  it('Labyrinth of Bones places 3 more above, below and to the right (only on free spots)', () => {
    let state = game(1, ['carcosaFoundNigelsHome'])
    const [up] = adjacent(state, CODES.theGateToHell).filter(
      (id) => position(state, id)?.[1] === -1,
    )
    // La Catacumba de arriba pasa a ser el Laberinto: reemplaza su id en juego.
    state = prep(
      state,
      [
        deckTop(CODES.wellOfSouls, CODES.narrowShaft, CODES.labyrinthOfBones),
        (s) => {
          const { [up!]: old, ...rest } = s.locations
          return {
            ...s,
            locations: {
              ...rest,
              [CODES.labyrinthOfBones]: {
                ...s.setAsideLocations[CODES.labyrinthOfBones]!,
                position: old!.position!,
                revealed: false,
                clues: 0,
                connections: [],
              },
            },
            setAsideLocations: {
              ...s.setAsideLocations,
              [up!]: { ...old!, position: undefined } as never,
            },
          }
        },
      ],
      { type: 'RevealLocation', location: CODES.labyrinthOfBones },
    )
    state = readAll(state)
    const around = adjacent(state, CODES.labyrinthOfBones)
    // Abajo está la Puerta: solo arriba y derecha.
    expect(around).toHaveLength(3)
    expect(around).toContain(CODES.theGateToHell)
  })

  it('Stone Archways: adjacent unrevealed Catacombs have no entry cost', () => {
    let state = game(1, ['carcosaFoundNigelsHome'])
    const [up] = adjacent(state, CODES.theGateToHell).filter(
      (id) => position(state, id)?.[1] === -1,
    )
    const archways = [CODES.stoneArchways, `${CODES.stoneArchways}~2`].find(
      (id) => state.setAsideLocations[id],
    )!
    state = prep(
      state,
      [
        (s) => ({
          ...s,
          locations: {
            ...s.locations,
            [archways]: {
              ...s.setAsideLocations[archways]!,
              position: [1, -1],
              revealed: true,
              clues: 0,
              connections: [],
            },
          },
        }),
        deckTop(CODES.wellOfSouls),
      ],
      { type: 'RevealLocation', location: CODES.theGateToHell },
    )
    // Junto a unas Arcadas reveladas no hay coste de entrada.
    expect(behavior().canEnter!(state, 'a', CODES.theGateToHell, up!)).toBe(true)
    const below = adjacent(state, CODES.theGateToHell).find((id) => position(state, id)?.[1] === 1)
    expect(behavior().canEnter!(state, 'a', CODES.theGateToHell, below!)).toBe(false)
  })

  it('the Tomb of Shadows advances act 1: The Man spawns there with +1 health per investigator', () => {
    let state = prep(
      game(2, ['carcosaFoundNigelsHome']),
      [
        (s) => ({
          ...s,
          setAside: [...s.setAside, { ...theManInThePallidMask }],
          locations: {
            ...s.locations,
            [CODES.tombOfShadows]: {
              ...s.setAsideLocations[CODES.tombOfShadows]!,
              position: [1, 0],
              revealed: false,
              clues: 0,
              connections: [],
            },
          },
        }),
      ],
      { type: 'RevealLocation', location: CODES.tombOfShadows },
    )
    state = readAll(state)
    expect(state.actIndex).toBe(1)
    const man = enemyOf(state, THE_MAN_IN_THE_PALLID_MASK)!
    expect(man.location).toBe(CODES.tombOfShadows)
    expect(man.maxHealth).toBe(3 + 2)
    expect(enemyOf(state, '03067b')?.location).toBe(CODES.theGateToHell)
  })

  it('act 2: defeating The Man marks 2 Conviction and leads to The Way Out', () => {
    let state = prep(game(1, ['carcosaFoundNigelsHome']), [(s) => ({ ...s, actIndex: 1 })], {
      type: 'SetScenarioMeta',
      key: 'carcosa:manDefeated',
      value: 1,
    })
    state = readAll(prep(state, [], { type: 'AdvanceAct', paid: true }))
    expect(state.acts[state.actIndex]!.code).toBe(CODES.theWayOut)
    expect(carcosaCount(state.campaignLog, 'conviction')).toBe(2)
  })

  it('act 2 with clues: 2 Doubt and Leading the Way', () => {
    let state = prep(game(1, ['carcosaFoundNigelsHome']), [(s) => ({ ...s, actIndex: 1 })])
    state = readAll(prep(state, [], { type: 'AdvanceAct', paid: true }))
    expect(state.acts[state.actIndex]!.code).toBe(CODES.leadingTheWay)
    expect(carcosaCount(state.campaignLog, 'doubt')).toBe(2)
  })

  it('The Way Out: the farthest location from the Gate collapses at the end of the round', () => {
    const start = game(1, ['carcosaFoundNigelsHome'])
    const [up] = adjacent(start, CODES.theGateToHell)
    let state = prep(start, [placeAt(up!), (s) => ({ ...s, actIndex: 2 })])
    expect(actBehavior(CODES.theWayOut)!.objectiveMet!(state)).toBe(false)
    const before = Object.keys(state.locations).length
    const forced = behavior().forced!(state, { type: 'roundEnds' })
    state = prep(state, [], ...forced)
    // Empate a distancia 1: se descarta el Lugar del investigador.
    const index = state.pending!.question.choices.findIndex(
      (c) => (c.target as { id?: string } | undefined)?.id === up,
    )
    state = readAll(applyInput(state, { investigator: state.pending!.investigator, choice: index }))
    expect(Object.keys(state.locations)).toHaveLength(before - 1)
    expect(state.locations[CODES.theGateToHell]).toBeDefined()
    // El investigador del Lugar descartado se mueve a uno conectado y recibe 2 daño.
    expect(getInvestigator(state, 'a').damage).toBe(2)
    expect(getInvestigator(state, 'a').location).toBe(CODES.theGateToHell)
    // Todos en la Puerta: objetivo cumplido (→R1).
    expect(actBehavior(CODES.theWayOut)!.objectiveMet!(state)).toBe(true)
    expect(actBehavior(CODES.theWayOut)!.onAdvance!(state)).toEqual([
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
    ])
  })

  it('agendas: the Specter of Death spawns at the starting location; then everyone is defeated', () => {
    let state = game(1, ['carcosaFoundNigelsHome'])
    state = readAll(prep(state, [], ...agendaBehavior(CODES.empireOfTheDead)!.onAdvance!(state)))
    expect(enemyOf(state, CODES.specterOfDeath)?.location).toBe(CODES.theGateToHell)
    const last = agendaBehavior(CODES.empireOfTheUndead)!.onAdvance!(state)
    expect(last.map((m) => m.type)).toEqual(['SufferTrauma', 'DefeatInvestigator'])
  })
})

describe('The Pallid Mask: chaos tokens', () => {
  it('skull: -X locations away from the starting location', () => {
    const state = game(1, ['carcosaFoundNigelsHome'])
    const [up] = adjacent(state, CODES.theGateToHell)
    expect(behavior().tokenEffect!(state, 'skull', 'a').modifier).toBe(-0)
    const away = prep(state, [placeAt(up!)])
    expect(behavior().tokenEffect!(away, 'skull', 'a').modifier).toBe(-1)
  })

  it('tablet: a ready Ghoul at your location attacks you', () => {
    let state = prep(
      game(1, ['carcosaFoundNigelsHome']),
      [],
      spawn(ghoulMinion, CODES.theGateToHell),
    )
    const ghoul = enemyOf(state, SETS.ghoulMinion)!
    state = prep(
      state,
      [
        (s) => ({
          ...s,
          enemies: { ...s.enemies, [ghoul.id]: { ...s.enemies[ghoul.id]!, engagedWith: null } },
        }),
      ],
      ...behavior().tokenEffect!(state, 'tablet', 'a').immediate!,
    )
    state = readAll(state)
    expect(getInvestigator(state, 'a').damage).toBe(1)
  })

  it('elder thing: draws a Ghoul or Geist from the encounter deck', () => {
    let state = game(1, ['carcosaFoundNigelsHome'])
    state = readAll(prep(state, [], ...behavior().tokenEffect!(state, 'elderThing', 'a').onFail!))
    expect(
      Object.values(state.enemies).some(
        (e) => (e.traits ?? []).includes('Ghoul') || (e.traits ?? []).includes('Geist'),
      ),
    ).toBe(true)
  })

  it('cultist during an attack: 1 less damage on Standard', () => {
    const state = prep(game(), [], spawn(ghoulMinion, CODES.theGateToHell, 'a'), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 1,
      kind: { type: 'fight', enemy: 'enemy-1' },
    })
    expect(behavior().tokenEffect!(state, 'cultist', 'a').onSuccess).toEqual([
      { type: 'AdjustAttackDamage', amount: -1 },
    ])
  })
})

describe('The Pallid Mask: locations, enemies and treacheries', () => {
  it('Crypt of the Sepulchral Lamp is investigated with willpower', () => {
    expect(behavior().investigateSkill!(game(), CODES.cryptOfTheSepulchralLamp)).toBe('willpower')
    expect(behavior().investigateSkill!(game(), CODES.theGateToHell)).toBeNull()
  })

  it('Well of Souls: at the end of your turn, 1 direct horror or 2 random cards', () => {
    const state = placeAt(CODES.wellOfSouls)(game())
    const [ask] = behavior().forced!(state, { type: 'turnEnds', investigator: 'a' })
    expect(ask?.type).toBe('Ask')
  })

  it('Catacombs Docent spawns at the nearest unrevealed location', () => {
    const state = readAll(prep(game(), [], draw({ ...catacombsDocent })))
    const docent = enemyOf(state, CODES.catacombsDocent)!
    expect(state.locations[docent.location]!.revealed).toBe(false)
  })

  it('Corpse Dweller replaces a Humanoid enemy, or is discarded with surge', () => {
    expect(enemyBehavior(CODES.corpseDweller)!.surge!(game())).toBe(true)
    let state = prep(game(), [], spawn(catacombsDocent, CODES.theGateToHell))
    expect(enemyBehavior(CODES.corpseDweller)!.surge!(state)).toBe(false)
    state = readAll(prep(state, [], draw({ ...corpseDweller })))
    expect(enemyOf(state, CODES.catacombsDocent)).toBeUndefined()
    expect(enemyOf(state, CODES.corpseDweller)!.location).toBe(CODES.theGateToHell)
  })

  it('Specter of Death: takes 1 less damage while exhausted', () => {
    const state = prep(game(), [], spawn(specterOfDeath, CODES.theGateToHell))
    const specter = enemyOf(state, CODES.specterOfDeath)!
    const taken = enemyBehavior(CODES.specterOfDeath)!.damageTaken!
    expect(taken(state, { ...specter, exhausted: true }, 2, {} as never).amount).toBe(1)
    expect(taken(state, specter, 2, {} as never).amount).toBe(2)
  })

  it('The Pit Below: +1 shroud, and 3 damage at the end of the round', () => {
    let state = prep(game(), [], draw(treacheryOf(CODES.thePitBelow)))
    state = readAll(state)
    const pit = Object.values(state.treacheries).find((t) => t.code === CODES.thePitBelow)!
    expect(pit.placement).toEqual({ type: 'location', location: CODES.theGateToHell })
    state = readAll(prep(state, [], { type: 'Forced', trigger: { type: 'roundEnds' } }))
    expect(getInvestigator(state, 'a').damage).toBe(3)
  })

  it('The Shadow Behind You: look behind you, or lose resources or your hand', () => {
    let state = readAll(prep(game(), [], draw(treacheryOf(CODES.theShadowBehindYou))))
    const look = availableAbilities(state, 'a').find((a) => a.label === 'ability.pallid.lookBehind')
    expect(look).toBeDefined()
    state = readAll(
      prep(state, [], { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } }),
    )
    expect(getInvestigator(state, 'a').resources).toBe(0)
  })

  it('Grasping Hands: 1 damage per point failed', () => {
    let state = prep(game(), [withBag(-2)], draw(treacheryOf(SETS.graspingHands)))
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })
})

describe('The Pallid Mask: resolutions', () => {
  const finish = (outcome: Message, players = 1) => {
    const campaign = afterThePhantom(players)
    let state = readAll(startScenario(campaign, 5))
    state = during(state, (s) => s, outcome)
    for (let n = 0; n < 30 && !state.outcome && state.pending; n++)
      state = choose(state, labels(state)[0]!, state.pending.question.choices[0]!.params)
    return { campaign, state }
  }

  it('R1: the site of the gate and 2 cultist tokens', () => {
    const { campaign, state } = finish({
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 1 },
    })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaKnowTheSiteOfTheGate')
    expect(next.log.chaosTokens.filter((t) => t === 'cultist')).toHaveLength(2)
  })

  it('R2: 2 more marks under Chasing the Stranger', () => {
    const { campaign, state } = finish({
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: 2 },
    })
    const next = finishScenario(campaign, state)
    expect(carcosaCount(next.log, 'chasing')).toBe(carcosaCount(campaign.log, 'chasing') + 2)
  })

  it('no resolution: at least one investigator reads Act II (2 XP and a weakness)', () => {
    const { campaign, state } = finish(
      { type: 'EndScenario', outcome: { type: 'noResolution' } },
      2,
    )
    const next = finishScenario(campaign, state)
    const reader = campaign.investigators[0]!.id
    expect(next.log.notes).toContain('carcosaReadActII')
    expect(next.log.investigators[reader]!.xp).toBe(2)
    expect(next.log.investigators[reader]!.storyAssets.length).toBeGreaterThan(
      campaign.log.investigators[reader]!.storyAssets.length,
    )
    expect(next.log.chaosTokens.filter((t) => t === 'elderThing')).toHaveLength(2)
  })
})
