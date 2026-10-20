import {
  applyInput,
  canAdvanceAct,
  createGame,
  playerCardBehavior,
  scenarioBehavior,
  shroudOf,
  skillTestValue,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import {
  CODES,
  LOCATIONS,
  MIDWINTER_GALA,
  bloodlessMan,
  bloodlessManUnleashed,
  declanPearce,
  encounterDeck,
  lanternClubMember,
  rookieCop,
  savageShantak,
  viciousAmbush,
  RIVAL_TREACHERIES,
  RIVAL_LEADERS,
} from './cards'
import { midwinterGala } from './gala'

// RR: "Abilities", "Forced Abilities", "Skill Tests", "Control", "Limits".
// Independent card-effect contracts, checked against the local reference handlers.
function table(location = '71007', players = 1): GameState {
  let s = throughSetup(
    createGame({
      seed: 81,
      interactive: true,
      scenario: testScenario({ id: MIDWINTER_GALA }),
      investigators: Array.from({ length: players }, (_, n) =>
        testInvestigator(n ? 'b' : 'a', { deck: Array(30).fill('12089') }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return during(s, (g) => ({
    ...g,
    locations: Object.fromEntries(
      Object.values(LOCATIONS).map((l) => [
        l.id,
        {
          ...l,
          connections: ['71007', '71009'].filter((id) => id !== l.id),
          revealed: true,
          clues: 2,
        },
      ]),
    ),
    investigators: g.investigators.map((i) => ({
      ...i,
      location,
      resources: 8,
      hand: [],
      clues: 4,
    })),
  }))
}
const put = (code: string, tokens = {}): Message => ({
  type: 'PutAssetIntoPlay',
  code,
  investigator: 'a',
  tokens,
})
const spawn = (card: EnemyCard, location = '71007'): Message => ({
  type: 'SpawnEnemy',
  card,
  location,
  engageWith: card.keywords.includes('aloof') ? null : 'a',
})
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)!
const me = (s: GameState) => s.investigators[0]!
function settle(s: GameState, preferred: string[] = []): GameState {
  for (let n = 0; s.pending && n < 60 && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choice = [...preferred, 'choice.revealToken', 'choice.applyResults', 'choice.skip']
      .map((label) => s.pending!.question.choices.findIndex((c) => c.label === label))
      .find((n) => n >= 0)
    s = applyInput(s, { investigator: s.pending.investigator, choice: choice ?? 0 })
  }
  return s
}
const begin = (s: GameState, difficulty = 0, tags: string[] = []) =>
  during(s, (g) => g, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'intellect',
    difficulty,
    tags,
    kind: { type: 'effect', source: 'Acceptance', onSuccess: [], onFail: [], onFailEach: [] },
  })
const reveal = (s: GameState, code: string) =>
  during(s, (g) => g, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: encounterDeck().find((c) => c.code === code) ?? RIVAL_TREACHERIES[code]!,
  })

describe('Invitados: contratos principales adicionales', () => {
  it('71016 Valeriya prepara otro Invitado y su bonificación se consume tras la siguiente prueba', () => {
    let s = during(table(), (g) => g, put('71016'), put('71017', { exhausted: true }))
    s = choose(s, 'ability.gala.rallyGuest')
    expect(asset(s, '71016').exhausted).toBe(true)
    expect(asset(s, '71017').exhausted).toBe(false)
    s = begin(s)
    expect(skillTestValue(s).total).toBe(5)
    s = begin(settle(s))
    expect(skillTestValue(s).total).toBe(3)
  })
  it('71019 Horacio agota un enemigo no Élite que acaba de atacar y lo mantiene agotado', () => {
    let s = during(table(), (g) => g, put('71019'), spawn(lanternClubMember))
    const enemy = Object.values(s.enemies)[0]!
    s = during(s, (g) => g, {
      type: 'Forced',
      trigger: { type: 'afterEnemyAttack', enemy: enemy.id, investigator: 'a' },
    })
    s = choose(s, 'ability.gala.horacio')
    expect(asset(s, '71019').exhausted).toBe(true)
    expect(s.enemies[enemy.id]!.exhausted).toBe(true)
    expect(s.enemies[enemy.id]!.stayExhausted).toBe(true)
  })
  it('71022 Caldwell roba hasta tres cartas tras descubrir pistas y no reacciona agotado', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        locations: { ...g.locations, '71007': { ...g.locations['71007']!, clues: 5 } },
      }),
      put('71022'),
      { type: 'DiscoverClues', investigator: 'a', location: '71007', amount: 4 },
    )
    s = choose(s, 'ability.drawCards')
    expect(me(s).hand).toHaveLength(3)
    expect(asset(s, '71022').exhausted).toBe(true)
    s = during(settle(s), (g) => g, {
      type: 'DiscoverClues',
      investigator: 'a',
      location: '71007',
      amount: 1,
    })
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it('71023 Mya usa el número de cartas en mano como intelecto base, pagando agotamiento', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, hand: ['12089', '12089'] })),
      }),
      put('71023'),
    )
    s = choose(s, 'ability.gala.myaInvestigate')
    expect(skillTestValue(s).total).toBe(2)
    expect(asset(s, '71023').exhausted).toBe(true)
    expect(playerCardBehavior('71023')!.handSize).toBe(2)
  })
  it('71025 Elizabeth permite mover a otro investigador tras robar durante tu turno', () => {
    let s = during(table('71007', 2), (g) => g, put('71025'), {
      type: 'DrawCards',
      investigator: 'a',
      amount: 1,
    })
    s = choose(s, 'ability.gala.elizabeth', { name: 'B' })
    s = settle(s, ['action.move'])
    expect(s.investigators[1]!.location).toBe('71009')
    expect(me(s).location).toBe('71007')
    expect(asset(s, '71025').exhausted).toBe(true)
  })
  it('71028 Johnny reacciona a recursos de un efecto una sola vez, sin recursión', () => {
    let s = during(table(), (g) => g, put('71028'), {
      type: 'GainResources',
      investigator: 'a',
      amount: 2,
    })
    s = settle(choose(s, 'ability.gala.johnny'))
    expect(me(s).resources).toBe(11)
    expect(me(s).hand).toHaveLength(1)
    expect(asset(s, '71028').exhausted).toBe(true)
  })
  it('71029 Miranda gasta suministro, coloca antigüedad y la vende tras éxito por dos', () => {
    let s = during(table(), (g) => g, put('71029'))
    s = choose(s, 'ability.gala.miranda')
    expect(asset(s, '71029').uses).toBe(2)
    expect(s.scenarioMeta!['antiquity:71007']).toBe(1)
    s = settle(begin(s), ['ability.gala.sellAntiquity'])
    expect(s.scenarioMeta!['antiquity:71007']).toBe(0)
    expect(me(s).resources).toBe(10)
  })
  it('71030 Arsène coloca antigüedades una vez por partida y las cambia por recursos', () => {
    let s = during(table(), (g) => g, put('71030'), spawn(lanternClubMember))
    s = during(s, (g) => ({
      ...g,
      enemies: Object.fromEntries(
        Object.entries(g.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    }))
    s = choose(s, 'ability.gala.arsenePlant')
    expect(
      Object.keys(s.locations).every((code) => s.scenarioMeta![`antiquity:${code}`] === 1),
    ).toBe(true)
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.arsenePlant')).toBe(
      false,
    )
    s = choose(s, 'ability.gala.arseneGain')
    expect(me(s).resources).toBe(10)
    expect(s.scenarioMeta!['antiquity:71007']).toBe(0)
  })
  it('71040 y 71043 Bain y Claire modifican una prueba comprometida y llaman un Invitado', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        scenarioDecks: { guests: ['71017'] },
        investigators: g.investigators.map((i) => ({ ...i, hand: ['12088'] })),
      }),
      put('71040'),
      put('71043'),
    )
    s = begin(s)
    const commit = s.pending!.question.choices.findIndex((c) => c.label === 'choice.commit')
    expect(commit).toBeGreaterThanOrEqual(0)
    s = applyInput(s, { investigator: 'a', choice: commit })
    s = choose(s, 'ability.gala.bain')
    s = choose(s, 'ability.gala.claire')
    expect(skillTestValue(s).total).toBe(6)
    expect(s.scenarioDecks!.guests).toEqual([])
    expect(Object.values(s.placedAssets!).some((p) => p.code === '71017')).toBe(true)
    expect(me(s).resources).toBe(7)
  })
})

