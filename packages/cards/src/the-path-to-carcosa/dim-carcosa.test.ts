import {
  availableAbilities,
  createGame,
  enemyBehavior,
  getInvestigator,
  allPlayerCardDefs,
  playableCards,
  scenarioBehavior,
  type Difficulty,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { canPlayNext, finishScenario, startScenario } from '../campaign'
import '../index'
import {
  act2Version,
  canFlip,
  CODES,
  creatureOutOfDemhe,
  DIM_CARCOSA,
  dimCarcosa,
  hasturDamage,
  hasturLordOfCarcosa,
  hasturTatteredKing,
  remainingSanity,
  STORY_OF,
  wingedOne,
} from './dim-carcosa'
import { afterBlackStars } from './dim-playthrough.test'
import { SETS } from './encounter-sets'
import { THE_MAN_IN_THE_PALLID_MASK } from './the-man-in-the-pallid-mask'

const IDS = ['a', 'b', 'c', 'd']
type Mod = (s: GameState) => GameState
const log = (notes: string[], values: Record<string, string> = {}) => ({
  notes,
  crossedOut: [],
  values,
  chaosTokens: [],
  investigators: {},
})

function game(
  players = 1,
  {
    notes = ['carcosaOpenedThePathBelow'],
    values = {},
    difficulty = 'standard',
    seed = 3,
  }: {
    notes?: string[]
    values?: Record<string, string>
    difficulty?: Difficulty
    seed?: number
  } = {},
): GameState {
  let state = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      investigators: IDS.slice(0, players).map((id) => testInvestigator(id)),
      scenario: dimCarcosa({ difficulty, seed, log: log(notes, values) }),
      campaignLog: {
        ...log(notes, values),
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
const atAct =
  (index: number): Mod =>
  (s) => ({ ...s, actIndex: index })
const atAgenda =
  (index: number): Mod =>
  (s) => ({ ...s, agendaIndex: index })
const noClues =
  (...ids: string[]): Mod =>
  (s) => ({
    ...s,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, ids.includes(id) ? { ...l, clues: 0 } : l]),
    ),
  })
const meta =
  (key: string, value: string | number = 1): Mod =>
  (s) => ({ ...s, scenarioMeta: { ...s.scenarioMeta, [key]: value } })
const prep = (state: GameState, mods: Mod[], ...messages: Message[]) =>
  during(state, (s) => mods.reduce((next, mod) => mod(next), s), ...messages)
const resolveTest = (state: GameState) =>
  choose(choose(state, 'choice.revealToken'), 'choice.applyResults')
const behavior = () => scenarioBehavior(DIM_CARCOSA)!
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
const treacheryOf = (code: string, keywords: string[] = []): EncounterCard =>
  ({ kind: 'treachery', code, name: code, traits: [], keywords }) as EncounterCard
function readAll(state: GameState, pick: (ls: string[]) => number = () => 0): GameState {
  let s = state
  for (let n = 0; n < 60 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = s.pending.question.choices[Math.max(0, pick(labels(s)))]!
    s = choose(s, choice.label, choice.params)
  }
  return s
}
const ofKind = (state: GameState, name: string) =>
  Object.values(state.locations).find((l) => l.name === name)!.id
/** Pone a Hastur en juego como enemigo en el palacio. */
const withHastur = (state: GameState, card = hasturLordOfCarcosa) =>
  prep(state, [], spawn(card, CODES.palaceOfTheKing))
const flip = (state: GameState, investigator = 'a') => {
  const ability = availableAbilities(state, investigator).find(
    (a) => a.label === 'ability.dim.flip',
  )!
  return choose(state, ability.label, ability.params)
}

