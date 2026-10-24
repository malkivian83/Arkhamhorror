import {
  applyInput,
  availableAbilities,
  availableActions,
  createGame,
  playerCardBehavior,
  registerTreachery,
  shuffle,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { CODES, FACTION_CARDS, LOCATIONS, MIDWINTER_GALA, rookieCop } from './cards'

const foe: EnemyCard = {
  kind: 'enemy',
  code: 'phase-two-foe',
  name: 'Test foe',
  fight: 1,
  health: 20,
  evade: 1,
  damage: 1,
  horror: 0,
  keywords: [],
  traits: ['Monster'],
}
registerTreachery({
  code: 'phase-two-check-surge',
  revelation: (s) => [
    {
      type: 'SetScenarioMeta',
      key: 'surgeBeforeExhaust',
      value: Number(
        Object.values(s.enemies).some((e) => e.code === rookieCop.code && !e.exhausted),
      ),
    },
  ],
})
const card = (n: number, elite = false): EncounterCard => ({
  kind: 'treachery',
  code: `phase-two-${n}`,
  name: `Card ${n}`,
  traits: elite ? ['Elite'] : ['Terror'],
  keywords: [],
})
function table(players = 1): GameState {
  let s = throughSetup(
    createGame({
      seed: 71,
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
    investigators: g.investigators.map((i) => ({ ...i, resources: 8, hand: [], clues: 0 })),
    locations: {
      ...g.locations,
      ...Object.fromEntries(
        Object.values(LOCATIONS).map((l) => [l.id, { ...l, revealed: true, clues: 2 }]),
      ),
    },
  }))
}
const asset = (code: string, investigator = 'a'): Message => ({
  type: 'PutAssetIntoPlay',
  code,
  investigator,
})
const specific = (key: string, data: Record<string, string | number | boolean> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data: { investigator: 'a', ...data },
})
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const at = (s: GameState, location: string) =>
  during(s, (g) => ({
    ...g,
    investigators: g.investigators.map((i) => (i.id === 'a' ? { ...i, location } : i)),
  }))
function finishTest(s: GameState) {
  for (let n = 0; n < 20 && s.skillTest; n++) {
    const choices = s.pending!.question.choices
    const label = ['choice.revealToken', 'choice.applyResults', 'choice.skip'].find((l) =>
      choices.some((c) => c.label === l),
    )
    if (!label) throw new Error(`Unexpected test decision: ${s.pending?.question.prompt}`)
    s = choose(s, label)
  }
  return s
}
function begin(s: GameState, skill: 'intellect' | 'combat' = 'intellect', investigator = 'a') {
  return during(s, (g) => g, {
    type: 'BeginSkillTest',
    investigator,
    skill,
    difficulty: 0,
    kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
  })
}