describe('Lugares: objetivos, pistas y curación', () => {
  it('71007 Vestíbulo paga por investigador, trae un Invitado y limita al grupo por ronda', () => {
    let s = during(table('71007', 2), (g) => ({
      ...g,
      agendaIndex: 1,
      scenarioDecks: { guests: ['71017', '71018'] },
    }))
    s = choose(s, 'ability.gala.fashionablyLate')
    expect(me(s).resources).toBe(6)
    expect(s.scenarioDecks!.guests).toEqual(['71018'])
    expect(
      s.pending!.question.choices.some((c) => c.label === 'ability.gala.fashionablyLate'),
    ).toBe(false)
  })
  it('71009 Galería añade dos pistas de la reserva y dos recursos, una vez por ronda', () => {
    let s = choose(table('71009'), 'ability.gala.artGallery')
    expect(s.locations['71009']!.clues).toBe(4)
    expect(me(s).clues).toBe(4)
    expect(me(s).resources).toBe(10)
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.artGallery')).toBe(
      false,
    )
    s = during(s, (g) => ({ ...g, round: g.round + 1 }))
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.artGallery')).toBe(
      true,
    )
  })
  it('71011 Bar cura al Invitado elegido, consume recurso y no se repite en la ronda', () => {
    let s = during(table('71011'), (g) => g, put('71017', { horror: 1 }))
    s = choose(s, 'ability.gala.buyDrink')
    // With one eligible target the engine resolves the choice immediately.
    s = settle(s)
    expect(asset(s, '71017').horror).toBe(0)
    expect(me(s).resources).toBe(7)
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.buyDrink')).toBe(false)
  })
  it('71013 Biblioteca elimina perdición de la Joya y no permite repetir su habilidad', () => {
    let s = during(table('71013'), (g) => g, put('71052', { doom: 1 }))
    s = choose(s, 'ability.gala.studyJewel')
    s = settle(s, ['choice.gala.jewelRemove'])
    expect(asset(s, '71052').doom).toBe(0)
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.studyJewel')).toBe(
      false,
    )
    s = begin(s, 0, ['parley'])
    expect(skillTestValue(s).total).toBe(4)
  })
  it('71014 Salón reduce velo hasta uno y permite agotar un enemigo remoto con la Joya', () => {
    let s = during(
      table('71014'),
      (g) => g,
      put('71052'),
      ...['71016', '71017', '71018', '71019', '71022', '71023'].map((code) => put(code)),
      spawn(lanternClubMember, '71009'),
    )
    expect(shroudOf(s, '71014')).toBe(1)
    s = choose(s, 'ability.gala.exhaustEnemy')
    expect(Object.values(s.enemies)[0]!.exhausted).toBe(true)
  })
})