// Guía ES p. 28, "Preparación".
describe('Dim Carcosa: setup', () => {
  for (const players of [1, 2, 3, 4])
    it(`${players} investigator(s): seven revealed locations with clues, copies set aside`, () => {
      const state = game(players)
      expect(Object.keys(state.locations)).toHaveLength(7)
      expect(Object.values(state.locations).every((l) => l.revealed)).toBe(true)
      expect(state.locations[CODES.palaceOfTheKing]!.clues).toBe(3 * players)
      expect(Object.keys(state.setAsideLocations)).toHaveLength(6)
      expect(state.investigators.every((i) => i.location === CODES.shoresOfHali)).toBe(true)
      // Mitad de la cordura en horror, sin quedar derrotado.
      for (const i of state.investigators) {
        expect(i.horror).toBe(Math.floor(i.sanity / 2))
        expect(i.eliminated).toBeFalsy()
      }
      expect(state.setAside.map((c) => c.code)).toEqual(
        expect.arrayContaining([
          CODES.hasturLordOfCarcosa,
          CODES.hasturTatteredKing,
          SETS.beastOfAldebaran,
          THE_MAN_IN_THE_PALLID_MASK,
        ]),
      )
      // Penumbrosa Carcosa 11, Delirios 6, Secta del Signo Amarillo 6, Habitantes 2,
      // Agentes de Hastur 4 y Miedo impactante 7.
      expect(state.encounterDeck).toHaveLength(11 + 6 + 6 + 2 + 4 + 7)
    })

  it('the path above starts at the Dark Spires', () => {
    const state = game(1, { notes: ['carcosaOpenedThePathAbove'] })
    expect(getInvestigator(state, 'a').location).toBe(CODES.darkSpires)
  })

  it.each([
    [{}, 3],
    [{ carcosaChasingTheStranger: '4' }, 2],
    [{ carcosaChasingTheStranger: '7' }, 1],
    [{ carcosaChasingTheStranger: '9' }, 0],
  ])('chasing the Stranger %o: %i doom on agenda 1a', (values, doom) => {
    expect(game(1, { values }).doom).toBe(doom)
  })

  it('act 2 version: v.I, v.II, v.III or chosen on a tie', () => {
    const v = (doubt: number, conviction: number) =>
      act2Version(log([], { carcosaDoubt: String(doubt), carcosaConviction: String(conviction) }))
    expect(v(2, 3)).toBe(1)
    expect(v(4, 2)).toBe(2)
    expect(v(2, 4)).toBe(3)
    expect(v(3, 3)).toBe('choose')
    const tie = game(1, { values: { carcosaDoubt: '3', carcosaConviction: '3' } })
    expect(tie.acts[1]!.code).toBe(CODES.searchV2)
  })

  it('The Man in the Pallid Mask leaves his bearer’s deck and is set aside', () => {
    const campaign = afterBlackStars(2, ['carcosaOpenedThePathBelow'])
    const state = readAll(startScenario(campaign, 4))
    const bearer = campaign.investigators[0]!.id
    const me = getInvestigator(state, bearer)
    expect([...me.deck, ...me.hand]).not.toContain(THE_MAN_IN_THE_PALLID_MASK)
    expect(state.scenarioMeta?.['carcosa:strangerBearer']).toBe(bearer)
  })

  it('investigators are not defeated by horror in Carcosa', () => {
    let state = game()
    state = readAll(
      prep(state, [], {
        type: 'TakeDamage',
        investigator: 'a',
        damage: 0,
        horror: 12,
        direct: true,
      }),
    )
    expect(getInvestigator(state, 'a').eliminated).toBeFalsy()
    expect(remainingSanity(state, 'a')).toBe(0)
  })
})

