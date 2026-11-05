import {
  availableAbilities,
  applyInput,
  dispatch,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, withBag } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { playRandomlyToEnd } from '../scenario-testing'
import {
  N,
  NPCS,
  TOWN,
  HIBBS,
  nightTreacheries,
  walkingContagion,
  gasGhoul,
  grinningVictim,
} from './night-data'
import { specific } from './helpers'
import { nightGame } from './night-testing'
import { emit, settle } from './testing'

const finish = (state: GameState) => {
  let s = state
  for (let n = 0; n < 50 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
    s = settle(applyInput(s, { investigator: s.pending.investigator, choice: 0 }))
  return s
}

const me = (s: GameState) => getInvestigator(s, 'a')
const townWithoutRuin = (row: (typeof TOWN)[number]) => {
  for (let seed = 0; seed < 16; seed++) {
    const s = nightGame(1, 'standard', seed)
    if (!s.locations[row.ruin]) return s
  }
  throw new Error(`No setup without ${row.ruin}`)
}
const patch = (s: GameState, data: Partial<ReturnType<typeof me>>): GameState => ({
  ...s,
  investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, ...data } : i)),
})
const at = (s: GameState, id: string): GameState => patch(s, { location: id, actionsRemaining: 3 })
const draw = (s: GameState, code: string) =>
  emit(s, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: nightTreacheries.find((c) => c.code === code)!,
  })
