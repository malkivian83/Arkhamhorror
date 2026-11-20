import {
  applyInput,
  availableAbilities,
  createGame,
  dispatch,
  emptyCampaignLog,
  enemyBehavior,
  scenarioBehavior,
  type CampaignLog,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, testInvestigator } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { DEATH_AT_SUNDOWN, deathAtSundown, inPlayVictory } from './death-at-sundown'
import { CONFRONTATION } from './confrontation'
import { plaguebearerChaosBag } from './campaign'
import { D } from './dawn-data'
import { FLOOR, Z } from './sundown-data'
import { emit, settle } from './testing'

function sundownSetup(notes: string[] = [], players = 1, values: Record<string, string> = {}) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const log: CampaignLog = { ...emptyCampaignLog(ids), notes, values }
  return createGame({
    seed: 7,
    difficulty: 'standard',
    interactive: true,
    campaignLog: log,
    scenario: deathAtSundown({ log }),
    investigators: ids.map((id) => testInvestigator(id)),
  })
}
function sundownGame(notes: string[] = [], players = 1, values: Record<string, string> = {}) {
  let s = sundownSetup(notes, players, values)
  const bodies: string[] = []
  for (let n = 0; n < 80 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    if (s.pending.question.story?.body) bodies.push(s.pending.question.story.body)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  return { s, bodies }
}
const run = (s: GameState, ...messages: Message[]) =>
  settle(dispatch({ ...s, pending: null, queue: [] }, ...messages))
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const move = (s: GameState, location: string, id = 'a'): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === id ? { ...i, location } : i)),
})
const reveal = (s: GameState, ...ids: string[]): GameState => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      ids.includes(id) ? { ...l, revealed: true } : l,
    ]),
  ),
})
const behavior = () => scenarioBehavior(DEATH_AT_SUNDOWN)!
const ritualDeck = (s: GameState) => s.scenarioDecks?.sundownRitual ?? []

// Guía ES pp. 18–19 / EN pp. 21–22; cartas ES 227–267, EN 221–261.
describe('Muerte a la puesta de sol · preparación', () => {
  it('pone la torre de seis pisos, empieza en la Plaza y forma el mazo de Ritual', () => {
    const { s, bodies } = sundownGame()
    expect(Object.keys(s.locations)).toHaveLength(10)
    expect(s.investigators[0]!.location).toBe(Z.square)
    expect(new Set(Object.keys(s.locations).map((id) => FLOOR[id]))).toEqual(
      new Set([0, 1, 2, 3, 4, 5]),
    )
    // Sin las palabras de muerte: Hoja oxidada y Palabras arriba, las Runas al fondo.
    const deck = ritualDeck(s)
    expect(deck).toHaveLength(6)
    expect(deck.slice(0, 2).sort()).toEqual([Z.words, Z.blade].sort())
    expect(deck.at(-1)).toBe(Z.runes)
    // Introducciones 1 → 4 → 5 → 6.
    expect(bodies).toEqual(
      expect.arrayContaining([
        'story.plaguebearer.sundown.intro4',
        'story.plaguebearer.sundown.intro5',
        'story.plaguebearer.sundown.intro6',
      ]),
    )
    expect(s.setAside.map((c) => c.code)).toEqual(
      expect.arrayContaining([Z.first, Z.tendrils, Z.pickman]),
    )
  })

  it('con las palabras de muerte, el jefe empieza con ellas y la Hoja queda arriba', () => {
    const { s } = sundownGame(['plaguebearerKillingWords', 'plaguebearerWestReagent'])
    expect(Object.values(s.assets).some((a) => a.code === Z.words && a.owner === 'a')).toBe(true)
    expect(ritualDeck(s)[0]).toBe(Z.blade)
    expect(ritualDeck(s)).not.toContain(Z.words)
  })

  it('usa la bolsa de la campaña sin las fichas retiradas por los Susurros', () => {
    const bag = deathAtSundown({
      log: { ...emptyCampaignLog(['a']), values: { plaguebearerRemovedTokens: 'tablet' } },
    }).chaosBag
    expect(bag.filter((t) => t === 'tablet')).toHaveLength(1)
  })
})