describe('Dim Carcosa: acts and Hastur', () => {
  const man = (s: GameState) => enemyOf(s, THE_MAN_IN_THE_PALLID_MASK)
  /** Acto 2 con El hombre de la máscara pálida en el palacio. */
  function act2(values: Record<string, string>, players = 1) {
    let state = game(players, { values })
    state = readAll(prep(state, [atAct(0)], { type: 'AdvanceAct', paid: true }))
    expect(man(state)!.location).toBe(CODES.palaceOfTheKing)
    return state
  }

  it('act 1: the Man spawns at the Palace; act 2 forbids discovering clues', () => {
    const state = act2({})
    expect(state.acts[state.actIndex]!.code).toBe(CODES.searchV1)
    expect(behavior().cannotDiscoverClues!(state, 'a', CODES.palaceOfTheKing)).toBe(true)
  })

  it('v.I: the lead spends 3 actions at his location; the Pallid Mask and the Tattered King', () => {
    let state = act2({})
    state = prep(state, [placeAt(CODES.palaceOfTheKing)])
    expect(man(state)).toBeDefined()
    const ability = availableAbilities(state, 'a').find((a) => a.label === 'ability.dim.advanceV1')!
    expect(ability.actions).toBe(3)
    state = readAll(choose(state, ability.label, ability.params))
    expect(man(state)).toBeUndefined()
    expect(enemyOf(state, CODES.hasturTatteredKing)!.location).toBe(CODES.palaceOfTheKing)
    expect(Object.values(state.assets).some((a) => a.code === CODES.thePallidMask)).toBe(true)
    // La máscara: -2 de cordura.
    expect(remainingSanity(state, 'a')).toBe(
      Math.max(0, getInvestigator(state, 'a').sanity - 2 - getInvestigator(state, 'a').horror),
    )
    // Y no se le puede derrotar con daño.
    expect(state.acts[state.actIndex]!.code).toBe(CODES.theKingInTatters)
  })

  it('v.II: defeated by his own ability → Hastur, the King in Yellow, beside the act', () => {
    let state = act2({ carcosaDoubt: '5', carcosaConviction: '2' })
    // El daño no lo derrota.
    state = readAll(prep(state, [], { type: 'DamageEnemy', enemy: man(state)!.id, amount: 5 }))
    expect(man(state)).toBeDefined()
    state = readAll(
      prep(state, [], { type: 'ScenarioSpecific', key: 'dimManAbility', data: { enemy: 'x' } }),
    )
    expect(man(state)).toBeUndefined()
    const king = state.stories?.[CODES.hasturKingInYellow]
    expect(king).toMatchObject({ damage: 0, health: 7, exhausted: false })
  })

  it('v.III: defeated by damage → Hastur, Lord of Carcosa, at his location', () => {
    let state = act2({ carcosaDoubt: '1', carcosaConviction: '6' })
    state = readAll(prep(state, [], { type: 'DamageEnemy', enemy: man(state)!.id, amount: 5 }))
    expect(man(state)).toBeUndefined()
    expect(enemyOf(state, CODES.hasturLordOfCarcosa)!.location).toBe(CODES.palaceOfTheKing)
  })

  it('the King in Yellow attacks everyone at the start of the enemy phase', () => {
    let state = act2({ carcosaDoubt: '5', carcosaConviction: '2' }, 2)
    state = readAll(
      prep(state, [], { type: 'ScenarioSpecific', key: 'dimManAbility', data: { enemy: 'x' } }),
    )
    const before = state.investigators.map((i) => i.horror)
    const messages = behavior().forced!(state, { type: 'enemyPhaseBegins' })
    expect(messages).toHaveLength(2)
    state = readAll(prep(state, [], ...messages))
    state.investigators.forEach((i, n) => expect(i.horror).toBeGreaterThanOrEqual(before[n]!))
    // [action] [willpower] (X = su combate): agotarlo.
    state = prep(state, [
      withBag(0),
      update('a', { skills: { willpower: 9, intellect: 1, combat: 1, agility: 1 } }),
    ])
    const ability = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.dim.exhaustKing',
    )!
    state = readAll(resolveTest(choose(state, ability.label, ability.params)))
    expect(state.stories?.[CODES.hasturKingInYellow]?.exhausted).toBe(true)
    expect(behavior().forced!(state, { type: 'enemyPhaseBegins' })).toEqual([])
  })

  it('Hastur’s attack: horror beyond your sanity also deals 1 damage', () => {
    let state = withHastur(game())
    const hastur = enemyOf(state, CODES.hasturLordOfCarcosa)!
    const sanity = getInvestigator(state, 'a').sanity
    state = prep(state, [update('a', { horror: sanity - 1 })])
    const [before] = behavior().forced!(state, {
      type: 'whenEnemyAttacks',
      enemy: hastur.id,
      investigator: 'a',
    })
    state = readAll(
      prep(state, [], before!, {
        type: 'TakeDamage',
        investigator: 'a',
        damage: 0,
        horror: 2,
        direct: true,
      }),
    )
    const [excess] = behavior().forced!(state, {
      type: 'afterEnemyAttack',
      enemy: hastur.id,
      investigator: 'a',
    })
    state = readAll(prep(state, [], excess!))
    expect(getInvestigator(state, 'a').damage).toBe(1)
  })

  it('agendas 1 and 2 advance with 3 and 5 damage per investigator on Hastur', () => {
    let state = withHastur(game(2))
    const hastur = () => enemyOf(state, CODES.hasturLordOfCarcosa)!
    state = readAll(prep(state, [], { type: 'DamageEnemy', enemy: hastur().id, amount: 6 }))
    expect(state.agendas[state.agendaIndex]!.code).toBe(CODES.madnessDrowns)
    // Plan 2: +1 de combate, y la Bestia de Aldebarán al avanzar.
    expect(behavior().enemyStat!(state, hastur(), 'fight')).toBe(1)
    state = readAll(prep(state, [], { type: 'DamageEnemy', enemy: hastur().id, amount: 4 }))
    expect(state.agendas[state.agendaIndex]!.code).toBe(CODES.madnessDies)
    expect(enemyOf(state, SETS.beastOfAldebaran)!.location).toBe(CODES.palaceOfTheKing)
    // No puede ser derrotado sin conocer el secreto.
    state = readAll(prep(state, [], { type: 'DamageEnemy', enemy: hastur().id, amount: 20 }))
    expect(enemyOf(state, CODES.hasturLordOfCarcosa)).toBeDefined()
    expect(hasturDamage(state)).toBe(30)
  })

  it('with the secret, defeating Hastur on agenda 3 ends act 3 (Lord of Carcosa → R3)', () => {
    let state = withHastur(game())
    state = prep(state, [atAct(2), atAgenda(2), meta('carcosa:knowTheSecret')])
    state = readAll(
      prep(state, [], {
        type: 'DamageEnemy',
        enemy: enemyOf(state, CODES.hasturLordOfCarcosa)!.id,
        amount: 9,
      }),
    )
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 3 })
  })

  it('the Tattered King → R1; the King in Yellow → R2', () => {
    let tattered = withHastur(game(), hasturTatteredKing)
    tattered = prep(tattered, [atAct(2), atAgenda(2), meta('carcosa:knowTheSecret')])
    tattered = readAll(
      prep(tattered, [], {
        type: 'DamageEnemy',
        enemy: enemyOf(tattered, CODES.hasturTatteredKing)!.id,
        amount: 8,
      }),
    )
    expect(tattered.outcome).toEqual({ type: 'resolution', resolution: 1 })
    let king = prep(game(), [atAct(2), atAgenda(2), meta('carcosa:knowTheSecret')], {
      type: 'ScenarioSpecific',
      key: 'dimKingEnters',
      data: {},
    })
    king = readAll(
      prep(king, [], { type: 'ScenarioSpecific', key: 'dimKingDamage', data: { amount: 7 } }),
    )
    expect(king.outcome).toEqual({ type: 'resolution', resolution: 2 })
  })

  it('agenda 1 back: test to snap out of it, or take horror, or faint (+1 doom)', () => {
    let state = prep(game(), [], { type: 'AdvanceAgenda' })
    expect(labels(state)).toEqual([
      'choice.dim.coils.willpower',
      'choice.dim.coils.intellect',
      'choice.dim.coils.horror',
      'choice.dim.coils.faint',
    ])
    state = readAll(choose(state, 'choice.dim.coils.faint'))
    expect(state.agendas[state.agendaIndex]!.code).toBe(CODES.madnessDrowns)
    expect(state.doom).toBe(1)
  })

  it('agenda 1 back: a failed test forces another option', () => {
    let state = prep(game(), [withBag(-8)], { type: 'AdvanceAgenda' })
    state = resolveTest(choose(state, 'choice.dim.coils.willpower'))
    expect(labels(state)).not.toContain('choice.dim.coils.willpower')
    state = readAll(choose(state, 'choice.dim.coils.horror'))
    expect(state.agendas[state.agendaIndex]!.code).toBe(CODES.madnessDrowns)
  })

  it('agenda 3 back: more Conviction → R4; more Doubt → R5 (everyone goes insane)', () => {
    const campaign = afterBlackStars(1, ['carcosaOpenedThePathBelow'], {
      carcosaDoubt: '4',
      carcosaConviction: '1',
    })
    let state = readAll(startScenario(campaign, 5))
    state = readAll(during(state, (s) => ({ ...s, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 5 })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaHasturHasYou')
    expect(Object.values(next.log.investigators).every((r) => r.insane)).toBe(true)
    expect(canPlayNext(next)).toBe(false)
  })
})

