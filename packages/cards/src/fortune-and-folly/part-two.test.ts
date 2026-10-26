import {
  applyInput,
  availableActions,
  createGame,
  enemyHasKeyword,
  scenarioBehavior,
  shroudOf,
  type CampaignLog,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, newCampaign, startScenario } from '../campaign'
import '../index'
import { CODES, fortunesChosenSet, PART_TWO, PART_TWO_CODES, planInShamblesSet } from './cards'
import { alarmOf } from './check'
import { BEARER, fortuneAndFollyPartTwo, HEIST_TASKS, tasksDone } from './part-two'

const IDS = ['a', 'b']
const emptyLog = (over: Partial<CampaignLog> = {}): CampaignLog => ({
  notes: [],
  crossedOut: [],
  values: {},
  chaosTokens: [],
  investigators: {},
  ...over,
})

/** Parte II preparada desde el registro (Roles anotados: El rostro y El músculo). */
function table(log: CampaignLog = emptyLog(), players = 1): GameState {
  const values: Record<string, string> = { ...log.values }
  for (const id of IDS.slice(0, players))
    values[`fof:role:${id}`] ??= id === 'a' ? CODES.theFace : CODES.theMuscle
  const full = { ...log, values }
  let s = createGame({
    seed: 3,
    interactive: true,
    investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
    scenario: fortuneAndFollyPartTwo({ log: full, players }),
    campaignLog: full,
  } as Parameters<typeof createGame>[0])
  s = throughSetup(s)
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return s
}

function settle(s: GameState, preferred: string[] = [], stopAt = 'prompt.chooseAction'): GameState {
  for (let n = 0; s.pending && n < 80 && s.pending.question.prompt !== stopAt; n++) {
    const choice = [
      ...preferred,
      'choice.revealToken',
      'choice.applyResults',
      'choice.continue',
      'choice.skip',
    ]
      .map((label) => s.pending!.question.choices.findIndex((c) => c.label === label))
      .find((n) => n >= 0)
    s = applyInput(s, { investigator: s.pending.investigator, choice: choice ?? 0 })
  }
  return s
}

const at =
  (where: string, extra: Partial<GameState['investigators'][number]> = {}) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, location: where, ...extra })),
    locations: {
      ...s.locations,
      [where]: { ...s.locations[where]!, revealed: true, clues: 0 },
    },
  })
const notes =
  (...keys: string[]) =>
  (s: GameState): GameState => ({
    ...s,
    campaignLog: { ...s.campaignLog!, notes: [...s.campaignLog!.notes, ...keys] },
  })
const meta =
  (values: Record<string, string | number>) =>
  (s: GameState): GameState => ({ ...s, scenarioMeta: { ...s.scenarioMeta, ...values } })
const stack =
  (...codes: string[]) =>
  (s: GameState): GameState => {
    const all = [...s.encounterDeck, ...s.encounterDiscard, ...s.setAside]
    return {
      ...s,
      encounterDeck: [
        ...codes.map((c) => ({ ...all.find((x) => x.code === c)! })),
        ...s.encounterDeck,
      ],
    }
  }
const enemyOf = (s: GameState, code: string) =>
  Object.values(s.enemies).find((e) => e.code === code)!
const spawn = (card: EnemyCard, location: string, engageWith: string | null = null): Message => ({
  type: 'SpawnEnemy',
  card,
  location,
  engageWith,
})
const chosen = (code: string) => fortunesChosenSet().find((c) => c.code === code)!

describe('Fortune and Folly, Part II: setup from the checkpoint', () => {
  it('restores alarm levels, roles, stash, Isamara, the Cash Cart and the Wellspring', () => {
    const s = table(
      emptyLog({
        notes: [
          'fofConvincedIsamara',
          'fofCleanedOutTheHouse',
          'fofNeedRest',
          'fofStoleAbarransKeys',
        ],
        values: {
          'fof:alarm:a': '4',
          'fof:role:a': `${CODES.theThief}b`,
          'fof:wellspring': '3',
          'fof:stash:a': 'a-card-19',
        },
      }),
    )
    expect(alarmOf(s, 'a')).toBe(4)
    expect(Object.values(s.assets).map((a) => a.code)).toEqual([`${CODES.theThief}b`])
    expect(s.investigators[0]!.hand).toContain('a-card-19')
    expect(s.investigators[0]!.deck).not.toContain('a-card-19')
    const placed = Object.values(s.placedAssets ?? {}).map((p) => [p.code, p.placement])
    expect(placed).toEqual([
      [PART_TWO_CODES.isamaraCrew, { type: 'location', location: CODES.casinoLoungeBusy }],
      [CODES.cashCart, { type: 'location', location: CODES.highRollersTableBusy }],
    ])
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(3)
    expect(s.doom).toBe(1)
    expect(s.locations[CODES.ownersOffice]?.enterCost).toBe(0)
    expect(s.locations[CODES.staffAccessHallway]?.enterCost).toBe(4)
    expect(enemyOf(s, '88035a').location).toBe(CODES.highRollersTableBusy)
    expect(enemyOf(s, '88037a').location).toBe(CODES.casinoFloorBusy)
  })

  it('sets Isamara and the Cash Cart aside without their tasks', () => {
    const s = table()
    expect(Object.values(s.placedAssets ?? {})).toEqual([])
    expect(alarmOf(s, 'a')).toBe(1)
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(7)
    expect(s.locations[CODES.ownersOffice]?.enterCost).toBe(2)
  })
})