describe('Muerte a la puesta de sol · reglas', () => {
  it('el plan 1 sustituye el robo de Encuentros por tu mazo', () => {
    const { s } = sundownGame()
    expect(behavior().insteadOfEncounterDraw!(s, 'a')).toEqual([
      { type: 'DrawCards', investigator: 'a', amount: 1 },
    ])
    expect(behavior().insteadOfEncounterDraw!({ ...s, agendaIndex: 1 }, 'a')).toBeNull()
  })

  it('la calavera usa el Piso de tu Lugar y la Plaza bloquea las capacidades [action]', () => {
    const { s } = sundownGame()
    expect(behavior().tokenEffect!(move(s, Z.north), 'skull', 'a').modifier).toBe(-4)
    expect(
      behavior().tokenEffect!({ ...move(s, Z.north), difficulty: 'hard' }, 'skull', 'a').modifier,
    ).toBe(-6)
    expect(behavior().actionAllowed!(s, 'a', 'activate')).toBe(false)
    expect(behavior().actionAllowed!(move(s, Z.lobby), 'a', 'activate')).toBe(true)
  })

  it('el plan 2 mata a quien está en el Piso del Primero, retira ese Piso y le hace subir', () => {
    let { s } = sundownGame([], 2)
    s = run(s, { type: 'SpawnSetAsideEnemy', code: Z.first, location: Z.square })
    s = move(reveal(s, Z.campaign), Z.campaign, 'b')
    s = { ...s, agendaIndex: 1 }
    s = emit(s, specific('sundown.upwards'))
    if (s.pending?.question.prompt === 'prompt.plaguebearer.sundown.climb')
      s = choose(s, 'choice.location', { location: 'Office Lobby' })
    expect(s.locations[Z.square]).toBeUndefined()
    expect(s.investigators.find((i) => i.id === 'a')!.eliminated).toBe(true)
    expect(s.campaignLog!.investigators.a!.killed).toBe(true)
    expect(s.investigators.find((i) => i.id === 'b')!.eliminated).toBe(false)
    const first = Object.values(s.enemies).find((e) => e.code === Z.first)!
    expect(FLOOR[first.location]).toBe(1)
  })

  it('el acto 2 saquea un Lugar y la clave va a la zona de victoria desde su Lugar sin pistas', () => {
    let { s } = sundownGame()
    s = { ...s, actIndex: 1 }
    s = reveal(move(s, Z.tinkerer), Z.tinkerer)
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, clues: 1 })),
      locations: { ...s.locations, [Z.tinkerer]: { ...s.locations[Z.tinkerer]!, clues: 0 } },
      scenarioDecks: { ...s.scenarioDecks, sundownRitual: [Z.blade, Z.runes] },
    }
    const ransack = availableAbilities(s, 'a').find((a) => a.key.startsWith('sundown:ransack'))
    expect(ransack).toBeDefined()
    s = emit(s, specific('sundown.ransack', { location: Z.tinkerer }))
    const placed = Object.values(s.placedAssets ?? {}).find((p) => p.code === Z.blade)!
    expect(placed.placement).toEqual({ type: 'location', location: Z.tinkerer })
    const toVictory = availableAbilities(s, 'a').find((a) => a.key === `sundown:victory:${Z.blade}`)
    expect(toVictory).toBeDefined()
    s = emit(s, specific('sundown.toVictory', { placed: placed.id }))
    expect(s.victoryDisplay).toContain(Z.blade)
  })

  it('el acto 2b pone la Memoria de Pickman con los Apoyos de la zona de victoria y a Pickman', () => {
    let { s } = sundownGame()
    s = { ...s, actIndex: 1, victoryDisplay: [Z.blade, Z.words, Z.runes] }
    s = emit(s, { type: 'AdvanceAct', paid: true })
    s = settle(s)
    expect(s.locations[Z.memory]?.revealed).toBe(true)
    expect(s.locations[Z.memory]!.connections).toContain(Z.deck)
    const pickman = Object.values(s.enemies).find((e) => e.code === Z.pickman)!
    expect(pickman.location).toBe(Z.memory)
    expect(
      Object.values(s.placedAssets ?? {})
        .map((p) => p.code)
        .sort(),
    ).toEqual([Z.blade, Z.words, Z.runes].sort())
    // Pickman: +X de salud por las pistas de la Memoria; no puede ser derrotado por daño.
    expect(behavior().enemyWouldBeDefeated!(s, pickman)).toEqual([
      { type: 'ExhaustEnemy', enemy: pickman.id },
      { type: 'HealEnemy', enemy: pickman.id, amount: 1 },
    ])
  })

  it('las Palabras de muerte derrotan a Pickman y el acto 3 lleva a la R1', () => {
    let { s } = sundownGame()
    s = { ...s, actIndex: 1, victoryDisplay: [Z.blade, Z.words, Z.runes] }
    s = settle(emit(s, { type: 'AdvanceAct', paid: true }))
    s = move(s, Z.memory)
    const words = Object.values(s.placedAssets ?? {}).find((p) => p.code === Z.words)!
    s = settle(emit(s, { type: 'TakeControlOfPlaced', placed: words.id, investigator: 'a' }))
    const ability = availableAbilities(s, 'a').find((a) => a.key.endsWith(':words'))
    expect(ability).toBeDefined()
    s = settle(emit(s, ...ability!.then))
    for (let n = 0; n < 20 && s.pending; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(s.campaignLog!.notes).toEqual(expect.arrayContaining([CONFRONTATION.warned]))
  })

  it('el daño a Pickman que no sea de la Hoja oxidada se reduce a 1', () => {
    let { s } = sundownGame()
    s = run(s, { type: 'SpawnSetAsideEnemy', code: Z.pickman, location: Z.lobby })
    const pickman = Object.values(s.enemies).find((e) => e.code === Z.pickman)!
    const taken = enemyBehavior(Z.pickman)!.damageTaken!
    expect(taken(s, pickman, 3, {}).amount).toBe(1)
    expect(taken(s, pickman, 3, { code: Z.blade }).amount).toBe(3)
    // Vestíbulo de las oficinas: −1 combate y −1 evitar.
    expect(behavior().enemyStat!(s, pickman, 'fight')).toBe(-1)
  })
})