describe('G02 y G19: predicción pública y límite por turno', () => {
  it.each(['Card 1', 'wrong', 'empty'])('descubre una pista aunque el nombre sea %s', (name) => {
    let s = at(table(), CODES.lanternChamber)
    s = during(s, (g) => ({ ...g, encounterDeck: name === 'empty' ? [] : [card(1)] }))
    s = choose(s, 'ability.gala.nameACard')
    expect(me(s).clues).toBe(1)
    expect(s.pending?.question.prompt).toBe('prompt.gala.nameACard')
    // A known public option, independent of our deliberately different hidden card.
    const selected = s.pending!.question.choices[0]!
    const message = selected.then[0] as Extract<Message, { type: 'ScenarioSpecific' }>
    if (name !== 'empty')
      s = {
        ...s,
        encounterDeck: [
          { ...card(1), name: name === 'wrong' ? 'different' : String(message.data!.name) },
        ],
      }
    s = applyInput(s, { investigator: 'a', choice: 0 })
    expect(me(s).clues).toBe(1)
    if (name === 'Card 1') expect(s.log.some((l) => l.key === 'log.encounter')).toBe(false)
    if (name === 'wrong') expect(s.log.some((l) => l.key === 'log.encounter')).toBe(true)
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.nameACard')).toBe(false)
    s = during(s, (g) => g, { type: 'BeginTurn', investigator: 'a' })
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.nameACard')).toBe(true)
  })
  it('las opciones de nombres y rasgos no cambian al cambiar mazo, descarte o Rival', () => {
    const variants = [[card(1)], [{ ...card(2), traits: ['Secret hidden trait'] }], []]
    const names = variants.map((deck) => {
      let s = at(table(), CODES.lanternChamber)
      s = during(s, (g) => ({ ...g, encounterDeck: deck, encounterDiscard: deck }))
      return choose(s, 'ability.gala.nameACard').pending!.question.choices.map(
        (c) => c.params?.card,
      )
    })
    expect(names[1]).toEqual(names[0])
    expect(names[2]).toEqual(names[0])
    const traits = variants.map((deck) => {
      let s = during(
        table(),
        (g) => ({ ...g, encounterDeck: deck, encounterDiscard: deck }),
        asset('71042'),
      )
      s = choose(s, 'ability.gala.olney')
      return s.pending!.question.choices.map((c) => c.params?.trait)
    })
    expect(traits[1]).toEqual(traits[0])
    expect(traits[2]).toEqual(traits[0])
    expect(traits[0]).not.toContain('Secret hidden trait')
    expect(names[0]).toContain('Jewel of Sarnath')
  })
})

describe('G04: Prudence conserva y reordena exactamente las cuatro cartas vistas', () => {
  it('no muestra la quinta tras descartar y devuelve las restantes en el orden elegido', () => {
    let s = during(
      table(),
      (g) => ({ ...g, encounterDeck: [card(1), card(2, true), card(3), card(4), card(5)] }),
      specific('prudence', { left: 2 }),
    )
    expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain('Card 2')
    s = choose(s, 'choice.discard', { card: 'Card 1' })
    expect(s.pending!.question.choices.map((c) => c.params?.card)).not.toContain('Card 5')
    s = choose(s, 'choice.discard', { card: 'Card 3' })
    expect(s.pending?.question.prompt).toBe('prompt.gala.orderEncounter')
    s = choose(s, 'choice.card', { card: 'Card 4' })
    expect(s.encounterDeck.map((c) => c.name)).toEqual(['Card 4', 'Card 2', 'Card 5'])
    expect(s.encounterDiscard.map((c) => c.name)).toEqual(['Card 1', 'Card 3'])
  })
  it.each([0, 1, 2, 4])('permite no descartar con %i cartas y conserva el resto del mazo', (n) => {
    let s = during(
      table(),
      (g) => ({ ...g, encounterDeck: Array.from({ length: n }, (_, k) => card(k)) }),
      specific('prudence', { left: 2 }),
    )
    if (n) s = choose(s, 'choice.gala.keepRest')
    while (s.pending?.question.prompt === 'prompt.gala.orderEncounter')
      s = applyInput(s, { investigator: 'a', choice: s.pending.question.choices.length - 1 })
    expect(s.encounterDeck).toHaveLength(n)
    expect(s.encounterDiscard).toHaveLength(0)
    if (n > 1) expect(s.encounterDeck[0]!.name).toBe(`Card ${n - 1}`)
  })
})

