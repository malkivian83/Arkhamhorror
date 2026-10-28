import {
  applyInput,
  enemyBehavior,
  locationBehavior,
  treacheryBehavior,
  effectiveVitals,
  createGame,
  emptyCampaignLog,
  getInvestigator,
  scenarioBehavior,
  availableAbilities,
  type GameState,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, it, expect } from 'vitest'
import '../index'
import { theMidnightMasks, classicEnemies, CULTISTS } from './the-midnight-masks'
import { theDevourerBelow } from './the-devourer-below'
import { ZEALOT_NOTES } from './the-gathering'
const context = (players = 1) => ({
  difficulty: 'standard' as const,
  seed: 7,
  investigators: Array.from({ length: players }, (_, n) => String(n)),
  log: emptyCampaignLog(Array.from({ length: players }, (_, n) => String(n))),
})
function game(final = false): GameState {
  const c = context()
  return throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      scenario: final ? theDevourerBelow(c) : theMidnightMasks(c),
      investigators: [testInvestigator('0')],
      campaignLog: c.log,
    }),
  )
}
describe('Original Night of the Zealot remaining scenarios; revised campaign guide pp. 4–7', () => {
  it.each([1, 2, 3, 4])(
    'Masks setup for %i investigators removes the correct Acolytes from the deck',
    (players) => {
      const c = context(players),
        d = theMidnightMasks(c)
      expect(d.locations).toHaveLength(9)
      expect(d.locations.filter((l) => l.name === 'Downtown')).toHaveLength(1)
      expect(d.locations.filter((l) => l.name === 'Southside')).toHaveLength(1)
      expect(d.encounterDeck.filter((e) => e.code === '01169')).toHaveLength(4 - players)
      expect(d.setup!.filter((m) => m.type === 'SpawnEnemy')).toHaveLength(players - 1)
      expect(d.setAside).toHaveLength(6)
    },
  )
  it('uses the house notes and excludes a crossed-out Ghoul Priest', () => {
    const c = context()
    c.log.notes = [ZEALOT_NOTES.houseBurned, ZEALOT_NOTES.priestAlive]
    c.log.crossedOut = [ZEALOT_NOTES.priestAlive]
    const d = theMidnightMasks(c)
    expect(d.startingLocation).toBe('01125')
    expect(d.locations.some((l) => l.id === '01124')).toBe(false)
    expect(d.encounterDeck.some((e) => e.code === '01116')).toBe(false)
  })
  it('the six cultists are outside the ordinary encounter deck', () => {
    const d = theMidnightMasks(context())
    expect(d.encounterDeck.some((c) => CULTISTS.includes(c.code))).toBe(false)
  })
  it.each([false, true])(
    'Masked Hunter prevents spending and discovering clues in either scenario: %s',
    (final) => {
      let s = game(final)
      s = during(
        s,
        (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, clues: 5 })) }),
        {
          type: 'SpawnEnemy',
          card: classicEnemies['01121b']!,
          location: final ? '01149' : '01124',
          engageWith: '0',
        },
      )
      const e = Object.values(s.enemies)[0]!
      expect(scenarioBehavior(s.scenarioId)!.cannotSpendClues!(s, '0')).toBe(true)
      if (final) {
        s = during(s, (g) => ({ ...g, actIndex: 2 }))
        expect(availableAbilities(s, '0').some((a) => a.key === 'devourer:ritual')).toBe(false)
      }
      s = during(
        s,
        keep,
        { type: 'SpendClues', investigator: '0', amount: 2 },
        { type: 'DiscoverClues', investigator: '0', amount: 1 },
      )
      expect(getInvestigator(s, '0').clues).toBe(5)
      s = during(s, keep, { type: 'DisengageEnemy', enemy: e.id })
      expect(scenarioBehavior(s.scenarioId)!.cannotSpendClues!(s, '0')).toBe(false)
    },
  )
  it('interrogation pays clues and draws one cultist without leaking deck order', () => {
    let s = game()
    s = during(s, (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, clues: 2 })),
    }))
    expect(availableAbilities(s, '0').some((a) => a.key === 'midnight:draw')).toBe(true)
    s = choose(s, 'ability.midnight.drawCultist')
    expect(getInvestigator(s, '0').clues).toBe(0)
    expect(Object.values(s.enemies).filter((e) => CULTISTS.includes(e.code))).toHaveLength(1)
    expect(String(s.scenarioMeta?.midnightCultists).split(',')).toHaveLength(4)
  })
  it.each([0, 1, 2, 3, 4, 5, 6])('final setup applies doom for %i escaped cultists', (n) => {
    const c = context()
    c.log.values.zealotEscaped = CULTISTS.slice(0, n).join(',')
    const d = theDevourerBelow(c)
    expect(d.locations).toHaveLength(5)
    expect(d.setAsideLocations).toHaveLength(1)
    expect(d.setup!.find((m) => m.type === 'PlaceDoom')).toMatchObject({ amount: Math.ceil(n / 2) })
    expect(d.setup!.some((m) => m.type === 'AddChaosTokens')).toBe(true)
  })
  it('woods are selected deterministically and share their unrevealed symbol', () => {
    const a = theDevourerBelow(context()),
      b = theDevourerBelow(context())
    expect(a).toEqual(b)
    expect(a.locations.slice(1).every((l) => l.unrevealed?.symbol === 'square')).toBe(true)
  })
  it('past midnight discards two opening cards for each investigator', () => {
    const c = context(4)
    c.log.notes = ['zealotPastMidnight']
    expect(
      theDevourerBelow(c).setup!.filter((m) => m.type === 'DiscardRandomFromHand'),
    ).toHaveLength(4)
  })
  it('Umordhoth has printed 6 health plus 4 per investigator and is massive', () => {
    let s = game(true)
    s = during(
      s,
      keep,
      { type: 'PutLocationIntoPlay', location: '01156' },
      { type: 'SpawnSetAsideEnemy', code: '01157', location: '01156' },
    )
    expect(Object.values(s.enemies)[0]).toMatchObject({
      health: 6,
      keywords: ['hunter', 'massive'],
    })
  })
  it.each(['01138', '01139', '01140'])(
    'parley with %s pays its printed cost and earns victory',
    (code) => {
      let s = game()
      s = during(
        s,
        (g) => ({
          ...g,
          investigators: g.investigators.map((i) => ({
            ...i,
            clues: 2,
            resources: 5,
            hand: Array(4).fill('12019'),
          })),
        }),
        { type: 'SpawnEnemy', card: classicEnemies[code]!, location: '01124', engageWith: '0' },
      )
      s = choose(s, 'ability.midnight.interrogate')
      for (let n = 0; s.pending?.question.prompt === 'prompt.chooseCardToDiscard' && n < 5; n++)
        s = choose(s, 'choice.discard', { card: 'M1911' })
      expect(s.victoryDisplay).toContain(code)
      expect(Object.values(s.enemies)).toHaveLength(0)
      expect(getInvestigator(s, '0')).toMatchObject(
        code === '01139' ? { clues: 0 } : code === '01140' ? { resources: 0 } : { hand: [] },
      )
    },
  )
  it('evading Ruth interrogates her immediately', () => {
    let s = game()
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: classicEnemies['01141']!,
      location: '01124',
      engageWith: '0',
    })
    const e = Object.values(s.enemies)[0]!
    s = during(s, keep, {
      type: 'Forced',
      trigger: { type: 'afterEvade', enemy: e.id, investigator: '0' },
    })
    expect(s.victoryDisplay).toContain('01141')
  })
  it('Drew heals before his attack resolves', () => {
    let s = game()
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: classicEnemies['01137']!,
      location: '01124',
      engageWith: '0',
    })
    const e = Object.values(s.enemies)[0]!
    s = during(s, (g) => ({ ...g, enemies: { ...g.enemies, [e.id]: { ...e, damageTaken: 2 } } }), {
      type: 'EnemyAttack',
      enemy: e.id,
      investigator: '0',
      exhaustAfter: false,
    })
    expect(s.enemies[e.id]?.damageTaken).toBe(1)
    expect(getInvestigator(s, '0').damage).toBe(2)
  })
  it.each([1, 2])('Masks resolution %i records interviewed and escaped cultists', (n) => {
    let s = game()
    s = during(
      s,
      (g) => ({
        ...g,
        victoryDisplay: ['01139'],
        scenarioMeta: { ...g.scenarioMeta, midnightCultists: '01137,01138,01140,01141' },
      }),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } },
    )
    while (s.pending?.question.prompt === 'prompt.story') s = choose(s, 'choice.continue')
    expect(s.campaignLog?.values.zealotInterrogated).toBe('01139')
    expect(s.campaignLog?.values.zealotEscaped?.split(',')).toContain('01121b')
    expect(s.campaignLog?.notes.includes('zealotPastMidnight')).toBe(n === 2)
  })
  it('Umordhoth readies at each turn end', () => {
    let s = game(true)
    s = during(
      s,
      keep,
      { type: 'PutLocationIntoPlay', location: '01156' },
      { type: 'SpawnSetAsideEnemy', code: '01157', location: '01156' },
    )
    const e = Object.values(s.enemies)[0]!
    s = during(s, (g) => ({ ...g, enemies: { ...g.enemies, [e.id]: { ...e, exhausted: true } } }), {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: '0' },
    })
    expect(s.enemies[e.id]?.exhausted).toBe(false)
  })
  it('the Ritual Site replenishes only missing clues at round end', () => {
    let s = game(true)
    s = during(
      s,
      keep,
      { type: 'PutLocationIntoPlay', location: '01156' },
      { type: 'RevealLocation', location: '01156' },
    )
    s = during(
      s,
      (g) => ({
        ...g,
        locations: { ...g.locations, '01156': { ...g.locations['01156']!, clues: 1 } },
      }),
      { type: 'Forced', trigger: { type: 'roundEnds' } },
    )
    expect(s.locations['01156']?.clues).toBe(2)
  })
  it.each([0, 1, 2, 3])('final resolution %i applies the printed lasting consequences', (n) => {
    let s = game(true)
    s = during(s, keep, {
      type: 'EndScenario',
      outcome: n ? { type: 'resolution', resolution: n } : { type: 'noResolution' },
    })
    for (let k = 0; s.pending?.question.prompt === 'prompt.story' && k < 10; k++)
      s = choose(s, 'choice.continue')
    const record = s.campaignLog!.investigators['0']!
    if (n === 0) {
      expect(s.campaignLog!.notes).toContain('campaignLost')
      expect(record.killed).toBe(true)
    } else {
      expect(record.mentalTrauma).toBe(2)
      expect(record.physicalTrauma).toBe(n === 1 ? 0 : 2)
      expect(record.xp).toBe(n === 1 ? 5 : n === 2 ? 10 : 0)
      if (n === 3) expect(record.storyAssets).toHaveLength(1)
    }
  })
  it('Mysterious Chanting still searches for and draws a cultist in the new scenario', () => {
    let s = game()
    s = during(
      s,
      (g) => ({
        ...g,
        encounterDeck: [
          {
            kind: 'enemy',
            code: '01169',
            name: 'Acolyte',
            fight: 3,
            health: 1,
            evade: 2,
            damage: 1,
            horror: 0,
            traits: ['Cultist'],
            keywords: [],
          },
        ],
      }),
      {
        type: 'ResolveEncounterCard',
        investigator: '0',
        card: { kind: 'treachery', code: '01171', name: 'Mysterious Chanting', keywords: [] },
      },
    )
    if (s.pending?.question.prompt !== 'prompt.chooseAction')
      s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
    expect(Object.values(s.enemies).some((e) => e.code === '01169')).toBe(true)
  })
  it('the third agenda replaces both decks and permits the final victory', () => {
    let s = game(true)
    s = during(s, (g) => ({ ...g, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    expect(s.acts[0]?.code).toBe('01145b')
    expect(s.agendas[0]?.code).toBe('01145b')
    expect(Object.values(s.enemies).some((e) => e.code === '01157')).toBe(true)
    expect(JSON.parse(JSON.stringify(s)).agendas[0].doomThreshold).toBeDefined()
  })
  it.each([
    ['01124', 1, 1, 0, 0],
    ['01126', 3, 0, 0, 0],
    ['01128', 0, 0, 3, 0],
    ['01130', 0, 3, 0, 0],
    ['01131', 0, 0, 0, 3],
    ['01134', 0, -5, 0, 0],
  ] as const)(
    'location %s resolves its printed action',
    (code, draw, resources, healDamage, healHorror) => {
      let s = game()
      s = during(s, (g) => ({
        ...g,
        investigators: g.investigators.map((i) => ({
          ...i,
          damage: 3,
          horror: 3,
          resources: 5,
          hand: [],
          deck: Array(10).fill('12019'),
        })),
      }))
      const location = { ...s.locations['01124']!, id: code }
      const ability = locationBehavior(code)!.abilities!(s, location, '0')[0]!
      s = during(s, keep, ...(ability.costs ?? []), ...ability.then)
      const i = getInvestigator(s, '0')
      expect(i.hand).toHaveLength(draw)
      expect(i.resources).toBe(5 + resources)
      expect(i.damage).toBe(3 - healDamage)
      expect(i.horror).toBe(3 - healHorror)
      if (code === '01134') {
        expect(i.clues).toBe(2)
        expect(ability.limit).toEqual({ per: 'game', group: true })
      }
    },
  )
  it.each([
    ['01127', ['Ally'], undefined],
    ['01129', ['Tome', 'Spell'], 6],
  ] as const)('location %s searches with the printed restrictions', (code, traits, top) => {
    const s = game()
    const ability = locationBehavior(code)!.abilities!(
      s,
      { ...s.locations['01124']!, id: code },
      '0',
    )[0]!
    expect(ability.then[0]).toMatchObject({
      type: 'SearchDeck',
      investigator: '0',
      traits: [...traits],
      to: 'hand',
    })
    expect((ability.then[0] as { top?: number }).top).toBe(top)
  })
  it('Relentless Dark Young heals 2 damage at round end', () => {
    let s = game(true)
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: {
        kind: 'enemy',
        code: '01179',
        name: 'Relentless Dark Young',
        fight: 4,
        health: 6,
        evade: 2,
        damage: 2,
        horror: 2,
        keywords: [],
      },
      location: '01149',
      engageWith: null,
    })
    const e = Object.values(s.enemies)[0]!
    s = during(s, (g) => ({ ...g, enemies: { ...g.enemies, [e.id]: { ...e, damageTaken: 3 } } }), {
      type: 'Forced',
      trigger: { type: 'roundEnds' },
    })
    expect(s.enemies[e.id]?.damageTaken).toBe(1)
  })
  it('Goat Spawn deals 1 horror to each investigator at its location when defeated', () => {
    let s = game(true)
    const goat = {
      ...classicEnemies['01137']!,
      id: 'goat',
      code: '01180',
      location: '01149',
      exhausted: false,
      engagedWith: null,
      maxHealth: 2,
      damageTaken: 2,
    }
    s = during(s, keep, { type: 'Forced', trigger: { type: 'enemyDefeated', enemy: goat } })
    expect(getInvestigator(s, '0').horror).toBe(1)
  })
  it('Young Deep One deals horror after engaging', () => {
    let s = game(true)
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: {
        kind: 'enemy',
        code: '01181',
        name: 'Young Deep One',
        fight: 3,
        health: 3,
        evade: 3,
        damage: 1,
        horror: 1,
        keywords: [],
      },
      location: '01149',
      engageWith: null,
    })
    const e = Object.values(s.enemies)[0]!
    s = during(s, keep, { type: 'EngageEnemy', enemy: e.id, investigator: '0' })
    expect(getInvestigator(s, '0').horror).toBe(1)
  })
  it('Dreams of Rlyeh reduces sanity and tests to discard itself', () => {
    let s = game(true)
    const before = effectiveVitals(s, getInvestigator(s, '0')).sanity
    s = during(s, keep, {
      type: 'ResolveEncounterCard',
      investigator: '0',
      card: { kind: 'treachery', code: '01182', name: "Dreams of R'lyeh", keywords: [] },
    })
    expect(effectiveVitals(s, getInvestigator(s, '0')).sanity).toBe(before - 1)
    const t = Object.values(s.treacheries).find((t) => t.code === '01182')!
    expect(t.placement).toEqual({ type: 'threatArea', investigator: '0' })
    const ability = treacheryBehavior(t.code)!.abilities!(s, t, '0')[0]!
    expect(ability.then[0]).toMatchObject({
      type: 'BeginSkillTest',
      skill: 'willpower',
      difficulty: 3,
    })
  })
  it('Wrath retains the damage-and-horror choice when the investigator has no hand', () => {
    let s = game(true)
    s = during(
      s,
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand: [] })) }),
      { type: 'ScenarioSpecific', key: 'devourerWrath', data: { investigator: '0' } },
    )
    expect(getInvestigator(s, '0')).toMatchObject({ damage: 1, horror: 1 })
  })
  it('Hunting Nightgaunt doubles only negative evade token modifiers', () => {
    let s = game()
    s = during(s, keep, {
      type: 'SpawnEnemy',
      card: {
        kind: 'enemy',
        code: '01172',
        name: 'Hunting Nightgaunt',
        fight: 3,
        health: 4,
        evade: 1,
        damage: 1,
        horror: 1,
        keywords: ['hunter'],
      },
      location: '01124',
      engageWith: '0',
    })
    const e = Object.values(s.enemies)[0]!
    s = choose(s, 'action.evade', { enemy: e.name })
    const modifier = enemyBehavior(e.code)!.tokenModifier!
    expect(modifier(s, e, s.skillTest!, -2)).toBe(-4)
    expect(modifier(s, e, s.skillTest!, 1)).toBe(1)
  })
  it('On Wings of Darkness moves a failing investigator to Rivertown', () => {
    let s = game()
    s = during(s, (g) => ({ ...g, chaosBag: [-6] }), {
      type: 'ResolveEncounterCard',
      investigator: '0',
      card: { kind: 'treachery', code: '01173', name: 'On Wings of Darkness', keywords: [] },
    })
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    expect(getInvestigator(s, '0')).toMatchObject({ location: '01125', damage: 1, horror: 1 })
  })
  it('Quiet Glade heals the chosen wound and has a once-per-turn limit', () => {
    let s = game(true)
    s = during(s, (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, damage: 1 })),
    }))
    const ability = locationBehavior('01155')!.abilities!(
      s,
      { ...s.locations['01149']!, id: '01155' },
      '0',
    )[0]!
    expect(ability.limit).toEqual({ per: 'turn' })
    s = during(s, keep, ...ability.then)
    expect(getInvestigator(s, '0').damage).toBe(0)
  })
  it.each([
    ['01152', 'willpower'],
    ['01153', 'agility'],
    ['01154', 'combat'],
  ] as const)('woods %s replaces the investigation skill with %s', (code, skill) => {
    let s = game(true)
    s = during(s, (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({ ...i, location: code })),
      locations: {
        ...g.locations,
        [code]: {
          ...g.locations['01149']!,
          id: code,
          name: 'Arkham Woods',
          revealed: true,
          clues: 1,
        },
      },
    }))
    s = choose(s, 'action.investigate', { location: 'Arkham Woods' })
    expect(s.skillTest?.skill).toBe(skill)
  })
  it('Disrupting the Ritual pays its clue before the test and places one clue on success', () => {
    let s = game(true)
    s = during(s, (g) => ({
      ...g,
      actIndex: 2,
      chaosBag: [0],
      investigators: g.investigators.map((i) => ({ ...i, clues: 1 })),
    }))
    s = choose(s, 'ability.devourer.disrupt')
    expect(getInvestigator(s, '0').clues).toBe(0)
    if (!s.skillTest) s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    expect(s.actClues).toBe(1)
  })
  it('the final agenda without a doom threshold does not advance for any doom total', () => {
    let s = game(true)
    s = during(s, (g) => ({ ...g, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    s = during(s, (g) => ({ ...g, doom: 999 }), { type: 'CheckAgenda' })
    expect(s.agendas[s.agendaIndex]?.code).toBe('01145b')
    expect(s.outcome).toBeNull()
  })
  it('searches offer the choice of enemy and encounter zone before drawing', () => {
    let s = game()
    const acolyte = {
      kind: 'enemy' as const,
      code: '01169',
      name: 'Acolyte',
      fight: 3,
      health: 1,
      evade: 2,
      damage: 1,
      horror: 0,
      traits: ['Cultist'],
      keywords: [],
    }
    s = during(
      s,
      (g) => ({
        ...g,
        encounterDeck: [acolyte, { ...acolyte, code: '01170', name: 'Wizard of the Order' }],
        encounterDiscard: [acolyte],
      }),
      { type: 'ScenarioSpecific', key: 'carcosaFindCultist', data: { investigator: '0' } },
    )
    expect(s.pending?.question.choices).toHaveLength(3)
    s = choose(s, 'choice.zealot.searchDiscardEnemy', { enemy: 'Acolyte' })
    if (s.pending?.question.prompt !== 'prompt.chooseAction')
      s = applyInput(s, { investigator: s.pending!.investigator, choice: 0 })
    expect(s.encounterDeck).toHaveLength(2)
    expect(s.encounterDiscard).toHaveLength(0)
    expect(Object.values(s.enemies).some((e) => e.code === '01169')).toBe(true)
  })
  it('Twisting Paths cancels the move when the intellect test fails', () => {
    let s = game(true)
    s = during(s, (g) => ({
      ...g,
      chaosBag: [-6],
      investigators: g.investigators.map((i) => ({ ...i, location: '01151' })),
      locations: {
        ...g.locations,
        '01151': {
          ...g.locations['01149']!,
          id: '01151',
          name: 'Arkham Woods',
          revealed: true,
          connections: ['01149'],
        },
      },
    }))
    s = choose(s, 'action.move', { location: 'Main Path' })
    expect(s.skillTest?.skill).toBe('intellect')
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    expect(getInvestigator(s, '0').location).toBe('01151')
  })
})