describe('Dim Carcosa: flipping locations (act 3)', () => {
  const act3 = (state: GameState) => prep(state, [atAct(2)])

  it('only without clues on your location; removes every investigator’s clues', () => {
    let state = act3(withHastur(game(2)))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.dim.flip')).toBe(false)
    state = prep(state, [noClues(CODES.shoresOfHali), update('b', { clues: 2 })])
    state = readAll(flip(state))
    expect(getInvestigator(state, 'b').clues).toBe(0)
    // Canciones que cantarán las Híades: 1 daño por investigador, agotado; no se repite.
    expect(hasturDamage(state)).toBe(2)
    expect(enemyOf(state, CODES.hasturLordOfCarcosa)!.exhausted).toBe(true)
    expect(canFlip(state, CODES.shoresOfHali)).toBe(false)
  })

  it('the Palace can only be flipped with 5 damage per investigator on Hastur; Hastur’s End', () => {
    let state = act3(withHastur(game()))
    expect(canFlip(state, CODES.palaceOfTheKing)).toBe(false)
    state = prep(state, [
      (s) => ({
        ...s,
        enemies: Object.fromEntries(
          Object.entries(s.enemies).map(([id, e]) => [id, { ...e, damageTaken: 5 }]),
        ),
      }),
      placeAt(CODES.palaceOfTheKing),
      noClues(CODES.palaceOfTheKing),
    ])
    expect(canFlip(state, CODES.palaceOfTheKing)).toBe(true)
    state = readAll(flip(state))
    expect(state.scenarioMeta?.['carcosa:knowTheSecret']).toBe(1)
  })

  it('a replacing story swaps the location for a set-aside copy with its clues', () => {
    // Una partida con unas Ruinas que se sustituyen (no El ataúd).
    const seed = [1, 2, 3, 4, 5, 6, 7, 8].find(
      (n) => ofKind(game(1, { seed: n }), 'Ruins of Carcosa') !== CODES.ruinsCoffin,
    )!
    let state = act3(game(1, { seed }))
    const ruins = ofKind(state, 'Ruins of Carcosa')
    state = prep(state, [placeAt(ruins), noClues(ruins), update('a', { horror: 4 })])
    state = readAll(flip(state))
    expect(state.locations[ruins]).toBeUndefined()
    const copy = ofKind(state, 'Ruins of Carcosa')
    expect(copy).not.toBe(ruins)
    expect(getInvestigator(state, 'a').location).toBe(copy)
    expect(state.locations[copy]!.clues).toBe(1)
  })

  it('The Fall: refuse (can flip again) or push her (2 horror, 2 damage per investigator)', () => {
    let state = act3(withHastur(game(1, { notes: ['carcosaOpenedThePathAbove'] })))
    state = prep(state, [noClues(CODES.darkSpires)])
    state = readAll(flip(state), (ls) => ls.indexOf('choice.dim.cannot'))
    expect(canFlip(state, CODES.darkSpires)).toBe(true)
    const horror = getInvestigator(state, 'a').horror
    state = readAll(flip(state), (ls) => ls.indexOf('choice.dim.push'))
    expect(getInvestigator(state, 'a').horror).toBe(horror + 2)
    expect(hasturDamage(state)).toBe(2)
    expect(canFlip(state, CODES.darkSpires)).toBe(false)
  })

  it('every location back has a story and the story effects resolve', () => {
    for (const [location, story] of Object.entries(STORY_OF)) {
      expect(story).toMatch(/^033\d\d[b-f]$/)
      expect(location).not.toBe(story)
    }
  })

  it('Creature Out of Demhe attacks; the Winged One moves toward the flipped location', () => {
    let state = act3(withHastur(game()))
    const bleak = ofKind(state, 'Bleak Plains')
    state = prep(
      state,
      [noClues(CODES.shoresOfHali)],
      spawn(creatureOutOfDemhe, bleak),
      spawn(wingedOne, ofKind(state, 'Depths of Demhe')),
    )
    const health = getInvestigator(state, 'a').damage
    state = readAll(flip(state))
    expect(getInvestigator(state, 'a').damage).toBeGreaterThan(health)
    // Se mueve una vez (de las Profundidades a un Lugar conectado con las Llanuras).
    expect([ofKind(state, 'Ruins of Carcosa'), ofKind(state, 'Dim Streets')]).toContain(
      enemyOf(state, CODES.wingedOne)!.location,
    )
  })
})