describe('Enemigos: transformación y efectos principales', () => {
  it('71045 transforma al Acechador derrotado y conserva como máximo 3 daños por investigador', () => {
    let s = during(table(), (g) => g, spawn(bloodlessMan))
    const id = Object.keys(s.enemies)[0]!
    s = during(s, (g) => g, { type: 'DamageEnemy', enemy: id, amount: 8, by: 'a' })
    expect(s.enemies[id]).toMatchObject({ code: '71045b', damageTaken: 3, exhausted: true })
    expect(s.victoryDisplay).not.toContain('71045')
  })
  it('71045b retira de la partida al Invitado elegido tras atacar', () => {
    let s = during(table(), (g) => g, spawn(bloodlessManUnleashed), put('71017'), put('71018'))
    const id = Object.keys(s.enemies)[0]!
    s = during(s, (g) => g, {
      type: 'Forced',
      trigger: { type: 'afterEnemyAttack', enemy: id, investigator: 'a' },
    })
    s = choose(s, 'choice.gala.removeGuest', { card: 'Special Agent Callahan' })
    expect(Object.values(s.assets).map((a) => a.code)).toEqual(['71017'])
    expect(Object.values(s.placedAssets ?? {})).toEqual([])
  })
  it('71051 Declan cura a todos los enemigos solo si está preparado al terminar Enemigos', () => {
    let s = during(table(), (g) => g, spawn(declanPearce), spawn(lanternClubMember))
    s = during(
      s,
      (g) => ({
        ...g,
        enemies: Object.fromEntries(
          Object.entries(g.enemies).map(([id, e]) => [id, { ...e, damageTaken: 1 }]),
        ),
      }),
      { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } },
    )
    expect(Object.values(s.enemies).map((e) => e.damageTaken)).toEqual([0, 0])
    expect(scenarioBehavior(MIDWINTER_GALA)!.actionsModifier!(s, 'a')).toBe(-1)
  })
  it('71053 soborno por 3 recursos descarta al Miembro durante el plan 1', () => {
    let s = during(table(), (g) => g, spawn(lanternClubMember))
    s = choose(s, 'ability.gala.bribeDiscard')
    expect(Object.keys(s.enemies)).toEqual([])
    expect(me(s).resources).toBe(5)
    expect(s.encounterDiscard.some((c) => c.code === '71053')).toBe(true)
  })
  it('71020 Policía daña tras atacar a otro enemigo, pero no tras ser él el objetivo', () => {
    let s = during(table(), (g) => g, spawn(rookieCop))
    const id = Object.keys(s.enemies)[0]!
    const attack = (enemy: string): Message => ({
      type: 'Forced',
      trigger: {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'fight',
        succeeded: false,
        margin: -1,
        enemy,
      },
    })
    s = settle(during(s, (g) => g, attack('other')))
    expect(me(s).damage).toBe(1)
    s = settle(during(s, (g) => g, attack(id)))
    expect(me(s).damage).toBe(1)
  })
  it.each(['foundation', 'miskatonic', 'syndicate', 'lodge', 'kingsport'] as const)(
    '%s: el Líder Rival es inmune y su negociación retira ambas cartas',
    (rival) => {
      const codes = {
        foundation: '71015b',
        miskatonic: '71021b',
        syndicate: '71027b',
        lodge: '71033b',
        kingsport: '71039b',
      }
      const leader = RIVAL_LEADERS[rival]
      let s = during(
        table(),
        (g) => ({ ...g, scenarioMeta: { rival }, chaosBag: [1], setAside: [leader] }),
        { type: 'PutStoryIntoPlay', code: codes[rival], name: rival },
      )
      const id = Object.keys(s.enemies)[0]!
      s = during(s, (g) => g, { type: 'DamageEnemy', enemy: id, amount: 100, by: 'a' })
      expect(s.enemies[id]!.damageTaken).toBe(0)
      s = choose(s, 'ability.gala.parleyRival')
      s = settle(s)
      expect(s.victoryDisplay).toEqual(expect.arrayContaining([codes[rival], leader.code]))
      expect(Object.values(s.enemies)).toEqual([])
      expect(me(s).clues).toBe(3)
    },
  )
})

