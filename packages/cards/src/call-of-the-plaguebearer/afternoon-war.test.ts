import {
  applyInput,
  availableAbilities,
  createGame,
  dispatch,
  emptyCampaignLog,
  scenarioBehavior,
  type CampaignLog,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { AFTERNOON_WAR, afternoonWar, locationDamage, unbindingLocations } from './afternoon-war'
import { plaguebearerChaosBag } from './campaign'
import { D } from './dawn-data'
import { E } from './chorus-data'
import { S } from './noon-data'
import { W } from './war-data'
import { emit, settle } from './testing'

const HIBBS = '78091'
const LIBRARY = '78093'
const BANK = '78089'
const town = (id: string, status: string) => `plaguebearerTown${id}${status}`
const ALL_DEFENDED = ['78023', '78024', '78025', '78026', '78027', '78028', '78029', '78030'].map(
  (id) => town(id, 'Defended'),
)
function logOf(notes: string[], players: number, values: Record<string, string> = {}) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const statuses = Object.fromEntries(
    notes
      .map((n) => n.match(/^plaguebearerTown(\d+)(Defended|Infected)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [`plaguebearerTown${m[1]}`, m[2]!]),
  )
  return { ...emptyCampaignLog(ids), notes, values: { ...statuses, ...values } } as CampaignLog
}
function warSetup(notes: string[] = ALL_DEFENDED, players = 1, seed = 5, values = {}): GameState {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const log = logOf(notes, players, values)
  return createGame({
    seed,
    difficulty: 'standard',
    interactive: true,
    campaignLog: log,
    scenario: afternoonWar({ log, seed, investigators: players }),
    investigators: ids.map((id) => testInvestigator(id)),
  })
}
function warGame(notes: string[] = ALL_DEFENDED, players = 1, seed = 5, values = {}): GameState {
  let s = throughSetup(warSetup(notes, players, seed, values))
  for (let n = 0; n < 60 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  return s
}
const run = (s: GameState, ...messages: Message[]) =>
  settle(dispatch({ ...s, pending: null, queue: [] }, ...messages))
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const place = (location: string, kind: string, amount: number) =>
  specific('war.tokens', { location, kind, amount })
const reveal = (s: GameState, ...ids: string[]): GameState => ({
  ...s,
  locations: Object.fromEntries(
    Object.entries(s.locations).map(([id, l]) => [
      id,
      ids.includes(id) ? { ...l, revealed: true } : l,
    ]),
  ),
})
const behavior = () => scenarioBehavior(AFTERNOON_WAR)!

// Guía ES pp. 16–17 / EN pp. 19–21; cartas ES 189–226 y 377–380, EN 183–220 y 347–350.
describe('Guerra al atardecer · preparación', () => {
  it('pone en juego Arkham, los dos Portales y vincula el Lugar de la Liberación al Motel', () => {
    const s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    expect(Object.keys(s.locations).sort()).toEqual(
      [
        '78088',
        '78089',
        '78090',
        '78091',
        '78092',
        '78093',
        '78094',
        '78095',
        W.flame,
        W.king,
      ].sort(),
    )
    expect(s.investigators[0]!.location).toBe(HIBBS)
    expect(unbindingLocations(s)).toEqual([HIBBS])
    expect(s.locations[W.flame]!.revealed).toBe(false)
    // Sin revelar no se puede entrar en los Portales.
    expect(behavior().canEnter!(s, 'a', LIBRARY, W.flame)).toBe(false)
    // 1 horror y 1 daño entre los Lugares Seguros: en Lugares distintos.
    const stable = Object.keys(s.locations).filter((id) => /^780(8[89]|9[0-5])$/.test(id))
    const marked = stable.filter((id) => locationDamage(s, id) + (s.locations[id]!.horror ?? 0) > 0)
    expect(marked).toHaveLength(2)
    expect(stable.reduce((n, id) => n + locationDamage(s, id), 0)).toBe(1)
    // El Acólito infernal aparece en el Lugar con más daño.
    const acolyte = Object.values(s.enemies).find((e) => e.code === W.acolyte)!
    expect(locationDamage(s, acolyte.location)).toBe(1)
    expect(s.encounterDeck.filter((c) => c.code === W.acolyte)).toHaveLength(1)
    expect(s.encounterDeck.filter((c) => c.code === W.protagonist)).toHaveLength(2)
    // Todos Defendidos: no quedan Élite y se barajan dos sustitutos (Vampiro o Byakhee).
    const elites = Object.values(E) as string[]
    expect(s.encounterDeck.some((c) => elites.includes(c.code))).toBe(false)
    expect(
      s.encounterDeck.filter((c) => c.code === S.fireVampire || c.code === '01175'),
    ).toHaveLength(2)
    for (const code of [W.messengerFlame, W.messengerKing, W.candlejack, W.molten])
      expect(s.setAside.some((c) => c.code === code)).toBe(true)
    expect(s.encounterDeck.some((c) => c.code === W.heed)).toBe(true)
    expect(s.encounterDeck.some((c) => c.code === '01176')).toBe(true)
  })

  it('con el Cráter lo pone en lugar del Lugar marcado y lo conecta con cada Lugar Miasma', () => {
    const notes = [
      ...ALL_DEFENDED.filter((n) => !n.includes('78025') && !n.includes('78027')),
      town('78025', 'Infected'),
      town('78027', 'Defended'),
      town('78027', 'Crater'),
    ]
    const s = warGame(notes, 3)
    expect(s.locations['78092']).toBeUndefined()
    expect(s.locations[W.crater]).toBeDefined()
    expect(s.locations['78277']).toBeDefined()
    expect(s.locations[W.crater]!.connections).toContain('78277')
    expect(s.locations['78277']!.connections).toContain(W.crater)
    // Con 3 jugadores aparece también la Protagonista delirante (Lugar con más horror).
    expect(Object.values(s.enemies).some((e) => e.code === W.protagonist)).toBe(true)
    // El Élite del Colmado Infectado (La Pareja de enamorados) puede barajarse.
    expect([...s.encounterDeck, ...s.setAside].some((c) => c.code === E.couple)).toBe(true)
  })

  it('aplica la visión de los portales, los Eliminados y los apoyos de los Lugares Protegidos', () => {
    const s = warGame([
      ...ALL_DEFENDED.filter((n) => !n.includes('78030')),
      town('78030', 'Infected'),
      town('78026', 'Site'),
      town('78028', 'Rallied'),
      town('78026', 'Rallied'),
      'plaguebearerVisionOfPortals',
      `plaguebearerEliminated${E.miriam}`,
    ])
    expect(s.investigators[0]!.clues).toBe(2)
    expect([...s.encounterDeck, ...s.setAside].some((c) => c.code === E.miriam)).toBe(false)
    const placed = Object.values(s.placedAssets ?? {})
    expect(placed.find((a) => a.code === W.armitage)?.placement).toEqual({
      type: 'location',
      location: LIBRARY,
    })
    // Nadie tenía a Hibb (Listo para ayudar): Hibb (Ya ha tenido suficiente) espera en el Motel.
    expect(placed.find((a) => a.code === W.hibbs)?.placement).toEqual({
      type: 'location',
      location: HIBBS,
    })
  })

  it('con West recuperó el reactivo, alguien añade a Herbert West a su mazo', () => {
    let s = throughSetup(warSetup([...ALL_DEFENDED, 'plaguebearerWestReagent']))
    for (let n = 0; n < 30 && s.pending?.question.prompt !== 'prompt.plaguebearer.war.west'; n++)
      s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
    s = choose(s, 'choice.investigator', { name: s.investigators[0]!.name })
    expect(s.campaignLog!.investigators.a!.storyAssets).toContain(D.west)
    expect(s.investigators[0]!.deck).toContain(D.west)
  })
})

describe('Guerra al atardecer · reglas', () => {
  it('al final de la ronda cada enemigo deja daño u horror; el Mensajero lo envía a la Liberación', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    const acolyte = Object.values(s.enemies).find((e) => e.code === W.acolyte)!
    const before = locationDamage(s, acolyte.location)
    s = run(s, specific('war.enemyTokens'))
    expect(locationDamage(s, acolyte.location)).toBe(before + 1)
    s = run(s, { type: 'SpawnSetAsideEnemy', code: W.messengerFlame, location: LIBRARY })
    const library = locationDamage(s, LIBRARY)
    const site = locationDamage(s, HIBBS)
    s = run(s, specific('war.enemyTokens'))
    // Mensajero de la Llama: 2 daño / 1 horror → su daño va al Motel (Liberación).
    expect(locationDamage(s, LIBRARY)).toBe(library)
    expect(locationDamage(s, HIBBS)).toBe(site + 1)
    // El Acólito (1/0) recibe +1 daño del Mensajero y sigue dejando daño.
    expect(behavior().enemyDamageModifier!(s, s.enemies[acolyte.id]!)).toBe(1)
  })

  it('la Liberación coloca perdición por cada 4 fichas que no sean pistas', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    s = run(s, place(HIBBS, 'horror', 4), place(HIBBS, 'clue', 3))
    const doom = s.doom
    s = run(s, specific('war.unbindingDoom'))
    expect(s.doom - doom).toBe(1)
  })

  it('el acto devuelve X fichas de un tipo y coloca 1 pista; la tablilla lo bloquea', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    expect(availableAbilities(s, 'a').some((a) => a.key === 'war:act')).toBe(true)
    s = run(s, place(HIBBS, 'horror', 3))
    const clues = s.locations[HIBBS]!.clues
    s = emit(s, specific('war.actSuccess', { investigator: 'a', amount: 2 }))
    if (s.pending?.question.prompt === 'prompt.plaguebearer.war.return')
      s = choose(s, 'choice.plaguebearer.war.return.horror', { amount: 2 })
    expect(s.locations[HIBBS]!.horror).toBe(1)
    expect(s.locations[HIBBS]!.clues).toBe(clues + 1)
    const blocked = { ...s, scenarioMeta: { ...s.scenarioMeta, 'warActBlocked:a': s.round } }
    expect(availableAbilities(blocked, 'a').some((a) => a.key === 'war:act')).toBe(false)
  })

  it('el acto 1b revela el Portal elegido; el 2 se cierra sin fichas y trae al otro Mensajero', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    s = emit(s, { type: 'AdvanceAct', paid: true })
    s = choose(s, 'choice.plaguebearer.war.splitFlame')
    s = settle(s)
    expect(s.locations[W.flame]!.revealed).toBe(true)
    expect(locationDamage(s, W.flame)).toBe(1)
    // +2 de velo por cada daño sobre el Edificio de Ciencias.
    expect(behavior().shroudModifier!(s, s.locations[W.flame]!)).toBe(2)
    // Edificio de Ciencias: conexión de un sentido con la Biblioteca Orne.
    expect(s.locations[W.flame]!.connections).toContain(LIBRARY)
    s = run(s, place(W.flame, 'damage', -1), place(W.flame, 'clue', -9))
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, location: W.flame })),
      encounterDeck: [...s.encounterDeck],
    }
    s = run(s, specific('war.objective'))
    s = settle(s)
    expect(s.locations[W.flame]).toBeUndefined()
    expect(s.victoryDisplay).toContain(W.flame)
    expect(s.investigators[0]!.location).toBe(LIBRARY)
    expect(Object.values(s.enemies).some((e) => e.code === W.messengerKing)).toBe(true)
    for (const code of [W.burst, W.flaming, W.acolyte, W.molten])
      expect(
        [...s.encounterDeck, ...s.encounterDiscard, ...s.setAside].some((c) => c.code === code),
      ).toBe(false)
    expect(Object.values(s.enemies).some((e) => e.code === W.acolyte)).toBe(false)
  })

  it('Defender usa el valor de la carta y retira una ficha por cada punto de éxito', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site'), town('78024', 'Rallied')])
    s = {
      ...s,
      investigators: s.investigators.map((i) => ({ ...i, location: BANK, resources: 10 })),
    }
    const vp = availableAbilities(s, 'a').find((a) => a.key.endsWith(':defend:intellect'))!
    expect(vp).toBeDefined()
    const test = {
      investigator: 'a',
      skill: 'intellect' as const,
      tags: ['plaguebearer:defend'],
      kind: {
        type: 'effect' as const,
        source: W.vicePresident,
        onSuccess: [],
        onFail: [],
        onFailEach: [],
      },
    }
    expect(behavior().skillBase!(s, test as never)).toBe(10)
    expect(behavior().skillUnmodified!(s, test as never)).toBe(true)
    s = run(s, place(LIBRARY, 'horror', 2))
    s = emit(s, specific('war.remove', { investigator: 'a', left: 2 }))
    for (let n = 0; n < 2; n++)
      s = choose(s, 'choice.plaguebearer.war.remove.horror', {
        location: s.locations[LIBRARY]!.name,
      })
    expect(s.locations[LIBRARY]!.horror ?? 0).toBe(0)
  })

  it('Progreso irreal: con 4+ horror pone perdición; si no, 2 horror en tu Lugar', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    const card = {
      kind: 'treachery' as const,
      code: W.unreal,
      name: 'Unreal Advance',
      traits: ['Omen'],
      keywords: [],
    }
    const horror = s.locations[HIBBS]!.horror ?? 0
    s = emit(s, { type: 'ResolveEncounterCard', investigator: 'a', card } as Message)
    expect(s.locations[HIBBS]!.horror).toBe(horror + 2)
  })

  it('la calavera usa el mayor daño u horror de un Lugar (máximo 4)', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    s = run(s, place(LIBRARY, 'damage', 6))
    expect(behavior().tokenEffect!(s, 'skull', 'a').modifier).toBe(-4)
    expect(behavior().tokenEffect!({ ...s, difficulty: 'hard' }, 'skull', 'a').modifier).toBe(-6)
  })
})

