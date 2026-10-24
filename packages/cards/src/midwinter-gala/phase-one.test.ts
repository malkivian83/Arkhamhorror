import {
  applyInput,
  availableAbilities,
  createGame,
  playerCardDef,
  registerEnemy,
  shuffle,
  treacheryBehavior,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import {
  CODES,
  MIDWINTER_GALA,
  bloodlessMan,
  enragedGug,
  moonBeast,
  rookieCop,
  viciousAmbush,
  FACTION_CARDS,
} from './cards'
import { midwinterGala } from './gala'

const foe: EnemyCard = {
  kind: 'enemy',
  code: 'gala-phase-one-foe',
  name: 'Pursuer',
  traits: ['Monster'],
  fight: 1,
  health: 20,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: [],
}
registerEnemy({
  code: foe.code,
  forced: (s, trigger) =>
    trigger.type === 'enemyEntersLocation'
      ? [
          {
            type: 'SetScenarioMeta',
            key: 'visits',
            value: `${s.scenarioMeta?.visits ?? ''}${trigger.location}`,
          },
        ]
      : [],
})
registerEnemy({
  code: 'gala-phase-one-vanishing',
  forced: (_s, trigger) =>
    trigger.type === 'enemyEntersLocation' && trigger.location === 'B'
      ? [{ type: 'DiscardEnemy', enemy: trigger.enemy }]
      : [],
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
    investigators: g.investigators.map((i) => ({ ...i, resources: 8, hand: [] })),
  }))
}
const asset = (code: string, investigator = 'a'): Message => ({
  type: 'PutAssetIntoPlay',
  investigator,
  code,
})
const spawn = (card = foe, location = 'A', engageWith: string | null = 'a'): Message => ({
  type: 'SpawnEnemy',
  card,
  location,
  engageWith,
})
const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
function settle(s: GameState, preferred: string[] = []) {
  for (
    let n = 0;
    s.pending && s.pending.question.prompt !== 'prompt.chooseAction' && n < 100;
    n++
  ) {
    const choices = s.pending.question.choices
    const labels = [...preferred, 'choice.revealToken', 'choice.applyResults', 'choice.skip']
    const match = labels
      .map((label) => choices.findIndex((c) => c.label === label))
      .find((i) => i >= 0)
    s = applyInput(s, { investigator: s.pending.investigator, choice: match ?? 0 })
  }
  return s
}

describe('G01: combate y costes', () => {
  for (const [code, label] of [
    ['71018', 'ability.gala.callahanFight'],
    ['71031', 'ability.gala.novaFight'],
    ['71036', 'ability.gala.sarahFight'],
  ]) {
    it.each(['ready', 'exhausted', 'massive'])(
      `${code} combate sin ataque de oportunidad contra %s`,
      (kind) => {
        let s = during(
          table(),
          (g) => g,
          asset(code!),
          spawn({ ...foe, keywords: kind === 'massive' ? ['massive'] : [] }),
        )
        if (kind === 'exhausted')
          s = during(s, (g) => g, { type: 'ExhaustEnemy', enemy: Object.keys(s.enemies)[0]! })
        s = choose(s, label!, code === '71036' ? { n: 2 } : {})
        expect(s.pending?.question.prompt).toBe('prompt.commitCards')
        expect(me(s).damage + me(s).horror).toBe(0)
        expect(me(s).resources).toBe(code === '71036' ? 6 : 8)
        expect(Object.values(s.assets).find((a) => a.code === code)?.exhausted).toBe(
          code !== '71018',
        )
      },
    )
  }
})