describe('Traiciones: contratos adicionales', () => {
  it.each([0, 1, 2])(
    '71026 Confusión con %i pistas paga solo las disponibles y su horror restante',
    (clues) => {
      let s = during(table(), (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, clues })),
        encounterDeck: [lanternClubMember],
      }))
      s = settle(reveal(s, CODES.confusion))
      expect(me(s).clues).toBe(0)
      expect(me(s).horror).toBe(2 - clues)
      expect(s.locations['71007']!.clues).toBe(2 + clues)
    },
  )
  it('71032 Mala racha permite elegir daño u horror por los recursos que faltan', () => {
    let s = during(table(), (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, resources: 2 })),
      encounterDeck: [lanternClubMember],
    }))
    s = choose(reveal(s, '71032'), 'choice.takeHorror')
    s = settle(choose(s, 'choice.takeDamage'))
    expect(me(s)).toMatchObject({ resources: 0, damage: 1, horror: 1 })
  })
  it('71044 Mala suerte reduce todas las habilidades y se descarta al final de ronda', () => {
    let s = during(table(), (g) => ({ ...g, encounterDeck: [lanternClubMember] }))
    s = settle(reveal(s, '71044'))
    s = begin(s)
    expect(skillTestValue(s).total).toBe(1)
    s = settle(s)
    s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(Object.values(s.treacheries)).toEqual([])
    expect(skillTestValue(begin(s)).total).toBe(3)
  })
  it('71054 Paredes sangrantes usa el velo y solo penaliza al fallar', () => {
    let s = during(table(), (g) => ({ ...g, chaosBag: ['autoFail'] }))
    s = reveal(s, '71054')
    expect(s.skillTest!.difficulty).toBe(2)
    s = settle(s)
    expect(me(s)).toMatchObject({ actionsRemaining: 2, horror: 1 })
  })
  it('71056 Frío inexplicable aplica una elección por punto de fallo', () => {
    let s = reveal(table(), '71056')
    s = settle(s)
    expect(me(s).damage).toBe(1)
  })
  it('71057 Extracción mental devuelve la Lámpara al Exangüe incluso con éxito', () => {
    let s = during(table(), (g) => g, spawn(bloodlessMan), put('71046b'))
    s = settle(reveal(s, '71057'))
    expect(Object.values(s.assets)).toEqual([])
    expect(Object.values(s.placedAssets!)[0]!.placement).toEqual({
      type: 'enemy',
      enemy: Object.keys(s.enemies)[0],
    })
    expect(me(s).horror).toBe(0)
  })
  it('71058 Vapores nocivos permite aguantar la respiración y aplica daño por margen', () => {
    const s = settle(reveal(table(), '71058'), ['choice.gala.holdBreath'])
    expect(me(s).damage).toBe(0)
    expect(me(s).location).toBe('71007')
  })
  it.each(['foundation', 'miskatonic', 'syndicate', 'lodge', 'kingsport'])(
    '71061 Portal aplica el castigo de %s al fallar',
    (ally) => {
      let s = during(table(), (g) => ({
        ...g,
        chaosBag: ['autoFail'],
        scenarioMeta: { ally },
        investigators: g.investigators.map((i) => ({ ...i, hand: ['12089', '12089'] })),
      }))
      s = settle(reveal(s, '71061'))
      const i = me(s)
      expect({
        damage: i.damage,
        horror: i.horror,
        resources: i.resources,
        hand: i.hand.length,
        actions: i.actionsRemaining,
      }).toEqual({
        damage: ally === 'foundation' ? 2 : 0,
        horror: ally === 'lodge' ? 2 : 0,
        resources: ally === 'syndicate' ? 5 : 8,
        hand: ally === 'miskatonic' ? 0 : 2,
        actions: ally === 'kingsport' ? 2 : 3,
      })
    },
  )
})

