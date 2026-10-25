import {
  allPlayerCardDefs,
  applyInput,
  createGame,
  enemyHasKeyword,
  scenarioBehavior,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import {
  CODES,
  DEALERS,
  fortuneAndFollySet,
  GUARDS,
  PART_ONE,
  practiced,
  QUESTIONING,
  SPOTLIGHTS,
} from './cards'
import { alarmOf, checkedIcons } from './check'
import { patrolTarget } from './encounter'
import { GAMES } from './games'
import { parseIcon } from './icons'
import { fortuneAndFollyPartOne, ROLE } from './part-one'

const IDS = ['a', 'b', 'c', 'd']
const card = (code: string): EncounterCard =>
  ({ ...fortuneAndFollySet().find((c) => c.code === code)! }) as EncounterCard

/** Parte I preparada: cada investigador elige el primer Rol libre. */
function table(players = 1, difficulty: Difficulty = 'standard'): GameState {
  let s = throughSetup(
    createGame({
      seed: 3,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: fortuneAndFollyPartOne({ difficulty }),
    }),
  )
  while (s.pending?.question.prompt === 'prompt.fof.role')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  s = throughSetup(s)
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator', { name: 'A' })
  return s
}

function settle(s: GameState, preferred: string[] = [], stopAt = 'prompt.chooseAction'): GameState {
  for (let n = 0; s.pending && n < 60 && s.pending.question.prompt !== stopAt; n++) {
    const choice = [...preferred, 'choice.revealToken', 'choice.applyResults', 'choice.skip']
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
const stack =
  (...codes: string[]) =>
  (s: GameState): GameState => ({
    ...s,
    encounterDeck: [...codes.map(card), ...s.encounterDeck],
  })
const alarm =
  (id: string, level: number) =>
  (s: GameState): GameState => ({
    ...s,
    scenarioMeta: { ...s.scenarioMeta, [`fof:alarm:${id}`]: level },
  })
const raise = (investigator: string, amount: number): Message => ({
  type: 'ScenarioSpecific',
  key: 'fofAlarm',
  data: { investigator, amount },
})
const enemyOf = (s: GameState, code: string) =>
  Object.values(s.enemies).find((e) => e.code === code)!

describe('Fortune and Folly, Part I: setup', () => {
  it('places Abarran, the uniformed guard, Isamara, the Wellspring and the roles', () => {
    const s = table(2)
    expect(enemyOf(s, CODES.abarran).location).toBe(CODES.highRollersTable)
    expect(enemyOf(s, GUARDS[0]!).location).toBe(CODES.rouletteWheel)
    expect(s.encounterDeck.some((c) => c.code === GUARDS[0])).toBe(false)
    expect(s.encounterDeck).toHaveLength(23)
    expect(Object.values(s.placedAssets ?? {})[0]).toMatchObject({
      code: CODES.isamara,
      placement: { type: 'location', location: CODES.baccaratTable },
    })
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(14)
    expect(alarmOf(s, 'a')).toBe(1)
    expect(s.scenarioMeta?.[`${ROLE}a`]).toBe(CODES.theFace)
    expect(s.scenarioMeta?.[`${ROLE}b`]).toBe(CODES.theMuscle)
  })

  it('gives a lone investigator two roles', () => {
    const s = table(1)
    expect(Object.values(s.assets).map((a) => a.code)).toEqual([CODES.theFace, CODES.theMuscle])
  })
})

describe('Fortune and Folly, Part I: casino games', () => {
  const icons = (...t: string[]) => t.map(parseIcon)
  it('pays each game by its printed rules', () => {
    expect(GAMES.poker.prize(icons('♠4', '♥5', '♦6', '♣7', '♠8'), '')).toBe(5)
    expect(GAMES.poker.prize(icons('♠4', '♥4', '♦4', '♣7', '♠9'), '')).toBe(5)
    expect(GAMES.poker.prize(icons('♠4', '♥4', '♦6', '♣7', '♠9'), '')).toBe(0)
    expect(GAMES.roulette.prize(icons('♦Q'), 'red:Q')).toBe(5)
    expect(GAMES.roulette.prize(icons('♦Q'), 'black:Q')).toBe(0)
    expect(GAMES.baccarat.prize(icons('♦Q', '♣9'), 'player')).toBe(4)
    expect(GAMES.baccarat.prize(icons('♦Q', '♣8'), 'tie')).toBe(4)
    expect(GAMES.baccarat.prize(icons('♦Q', '♣7'), 'banker')).toBe(4)
    expect(GAMES.slots.prize(icons('♠4', '♠Q', '♠9'), '')).toBe(3)
    expect(GAMES.slots.prize(icons('♠4', '♥4', '♦4'), '')).toBe(3)
    expect(GAMES.highRoller.prize(icons('♠4', '♠5', '♠6', '♠K', '♠9'), '')).toBe(8)
    expect(GAMES.highRoller.prize(icons('♠4', '♥4', '♦4', '♣4', '♠9'), '')).toBe(8)
    expect(GAMES.highRoller.prize(icons('♠4', '♥4', '♦4', '♣8', '♠9'), '')).toBe(0)
  })

  it('plays the slots, removes Wellspring clues and skips cards without an icon', () => {
    let s = table(1)
    // 3 Mirada sospechosa (♣8, ♠7, ♣7): no gana; con un Lugar sin icono intercalado.
    s = during(s, (g) => stack('88041a', '88041b', '88041c')(at(CODES.slotMachines)(g)))
    s = choose(s, 'ability.fof.slots')
    s = settle(s)
    expect(s.investigators[0]!.resources).toBe(4)
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(6)
    // Ahora gana: tres ♣ (♣Q, ♣9, ♣10).
    s = during(s, (g) => stack('88035b', '88036b', '88037c')(g))
    s = choose(s, 'ability.fof.slots')
    s = settle(s)
    expect(s.investigators[0]!.resources).toBe(6)
    expect(s.stories?.[CODES.wellspring]?.clues).toBe(4)
  })

  it('lets the player mulligan at the poker table', () => {
    let s = table(1)
    // ♠7 ♠8 ♠9 ♠10 ♣Q y, debajo, ♠J: cambiar la ♣Q completa la escalera.
    s = during(s, (g) =>
      stack('88041b', '88038c', '88038a', '88039c', '88035a', '88039b')(at(CODES.pokerTable)(g)),
    )
    s = choose(s, 'ability.fof.poker')
    expect(s.pending?.question.prompt).toBe('prompt.fof.mulligan')
    s = choose(s, 'choice.fof.swapIcon', { icon: '♣Q' })
    s = choose(s, 'choice.fof.swapChosen')
    s = settle(s)
    expect(s.investigators[0]!.resources).toBe(8)
    expect(s.encounterDiscard.map((c) => c.code)).toContain('88035a')
  })

  it('lets The Grifter change a checked icon by raising the alarm', () => {
    let s = table(1)
    s = during(s, (g) => ({
      ...stack('88041a', '88041b', '88041c')(at(CODES.slotMachines)(g)),
      assets: Object.fromEntries(
        Object.entries(g.assets).map(([id, a]) => [id, { ...a, code: CODES.theGrifter }]),
      ),
    }))
    s = choose(s, 'ability.fof.slots')
    s = choose(s, 'choice.fof.grifterChange', { count: 1 })
    s = choose(s, 'choice.fof.icon', { icon: '♠7' })
    s = choose(s, 'choice.fof.suit', { suit: '♣' })
    s = choose(s, 'choice.fof.rank', { rank: '7' })
    s = settle(s)
    expect(alarmOf(s, 'a')).toBe(2)
    expect(s.investigators[0]!.resources).toBe(7)
  })

  it('names a colour and rank at the roulette wheel', () => {
    let s = table(1)
    s = during(s, (g) => stack('88037a')(at(CODES.rouletteWheel)(g)))
    s = choose(s, 'ability.fof.roulette')
    s = choose(s, 'choice.fof.red')
    s = choose(s, 'choice.fof.rank', { rank: 'Q' })
    s = settle(s)
    expect(s.investigators[0]!.resources).toBe(9)
    expect(checkedIcons(s)).toEqual([])
  })

  it('charges an extra action while a House Dealer is ready there', () => {
    let s = table(1)
    s = during(s, (g) => at(CODES.slotMachines)(g), {
      type: 'SpawnEnemy',
      card: card(DEALERS[0]!) as EnemyCard,
      location: CODES.slotMachines,
      engageWith: null,
    })
    const option = s.pending!.question.choices.find((c) => c.label === 'ability.fof.slots')
    expect(option?.display?.actions).toBe(2)
  })
})

describe('Fortune and Folly, Part I: alarm level and patrols', () => {
  it('damages you for each Casino Guard at your location when your alarm rises', () => {
    let s = table(1)
    s = during(s, at(CODES.rouletteWheel), raise('a', 2))
    s = settle(s)
    expect(alarmOf(s, 'a')).toBe(3)
    expect(s.investigators[0]!.damage).toBe(1)
    s = during(s, alarm('a', 10), raise('a', 1))
    expect(s.investigators[0]!.damage).toBe(1)
  })

  it('removes aloof from Casino enemies at a location with alarm 6 or higher', () => {
    let s = table(1)
    s = during(s, at(CODES.rouletteWheel))
    const guard = enemyOf(s, GUARDS[0]!)
    expect(enemyHasKeyword(s, guard, 'aloof')).toBe(true)
    expect(enemyHasKeyword(alarm('a', 6)(s), guard, 'aloof')).toBe(false)
  })

  it('patrols around the public ring and lets The Thief reverse it', () => {
    const s = table(1)
    const abarran = enemyOf(s, CODES.abarran)
    const guard = enemyOf(s, GUARDS[0]!)
    expect(patrolTarget(s, abarran)).toEqual([CODES.casinoLounge])
    expect(patrolTarget(s, guard)).toEqual([CODES.casinoLounge])
    const reversed = {
      ...s,
      scenarioMeta: { ...s.scenarioMeta, [`fof:reverse:${guard.id}`]: s.round },
    }
    expect(patrolTarget(reversed, guard)).toEqual([CODES.slotMachines])
  })

  it('raises the alarm at the start of the enemy phase next to a ready Casino enemy', () => {
    let s = table(1)
    s = during(s, at(CODES.rouletteWheel), {
      type: 'Forced',
      trigger: { type: 'enemyPhaseBegins' },
    })
    s = settle(s)
    expect(alarmOf(s, 'a')).toBe(2)
  })

  it('reads the alarm level in the skull token', () => {
    const s = alarm('a', 5)(table(1))
    const skull = scenarioBehavior(PART_ONE)!.tokenEffect!(s, 'skull', 'a')
    expect(skull.modifier).toBe(-3)
    const hard = { ...s, difficulty: 'hard' as const }
    expect(scenarioBehavior(PART_ONE)!.tokenEffect!(hard, 'skull', 'a').modifier).toBe(-5)
  })
})

describe('Fortune and Folly, Part I: tasks', () => {
  it('steals Abarran’s keys on a red icon', () => {
    let s = table(1)
    s = during(s, (g) => stack('88037a')(at(CODES.highRollersTable)(g)), {
      type: 'ScenarioSpecific',
      key: 'fofAbarranKeys',
      data: { investigator: 'a' },
    })
    expect(s.campaignLog?.notes ?? []).toContain('fofStoleAbarransKeys')
  })

  it('advances the agenda when an investigator engages Abarran', () => {
    let s = table(1)
    const abarran = enemyOf(s, CODES.abarran)
    s = during(s, at(CODES.highRollersTable), {
      type: 'EngageEnemy',
      investigator: 'a',
      enemy: abarran.id,
    })
    s = settle(s, ['choice.continue'])
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })

  it('knocks out the uniformed guard', () => {
    let s = table(1)
    s = during(s, (g) => ({ ...at(CODES.rouletteWheel)(g), chaosBag: [0] }))
    s = choose(s, 'ability.fof.uniform')
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofObtainedAnEmployeeUniform')
    expect(Object.values(s.enemies).some((e) => e.code === GUARDS[0])).toBe(false)
    expect(s.stories?.[CODES.ifTheUniformFits]).toBeUndefined()
  })

  it('convinces Isamara with 1 clue per investigator', () => {
    let s = table(1)
    s = during(s, (g) => ({ ...at(CODES.baccaratTable)(g), chaosBag: [0] }))
    s = choose(s, 'ability.fof.isamara', { difficulty: 1 })
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofConvincedIsamara')
    expect(labels(s)).not.toContain('ability.fof.isamara')
  })

  it('finds the vent once Casino Lounge has no clues', () => {
    let s = table(1)
    s = during(s, (g) => ({ ...at(CODES.casinoLounge)(g), chaosBag: [0] }))
    s = choose(s, 'ability.fof.vent')
    s = settle(s)
    expect(s.campaignLog?.notes).toContain('fofFoundAVent')
  })

  it('stashes an asset from hand for the heist', () => {
    const asset = allPlayerCardDefs().find(
      (d) => d.type === 'asset' && !d.story && !d.weakness && d.cost !== undefined,
    )!
    let s = table(1)
    s = during(s, (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, hand: [asset.code, ...i.hand] })),
    }))
    s = choose(s, 'ability.fof.stash')
    expect(s.investigators[0]!.hand).not.toContain(asset.code)
    expect(s.scenarioMeta?.['fof:stash:a']).toBe(asset.code)
  })
})