describe('Guerra al atardecer · resoluciones', () => {
  it('sin resolución por derrota pasa a la Resolución 2: muertos y campaña perdida', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')])
    s = emit(s, { type: 'EndScenario', outcome: { type: 'noResolution' } } as Message)
    for (let n = 0; n < 10 && s.pending; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(s.campaignLog!.notes).toContain('campaignLost')
    expect(s.campaignLog!.investigators.a!.killed).toBe(true)
  })

  it('la Resolución 3 anota Tocado por la Llama/Locura, los Eliminados y los Susurros', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')], 1, 5)
    s = run(s, place(LIBRARY, 'damage', 5), place(BANK, 'horror', 5))
    s = { ...s, victoryDisplay: [...s.victoryDisplay, E.doyle] }
    s = emit(s, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } })
    for (let n = 0; n < 20 && s.pending; n++) {
      const p = s.pending.question.prompt
      if (p === 'prompt.plaguebearer.war.whispers')
        s = choose(s, 'choice.plaguebearer.friends.read')
      else if (p === 'prompt.plaguebearer.war.swap')
        s = choose(s, 'choice.plaguebearer.war.swap.skull')
      else s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    }
    const notes = s.campaignLog!.notes
    expect(notes).toContain('plaguebearerTown78028FlameTouched')
    expect(notes).toContain('plaguebearerTown78024MadnessTouched')
    expect(notes).toContain(`plaguebearerEliminated${E.doyle}`)
    expect(s.campaignLog!.values.plaguebearerRemovedTokens).toBe('skull')
    expect(s.campaignLog!.chaosTokens).toContain('cultist')
    const bag = plaguebearerChaosBag('standard', s.campaignLog)
    expect(bag.filter((t) => t === 'skull')).toHaveLength(1)
  })

  it('la Resolución 1 vuelve locos a todos y pierde la campaña', () => {
    let s = warGame([...ALL_DEFENDED, town('78026', 'Site')], 2)
    s = emit(s, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } })
    for (let n = 0; n < 10 && s.pending; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(s.campaignLog!.investigators.a!.insane).toBe(true)
    expect(s.campaignLog!.investigators.b!.insane).toBe(true)
    expect(s.campaignLog!.notes).toContain('campaignLost')
  })
})