describe('71005: restricciones del primer acto', () => {
  it('exige un Invitado de cada investigador además de pistas y el segundo plan', () => {
    let s = during(
      table('71007', 2),
      (g) => ({
        ...g,
        acts: [
          {
            code: '71005',
            name: 'Meet and Greet',
            clueThreshold: 3,
            cluesPerInvestigator: true,
            advanceTiming: 'anytime',
          },
        ],
      }),
      put('71017'),
    )
    expect(canAdvanceAct(s)).toBe(false)
    s = during(s, (g) => ({ ...g, agendaIndex: 1 }), {
      type: 'PutAssetIntoPlay',
      investigator: 'b',
      code: '71018',
    })
    expect(canAdvanceAct(s)).toBe(true)
  })
})

describe('Historias Aliado: adquisición de la Joya y límites', () => {
  it('71015 Fundación toma la Joya de su Lugar y añade un daño', () => {
    let s = during(
      table(),
      (g) => ({ ...g, scenarioMeta: { ally: 'foundation' } }),
      { type: 'PutStoryIntoPlay', code: '71015', name: 'The Foundation' },
      {
        type: 'PlaceAsset',
        code: '71052',
        name: 'Jewel of Sarnath',
        placement: { type: 'location', location: '71007' },
      },
    )
    s = choose(s, 'ability.gala.takeJewel')
    expect(asset(s, '71052')).toMatchObject({ owner: 'a', damage: 1 })
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('71021 Universidad protege a Declan hasta pagar tres pistas por investigador', () => {
    let s = during(
      table(),
      (g) => ({ ...g, scenarioMeta: { ally: 'miskatonic' } }),
      spawn(declanPearce),
      { type: 'PutStoryIntoPlay', code: '71021', name: 'Miskatonic University' },
    )
    const id = Object.keys(s.enemies)[0]!
    s = during(
      s,
      (g) => g,
      {
        type: 'PlaceAsset',
        code: '71052',
        name: 'Jewel of Sarnath',
        placement: { type: 'enemy', enemy: id },
      },
      { type: 'DamageEnemy', enemy: id, amount: 100, by: 'a' },
    )
    expect(s.enemies[id]!.damageTaken).toBe(0)
    s = choose(s, 'ability.gala.convinceDeclan', { n: 2 })
    expect(s.enemies[id]!.leads).toBe(2)
    expect(Object.values(s.assets)).toEqual([])
    s = choose(s, 'ability.gala.convinceDeclan', { n: 1 })
    expect(asset(s, '71052').owner).toBe('a')
    expect(s.victoryDisplay).toContain('71051')
    expect(me(s).clues).toBe(1)
  })
  it('71033 Logia permite rechazar la carta descartada y limita dos usos por ronda', () => {
    let s = during(table(), (g) => ({ ...g, encounterDeck: [lanternClubMember, rookieCop] }), {
      type: 'PutStoryIntoPlay',
      code: '71033',
      name: 'Lodge',
    })
    s = choose(choose(s, 'ability.gala.senseJewel'), 'choice.gala.leaveDiscarded')
    expect(s.encounterDiscard[0]!.code).toBe('71053')
    expect(Object.keys(s.enemies)).toEqual([])
    s = choose(choose(s, 'ability.gala.senseJewel'), 'choice.gala.leaveDiscarded')
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.senseJewel')).toBe(
      false,
    )
  })
  it('71039 Kingsport retira la ficha elegida y permite rechazar o tomar la Joya', () => {
    let s = during(
      table(),
      (g) => ({ ...g, chaosBag: [1] }),
      { type: 'PutStoryIntoPlay', code: '71039', name: 'Kingsport' },
      {
        type: 'PlaceAsset',
        code: '71052',
        name: 'Jewel of Sarnath',
        damage: 1,
        doom: 1,
        placement: { type: 'location', location: '71007' },
      },
    )
    s = choose(s, 'ability.gala.purgeJewel')
    s = choose(s, 'choice.test.combat')
    // Resolve the skill test, then choose which of the two tokens to remove.
    for (let n = 0; s.skillTest && n < 12; n++) {
      const label = ['choice.revealToken', 'choice.applyResults'].find((l) =>
        s.pending!.question.choices.some((c) => c.label === l),
      )
      if (!label) break
      s = choose(s, label)
    }
    s = choose(s, 'choice.gala.jewelRemove', { kind: 'doom' })
    s = settle(choose(s, 'choice.gala.takeJewel'))
    expect(asset(s, '71052').damage).toBe(1)
    expect(asset(s, '71052').doom ?? 0).toBe(0)
  })
})

describe('Caras y ramas adicionales de cierre', () => {
  it('71050 Emboscada sin Monstruos gana Oleada y roba otro encuentro', () => {
    const s = settle(
      during(table(), (g) => ({ ...g, encounterDeck: [lanternClubMember] }), {
        type: 'ResolveEncounterCard',
        investigator: 'a',
        card: viciousAmbush,
      }),
    )
    expect(s.encounterDiscard.map((c) => c.code)).toContain('71050')
    expect(Object.values(s.enemies).map((e) => e.code)).toContain('71053')
  })
  it('71055 Atrapado hechiza al Invitado al fallar con El Exangüe aquí', () => {
    let s = during(
      table(),
      (g) => ({ ...g, chaosBag: ['autoFail'] }),
      spawn(bloodlessMan),
      put('71017'),
    )
    s = settle(reveal(s, '71055'))
    expect(Object.values(s.assets)).toEqual([])
    expect(Object.values(s.placedAssets!).find((p) => p.code === '71017')!.faceDown).toBe(true)
  })
  it('71005 dar un Invitado cambia de controlador y conserva sus usos', () => {
    let s = during(
      table('71007', 2),
      (g) => ({ ...g, acts: midwinterGala({ players: 2 }).acts }),
      put('71035', { uses: 1 }),
    )
    s = choose(s, 'ability.gala.giveGuest', { name: 'B' })
    expect(asset(s, '71035')).toMatchObject({ owner: 'b', uses: 1 })
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('71016b Valeriya agota Invitados aquí y penaliza al controlador de uno agotado', () => {
    let s = during(table(), (g) => g, spawn(RIVAL_LEADERS.foundation), put('71017'))
    s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(asset(s, '71017').exhausted).toBe(true)
    expect(skillTestValue(begin(s)).total).toBe(2)
  })
  it('71022b Caldwell exige descartar al terminar el turno de un investigador aquí', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, hand: ['12088', '12089'] })),
      }),
      spawn(RIVAL_LEADERS.miskatonic),
    )
    s = settle(
      during(s, (g) => g, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } }),
    )
    expect(me(s).hand).toHaveLength(1)
    expect(me(s).discard).toHaveLength(1)
  })
  it('71028b Johnny quita dos recursos al terminar un turno aquí', () => {
    let s = during(table(), (g) => g, spawn(RIVAL_LEADERS.syndicate))
    s = during(s, (g) => g, { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } })
    expect(me(s).resources).toBe(6)
  })
  it('71034b Carl reduce voluntad y no intelecto en cualquier fase', () => {
    const s = during(table(), (g) => ({ ...g, phase: 'investigation' }), spawn(RIVAL_LEADERS.lodge))
    const intellect = begin(s)
    expect(skillTestValue(intellect).total).toBe(3)
    expect(
      skillTestValue({ ...intellect, skillTest: { ...intellect.skillTest!, skill: 'willpower' } })
        .total,
    ).toBe(2)
  })
  it('71031 Nova gana un recurso por derrotar y limita su reacción por ronda', () => {
    let s = during(table(), (g) => g, put('71031'), spawn(lanternClubMember))
    const enemy = Object.values(s.enemies)[0]!
    const trigger: Message = { type: 'Forced', trigger: { type: 'enemyDefeated', enemy, by: 'a' } }
    s = during(s, (g) => g, trigger)
    s = choose(s, 'ability.gainResource')
    expect(me(s).resources).toBe(9)
    s = during(s, (g) => g, trigger)
    expect(s.pending!.question.prompt).toBe('prompt.chooseAction')
  })
  it('71045 listo con la Lámpara hechiza Invitados y causa horror al terminar Investigación', () => {
    let s = during(table(), (g) => g, spawn(bloodlessMan), put('71017'))
    s = during(
      s,
      (g) => g,
      {
        type: 'PlaceAsset',
        code: '71046',
        name: 'The Pale Lantern',
        placement: { type: 'enemy', enemy: Object.keys(s.enemies)[0]! },
      },
      { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } },
    )
    s = settle(s)
    expect(me(s).horror).toBe(1)
    expect(Object.values(s.assets)).toEqual([])
    expect(Object.values(s.placedAssets!).find((p) => p.code === '71017')).toMatchObject({
      faceDown: true,
      horror: 0,
    })
  })
  it('71046 tomar la Lámpara la transforma en Aura y conserva su daño', () => {
    let s = during(table(), (g) => ({ ...g, chaosBag: [1], victoryDisplay: ['71045b'] }), {
      type: 'PlaceAsset',
      code: '71046',
      name: 'The Pale Lantern',
      damage: 1,
      placement: { type: 'location', location: '71007' },
    })
    s = settle(choose(s, 'ability.gala.takeLantern'))
    expect(asset(s, '71046b')).toMatchObject({ damage: 1, owner: 'a' })
    expect(Object.values(s.placedAssets!)).toEqual([])
  })
  it('71049 Shantak suma Invitados al combate y a la evasión', () => {
    let s = during(table(), (g) => g, spawn(savageShantak), put('71017'), put('71018'))
    s = choose(s, 'action.fight')
    expect(s.skillTest!.difficulty).toBe(3)
    s = settle(s)
    s = choose(s, 'action.evade')
    expect(s.skillTest!.difficulty).toBe(3)
  })
  it.each(['success', 'fail'])('71058 huir con %s mueve o causa dos daños', (result) => {
    let s = during(table(), (g) => ({ ...g, chaosBag: result === 'success' ? [1] : ['autoFail'] }))
    s = settle(reveal(s, '71058'), ['choice.gala.flee', 'action.move'])
    expect(me(s).damage).toBe(result === 'success' ? 0 : 2)
    expect(me(s).location).toBe(result === 'success' ? '71009' : '71007')
  })
})