describe('Fortune and Folly, Part II: restricted area', () => {
  it('revealing Staff Access Hallway spawns Abarran Unleashed and shuffles in Fortune’s Chosen', () => {
    let s = table()
    s = during(s, (g) => g, { type: 'RevealLocation', location: CODES.staffAccessHallway })
    expect(enemyOf(s, CODES.abarranUnleashed).location).toBe(CODES.ownersOffice)
    const deck = s.encounterDeck.map((c) => c.code)
    for (const c of fortunesChosenSet()) expect(deck).toContain(c.code)
  })

  it('Abarran Unleashed hunts while anyone has alarm 5 or more', () => {
    let s = table()
    s = during(s, (g) => g, { type: 'RevealLocation', location: CODES.staffAccessHallway })
    const abarran = enemyOf(s, CODES.abarranUnleashed)
    expect(enemyHasKeyword(s, abarran, 'hunter')).toBe(false)
    expect(enemyHasKeyword(meta({ 'fof:alarm:a': 5 })(s), abarran, 'hunter')).toBe(true)
  })

  it('keeps Vault Door closed until 4 heist tasks are done', () => {
    let s = table()
    s = during(s, (g) => at(CODES.countingRoom)(g))
    const moves = (g: GameState) =>
      availableActions(g, 'a')
        .filter((a) => a.kind === 'move')
        .map((a) => (a as { to: string }).to)
    expect(moves(s)).not.toContain(CODES.vaultDoor)
    s = during(s, notes(...HEIST_TASKS.slice(0, 4)))
    expect(tasksDone(s)).toBe(4)
    expect(moves(s)).toContain(CODES.vaultDoor)
  })

  it('makes Owner’s Office shroud the highest alarm level there', () => {
    let s = table()
    s = during(s, (g) => meta({ 'fof:alarm:a': 6 })(at(CODES.ownersOffice)(g)))
    expect(shroudOf(s, CODES.ownersOffice)).toBe(6)
  })

  it('opens the Relic Room from Vault Door and takes the Wellspring', () => {
    let s = table()
    s = during(s, (g) => ({
      ...notes('fofFoundAbarransSigil')(at(CODES.vaultDoor, { clues: 4 })(g)),
      chaosBag: [1],
    }))
    s = choose(s, 'ability.fof.vaultRelic')
    s = settle(s, ['choice.test.willpower', 'choice.fof.openRelicRoom'])
    expect(s.locations[CODES.relicRoom]?.revealed).toBe(true)
    // Las 7 pistas del manantial pasan a la Sala de reliquias (más la suya).
    expect(s.locations[CODES.relicRoom]?.clues).toBe(8)
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(0)
    s = during(s, (g) => ({
      ...at(CODES.relicRoom)(g),
      enemies: {},
    }))
    s = choose(s, 'ability.fof.takeWellspring')
    s = settle(s)
    expect(s.scenarioMeta?.[BEARER]).toBe('a')
    expect(s.acts[s.actIndex]?.code).toBe(CODES.theExit)
  })

  it('moves Abarran to the Relic Room when the Wellspring is taken', () => {
    let s = table()
    s = during(s, (g) => g, { type: 'RevealLocation', location: CODES.staffAccessHallway })
    s = during(s, (g) => meta({ [BEARER]: 'a' })(g), { type: 'CheckActObjective' })
    s = settle(s)
    expect(enemyOf(s, CODES.abarranUnleashed).location).toBe(CODES.relicRoom)
  })

  it('records the observed staff when an icon matches an enemy rank', () => {
    let s = table()
    // En juego: Guardia ♣Q y Patrulla ♥Q.
    s = during(s, (g) => stack('88037c')(at(CODES.securityOffice)(g)))
    s = choose(s, 'ability.fof.security')
    s = choose(s, 'choice.fof.checkN', { n: 1 })
    s = settle(s)
    // ♣10 no coincide con ninguna Q.
    expect(s.campaignLog?.notes).not.toContain('fofObservedTheStaff')
    // ♥J y ♠Q: la Q coincide.
    s = during(s, (g) => stack('88037b', '88039a')(g))
    s = choose(s, 'ability.fof.security')
    s = choose(s, 'choice.fof.checkN', { n: 2 })
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofObservedTheStaff')
  })

  it('buys a schematic in the Counting Room and allows two mulligans at Vault Door', () => {
    let s = table()
    s = during(s, (g) => at(CODES.countingRoom, { resources: 10 })(g))
    s = choose(s, 'ability.fof.schematic', { amount: 10 })
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofObtainedASchematic')
    expect(s.investigators[0]!.resources).toBe(0)
    s = during(s, (g) => stack('88039a', '88037b', '88040a')(at(CODES.vaultDoor)(g)))
    s = choose(s, 'ability.fof.vaultMove')
    expect(s.pending?.question.prompt).toBe('prompt.fof.mulligan')
    s = choose(s, 'choice.fof.swapIcon', { icon: '♠Q' })
    s = choose(s, 'choice.fof.swapChosen')
    s = choose(s, 'choice.fof.swapIcon', { icon: '♥J' })
    s = choose(s, 'choice.fof.swapChosen')
    s = settle(s)
    // ♦Q: a la Mesa de bacará.
    expect(s.investigators[0]!.location).toBe(CODES.baccaratTable)
  })

  it('impersonates a guard with the uniform in an empty, searched Guard Room', () => {
    let s = table()
    s = during(s, (g) => notes('fofObtainedAnEmployeeUniform')(at(CODES.guardRoom)(g)))
    s = choose(s, 'ability.fof.disguise')
    expect(s.campaignLog?.notes).toContain('fofImpersonatedAGuard')
  })
})