describe('Guerra al atardecer · encuentros', () => {
  const SITE = [...ALL_DEFENDED, town('78026', 'Site')]
  it('Llamarada y Epifanía: cada punto de fallo va a tu Lugar o lo recibes', () => {
    let s = warGame(SITE)
    const damage = locationDamage(s, HIBBS)
    s = emit(s, specific('war.share', { investigator: 'a', amount: 3, kind: 'damage' }))
    s = choose(s, 'choice.plaguebearer.war.share.damage', { placed: 2, taken: 1 })
    s = settle(s)
    expect(locationDamage(s, HIBBS)).toBe(damage + 2)
    expect(s.investigators[0]!.damage).toBe(1)
  })

  it('Escucha la llamada: mueve hacia la Liberación o resuelve el Obligado de un Lugar Miasma', () => {
    const notes = [
      ...ALL_DEFENDED.filter((n) => !n.includes('78028')),
      town('78028', 'Infected'),
      town('78026', 'Site'),
    ]
    let s = warGame(notes)
    s = reveal(s, '78280')
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, location: '78090' })) }
    s = emit(s, specific('war.heed', { investigator: 'a', left: 1 }))
    const labels = s.pending!.question.choices.map((c) => c.label)
    expect(labels).toContain('choice.plaguebearer.war.heedMove')
    expect(labels).toContain('choice.plaguebearer.war.heedForced')
    // Quien ha escuchado la llamada revela una ficha adicional.
    const heeded = {
      ...s,
      campaignLog: {
        ...s.campaignLog!,
        values: { ...s.campaignLog!.values, plaguebearerHeeded: '["a"]' },
      },
      skillTest: {
        investigator: 'a',
        tokens: ['skull'],
        kind: { type: 'effect', source: W.heed, onSuccess: [], onFail: [], onFailEach: [] },
      } as never,
    }
    expect(
      behavior().forced!(heeded, {
        type: 'afterRevealChaosToken',
        investigator: 'a',
        token: 'skull',
      }),
    ).toEqual([{ type: 'RevealChaosToken' }])
  })

  it('La ira del Desatado mueve 1 daño u horror de tu Lugar a ti', () => {
    let s = warGame(SITE)
    s = run(s, place(HIBBS, 'horror', 2))
    s = emit(s, specific('war.ire', { investigator: 'a', location: HIBBS }))
    s = settle(s)
    expect(s.locations[HIBBS]!.horror).toBe(1)
    expect(s.investigators[0]!.horror).toBe(1)
  })

  it('Acólito infernal y Asesino fundente usan el daño y el horror de su Lugar', () => {
    let s = warGame(SITE)
    s = run(s, place(HIBBS, 'damage', 2 - locationDamage(s, HIBBS)))
    s = emit(s, specific('war.acolyte', { left: 2, location: HIBBS, by: 'a' }))
    s = settle(s)
    expect(s.investigators[0]!.damage).toBe(2)
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, resources: 5 })) }
    s = emit(s, specific('war.molten', { investigator: 'a', amount: 3 }))
    s = choose(s, 'choice.plaguebearer.war.loseResources', { amount: 3 })
    expect(s.investigators[0]!.resources).toBe(2)
  })

  it('Plan 2: al final del turno, con 4 horror aquí, se mueve 1 ficha al Lugar de la Liberación', () => {
    const notes = [...ALL_DEFENDED, town('78025', 'Site')]
    let s = warGame(notes)
    s = { ...s, agendaIndex: 1 }
    s = run(s, place(HIBBS, 'horror', 4 - (s.locations[HIBBS]!.horror ?? 0)))
    const site = s.locations['78090']!.horror ?? 0
    s = emit(s, specific('war.overflow', { investigator: 'a' }))
    if (s.pending?.question.prompt === 'prompt.plaguebearer.war.overflow')
      s = choose(s, 'choice.plaguebearer.war.kind.horror')
    expect(s.locations[HIBBS]!.horror).toBe(3)
    expect(s.locations['78090']!.horror).toBe(site + 1)
  })

  it('Plan 3b: más horror que daño → R1; si no, R2', () => {
    let s = warGame(SITE)
    s = run(s, place(LIBRARY, 'horror', 9))
    s = { ...s, agendaIndex: 2 }
    s = emit(s, { type: 'AdvanceAgenda' })
    for (let n = 0; n < 10 && s.pending; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(s.campaignLog!.investigators.a!.insane).toBe(true)
  })
})