describe('Dim Carcosa: chaos tokens, locations and encounter cards', () => {
  const token = (state: GameState, t: 'skull' | 'cultist' | 'tablet' | 'elderThing') =>
    behavior().tokenEffect!(state, t, 'a')

  it('skull: -2, or -4 with no remaining sanity; Hard: -X (horror on you)', () => {
    expect(token(prep(game(), [update('a', { horror: 0 })]), 'skull').modifier).toBe(-2)
    expect(token(prep(game(), [update('a', { horror: 20 })]), 'skull').modifier).toBe(-4)
    expect(
      token(prep(game(1, { difficulty: 'hard' }), [update('a', { horror: 5 })]), 'skull').modifier,
    ).toBe(-5)
  })

  it('cultist reveals another (1 horror on failure); tablet places a clue with Hastur', () => {
    expect(token(game(), 'cultist')).toMatchObject({ revealAnother: true })
    let state = withHastur(game())
    const clues = state.locations[CODES.shoresOfHali]!.clues
    state = readAll(prep(state, [], ...token(state, 'tablet').onFail!))
    expect(state.locations[CODES.shoresOfHali]!.clues).toBe(clues + 1)
  })

  it('attacking Hastur with no remaining sanity: +1, 0, -1 and elder sign fail', () => {
    const state = prep(withHastur(game()), [update('a', { horror: 20 })])
    const hastur = enemyOf(state, CODES.hasturLordOfCarcosa)!
    const fighting: GameState = {
      ...state,
      skillTest: { investigator: 'a', kind: { type: 'fight', enemy: hastur.id } } as never,
    }
    expect(behavior().tokenOverride!(fighting, 0, 'a')).toEqual({ modifier: 0, autoFail: true })
    expect(behavior().tokenOverride!(fighting, 'elderSign', 'a')).toMatchObject({ autoFail: true })
    expect(behavior().tokenOverride!(fighting, -2, 'a')).toBeNull()
    expect(
      behavior().tokenOverride!(prep(fighting, [update('a', { horror: 0 })]), 0, 'a'),
    ).toBeNull()
  })

  it('Bleak Plains: no Ally assets; Depths of Demhe: no fast cards', () => {
    const state = game()
    const ally = allPlayerCardDefs().find(
      (d) => d.type === 'asset' && d.traits.includes('Ally'),
    )!.code
    const at = (name: string) => prep(state, [placeAt(ofKind(state, name))])
    expect(behavior().cannotPlay!(at('Bleak Plains'), 'a', ally)).toBe(true)
    expect(behavior().cannotPlay!(at('Shores of Hali'), 'a', ally)).toBe(false)
    expect(behavior().cannotPlay!(at('Depths of Demhe'), 'a', '01023')).toBe(true)
    expect(playableCards(at('Depths of Demhe'), 'a', true)).not.toContain('01023')
  })

  it('Ruins of Carcosa and Dim Streets: the last clue costs 1 damage or 1 action', () => {
    const forced = behavior().forced!
    const state = game()
    const trigger = (location: string) =>
      ({ type: 'afterDiscoverClues', investigator: 'a', location, amount: 1, last: true }) as const
    expect(forced(state, trigger(ofKind(state, 'Ruins of Carcosa')))).toEqual([
      { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 },
    ])
    expect(forced(state, trigger(ofKind(state, 'Dim Streets')))[0]!.type).toMatch(
      /LoseNext|LoseActions/,
    )
  })

  it('spawns: Creature Out of Demhe at the Depths, Winged One at the Bleak Plains', () => {
    const state = game()
    expect(enemyBehavior(CODES.creatureOutOfDemhe)!.spawn!(state, 'a')).toEqual([
      ofKind(state, 'Depths of Demhe'),
    ])
    expect(enemyBehavior(CODES.wingedOne)!.spawn!(state, 'a')).toEqual([
      ofKind(state, 'Bleak Plains'),
    ])
  })

  it('Dismal Curse: 2 damage, or 4 with horror over twice your sanity', () => {
    let state = prep(
      game(),
      [withBag(-8), update('a', { horror: 3 })],
      draw(treacheryOf(CODES.dismalCurse)),
    )
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').damage).toBe(2)
    const sanity = getInvestigator(state, 'a').sanity
    let worse = prep(
      game(),
      [withBag(-8), update('a', { horror: 2 * sanity + 1 })],
      draw(treacheryOf(CODES.dismalCurse)),
    )
    worse = readAll(resolveTest(worse))
    expect(getInvestigator(worse, 'a').damage).toBe(4)
  })

  it('Realm of Madness: discard cards worth your horror, or take 2 horror', () => {
    const cards = allPlayerCardDefs()
      .filter((d) => d.type === 'event' && !d.weakness && (d.cost ?? 0) >= 1)
      .slice(0, 2)
      .map((d) => d.code)
    let state = prep(
      game(),
      [update('a', { horror: 1, hand: cards })],
      draw(treacheryOf(CODES.realmOfMadness)),
    )
    const hand = getInvestigator(state, 'a').hand.length
    expect(state.pending!.question.prompt).toBe('prompt.dim.realm')
    state = readAll(state)
    expect(getInvestigator(state, 'a').hand.length).toBeLessThan(hand)
    let none = prep(
      game(),
      [update('a', { horror: 1, hand: [] })],
      draw(treacheryOf(CODES.realmOfMadness)),
    )
    none = readAll(none)
    expect(getInvestigator(none, 'a').horror).toBe(3)
  })

  it('The Final Act: 2 doom with no remaining sanity', () => {
    const state = readAll(
      prep(
        game(1, { values: { carcosaChasingTheStranger: '9' } }),
        [update('a', { horror: 20 })],
        draw(treacheryOf(CODES.theFinalAct)),
      ),
    )
    expect(state.doom).toBe(2)
  })

  it('Possession: hidden in your hand; killed with horror over twice your sanity', () => {
    let state = readAll(
      prep(game(), [], draw(treacheryOf(CODES.possessionTorturous, ['peril', 'hidden']))),
    )
    const held = Object.values(state.treacheries).find((t) => t.code === CODES.possessionTorturous)!
    expect(held.placement).toEqual({ type: 'threatArea', investigator: 'a' })
    // Atormentadora: [action] gasta 5 recursos para descartarla.
    state = prep(state, [update('a', { resources: 5 })])
    const discard = availableAbilities(state, 'a').find((a) => a.label === 'ability.dim.torturous')!
    state = readAll(choose(state, discard.label, discard.params))
    expect(state.treacheries[held.id]).toBeUndefined()
    expect(getInvestigator(state, 'a').resources).toBe(0)
    // Con más del doble de horror que de cordura: eliminado y muerto.
    let doomed = readAll(
      prep(game(), [], draw(treacheryOf(CODES.possessionMurderous, ['peril', 'hidden']))),
    )
    const sanity = getInvestigator(doomed, 'a').sanity
    doomed = readAll(
      prep(doomed, [], {
        type: 'TakeDamage',
        investigator: 'a',
        damage: 0,
        horror: 2 * sanity + 1,
        direct: true,
      }),
    )
    expect(getInvestigator(doomed, 'a').eliminated).toBe(true)
    expect(doomed.campaignLog!.investigators['a']!.killed).toBe(true)
  })

  it('Possession (Traitorous): committing it makes the test fail and discards it', () => {
    let state = readAll(
      prep(game(), [], draw(treacheryOf(CODES.possessionTraitorous, ['peril', 'hidden']))),
    )
    state = prep(
      state,
      [withBag(0), update('a', { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } })],
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'willpower',
        difficulty: 1,
        kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    expect(labels(state)).toContain('ability.dim.commitTraitorous')
    state = choose(state, 'ability.dim.commitTraitorous')
    state = choose(state, 'choice.revealToken')
    expect(state.pending!.question.prompt).toBe('prompt.skillTestFailed')
    state = readAll(state)
    expect(
      Object.values(state.treacheries).some((t) => t.code === CODES.possessionTraitorous),
    ).toBe(false)
  })
})