describe('G03: dormitorio', () => {
  function bedroom() {
    return during(
      table(),
      (s) => ({
        ...s,
        chaosBag: [0],
        investigators: s.investigators.map((i) => ({ ...i, location: CODES.bedroom, clues: 1 })),
        locations: {
          ...s.locations,
          [CODES.bedroom]: { ...s.locations.C!, id: CODES.bedroom, revealed: true },
        },
      }),
      spawn(foe, CODES.bedroom),
    )
  }
  it('aplica daño adicional, cobra una pista y limita por turno, incluso si se reponen acciones', () => {
    let s = choose(bedroom(), 'ability.gala.bedroomFight', { skill: 'agility' })
    expect(me(s).damage + me(s).horror).toBe(0)
    s = settle(s, ['choice.gala.spendClueDamage'])
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
    expect(me(s).clues).toBe(0)
    s = during(s, (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, actionsRemaining: 3 })),
    }))
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.bedroomFight')).toBe(
      false,
    )
    s = during(s, (g) => g, { type: 'BeginTurn', investigator: 'a' })
    expect(availableAbilities(s, 'a').some((a) => a.label === 'ability.gala.bedroomFight')).toBe(
      true,
    )
  })
  it('permite atacar desde dormitorio a otra sala del primer piso', () => {
    let s = bedroom()
    s = during(s, (g) => ({
      ...g,
      enemies: Object.fromEntries(
        Object.entries(g.enemies).map(([id, e]) => [
          id,
          { ...e, location: CODES.library, engagedWith: null },
        ]),
      ),
    }))
    s = choose(s, 'ability.gala.bedroomFight', { skill: 'combat' })
    expect(s.skillTest?.kind.type).toBe('fight')
    expect(s.skillTest?.skill).toBe('combat')
  })
})

describe('G06: Oleada y caras de El Exangüe', () => {
  it('Rookie Cop roba otro encuentro después de aparecer; aparecer por efecto no provoca Oleada', () => {
    const harmless = {
      kind: 'treachery' as const,
      code: 'gala-harmless',
      name: 'Harmless',
      keywords: [],
    }
    let s = during(table(), (g) => ({ ...g, encounterDeck: [harmless] }), {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: rookieCop,
    })
    expect(s.log.filter((e) => e.key === 'log.encounter').map((e) => e.params?.code)).toEqual([
      CODES.rookieCop,
      harmless.code,
    ])
    expect(s.encounterDeck).toHaveLength(0)
    s = during(table(), (g) => ({ ...g, encounterDeck: [harmless] }), spawn(rookieCop))
    expect(s.encounterDeck).toHaveLength(1)
  })
  it('la cara silenciosa preparada no tiene Victoria y solo la desatada concede XP al derrotarla', () => {
    let prepared = throughSetup(
      createGame({
        seed: 3,
        scenario: midwinterGala({ players: 1 }),
        investigators: [testInvestigator('a')],
      }),
    )
    expect(
      Object.values(prepared.enemies).find((e) => e.code === CODES.bloodlessMan)?.victory,
    ).toBeUndefined()
    expect(bloodlessMan.victory).toBeUndefined()
    prepared = during(table(), (s) => s, spawn(bloodlessMan))
    const id = Object.keys(prepared.enemies)[0]!
    prepared = during(prepared, (s) => s, { type: 'DefeatEnemy', enemy: id })
    expect(prepared.enemies[id]).toMatchObject({
      code: CODES.bloodlessManUnleashed,
      exhausted: true,
      victory: 1,
    })
    expect(prepared.victoryDisplay).toHaveLength(0)
    prepared = during(prepared, (s) => s, { type: 'DefeatEnemy', enemy: id })
    expect(prepared.victoryDisplay).toEqual([CODES.bloodlessManUnleashed])
    expect(prepared.victoryPoints).toBe(1)
  })
})

describe('G07: salidas de apoyos al eliminar', () => {
  it.each(['DefeatInvestigator', 'Resign'] as const)(
    '%s resuelve Invitado, Líder, Lámpara y Joya antes de perder la localización',
    (type) => {
      let s = during(
        table(2),
        (g) => g,
        asset('71018'),
        asset('71016'),
        asset(CODES.paleLanternAura),
        asset(CODES.jewelOfSarnath),
      )
      const rng = s.rng
      s = during(s, (g) => g, { type, investigator: 'a' })
      expect(me(s)).toMatchObject({ eliminated: true, location: null })
      expect(Object.values(s.assets).filter((a) => a.owner === 'a')).toEqual([])
      expect(Object.values(s.placedAssets ?? {}).find((a) => a.code === '71018')).toMatchObject({
        faceDown: true,
        placement: { type: 'location', location: 'A' },
        damage: 0,
        horror: 0,
      })
      expect(Object.values(s.placedAssets ?? {}).some((a) => a.code === '71016')).toBe(false)
      expect(
        Object.values(s.placedAssets ?? {}).find((a) => a.code === CODES.paleLantern),
      ).toMatchObject({ placement: { type: 'location', location: 'A' } })
      expect(s.encounterDeck.filter((c) => c.code === CODES.jewelOfSarnath)).toHaveLength(1)
      expect(s.rng).not.toBe(rng)
    },
  )
  it('también resuelve las salidas cuando cae el último investigador, sin bucles ni duplicados', () => {
    let s = during(table(), (g) => g, asset('71018'), asset(CODES.jewelOfSarnath))
    s = during(s, (g) => g, { type: 'DefeatInvestigator', investigator: 'a' })
    s = settle(s)
    expect(s.outcome?.type).toBe('noResolution')
    expect(Object.values(s.placedAssets ?? {}).filter((a) => a.code === '71018')).toHaveLength(1)
    expect(s.encounterDeck.filter((c) => c.code === CODES.jewelOfSarnath)).toHaveLength(1)
  })
})