describe('G05: habilidades de Invitados y ventanas del motor', () => {
  it('Callahan ofrece el daño después de terminar su acción de combate y se agota al aceptarlo', () => {
    let s = during(table(), (g) => g, asset('71018'), {
      type: 'SpawnEnemy',
      card: foe,
      location: 'A',
      engageWith: 'a',
    })
    s = choose(s, 'ability.gala.callahanFight')
    expect(s.pending?.question.prompt).toBe('prompt.commitCards')
    s = finishTest(s)
    expect(s.pending?.question.prompt).toBe('prompt.reaction')
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
    s = choose(s, 'ability.gala.callahanShot')
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
    expect(Object.values(s.assets)[0]!.exhausted).toBe(true)
  })
  it('Callahan no reacciona a acciones básicas ni habilidades rápidas', () => {
    let s = during(table(), (g) => g, asset('71018'))
    s = choose(s, 'action.resource')
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(
      playerCardBehavior('71018')!.reactions!(
        s,
        { type: 'afterPlayAsset', investigator: 'a', code: '12002' },
        Object.values(s.assets)[0]!,
      ),
    ).toEqual([])
  })
  it('Callahan también reacciona al combate de un Arma', () => {
    let s = during(table(), (g) => g, asset('71018'), asset('12028'), {
      type: 'SpawnEnemy',
      card: foe,
      location: 'A',
      engageWith: 'a',
    })
    const weapon = Object.values(s.assets).find((a) => a.code === '12028')!
    const index = s.pending!.question.choices.findIndex((c) =>
      c.then.some(
        (m) => m.type === 'UseAbility' && m.key.startsWith(`${weapon.id}:`) && m.actions === 1,
      ),
    )
    expect(index).toBeGreaterThanOrEqual(0)
    s = applyInput(s, { investigator: 'a', choice: index })
    s = finishTest(s)
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.callahanShot')).toBe(
      true,
    )
  })
  it.each([false, true])(
    'Delores evita ataques de oportunidad de Humanoides (Élite: %s)',
    (elite) => {
      let s = during(table(), (g) => g, asset('71041'), {
        type: 'SpawnEnemy',
        card: { ...foe, traits: ['Humanoid', ...(elite ? ['Elite'] : [])] },
        location: 'A',
        engageWith: 'a',
      })
      s = choose(s, 'action.resource')
      expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
      expect(me(s).damage).toBe(0)
      expect(s.log.filter((l) => l.key === 'log.enemyAttack')).toHaveLength(0)
    },
  )
  it('Delores no evita el ataque normal ni los de oportunidad de Monstruos', () => {
    let s = during(table(), (g) => g, asset('71041'), {
      type: 'SpawnEnemy',
      card: foe,
      location: 'A',
      engageWith: 'a',
    })
    s = choose(s, 'action.resource')
    expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
    s = choose(s, 'choice.assignToInvestigator')
    const enemy = Object.keys(s.enemies)[0]!
    s = during(
      s,
      (g) => ({
        ...g,
        enemies: { ...g.enemies, [enemy]: { ...g.enemies[enemy]!, traits: ['Humanoid'] } },
      }),
      { type: 'EnemyAttack', enemy, investigator: 'a', exhaustAfter: false },
    )
    expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
  })
  it.each(['a', 'b'])('Olney compromete desde su propio mazo a la prueba de %s', (tester) => {
    let s = during(
      table(2),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) =>
          i.id === 'a' ? { ...i, deck: ['12088', '12089'] } : i,
        ),
      }),
      asset('71042'),
    )
    s = begin(s, 'intellect', tester)
    s = choose(s, 'ability.gala.olneyCommit')
    expect(s.skillTest!.committed).toContainEqual({ code: '12088', by: 'a' })
    expect(me(s).hand).toEqual([])
    expect(me(s).discard).toEqual([])
    expect(me(s).deck).toEqual(['12089'])
    s = finishTest(s)
    expect(me(s).discard).toContain('12088')
  })
  it.each(['wrong-icon', 'empty', 'already-helped', 'blocked'])(
    'Olney respeta la restricción %s',
    (kind) => {
      let s = during(
        table(2),
        (g) => ({
          ...g,
          investigators: g.investigators.map((i) =>
            i.id === 'a'
              ? {
                  ...i,
                  deck: kind === 'empty' ? [] : ['12088'],
                  blockedTypes: kind === 'blocked' ? [{ cardType: 'asset', round: g.round }] : [],
                }
              : i,
          ),
        }),
        asset('71042'),
      )
      s = begin(s, kind === 'wrong-icon' ? 'combat' : 'intellect', 'b')
      if (kind === 'already-helped')
        s = { ...s, skillTest: { ...s.skillTest!, committed: [{ code: '12034', by: 'a' }] } }
      s = choose(s, 'ability.gala.olneyCommit')
      expect(s.skillTest!.committed.filter((c) => c.code === '12088')).toHaveLength(0)
      if (kind !== 'empty') expect(me(s).discard).toContain('12088')
    },
  )
  it('no ofrece Olney desde otra localización', () => {
    let s = during(
      table(2),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => (i.id === 'b' ? { ...i, location: 'B' } : i)),
      }),
      asset('71042'),
    )
    s = begin(s, 'intellect', 'b')
    expect(s.pending!.question.choices.some((c) => c.label === 'ability.gala.olneyCommit')).toBe(
      false,
    )
  })
  it('Olney descarta sin comprometer cuando William Bain lo impide', () => {
    let s = during(
      table(),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, deck: ['12088'] })) }),
      asset('71042'),
      { type: 'SpawnEnemy', card: { ...foe, code: '71040b' }, location: 'A', engageWith: null },
    )
    s = begin(s)
    s = choose(s, 'ability.gala.olneyCommit')
    expect(s.skillTest!.committed).toEqual([])
    expect(me(s).discard).toEqual(['12088'])
  })
})