describe('Dim Carcosa: resolutions and the end of the campaign', () => {
  it('R1: the investigators win; trauma, 5 bonus experience and the possessed are recorded', () => {
    const campaign = afterBlackStars(2, ['carcosaOpenedThePathBelow'])
    let state = readAll(startScenario(campaign, 4))
    const [first] = state.investigators
    state = readAll(
      prep(state, [], draw(treacheryOf(CODES.possessionTorturous, ['peril', 'hidden']), first!.id)),
    )
    state = readAll(
      prep(state, [], { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }),
    )
    expect(state.campaignLog!.notes).toContain('carcosaPreventedHastur')
    expect(state.campaignLog!.values['carcosaPossessed']).toBe(first!.name)
    const next = finishScenario(campaign, state)
    expect(next.scenarioIndex).toBe(8)
    for (const id of state.investigators.map((i) => i.id)) {
      const record = next.log.investigators[id]!
      expect(record.physicalTrauma).toBeGreaterThanOrEqual(2)
      expect(record.mentalTrauma).toBeGreaterThanOrEqual(2)
      expect(record.insane).toBeFalsy()
    }
    expect(canPlayNext(next)).toBe(false)
  })

  it('no resolution: R4 with more (or equal) Conviction, R5 with more Doubt', () => {
    const r = (values: Record<string, string>) =>
      readAll(
        prep(game(1, { values }), [], { type: 'EndScenario', outcome: { type: 'noResolution' } }),
      )
    expect(r({ carcosaDoubt: '2', carcosaConviction: '2' }).campaignLog!.notes).toContain(
      'carcosaRealmsMerged',
    )
    expect(r({ carcosaDoubt: '3', carcosaConviction: '2' }).campaignLog!.notes).toContain(
      'carcosaHasturHasYou',
    )
  })
})