describe('G08: horror de primera entrada', () => {
  function chamber() {
    return during(table(), (s) => ({
      ...s,
      locations: { ...s.locations, B: { ...s.locations.B!, enterHorror: 1 } },
    }))
  }
  it.each(['effect', 'action'])(
    'cobra una vez al entrar por %s, sin cobrar al volver a entrar',
    (kind) => {
      let s = chamber()
      s = during(
        s,
        (g) => g,
        kind === 'effect'
          ? { type: 'MoveTo', investigator: 'a', location: 'B' }
          : { type: 'TakeAction', investigator: 'a', action: { kind: 'move', to: 'B' } },
      )
      expect(me(s)).toMatchObject({ location: 'B', horror: 1 })
      s = during(
        s,
        (g) => g,
        { type: 'MoveTo', investigator: 'a', location: 'A' },
        { type: 'MoveTo', investigator: 'a', location: 'B' },
      )
      expect(me(s).horror).toBe(1)
    },
  )
  it('pide asignar el horror antes de moverse y antes del ataque de oportunidad', () => {
    let s = during(chamber(), (g) => g, asset('12016'), spawn())
    s = choose(s, 'action.move', { location: 'Room B' })
    expect(s.pending?.question.prompt).toBe('prompt.assignHorror')
    expect(me(s)).toMatchObject({ location: 'A', damage: 0, horror: 0 })
    s = choose(s, 'choice.assignToInvestigator')
    expect(me(s).horror).toBe(1)
    expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
  })
})

describe('G12: asignación prioritaria a Invitados', () => {
  it('Gug obliga a agotar la capacidad de horror de todos los Invitados antes de otros destinos', () => {
    let s = during(
      table(),
      (g) => g,
      asset('71018'),
      asset('71031'),
      asset('12016'),
      spawn({ ...enragedGug, damage: 0, horror: 3 }),
    )
    const enemy = Object.keys(s.enemies)[0]!
    expect(Object.values(s.assets).map((a) => a.code)).toEqual(['71018', '71031', '12016'])
    s = during(s, (g) => g, { type: 'EnemyAttack', enemy, investigator: 'a', exhaustAfter: false })
    expect(s.pending?.question.choices.map((c) => c.params?.card)).toEqual([
      'Special Agent Callahan',
      'Nova Malone',
    ])
    s = choose(s, 'choice.assignToAsset', { card: 'Special Agent Callahan' })
    // The sole remaining mandatory target is assigned automatically.
    expect(Object.values(s.assets).some((a) => ['71018', '71031'].includes(a.code))).toBe(false)
    expect(s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator')).toBe(
      true,
    )
    s = choose(s, 'choice.assignToAsset', { card: 'Bodyguard' })
    expect(Object.values(s.placedAssets ?? {}).filter((a) => a.faceDown)).toHaveLength(2)
    expect(me(s).discard).toContain('12016')
    expect(me(s).horror).toBe(0)
  })
  it.each([enragedGug, moonBeast])('$name solo prioriza su tipo impreso de daño', (card) => {
    let s = during(table(), (g) => g, asset('71018'), asset('71031'), spawn(card))
    s = during(s, (g) => g, {
      type: 'EnemyAttack',
      enemy: Object.keys(s.enemies)[0]!,
      investigator: 'a',
      exhaustAfter: false,
    })
    if (card.code === CODES.enragedGug) {
      expect(
        s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'),
      ).toBe(true)
      s = choose(s, 'choice.assignToInvestigator')
      expect(
        s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'),
      ).toBe(false)
    } else {
      expect(
        s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'),
      ).toBe(false)
      s = choose(s, 'choice.assignToAsset', { card: 'Special Agent Callahan' })
      expect(
        s.pending?.question.choices.some((c) => c.label === 'choice.assignToInvestigator'),
      ).toBe(true)
    }
  })
})

