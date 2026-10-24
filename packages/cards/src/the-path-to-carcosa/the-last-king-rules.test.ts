import {
  availableAbilities,
  getInvestigator,
  scenarioBehavior,
  shroudOf,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario } from '../campaign'
import { ENCOUNTER_SETS, SETS } from './encounter-sets'
import {
  bystander,
  enemyCode,
  game,
  placeAt,
  prep,
  resolveTest,
  update,
  withBag,
} from './last-king-testing'
import { carcosaCount } from './log'
import { CODES, INTERVIEWED, THE_LAST_KING, VIPS } from './the-last-king'
import { afterCurtainCall } from './the-last-king-playthrough.test'
import { THE_MAN_IN_THE_PALLID_MASK, theManInThePallidMask } from './the-man-in-the-pallid-mask'
import { startScenario } from '../campaign'

const ALL = Object.values(ENCOUNTER_SETS).flat()
const cardOf = (code: string): EncounterCard => ({ ...ALL.find((c) => c.code === code)! })
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: cardOf(code),
})
const spawn = (code: string, location: string, engageWith: string | null = null): Message => ({
  type: 'SpawnEnemy',
  card: cardOf(code) as EnemyCard,
  location,
  engageWith,
})
const behavior = () => scenarioBehavior(THE_LAST_KING)!