describe('Fortune and Folly, Part II: crew and tasks', () => {
  it('Isamara mesmerizes the guards in a restricted location', () => {
    let s = table(emptyLog({ notes: ['fofConvincedIsamara'] }))
    s = during(s, (g) => ({ ...at(CODES.casinoLoungeBusy)(g), chaosBag: [0] }))
    s = choose(s, 'ability.fof.recruitIsamara')
    expect(Object.values(s.assets).some((a) => a.code === PART_TWO_CODES.isamaraCrew)).toBe(true)
    s = during(
      s,
      (g) => at(CODES.guardRoom, { actionsRemaining: 3 })(g),
      spawn(chosen('88046a'), CODES.guardRoom),
    )
    s = choose(s, 'ability.fof.mesmerize')
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofIsamaraMesmerized')
    expect(enemyOf(s, '88046a').exhausted).toBe(true)
  })

  it('hides in the Cash Cart until it breaks: stayed out of sight', () => {
    let s = table(emptyLog({ notes: ['fofCleanedOutTheHouse'] }))
    s = during(s, (g) => at(CODES.highRollersTableBusy)(g))
    for (let n = 0; n < 3; n++) {
      s = during(s, (g) => g, spawn(chosen('88046a'), CODES.highRollersTableBusy, 'a'))
      s = settle(s, ['ability.fof.hideInCart'])
    }
    expect(s.campaignLog?.notes).toContain('fofStayedOutOfSight')
    expect(Object.values(s.placedAssets ?? {})).toEqual([])
  })

  it('wins a cultist medallion at the busy High Roller’s Table', () => {
    let s = table()
    // ♠Q ♠J ♠10 ♠9 ♠8: escalera del mismo palo.
    s = during(s, (g) =>
      stack('88039a', '88039b', '88039c', '88038a', '88038c')(at(CODES.highRollersTableBusy)(g)),
    )
    s = choose(s, 'ability.fof.medallion')
    s = settle(s, ['choice.fof.noMulligan'])
    expect(s.investigators[0]!.resources).toBe(9)
    expect(s.campaignLog?.notes).toContain('fofWonACultistMedallion')
  })

  it('delivers a decoy package to Vault Door', () => {
    let s = table()
    s = during(s, (g) => notes('fofImpersonatedAHighRoller')(g))
    s = choose(s, 'ability.fof.delivery')
    s = settle(s)
    const carrier = Object.values(s.enemies).find((e) => e.id === s.scenarioMeta?.['fof:package'])!
    expect(carrier.traits).not.toContain('Casino')
    expect(scenarioBehavior(PART_TWO)).toBeDefined()
    s = during(s, (g) => g, { type: 'MoveEnemy', enemy: carrier.id, location: CODES.vaultDoor })
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofDeliveredADecoyPackage')
    expect(s.enemies[carrier.id]).toBeUndefined()
  })
})