describe('G13: persecución por conexiones', () => {
  function pursuit(card = foe) {
    return during(
      table(),
      (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, location: 'C' })) }),
      spawn(card, 'A', null),
    )
  }
  const pursue: Message = {
    type: 'ScenarioSpecific',
    key: 'comeForYou',
    data: { enemy: 'enemy-1', investigator: 'a', attack: true },
  }
  it('visita B y C y ataca solo después de llegar', () => {
    let s = pursuit()
    const id = Object.keys(s.enemies)[0]!
    s = during(s, (g) => ({ ...g, scenarioMeta: { visits: '' } }), {
      ...pursue,
      data: { enemy: id, investigator: 'a', attack: true },
    })
    expect(s.scenarioMeta?.visits).toBe('BC')
    expect(s.enemies[id]?.location).toBe('C')
    expect(me(s).damage).toBe(1)
  })
  it('no atraviesa Lugares desconectados ni ataca a distancia', () => {
    let s = pursuit()
    s = during(
      s,
      (g) => ({
        ...g,
        locations: {
          ...g.locations,
          B: { ...g.locations.B!, connections: ['A'] },
          C: { ...g.locations.C!, connections: [] },
        },
      }),
      { ...pursue, data: { enemy: Object.keys(s.enemies)[0]!, investigator: 'a', attack: true } },
    )
    expect(Object.values(s.enemies)[0]!.location).toBe('A')
    expect(me(s).damage).toBe(0)
    expect(s.log.some((e) => e.key === 'log.gala.couldNotReach')).toBe(true)
  })
  it('resuelve las ventanas del camino y se detiene si el enemigo sale del juego', () => {
    let s = pursuit({ ...foe, code: 'gala-phase-one-vanishing' })
    s = during(s, (g) => g, {
      ...pursue,
      data: { enemy: Object.keys(s.enemies)[0]!, investigator: 'a', attack: true },
    })
    expect(Object.values(s.enemies)).toHaveLength(0)
    expect(me(s).damage).toBe(0)
  })
  it('pregunta cuál de los monstruos empatados te persigue', () => {
    let s = during(pursuit(), (g) => g, spawn({ ...foe, name: 'Other pursuer' }, 'A', null))
    s = during(s, (g) => g, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: viciousAmbush,
    })
    expect(s.pending?.question.prompt).toBe('prompt.chooseEnemy')
    expect(s.pending?.question.choices.map((c) => c.params?.enemy)).toEqual([
      'Pursuer',
      'Other pursuer',
    ])
  })
  it('pregunta por caminos mínimos empatados y respeta el elegido', () => {
    let s = pursuit()
    s = during(
      s,
      (g) => ({
        ...g,
        scenarioMeta: { visits: '' },
        locations: {
          ...g.locations,
          A: { ...g.locations.A!, connections: ['B', 'D'] },
          C: { ...g.locations.C!, connections: ['B', 'D'] },
          D: { ...g.locations.B!, id: 'D', name: 'Room D', connections: ['A', 'C'] },
        },
      }),
      { ...pursue, data: { enemy: Object.keys(s.enemies)[0]!, investigator: 'a', attack: false } },
    )
    expect(s.pending?.question.prompt).toBe('prompt.chooseHunterPath')
    s = choose(s, 'choice.location', { location: 'Room D' })
    expect(s.scenarioMeta?.visits).toBe('DC')
    expect(me(s).damage).toBe(0)
  })
})