describe('Muerte a la puesta de sol · resoluciones', () => {
  it('sin resolución pasa a la R2 y se pierde la campaña', () => {
    let { s } = sundownGame()
    s = emit(s, { type: 'EndScenario', outcome: { type: 'noResolution' } } as Message)
    for (let n = 0; n < 10 && s.pending; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(s.campaignLog!.notes).toContain('campaignLost')
  })

  it('la R1 revive a los muertos, cambia Voluntad inquebrantable y encadena el Interludio V', () => {
    let { s } = sundownGame([], 2)
    s = {
      ...s,
      campaignLog: {
        ...s.campaignLog!,
        investigators: {
          ...s.campaignLog!.investigators,
          b: { ...s.campaignLog!.investigators.b!, storyAssets: [D.will, D.folly] },
        },
      },
      investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, eliminated: true } : i)),
    }
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } },
    )
    const bodies: string[] = []
    for (let n = 0; n < 30 && s.pending; n++) {
      const q = s.pending.question
      if (q.story?.body) bodies.push(q.story.body)
      if (q.prompt === 'prompt.plaguebearer.sundown.tablet')
        s = choose(s, 'choice.plaguebearer.friends.read')
      else if (q.prompt === 'prompt.plaguebearer.confrontation.decide')
        s = choose(s, 'choice.plaguebearer.confrontation.release')
      else s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    }
    const b = s.campaignLog!.investigators.b!
    expect(b.killed).toBe(false)
    expect(b.storyAssets).toEqual(expect.arrayContaining([D.strength, D.deathsHold]))
    expect(b.storyAssets).not.toContain(D.will)
    expect(JSON.parse(s.campaignLog!.values.plaguebearerReagent!)).toContain('b')
    // Habéis sido advertidos: ficha −5 en Normal y La confrontación 4.
    expect(s.campaignLog!.notes).toContain(CONFRONTATION.warned)
    expect(s.campaignLog!.chaosTokens).toContain(-5)
    expect(bodies).toContain('story.plaguebearer.confrontation.section4')
    expect(bodies).toContain('story.plaguebearer.sundown.defeated')
  })

  it('cuenta la Victoria X de las cartas en juego', () => {
    const { s } = sundownGame()
    expect(inPlayVictory(s)).toBe(1) // Cámara del reloj norte sin revelar.
    expect(plaguebearerChaosBag('standard')).toHaveLength(17)
  })
})