describe('G09: Baile', () => {
  it('elige dos entre Invitados controlados y colocados, y solo los elegidos se curan', () => {
    let s = at(table(), CODES.ballroom)
    s = during(
      s,
      (g) => ({
        ...g,
        placedAssets: {
          p: {
            id: 'p',
            code: '71035',
            name: 'Prudence',
            placement: { type: 'location', location: CODES.ballroom },
            exhausted: false,
            damage: 0,
            horror: 1,
          },
        },
      }),
      asset('71022'),
      asset('71023'),
    )
    s = during(s, (g) => ({
      ...g,
      assets: Object.fromEntries(
        Object.entries(g.assets).map(([id, a]) => [id, { ...a, horror: 1 }]),
      ),
    }))
    s = choose(s, 'ability.gala.dance')
    s = choose(s, 'choice.card', { card: 'Prudence' })
    expect(s.pending!.question.choices).toHaveLength(2)
    s = choose(s, 'choice.card', { card: 'Dr. Mya Badry' })
    expect(s.placedAssets!.p).toMatchObject({ exhausted: true, horror: 0 })
    expect(Object.values(s.assets).find((a) => a.code === '71023')).toMatchObject({
      exhausted: true,
      horror: 0,
    })
    expect(Object.values(s.assets).find((a) => a.code === '71022')).toMatchObject({
      exhausted: false,
      horror: 1,
    })
  })
  it('con un único Invitado lo agota y no cura sin segundo bailarín, como la referencia', () => {
    let s = during(at(table(), CODES.ballroom), (g) => g, asset('71022'))
    s = during(s, (g) => ({
      ...g,
      assets: Object.fromEntries(
        Object.entries(g.assets).map(([id, a]) => [id, { ...a, horror: 1 }]),
      ),
    }))
    s = choose(s, 'ability.gala.dance')
    expect(Object.values(s.assets)[0]).toMatchObject({ exhausted: true, horror: 1 })
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.dance')).toBe(false)
  })
})