describe('G15: los costes preceden al ataque de oportunidad', () => {
  it.each(['mya', 'archibald', 'syndicate'])(
    '%s paga antes de ofrecer la asignación del ataque',
    (kind) => {
      let s = during(
        table(),
        (g) => ({
          ...g,
          investigators: g.investigators.map((i) => ({ ...i, clues: 2 })),
          locations: {
            ...g.locations,
            A: {
              ...g.locations.A!,
              beneath: [{ kind: 'treachery', code: 'mystery', name: 'Mystery', keywords: [] }],
            },
          },
        }),
        asset('12016'),
        spawn(),
        ...(kind === 'mya'
          ? [asset('71023')]
          : kind === 'archibald'
            ? [
                asset('71017'),
                { type: 'DamageAsset' as const, asset: 'asset-1', damage: 1, horror: 0 },
              ]
            : [
                {
                  type: 'PutStoryIntoPlay' as const,
                  code: FACTION_CARDS.syndicate.story,
                  name: 'The Syndicate',
                },
              ]),
      )
      const label =
        kind === 'mya'
          ? 'ability.gala.myaInvestigate'
          : kind === 'archibald'
            ? 'ability.gala.moveDamage'
            : 'ability.gala.lookMystery'
      s = choose(s, label)
      expect(s.pending?.question.prompt).toBe('prompt.assignDamage')
      if (kind === 'mya')
        expect(Object.values(s.assets).find((a) => a.code === '71023')?.exhausted).toBe(true)
      if (kind === 'archibald') expect(me(s).resources).toBe(7)
      if (kind === 'syndicate') expect(me(s).clues).toBe(1)
      s = settle(s)
      if (kind === 'archibald') expect(me(s).resources).toBe(7)
      if (kind === 'syndicate') expect(me(s).clues).toBe(1)
    },
  )
})

describe('G16: barajados del motor', () => {
  it.each(['shuffleEncounter', 'jewelIntoEncounter'])(
    '%s conserva cartas y avanza el RNG de forma reproducible',
    (key) => {
      const s = table()
      const extra = {
        kind: 'treachery' as const,
        code: CODES.jewelOfSarnath,
        name: 'Jewel of Sarnath',
        traits: ['Item', 'Relic'],
        keywords: [],
      }
      const [expected, rng] = shuffle(
        key === 'jewelIntoEncounter' ? [...s.encounterDeck, extra] : s.encounterDeck,
        s.rng,
      )
      const message: Message = { type: 'ScenarioSpecific', key }
      const first = during(s, (g) => g, message)
      expect(first.encounterDeck).toEqual(expected)
      expect(first.rng).toBe(rng)
      expect(first.rng).not.toBe(s.rng)
      expect(during(s, (g) => g, message)).toEqual(first)
    },
  )
  it('Pushed baraja el mazo entero, descarta tres y conserva el RNG y el horror correctos', () => {
    let s = during(
      table(),
      (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({
          ...i,
          deck: ['12089', '12090', '12091', '12092', '12093', '12094'],
        })),
      }),
      asset('12020'),
    )
    const [expected, rng] = shuffle([...me(s).deck, '12020'], s.rng)
    s = during(s, (g) => g, {
      type: 'ScenarioSpecific',
      key: 'pushed',
      data: { investigator: 'a', asset: Object.keys(s.assets)[0]! },
    })
    expect(me(s).deck).toEqual(expected.slice(3))
    expect(me(s).discard).toEqual(expected.slice(0, 3))
    expect(me(s).horror).toBe(expected.slice(0, 3).includes('12020') ? 2 : 0)
    expect(s.rng).toBe(rng)
  })
  it.each(['12115', '12095', '71018', '71046b', '71052'])(
    'Pushed no ofrece %s (historia, permanente o reliquia del escenario)',
    (code) => {
      expect(playerCardDef(code)).toBeDefined()
      let s = during(table(), (g) => g, asset(code))
      const card = {
        kind: 'treachery' as const,
        code: CODES.pushedIntoTheBeyond,
        name: 'Pushed into the Beyond',
        keywords: [],
      }
      const messages = treacheryBehavior(card.code)!.revelation(s, 'a', {
        ...card,
        id: 'pushed',
        placement: { type: 'limbo' },
      })
      expect(messages).toEqual([])
      s = during(s, (g) => g, ...messages)
      expect(Object.values(s.assets).some((a) => a.code === code)).toBe(true)
    },
  )
})