describe('Fortune and Folly, Part II: agendas and Plan in Shambles', () => {
  it('Opening Hand spawns the Dimensional Shambler and shuffles in Plan in Shambles', () => {
    let s = table()
    s = during(s, (g) => g, { type: 'AdvanceAgenda' })
    s = settle(s)
    expect(enemyOf(s, PART_TWO_CODES.dimensionalShambler).location).toBe(CODES.rouletteWheel)
    for (const c of planInShamblesSet())
      expect(s.encounterDeck.map((x) => x.code)).toContain(c.code)
    expect(alarmOf(s, 'a')).toBe(2)
  })

  it('The Turn resolves one Fortune’s Disfavor at random', () => {
    let s = table()
    s = during(s, (g) => ({ ...g, agendaIndex: 1 }), { type: 'AdvanceAgenda' })
    s = settle(s)
    const stories = Object.keys(s.stories ?? {})
    expect(stories.filter((c) => ['88025b', '88026b', '88027b'].includes(c))).toHaveLength(1)
  })

  it('Lights Out adds shroud and an extra cost to location abilities', () => {
    let s = table()
    s = during(s, (g) => meta({ 'fof:dark': 'public,restricted' })(at(CODES.slotMachines)(g)))
    expect(shroudOf(s, CODES.slotMachines)).toBe(3)
    const slots = s.pending!.question.choices.filter((c) => c.label === 'ability.fof.slots')
    expect(slots.map((c) => c.display?.actions)).toEqual([2, 1])
  })

  it('Unlikely Injuries limit one move action per turn', () => {
    let s = table()
    s = during(s, (g) => meta({ 'fof:injury:a': '♥' })(g))
    s = choose(s, 'action.move', { location: 'Poker Table' })
    s = settle(s)
    expect(labels(s)).not.toContain('action.move')
    s = choose(s, 'ability.fof.ignoreInjury.horror')
    expect(labels(s)).toContain('action.move')
  })

  it('the Dimensional Shambler moves after the same action twice in a row', () => {
    let s = table()
    s = during(s, (g) => g, {
      type: 'SpawnSetAsideEnemy',
      code: PART_TWO_CODES.dimensionalShambler,
      location: CODES.slotMachines,
    })
    s = choose(s, 'action.resource')
    s = settle(s)
    expect(enemyOf(s, PART_TWO_CODES.dimensionalShambler).location).toBe(CODES.slotMachines)
    s = choose(s, 'action.resource')
    s = settle(s)
    expect(enemyOf(s, PART_TWO_CODES.dimensionalShambler).location).toBe(CODES.casinoFloorBusy)
  })

  it('Fortune’s Dagger adds 1 damage per club checked when it attacks', () => {
    let s = table()
    s = during(
      s,
      (g) => stack('88035a', '88041a')(g),
      spawn(chosen('88047a'), CODES.casinoFloorBusy, 'a'),
    )
    s = during(s, (g) => g, {
      type: 'EnemyAttack',
      enemy: enemyOf(s, '88047a').id,
      investigator: 'a',
      exhaustAfter: false,
    })
    s = settle(s)
    expect(s.investigators[0]!.damage).toBe(3)
  })

  it('Fortune’s Shield cancels 1 damage on a heart', () => {
    let s = table()
    s = during(s, (g) => stack('88037b')(g), spawn(chosen('88046a'), CODES.casinoFloorBusy))
    const shield = enemyOf(s, '88046a')
    s = during(s, (g) => g, {
      type: 'DamageEnemy',
      enemy: shield.id,
      amount: 2,
      by: 'a',
    } as Message)
    s = settle(s)
    expect(s.enemies[shield.id]?.damageTaken).toBe(1)
  })
})

describe('Fortune and Folly, Part II: resolutions', () => {
  it('escaping with the Wellspring is Resolution 1 with bonus experience for extra tasks', () => {
    let s = table()
    s = during(s, (g) => ({
      ...notes(...HEIST_TASKS.slice(0, 6))(meta({ [BEARER]: 'a' })(g)),
      actIndex: 1,
    }))
    s = choose(s, 'ability.resign')
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.notes).toContain('fofEarnedDeckOfPossibilities')
    expect(s.campaignLog?.notes).not.toContain('fofBadLuck')
  })

  it('resigning without the Wellspring is Resolution 2 and binds bad luck', () => {
    let s = table()
    s = choose(s, 'ability.resign')
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain('fofBadLuck')
  })
})