describe('G10: Archibald busca, roba y agota la instancia correcta', () => {
  it('termina de resolver Oleada antes de agotar el enemigo buscado', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        encounterDeck: [
          rookieCop,
          {
            kind: 'treachery',
            code: 'phase-two-check-surge',
            name: 'Surge timing',
            keywords: [],
          },
        ],
      }),
      asset('71017'),
    )
    s = choose(s, 'ability.gala.archibaldHunt')
    expect(s.scenarioMeta?.surgeBeforeExhaust).toBe(1)
    expect(Object.values(s.enemies)[0]!.exhausted).toBe(true)
  })
  it('elige entre enemigos, respeta aparición y Oleada, y no agota una copia anterior', () => {
    let s = during(
      table(),
      (g) => ({ ...g, encounterDeck: [foe, { ...rookieCop, spawnAt: 'B' }, card(9)] }),
      asset('71017'),
      { type: 'SpawnEnemy', card: rookieCop, location: 'B', engageWith: null },
    )
    const old = Object.keys(s.enemies)[0]!
    s = choose(s, 'ability.gala.archibaldHunt')
    expect(s.pending!.question.choices).toHaveLength(2)
    s = choose(s, 'choice.card', { card: 'Rookie Cop' })
    expect(s.enemies[old]!.exhausted).toBe(false)
    const drawn = Object.values(s.enemies).find((e) => e.id !== old && e.code === rookieCop.code)!
    expect(drawn).toMatchObject({ location: 'B', exhausted: true, engagedWith: null })
    expect(s.log.filter((l) => l.key === 'log.encounter')).toHaveLength(2)
    expect(me(s).resources).toBe(11)
  })
  it('sin enemigo baraja y no concede recursos', () => {
    let s = during(
      table(),
      (g) => ({ ...g, encounterDeck: [card(1), card(2), card(3)] }),
      asset('71017'),
    )
    const [deck, rng] = shuffle(s.encounterDeck, s.rng)
    s = choose(s, 'ability.gala.archibaldHunt')
    expect(s.encounterDeck).toEqual(deck)
    expect(s.rng).toEqual(rng)
    expect(me(s).resources).toBe(8)
  })
})

describe('G11: Lucas y los rasgos del Objeto elegido', () => {
  it('elige Objeto; una Reliquia da recursos y pasa por el robo normal', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, deck: ['12034', '12068', '12089'] })),
      }),
      asset('71024'),
    )
    s = during(s, (g) => g, specific('lucas'))
    expect(s.pending!.question.choices).toHaveLength(2)
    s = choose(s, 'choice.card', { card: 'Mask of Silenus' })
    expect(me(s).hand).toContain('12068')
    expect(me(s).resources).toBe(10)
    expect(me(s).deck).toHaveLength(2)
  })
  it.each([true, false])('ofrece pagar el Tomo y permite rechazarlo (%s)', (play) => {
    let s = during(
      table(),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, deck: ['12040'] })) }),
      specific('lucas'),
    )
    expect(s.pending?.question.prompt).toBe('prompt.gala.playTome')
    s = choose(s, play ? 'action.play' : 'choice.skip')
    expect(me(s).resources).toBe(play ? 5 : 8)
    expect(Object.values(s.assets).some((a) => a.code === '12040')).toBe(play)
    expect(me(s).actionsRemaining).toBe(3)
  })
  it('no ofrece jugar un Tomo impagable', () => {
    const s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, resources: 0, deck: ['12040'] })),
      }),
      specific('lucas'),
    )
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(me(s).hand).toContain('12040')
  })
  it('Herramienta solo permite destinos conectados con pistas', () => {
    const s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, deck: ['12034'] })),
        locations: {
          ...g.locations,
          A: { ...g.locations.A!, connections: ['B', 'C'] },
          B: { ...g.locations.B!, clues: 0 },
          C: { ...g.locations.C!, clues: 1 },
        },
      }),
      specific('lucas'),
    )
    expect(me(s).clues).toBe(1)
    expect(s.locations.C!.clues).toBe(0)
  })
  it('sin Objetos baraja sin robar', () => {
    const s = during(table(), (g) => g, specific('lucas'))
    expect(me(s).hand).toEqual([])
    expect(me(s).deck).toHaveLength(25)
  })
  it('Dead Ends cancela la búsqueda de Lucas antes de elegir un Objeto', () => {
    const s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({ ...i, deck: ['12034', '12006', '12040'] })),
      }),
      specific('lucas'),
    )
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(me(s).hand).toEqual(['12006'])
    expect(me(s).deck).toHaveLength(2)
  })
})