describe('Fortune and Folly, Part I: encounter cards', () => {
  const reveal = (code: string) => (s: GameState) =>
    during(s, (g) => g, { type: 'ResolveEncounterCard', investigator: 'a', card: card(code) })

  it('Inconvenient Questioning surges without non-unique Casino enemies', () => {
    let s = table(1)
    const guard = enemyOf(s, GUARDS[0]!)
    s = during(s, (g) => g, { type: 'DiscardEnemy', enemy: guard.id })
    s = reveal(QUESTIONING[0]!)(s)
    expect(s.encounterDiscard.some((c) => c.code === QUESTIONING[0])).toBe(true)
  })

  it('Arcane Spotlight raises the alarm of investigators at its location at round end', () => {
    let s = table(1)
    s = reveal(SPOTLIGHTS[0]!)(s)
    const spot = Object.values(s.treacheries).find((t) => t.code === SPOTLIGHTS[0])!
    expect(spot.placement).toEqual({ type: 'location', location: CODES.casinoFloor })
    s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(alarmOf(s, 'a')).toBe(2)
    expect(s.treacheries[spot.id]).toBeUndefined()
  })
})

describe('Fortune and Folly, Part I: resolutions and checkpoint', () => {
  it('resigning leads to R2, checks the cleaned-out task and records the checkpoint', () => {
    let s = table(1)
    s = during(s, (g) => ({
      ...g,
      actClues: 2,
      investigators: g.investigators.map((i) => ({ ...i, resources: 11, clues: 0 })),
      scenarioMeta: { ...g.scenarioMeta, 'fof:alarm:a': 3 },
    }))
    s = choose(s, 'ability.resign')
    s = settle(s, ['choice.continue'], 'prompt.fof.plan')
    expect(s.pending?.question.prompt).toBe('prompt.fof.plan')
    s = choose(s, 'choice.fof.practice', { card: CODES.theFace, name: 'A' })
    s = choose(s, 'choice.fof.planCalm')
    s = settle(s, ['choice.continue'])
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    const log = s.campaignLog!
    expect(log.notes).toContain('fofCleanedOutTheHouse')
    expect(log.values['fof:alarm:a']).toBe('2')
    expect(log.values['fof:role:a']).toBe(`${practiced(CODES.theFace)},${CODES.theMuscle}`)
    expect(log.values['fof:wellspring']).toBe('7')
  })

  it('defeated investigators raise their alarm level by 2 (R1)', () => {
    let s = table(1)
    s = during(s, (g) => g, { type: 'DefeatInvestigator', investigator: 'a' })
    s = settle(s, ['choice.continue'])
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.values['fof:alarm:a']).toBe('3')
  })
})