describe('Fortune and Folly, Part II: more encounter cards', () => {
  const card = (code: string) => planInShamblesSet().find((c) => c.code === code)!
  const reveal = (code: string) => (s: GameState) =>
    during(s, (g) => g, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { ...card(code) },
    })

  it('Dimensional Duplicator puts the top card of your deck into play as a 1/1 enemy', () => {
    let s = table()
    s = during(s, (g) => g, spawn(card('88049a') as EnemyCard, CODES.casinoFloorBusy, 'a'))
    const duplicator = enemyOf(s, '88049a')
    const top = s.investigators[0]!.deck[0]
    s = during(s, (g) => g, {
      type: 'DamageEnemy',
      enemy: duplicator.id,
      amount: 1,
      by: 'a',
    } as Message)
    s = settle(s)
    const copy = Object.values(s.enemies).find((e) => e.name === 'Dimensional Duplicate')!
    expect(copy).toMatchObject({ fight: 1, health: 1, engagedWith: 'a' })
    expect(s.investigators[0]!.discard).toContain(top)
  })

  it('Dimensional Displacer replaces the nearest non-unique Casino enemy', () => {
    let s = table()
    // La Patrulla de seguridad de la Zona de juego es la más cercana.
    const patrol = enemyOf(s, '88037a')
    s = reveal('88050a')(s)
    s = settle(s)
    expect(s.enemies[patrol.id]).toBeUndefined()
    expect(enemyOf(s, '88035a')).toBeDefined()
    expect(enemyOf(s, '88050a').location).toBe(CODES.casinoFloorBusy)
  })

  it('Dimensional Hypnosis tests willpower to leave its location', () => {
    let s = table()
    s = reveal('88051a')(s)
    s = during(s, (g) => ({ ...g, chaosBag: [-5] }))
    s = choose(s, 'action.move', { location: 'Poker Table' })
    s = settle(s)
    expect(s.investigators[0]!.location).toBe(CODES.casinoFloorBusy)
    expect(Object.values(s.treacheries).some((t) => t.code === '88051a')).toBe(false)
  })

  it('Grip of the Beyond deals 2 damage minus each move this turn', () => {
    let s = table()
    s = reveal('88052a')(s)
    s = choose(s, 'action.move', { location: 'Poker Table' })
    s = settle(s)
    s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    expect(s.investigators[0]!.damage).toBe(1)
  })

  it('Hunter’s Hunger without allies tests agility for direct damage and horror', () => {
    let s = table()
    s = during(s, (g) => ({ ...g, chaosBag: [-5] }))
    s = reveal('88053a')(s)
    s = settle(s, ['choice.test.agility'])
    expect(s.investigators[0]!).toMatchObject({ damage: 1, horror: 1 })
  })

  it('Personal Entanglement collects horror and hurts everyone at 6', () => {
    let s = table()
    s = during(
      s,
      (g) => g,
      { type: 'PutStoryIntoPlay', code: '88027b', name: 'Entanglement' },
      {
        type: 'ScenarioSpecific',
        key: 'fof_personalEntanglement',
      },
    )
    for (let n = 0; n < 6; n++)
      s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
    expect(s.stories?.['88027b']).toBeUndefined()
    expect(s.investigators[0]!.horror).toBe(2)
  })

  it('All Bets Down defeats the investigators still inside (R3)', () => {
    let s = table()
    s = during(s, (g) => ({ ...g, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(s.campaignLog?.notes).toContain('fofBadLuck')
  })
})

describe('Fortune and Folly: from Part I to Part II in the campaign', () => {
  it('carries the checkpoint into the heist', () => {
    let campaign = newCampaign('fortune-and-folly', ['joe'], 'standard')
    let s = startScenario(campaign, 3)
    s = throughSetup(s)
    while (s.pending?.question.prompt === 'prompt.fof.role')
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    s = settle(s)
    s = during(s, (g) => meta({ [`fof:alarm:${g.investigators[0]!.id}`]: 5 })(g))
    s = choose(s, 'ability.resign')
    s = settle(s)
    campaign = finishScenario(campaign, s)
    const two = throughSetup(startScenario(campaign, 4))
    expect(two.scenarioId).toBe(PART_TWO)
    const id = two.investigators[0]!.id
    expect(alarmOf(two, id)).toBe(5)
    expect(Object.values(two.assets).length).toBe(2)
  })
})