describe('G14 y G21: traiciones compartidas', () => {
  it('Puerta secreta pregunta el empate y bloquea acciones y movimiento por efecto hasta descartarla', () => {
    let s = at(table(2), CODES.lobby)
    s = during(
      s,
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) =>
          i.id === 'b' ? { ...i, location: CODES.ballroom } : i,
        ),
      }),
      {
        type: 'ResolveEncounterCard',
        investigator: 'a',
        card: { kind: 'treachery', code: CODES.secretDoor, name: 'Secret Door', keywords: [] },
      },
    )
    expect(s.pending!.question.choices.map((c) => c.target)).toEqual(
      expect.arrayContaining([
        { type: 'location', id: CODES.lobby },
        { type: 'location', id: CODES.ballroom },
      ]),
    )
    // El empate se explica: qué carta se pone y por qué hay que elegir.
    expect(s.pending!.question.prompt).toBe('prompt.placeMostInvestigators')
    expect(s.pending!.question.promptParams).toEqual({ card: 'Secret Door' })
    s = choose(s, 'choice.location', { location: s.locations[CODES.lobby]!.name })
    expect(availableActions(s, 'a').some((a) => a.kind === 'move')).toBe(false)
    s = during(
      s,
      (g) => g,
      { type: 'ChooseMove', investigator: 'a' },
      { type: 'MoveTo', investigator: 'a', location: CODES.ballroom },
    )
    expect(me(s).location).toBe(CODES.lobby)
    s = during(
      s,
      (g) => g,
      { type: 'DiscardTreachery', treachery: Object.keys(s.treacheries)[0]! },
      { type: 'MoveTo', investigator: 'a', location: CODES.ballroom },
    )
    expect(me(s).location).toBe(CODES.ballroom)
  })
  it('otro investigador del mismo Lugar puede quitar Órdenes violentas; a distancia no', () => {
    let s = during(table(2), (g) => g, {
      type: 'ResolveEncounterCard',
      investigator: 'b',
      card: {
        kind: 'treachery',
        code: CODES.violentCommands,
        name: 'Violent Commands',
        keywords: [],
      },
    })
    expect(
      availableAbilities(s, 'a').filter((a) => a.label === 'ability.gala.violentCommands'),
    ).toHaveLength(2)
    const away = at(s, 'B')
    expect(
      availableAbilities(away, 'a').some((a) => a.label === 'ability.gala.violentCommands'),
    ).toBe(false)
    s = choose(s, 'ability.gala.violentCommands', { name: 'A' })
    expect(me(s).damage).toBe(2)
    expect(Object.keys(s.treacheries)).toHaveLength(0)
    expect(me(s).actionsRemaining).toBe(2)
  })
})

describe('G20: Misterios del Sindicato', () => {
  it('roba una carta elegida de otro Lugar revelado, con el umbral por investigador', () => {
    let s = during(
      table(2),
      (g) => ({
        ...g,
        locations: {
          ...g.locations,
          B: { ...g.locations.B!, revealed: true, clues: 2, beneath: [card(1), card(2)] },
          C: { ...g.locations.C!, revealed: false, clues: 0, beneath: [card(3)] },
        },
      }),
      { type: 'PutStoryIntoPlay', code: FACTION_CARDS.syndicate.story, name: 'Syndicate' },
    )
    const options = availableAbilities(s, 'a').filter((a) => a.label === 'ability.gala.drawMystery')
    expect(options).toHaveLength(1)
    expect(options[0]!.target).toEqual({ type: 'location', id: 'B' })
    s = choose(s, 'ability.gala.drawMystery')
    s = choose(s, 'choice.card', { card: 'Card 2' })
    expect(s.locations.B!.beneath!.map((c) => c.name)).toEqual(['Card 1'])
    expect(s.log.find((l) => l.key === 'log.encounter')?.params?.card).toBe('Card 2')
    expect(me(s).location).toBe('A')
  })
  it('respeta el turno y el máximo de pistas', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        activeTurn: 'other',
        locations: {
          ...g.locations,
          B: { ...g.locations.B!, revealed: true, clues: 2, beneath: [card(1)] },
        },
      }),
      { type: 'PutStoryIntoPlay', code: FACTION_CARDS.syndicate.story, name: 'Syndicate' },
    )
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.drawMystery')).toBe(
      false,
    )
    s = during(s, (g) => ({ ...g, activeTurn: 'a' }))
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.drawMystery')).toBe(
      false,
    )
  })
})