describe('71001 y planes: referencia, cambios de fase y derrota', () => {
  it('71001 usa número de plan, Invitados y Lugar Privado para los símbolos', () => {
    const token = scenarioBehavior(MIDWINTER_GALA)!.tokenEffect!
    let s = table()
    expect(token(s, 'skull', 'a')!.modifier).toBe(-1)
    expect(token({ ...s, difficulty: 'hard', agendaIndex: 2 }, 'skull', 'a')!.modifier).toBe(-4)
    expect(token(s, 'tablet', 'a')!.modifier).toBe(-2)
    s = during(
      s,
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, location: '71008' })) }),
      put('71017'),
      put('71018'),
    )
    expect(token(s, 'tablet', 'a')!.modifier).toBe(-4)
    expect(token(s, 'cultist', 'a')!.modifier).toBe(-2)
    expect(token(s, 'elderThing', 'a')).toMatchObject({
      modifier: -3,
      onFail: [{ type: 'TakeDamage', horror: 1 }],
    })
  })
  it('71002 protege a los miembros del Club y añade siete cartas apartadas al avanzar', () => {
    const definition = midwinterGala({ players: 1 })
    let s = during(
      table(),
      (g) => ({ ...g, agendas: definition.agendas, setAside: definition.setAside! }),
      spawn(lanternClubMember),
    )
    const id = Object.keys(s.enemies)[0]!
    s = during(s, (g) => g, { type: 'DamageEnemy', enemy: id, amount: 1, by: 'a' })
    expect(s.enemies[id]!.damageTaken).toBe(0)
    const size = s.encounterDeck.length
    s = during(s, (g) => g, { type: 'AdvanceAgenda' })
    expect(s.agendaIndex).toBe(1)
    expect(s.encounterDeck.length).toBe(size + 7)
    expect(s.encounterDeck.filter((c) => c.code === '71050')).toHaveLength(2)
    s = during(s, (g) => g, { type: 'DamageEnemy', enemy: id, amount: 1, by: 'a' })
    expect(s.enemies[id]!.damageTaken).toBe(1)
  })
  it('71003 transforma al Exangüe si sigue silencioso', () => {
    let s = during(
      table(),
      (g) => ({ ...g, agendas: midwinterGala({ players: 1 }).agendas, agendaIndex: 1 }),
      spawn(bloodlessMan),
    )
    s = settle(during(s, (g) => g, { type: 'AdvanceAgenda' }))
    expect(s.agendaIndex).toBe(2)
    expect(Object.values(s.enemies)[0]!.code).toBe('71045b')
  })
  it('71003 sin el Acechador permite curar un horror', () => {
    let s = during(table(), (g) => ({
      ...g,
      agendas: midwinterGala({ players: 1 }).agendas,
      agendaIndex: 1,
      investigators: g.investigators.map((i) => ({ ...i, horror: 1 })),
    }))
    s = settle(
      during(s, (g) => g, { type: 'AdvanceAgenda' }),
      ['choice.heal.horror'],
    )
    expect(me(s).horror).toBe(0)
  })
  it('71004 derrota a todos y añade trauma mental antes de puntuar', () => {
    let s = during(table(), (g) => ({
      ...g,
      agendas: midwinterGala({ players: 1 }).agendas,
      agendaIndex: 2,
    }))
    s = settle(during(s, (g) => g, { type: 'AdvanceAgenda' }))
    expect(s.outcome).toEqual({ type: 'noResolution' })
    expect(me(s).eliminated).toBe(true)
    expect(s.campaignLog!.investigators.a!.mentalTrauma).toBe(1)
  })
  it('71038 cancela el Evento jugado sin devolver costes, causa horror y se descarta', () => {
    let s = during(table(), (g) => ({
      ...g,
      encounterDeck: [lanternClubMember],
      investigators: g.investigators.map((i) => ({ ...i, hand: ['12089'] })),
    }))
    s = settle(reveal(s, '71038'))
    s = during(s, (g) => ({
      ...g,
      enemies: Object.fromEntries(
        Object.entries(g.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
      ),
    }))
    s = settle(choose(s, 'action.play', { card: 'Emergency Cache' }))
    expect(me(s)).toMatchObject({ resources: 8, horror: 1, actionsRemaining: 2, hand: [] })
    expect(me(s).discard).toContain('12089')
    expect(s.encounterDiscard.some((c) => c.code === '71038')).toBe(true)
  })
})