const use = (s: GameState, label: string) => {
  const ability = availableAbilities(s, 'a').find((a) => a.label.startsWith(label))
  expect(ability, label).toBeDefined()
  return emit(s, { type: 'UseAbility', investigator: 'a', ...ability! })
}
// Guía ES p. 5, cartas 019–053 y 353–363; RR «Skill Tests», «Spawn», «Elimination».
describe('Noche en la ciudad', () => {
  it.each([1, 2, 3, 4])(
    'prepara seis refugios con cuatro pistas fijas y un lugar infectado (%i)',
    (players) => {
      const s = nightGame(players)
      expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
      expect(s.investigators.every((i) => i.location === HIBBS)).toBe(true)
      expect(Object.keys(s.locations)).toHaveLength(7)
      const healthy = Object.values(s.locations).filter((l) => l.id.startsWith('780'))
      expect(healthy).toHaveLength(6)
      expect(healthy.every((l) => l.clues === 4)).toBe(true)
      expect(Object.values(s.locations).filter((l) => l.horror === 1)).toHaveLength(1)
      expect(Object.values(s.placedAssets ?? {}).some((a) => a.code === '78034')).toBe(true)
      expect(s.encounterDeck.some((c) => c.code === '01134')).toBe(false)
      expect(s.encounterDeck.filter((c) => c.code === '01135')).toHaveLength(3)
      expect(s.encounterDeck.filter((c) => c.code === '01166')).toHaveLength(3)
      expect(s.encounterDeck.filter((c) => c.code === N.victim)).toHaveLength(3)
    },
  )
  it('las semillas eligen ambas variantes de los dos pares y de la pérdida inicial', () => {
    const selected = new Set<string>(),
      lost = new Set<string>()
    for (let seed = 0; seed < 16; seed++) {
      const s = nightGame(1, 'standard', seed)
      Object.values(s.locations).forEach((l) => {
        if (l.id.startsWith('780')) selected.add(l.id)
        else lost.add(l.id)
      })
    }
    expect(selected.size).toBe(8)
    expect(lost.size).toBe(4)
  })
  it('revelar un refugio conserva sus pistas actuales y no repone las que ya se perdieron', () => {
    let s = nightGame()
    s = { ...s, locations: { ...s.locations, '78024': { ...s.locations['78024']!, clues: 2 } } }
    s = emit(s, { type: 'RevealLocation', location: '78024' })
    expect(s.locations['78024']?.clues).toBe(2)
  })
  it.each(NPCS)('Defender a $name pone Supervivientes y gana una sola victoria', (npc) => {
    const row = TOWN.find((r) => r.npc === npc.code)!
    let s = townWithoutRuin(row)
    if (!s.locations[row.id]) s = emit(s, { type: 'PutLocationIntoPlay', location: row.id })
    s = emit(at(s, row.id), { type: 'RevealLocation', location: row.id })
    s = patch(s, {
      resources: 20,
      hand: Array.from({ length: 10 }, () => '01089'),
      discard: Array.from({ length: 8 }, () => (npc.metric === 'skills' ? '01089' : '01088')),
      skills: { willpower: 20, intellect: 20, combat: 20, agility: 20 },
    })
    if (npc.metric === 'assets' || npc.metric === 'ally' || npc.metric === 'nonAlly')
      s = emit(
        s,
        ...Array.from({ length: 6 }, (): Message => ({
          type: 'PutAssetIntoPlay',
          investigator: 'a',
          code: npc.metric === 'ally' ? '01018' : '01021',
          noSlot: true,
        })),
      )
    s = use(withBag(20)(s), 'ability.plaguebearer.night.defend')
    expect(s.locations[row.id]?.resources).toBe(1)
    expect(s.victoryDisplay.filter((code) => code === npc.code)).toHaveLength(1)
    expect(Object.values(s.placedAssets ?? {}).some((a) => a.code === npc.code)).toBe(false)
  })
  it('Defender usa los recursos actuales, impide asignar y no aumenta con apoyos o bonificaciones', () => {
    let s = nightGame()
    s = emit(
      at(s, '78024'),
      { type: 'RevealLocation', location: '78024' },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '01035', noSlot: true },
    )
    const ability = availableAbilities(s, 'a').find(
      (a) => a.label === 'ability.plaguebearer.night.defend',
    )!
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'UseAbility', investigator: 'a', ...ability },
    )
    // La reacción del acto puede aparecer antes de la ventana de asignación.
    while (s.pending?.question.prompt === 'prompt.reaction') s = choose(s, 'choice.skip')
    expect(scenarioBehavior(s.scenarioId)?.cannotCommit?.(s, 'a')).toBe(true)
    expect(skillTestValue(s).total).toBe(me(s).resources)
    expect(
      skillTestValue({
        ...patch(s, { resources: 9 }),
        skillTest: { ...s.skillTest!, baseModifier: 100 },
      }).total,
    ).toBe(9)
  })
  it('Hibb permite una habilidad normal y sí admite asignaciones', () => {
    let s = nightGame()
    const a = availableAbilities(s, 'a').find((a) =>
      a.label.startsWith('ability.plaguebearer.night.defend'),
    )!
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'UseAbility', investigator: 'a', ...a },
    )
    expect(scenarioBehavior(s.scenarioId)?.cannotCommit?.(s, 'a')).toBe(false)
  })
  it('el final de ronda mueve una pista a cada miasma y destruye un refugio sin fichas', () => {
    let s = nightGame()
    s = draw(s, N.cackling)
    if (s.pending?.question.prompt === 'prompt.chooseLocation')
      s = settle(choose(s, 'choice.location'))
    const t = Object.values(s.treacheries).find((t) => t.code === N.cackling)!
    expect(t.placement.type).toBe('location')
    if (t.placement.type !== 'location') return
    const id = t.placement.location
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.treacheries[t.id]?.clues).toBe(1)
    expect(s.locations[id]?.clues).toBe(3)
    s = { ...s, locations: { ...s.locations, [HIBBS]: { ...s.locations[HIBBS]!, clues: 0 } } }
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.locations[HIBBS]).toBeUndefined()
    expect(s.locations['78278']?.horror).toBe(1)
    expect(me(s).location).toBe('78278')
    expect(Object.values(s.placedAssets ?? {}).some((a) => a.code === '78034')).toBe(false)
  })
  it('el primer plan hace aparecer la Pústula y el segundo derrota con trauma', () => {
    let s = emit(nightGame(), { type: 'AdvanceAgenda' })
    expect(s.agendaIndex).toBe(1)
    expect(Object.values(s.enemies).find((e) => e.code === N.pustule)?.location).toBe('78025')
    s = emit(s, { type: 'AdvanceAgenda' })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.investigators.a?.physicalTrauma).toBe(1)
  })
  it('el acto espera al final de ronda y R2 conserva los seis lugares defendidos', () => {
    let s = nightGame()
    s = {
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [
          id,
          { ...l, ...(id.startsWith('780') ? { resources: 1 } : {}) },
        ]),
      ),
    }
    s = emit(s, { type: 'CheckActObjective' })
    expect(s.outcome).toBeNull()
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain('plaguebearerArkhamTogether')
    expect(s.campaignLog?.values.plaguebearerTown78026).toBe('Defended')
  })
  it('R1 anota que Hibb cubre las espaldas si se defendieron tres lugares incluido el Motel', () => {
    let s = nightGame()
    s = {
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [
          id,
          { ...l, ...([HIBBS, '78024', '78025'].includes(id) ? { resources: 1 } : {}) },
        ]),
      ),
    }
    s = emit(s, { type: 'EndScenario', outcome: { type: 'noResolution' } })
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog?.notes).toContain('plaguebearerHibbsCovered')
    expect(Object.values(s.campaignLog!.values).filter((v) => v === 'Infected')).toHaveLength(1)
  })
  it('colocar pistas mediante el acto reduce la dificultad de Defender sin modificar su valor', () => {
    let s = emit(at(nightGame(2), '78024'), { type: 'RevealLocation', location: '78024' })
    s = patch(s, { clues: 2 })
    const a = availableAbilities(s, 'a').find(
      (a) => a.label === 'ability.plaguebearer.night.defend',
    )!
    s = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'UseAbility', investigator: 'a', ...a },
    )
    s = choose(s, 'ability.plaguebearer.night.help', { amount: 2 })
    expect(me(s).clues).toBe(0)
    expect(s.locations['78024']?.clues).toBe(6)
    expect(s.skillTest?.difficulty).toBe(10)
    expect(skillTestValue(s).base).toBe(me(s).resources)
  })
  it('el Gul roba pistas al enfrentarse y atacar, y las devuelve al ser derrotado', () => {
    let s = patch(nightGame(), { clues: 2 })
    s = emit(s, { type: 'SpawnEnemy', card: gasGhoul, location: HIBBS, engageWith: 'a' })
    const e = Object.values(s.enemies)[0]!
    expect(me(s).clues).toBe(1)
    s = emit(s, { type: 'EnemyAttack', enemy: e.id, investigator: 'a', exhaustAfter: false })
    expect(s.enemies[e.id]?.clues).toBe(2)
    s = emit(s, { type: 'DefeatEnemy', enemy: e.id, by: 'a' })
    expect(me(s).clues).toBe(2)
  })
  it('Contagio andante aparece sin Supervivientes/Ruinas y drena pistas cada ronda', () => {
    let s = nightGame()
    s = {
      ...s,
      locations: Object.fromEntries(
        Object.entries(s.locations).map(([id, l]) => [
          id,
          id !== HIBBS && id.startsWith('780') ? { ...l, resources: 1 } : l,
        ]),
      ),
    }
    s = emit(s, { type: 'ResolveEncounterCard', investigator: 'a', card: walkingContagion })
    const e = Object.values(s.enemies)[0]!
    expect(e.location).toBe(HIBBS)
    s = emit(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.enemies[e.id]?.clues).toBe(1)
    expect(s.locations[HIBBS]?.clues).toBe(3)
    s = emit(s, { type: 'DefeatEnemy', enemy: e.id, by: 'a' })
    expect(me(s).clues).toBe(1)
  })
  it.each([true, false])(
    'Víctima sonriente pierde una acción solo durante tu turno (%s)',
    (ownTurn) => {
      let s = nightGame()
      if (!ownTurn) s = { ...s, activeTurn: null, phase: 'enemy' }
      s = emit(s, { type: 'SpawnEnemy', card: grinningVictim, location: HIBBS, engageWith: 'a' })
      expect(me(s).damage).toBe(ownTurn ? 0 : 1)
      if (ownTurn) expect(me(s).actionsRemaining).toBe(2)
    },
  )
  it('la Pústula retira una pista solo al recibir al menos dos daños de una fuente', () => {
    let s = emit(nightGame(), { type: 'AdvanceAgenda' })
    const e = Object.values(s.enemies).find((e) => e.code === N.pustule)!
    s = emit(s, { type: 'DamageEnemy', enemy: e.id, amount: 1, by: 'a' })
    expect(s.locations['78025']?.clues).toBe(4)
    s = emit(s, { type: 'DamageEnemy', enemy: e.id, amount: 2, by: 'a' })
    if (s.pending?.question.prompt === 'prompt.chooseLocation')
      s = settle(choose(s, 'choice.location'))
    expect(s.locations['78025']?.clues).toBe(3)
  })
  it('el miasma puede robarse del descarte con tablilla sin duplicarse', () => {
    let s = nightGame(1, 'hard')
    s = { ...s, encounterDiscard: [nightTreacheries[0]!] }
    const effect = scenarioBehavior(s.scenarioId)!.tokenEffect!(s, 'tablet', 'a')
    s = emit(s, ...effect.immediate!)
    if (s.pending?.question.prompt === 'prompt.chooseLocation')
      s = settle(choose(s, 'choice.location'))
    expect(s.encounterDiscard.some((c) => c.code === N.cackling)).toBe(false)
    expect(Object.values(s.treacheries).filter((t) => t.code === N.cackling)).toHaveLength(1)
  })
  it.each([N.cackling, N.echoing, N.hissing, N.whispering])(
    'la penalización de %s escala con sus pistas',
    (code) => {
      let s = finish(draw(nightGame(), code))
      const t = Object.values(s.treacheries).find((t) => t.code === code)!
      s = {
        ...s,
        treacheries: {
          ...s.treacheries,
          [t.id]: { ...t, clues: 2, placement: { type: 'location', location: HIBBS } },
        },
      }
      const before = me(s)
      s = finish(emit(s, { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } }))
      if (code === N.cackling) expect(me(s).damage - before.damage).toBe(2)
      if (code === N.echoing) expect(before.resources - me(s).resources).toBe(2)
      if (code === N.hissing) expect(before.hand.length - me(s).hand.length).toBe(2)
      if (code === N.whispering) expect(me(s).horror - before.horror).toBe(2)
    },
  )
  it('dispersar el miasma permite tomar una pista o descartar la carta tras acertar', () => {
    let s = finish(draw(nightGame(), N.cackling))
    const t = Object.values(s.treacheries).find((t) => t.code === N.cackling)!
    s = {
      ...s,
      treacheries: {
        ...s.treacheries,
        [t.id]: { ...t, clues: 2, placement: { type: 'location', location: HIBBS } },
      },
    }
    s = use(withBag(5)(s), 'ability.plaguebearer.night.clearMiasma')
    s = settle(choose(s, 'choice.plaguebearer.night.takeClue'))
    expect(me(s).clues).toBe(1)
    expect(s.treacheries[t.id]?.clues).toBe(1)
    s = use(s, 'ability.plaguebearer.night.clearMiasma')
    s = settle(choose(s, 'choice.plaguebearer.night.discardMiasma'))
    expect(s.treacheries[t.id]).toBeUndefined()
  })
  it('Explosión infecciosa retira pistas o busca una carta física de miasma', () => {
    let s = nightGame()
    s = { ...s, encounterDeck: [nightTreacheries[0]!], encounterDiscard: [] }
    s = finish(draw(s, N.outburst))
    const t = Object.values(s.treacheries).find((t) => t.code === N.cackling)!
    expect(t).toBeDefined()
    expect(s.encounterDeck.some((c) => c.code === N.cackling)).toBe(false)
    s = { ...s, treacheries: { ...s.treacheries, [t.id]: { ...t, clues: 2 } } }
    s = draw(s, N.outburst)
    expect(s.treacheries[t.id]?.clues).toBe(1)
  })
  it.each(TOWN)(
    'cada lugar $name puede caer sin dejar cartas vinculadas ni perder ocupantes',
    (row) => {
      let s = townWithoutRuin(row)
      if (!s.locations[row.id]) s = emit(s, { type: 'PutLocationIntoPlay', location: row.id })
      s = emit(
        at(s, row.id),
        { type: 'RevealLocation', location: row.id },
        { type: 'SpawnEnemy', card: gasGhoul, location: row.id, engageWith: null },
      )
      s = finish(emit(s, specific('night.ruin', { location: row.id })))
      expect(s.locations[row.id]).toBeUndefined()
      expect(s.locations[row.ruin]?.horror).toBe(1)
      expect(me(s).location).toBe(row.ruin)
      expect(Object.values(s.enemies).every((e) => e.location === row.ruin)).toBe(true)
      expect(Object.values(s.placedAssets ?? {}).some((a) => a.code === row.npc)).toBe(false)
    },
  )
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'termina partidas completas en %s',
    (difficulty) => {
      for (const players of [1, 2, 3, 4])
        playRandomlyToEnd(nightGame(players, difficulty), players + 330)
    },
  )
})