/** Lee los textos pendientes y elige la primera opción hasta que no quede pregunta. */
function readAll(state: GameState, pick: (labels: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 40 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = choose(
      s,
      s.pending.question.choices[pick(labels(s))]!.label,
      s.pending.question.choices[pick(labels(s))]!.params,
    )
  return s
}

// Referencia de escenario 03061.
describe('The Last King: chaos tokens', () => {
  it('skull reveals another token; failing places 1 doom on a Lunatic enemy', () => {
    let state = prep(game(), [], spawn(SETS.maniac, CODES.courtyard))
    const effect = behavior().tokenEffect!(state, 'skull', 'a')
    expect(effect).toMatchObject({ modifier: 0, revealAnother: true })
    state = during(state, keep, ...effect.onFail!)
    expect(enemyCode(state, SETS.maniac)!.doom).toBe(1)
  })

  it('hard skull: the Lunatic with the most remaining health gets the doom', () => {
    let state = game(1, 'hard')
    state = prep(
      state,
      [],
      spawn(SETS.maniac, CODES.courtyard),
      spawn(SETS.youngPsychopath, CODES.courtyard),
    )
    state = during(state, keep, ...behavior().tokenEffect!(state, 'skull', 'a').onFail!)
    expect(enemyCode(state, SETS.maniac)!.doom).toBe(1)
    expect(enemyCode(state, SETS.youngPsychopath)!.doom ?? 0).toBe(0)
  })

  it.each([
    ['standard', 'cultist', -2, 'onFail'],
    ['hard', 'cultist', -3, 'immediate'],
    ['standard', 'tablet', -4, 'onFail'],
    ['expert', 'tablet', -4, 'immediate'],
  ] as const)('%s %s: %i, effect %s', (difficulty, token, modifier, when) => {
    const state = game(1, difficulty)
    const effect = behavior().tokenEffect!(state, token, 'a')
    expect(effect.modifier).toBe(modifier)
    expect(effect[when]).toHaveLength(1)
  })

  it('cultist places 1 of your clues on your location; elder thing is minus the shroud', () => {
    let state = prep(game(), [update('a', { clues: 2 })])
    state = during(state, keep, ...behavior().tokenEffect!(state, 'cultist', 'a').onFail!)
    expect(getInvestigator(state, 'a').clues).toBe(1)
    expect(state.locations[CODES.foyer]!.clues).toBe(2)
    expect(behavior().tokenEffect!(state, 'elderThing', 'a').modifier).toBe(-2)
    expect(behavior().tokenEffect!(game(1, 'hard'), 'elderThing', 'a').onFail).toHaveLength(1)
  })
})

describe('The Last King: locations', () => {
  it('Foyer: resign', () => {
    const state = game()
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.resign')).toBe(true)
  })

  it('Gallery: ending your turn there, willpower (2) or leave 1 clue', () => {
    let state = prep(game(), [placeAt(CODES.gallery), update('a', { clues: 1 }), withBag(-8)], {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    state = resolveTest(state)
    expect(getInvestigator(state, 'a').clues).toBe(0)
    expect(state.locations[CODES.gallery]!.clues).toBe(1)
  })

  it('Courtyard: entering discards the top encounter card, or draws it if it is an enemy', () => {
    let state = game()
    const top = (code: string) => (s: GameState) => ({
      ...s,
      encounterDeck: [cardOf(code), ...s.encounterDeck],
    })
    state = during(state, top(SETS.ancientEvils), {
      type: 'MoveTo',
      investigator: 'a',
      location: CODES.courtyard,
    })
    expect(state.encounterDiscard.map((c) => c.code)).toContain(SETS.ancientEvils)
    expect(state.doom).toBe(0)
    state = during(state, (s) => top(SETS.roachSwarm)(placeAt(CODES.foyer)(s)), {
      type: 'MoveTo',
      investigator: 'a',
      location: CODES.courtyard,
    })
    expect(enemyCode(state, SETS.roachSwarm)).toMatchObject({ engagedWith: 'a' })
  })

  it('Dining Room: heals 1 horror; a skull or auto-fail token deals 1 horror and 1 doom', () => {
    let state = prep(game(), [placeAt(CODES.diningRoom), update('a', { horror: 2 }), withBag(0)], {
      type: 'RevealLocation',
      location: CODES.diningRoom,
    })
    const heal = availableAbilities(state, 'a').find((a) => a.key.endsWith(':heal'))!
    state = during(state, keep, ...heal.then)
    expect(getInvestigator(state, 'a').horror).toBe(1)
    state = prep(state, [withBag('skull')], ...heal.then)
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(state.locations[CODES.diningRoom]!.doom).toBe(1)
  })
})

describe('The Last King: Hastur’s Gift, Decay and Filth, The Stranger, Ancient Evils', () => {
  it('Maniac: after it engages you, 1 damage to you and to it', () => {
    const state = prep(game(), [], spawn(SETS.maniac, CODES.foyer, 'a'))
    expect(getInvestigator(state, 'a').damage).toBe(1)
    expect(enemyCode(state, SETS.maniac)!.damageTaken).toBe(1)
  })

  it('Young Psychopath: 1 horror or +3 fight until the end of the investigation phase', () => {
    let state = during(game(), keep, spawn(SETS.youngPsychopath, CODES.foyer, 'a'))
    expect(labels(state)).toEqual(['choice.takeHorror', 'choice.psychopathFight'])
    state = choose(state, 'choice.psychopathFight')
    const young = enemyCode(state, SETS.youngPsychopath)!
    const fight = (s: GameState) => behavior().enemyStat!(s, young, 'fight')
    expect(fight(state)).toBe(3)
    expect(fight({ ...state, phase: 'enemy' })).toBe(0)
    expect(fight({ ...state, round: state.round + 1, phase: 'investigation' })).toBe(0)
  })

  it('Dance of the Yellow King: surge without Lunatics; else the nearest comes and attacks', () => {
    let state = during(game(), keep, draw(SETS.danceOfTheYellowKing))
    expect(state.encounterDiscard.some((c) => c.code === SETS.danceOfTheYellowKing)).toBe(true)
    state = prep(game(), [withBag(-8)], spawn(SETS.maniac, CODES.gallery))
    const id = enemyCode(state, SETS.maniac)!.id
    state = during(
      state,
      (s) => ({ ...s, enemies: { ...s.enemies, [id]: { ...s.enemies[id]!, exhausted: true } } }),
      draw(SETS.danceOfTheYellowKing),
    )
    state = readAll(resolveTest(state))
    expect(enemyCode(state, SETS.maniac)).toMatchObject({ location: CODES.foyer, engagedWith: 'a' })
    // Se enfrenta (1 daño del Maníaco) y ataca (1 daño).
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('Ooze and Filth: +1 shroud everywhere until the end of the round', () => {
    let state = during(game(), keep, draw(SETS.oozeAndFilth))
    expect(shroudOf(state, CODES.courtyard)).toBe(6)
    expect(shroudOf(state, CODES.foyer)).toBe(3)
    state = during(state, keep, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(shroudOf(state, CODES.foyer)).toBe(2)
  })

  it('Corrosion: discard Items costing at least the shroud; none discarded means surge', () => {
    let state = prep(game(), [update('a', { hand: ['12019', '12002', 'x'] })])
    state = during(state, keep, draw(SETS.corrosion))
    // Velo 2: basta con la M1911 (coste 3).
    expect(labels(state)).toEqual(['choice.card', 'choice.card'])
    state = choose(state, 'choice.card', { card: 'M1911' })
    expect(getInvestigator(state, 'a').hand).toEqual(['12002', 'x'])
    state = prep(state, [update('a', { hand: ['x'] })], draw(SETS.corrosion))
    expect(state.encounterDiscard.filter((c) => c.code === SETS.corrosion)).toHaveLength(2)
  })

  it('Roach Swarm fights with the shroud of its location', () => {
    const state = prep(game(), [], spawn(SETS.roachSwarm, CODES.courtyard))
    expect(behavior().enemyStat!(state, enemyCode(state, SETS.roachSwarm)!, 'fight')).toBe(5)
  })

  it('Marked by the Sign: willpower (2); with the Stranger in play, +2 and direct horror', () => {
    let state = prep(game(), [withBag(0)], draw(SETS.markedByTheSign))
    expect(state.skillTest?.difficulty).toBe(2)
    state = prep(
      game(),
      [withBag(-8)],
      {
        type: 'SpawnEnemy',
        card: { ...theManInThePallidMask },
        location: CODES.courtyard,
        engageWith: null,
      },
      draw(SETS.markedByTheSign),
    )
    expect(state.skillTest?.difficulty).toBe(4)
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').horror).toBe(2)
  })

  it('The Pale Mask Beckons: the bearer draws the Stranger; in play, he attacks everybody', () => {
    let state = prep(
      game(2),
      [update('b', { deck: ['y', THE_MAN_IN_THE_PALLID_MASK, 'z'] })],
      draw(SETS.thePaleMaskBeckons),
    )
    state = readAll(state)
    const man = Object.values(state.enemies).find((e) => e.code === THE_MAN_IN_THE_PALLID_MASK)!
    expect(man).toBeDefined()
    expect(getInvestigator(state, 'b').deck).not.toContain(THE_MAN_IN_THE_PALLID_MASK)
    state = readAll(during(state, keep, draw(SETS.thePaleMaskBeckons)))
    expect(getInvestigator(state, 'a').horror + getInvestigator(state, 'b').horror).toBe(2)
  })

  it('Ancient Evils places 1 doom on the agenda', () => {
    const state = during(game(), keep, draw(SETS.ancientEvils))
    expect(state.doom).toBe(1)
  })

  it('Fine Dining: give a bystander 1 of your clues, or take 1 damage and 1 horror', () => {
    let state = during(game(), keep, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { ...state0().encounterDeck.find((c) => c.code === CODES.fineDining)! },
    })
    expect(getInvestigator(state, 'a')).toMatchObject({ damage: 1, horror: 1 })
    state = prep(state, [update('a', { clues: 1 })], {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { ...state0().encounterDeck.find((c) => c.code === CODES.fineDining)! },
    })
    expect(labels(state)).toContain('choice.lastKing.clueOn')
    state = choose(state, 'choice.lastKing.clueOn', { card: 'Jordan Perry' })
    expect(bystander(state, 'Jordan').clues).toBe(3)
    expect(getInvestigator(state, 'a').clues).toBe(0)
  })
})

const state0 = () => game()

describe('The Last King: resolutions and Interlude I', () => {
  /** Partida de campaña con el registro real. */
  const campaignGame = (players = 2) => {
    const campaign = afterCurtainCall(players)
    let state = startScenario(campaign, 41)
    state = readAll(state)
    return { campaign, state }
  }

  const end = (state: GameState, ...mods: ((s: GameState) => GameState)[]) =>
    during(state, (s) => mods.reduce((n, m) => m(n), s), {
      type: 'EndScenario',
      outcome: { type: 'noResolution' },
    })

  it('eliminated investigators place their clues on the act', () => {
    let { state } = campaignGame()
    const [a, b] = state.investigators
    state = during(
      state,
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) => (i.id === a!.id ? { ...i, clues: 3 } : i)),
      }),
      { type: 'Resign', investigator: a!.id },
    )
    expect(state.actClues).toBe(3)
    expect(state.locations[CODES.foyer]!.clues).toBe(2)
    expect(b).toBeDefined()
  })

  it('R1 (someone resigned): records, clue experience split as evenly as possible, Interlude I', () => {
    const { campaign, state: start } = campaignGame()
    const [a, b] = start.investigators.map((i) => i.id)
    const constance = VIPS[0]!
    let state = end(start, (s) => ({
      ...s,
      actClues: 7,
      victoryDisplay: [...s.victoryDisplay, constance.enemy.code],
      scenarioMeta: { ...s.scenarioMeta, [`${INTERVIEWED}Jordan`]: 1 },
      investigators: s.investigators.map((i) =>
        i.id === a ? { ...i, resigned: true, eliminated: true } : i,
      ),
    }))
    // R1 → bonus 3 (7 clues): 1 each, 1 more for the investigator the lead chooses.
    state = readAll(state, (ls) => Math.max(0, ls.indexOf('story.theLastKing.interludeChoice3')))
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 1 })
    const next = finishScenario(campaign, state)
    const xp = [a!, b!].map((id) => next.log.investigators[id]!.xp)
    expect(xp.sort()).toEqual([1, 2])
    expect(next.log.notes).toEqual(
      expect.arrayContaining([
        'carcosaInterviewedJordan',
        'carcosaSlainConstance',
        'carcosaSlewTheMonsters',
        ...VIPS.map((v) => `carcosaSlain${v.key}`),
      ]),
    )
    expect(carcosaCount(next.log, 'conviction')).toBe(1)
    expect(next.log.chaosTokens).toEqual(['cultist', 'cultist'])
  })

  it.each([
    [1, 'carcosaSecretMeeting', ['elderThing', 'elderThing'], 'doubt'],
    [2, 'carcosaFledTheParty', ['tablet', 'tablet'], null],
  ] as const)('Interlude I option %i', (n, note, tokens, mark) => {
    const { campaign, state: start } = campaignGame()
    let state = end(start, (s) => ({
      ...s,
      investigators: s.investigators.map((i, k) => (k === 0 ? { ...i, resigned: true } : i)),
    }))
    state = readAll(state, (ls) => Math.max(0, ls.indexOf(`story.theLastKing.interludeChoice${n}`)))
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain(note)
    expect(next.log.chaosTokens).toEqual(tokens)
    if (mark) expect(carcosaCount(next.log, mark)).toBe(1)
    else expect(carcosaCount(next.log, 'doubt') + carcosaCount(next.log, 'conviction')).toBe(0)
  })

  it('R2 (all defeated): 1 cultist, 1 tablet and 1 elder thing; no interlude', () => {
    const { campaign, state: start } = campaignGame()
    let state = end(start, (s) => ({
      ...s,
      campaignLog: { ...s.campaignLog!, chaosTokens: ['tablet', 'tablet', 'cultist'] },
    }))
    state = readAll(state)
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 2 })
    const next = finishScenario(campaign, state)
    expect(next.log.chaosTokens).toEqual(['cultist', 'tablet', 'elderThing'])
    expect(next.log.notes).not.toContain('carcosaFledTheParty')
  })

  it('R3: interviewed VIPs are recorded and crossed out', () => {
    const { campaign, state: start } = campaignGame(1)
    let state = during(
      start,
      (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [`${INTERVIEWED}Haruko`]: 1 } }),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
    )
    state = readAll(state)
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaInterviewedHaruko')
    expect(next.log.crossedOut).toContain('carcosaInterviewedHaruko')
    expect(next.log.chaosTokens).toEqual(['cultist', 'tablet', 'elderThing'])
  })
})
