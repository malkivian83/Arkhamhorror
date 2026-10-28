import {
  applyInput,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  enemyMaxHealth,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  type GameState,
  type Message,
  type Difficulty,
  type EnemyCard,
} from '@lcg/engine'
import { choose, during, keep, spawnAt, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, it, expect } from 'vitest'
import '../index'
import {
  bloodOnTheAltar,
  B,
  BN,
  ALTAR_LOCATIONS,
  ALTAR_ENCOUNTERS,
  DUNWICH_COUNTRY,
  NIGHTGAUNTS,
} from './blood-on-the-altar'
import { altarList, altarSpecific as specific } from './altar-helpers'
import { H, HN } from './house-codes'
import { EA, DUNWICH_NOTES as N } from './extracurricular-codes'
import { M } from './museum-codes'
import { TN } from './essex-codes'
import { huntingNightgaunt } from './hunting-nightgaunt'
import { servantOfManyMouths } from './servant-of-many-mouths'
import {
  newCampaign,
  startScenario,
  finishScenario,
  currentScenario,
  purchaseOptions,
} from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
const change =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
function game(
  players = 1,
  seed = 11,
  difficulty: Difficulty = 'standard',
  notes: string[] = [],
  strong = false,
) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  log.notes = notes
  let s = throughSetup(
    createGame({
      seed,
      difficulty,
      interactive: true,
      campaignLog: log,
      scenario: { ...bloodOnTheAltar({ difficulty, log }), chaosBag: [0] },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: 30,
          sanity: 30,
          ...(strong ? { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } } : {}),
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function settle(s: GameState, rewards = false) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 500;
    n++
  ) {
    const p = s.pending
    const choice = p.question.choices.findIndex((c) =>
      ['choice.revealToken', 'choice.applyResults', ...(rewards ? [] : ['choice.skip'])].includes(
        c.label,
      ),
    )
    s = applyInput(s, { investigator: p.investigator, choice: choice < 0 ? 0 : choice })
  }
  return s
}
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: {
    ...[...ALTAR_ENCOUNTERS, ...DUNWICH_COUNTRY, ...NIGHTGAUNTS].find((c) => c.code === code)!,
  },
})
const put = (location: string): Message => ({ type: 'PutLocationIntoPlay', location })
const reveal = (location: string): Message => ({
  type: 'RevealLocation',
  location,
  investigator: 'a',
})
const room = (code: string) => (s: GameState) => ({
  ...s,
  setAsideLocations: {
    ...s.setAsideLocations,
    [code]: Object.values(ALTAR_LOCATIONS).find((l) => l.id === code)!,
  },
})
// Revised guide pp.13–16; RR "Scenario Setup", "Abilities", "Damage and Horror", "Campaign Play".
describe('Blood on the Altar', () => {
  it.each([1, 2, 3, 4])(
    'sets up %i investigators with five hidden cards and the printed encounter sets',
    (players) => {
      const s = game(players)
      expect(Object.keys(s.locations)).toHaveLength(6)
      expect(s.investigators.every((i) => i.location === B.commons)).toBe(true)
      expect(s.encounterDeck).toHaveLength(26)
      expect(poolCodes(s)).toEqual(expect.arrayContaining([B.key, B.chamber]))
      expect(poolCodes(s)).toHaveLength(5)
      expect(altarList(s, 'altarPotential')).toEqual([B.zebulon, B.earl])
      expect(s.locations[B.commons]!.clues).toBe(0)
    },
  )
  it('selects both copies and all six possible omitted locations across seeds', () => {
    const selected = new Set<string>(),
      omitted = new Set<number>()
    for (let n = 1; n < 55; n++) {
      const s = game(1, n)
      for (let k = 0; k < 6; k++) {
        const pair = [String(2202 + k * 2).padStart(5, '0'), String(2203 + k * 2).padStart(5, '0')]
        const codes = Object.keys(s.locations).filter((c) => pair.includes(c))
        expect(codes.length).toBeLessThanOrEqual(1)
        if (!codes.length) omitted.add(k)
        codes.forEach((c) => selected.add(c))
      }
    }
    expect(selected.size).toBe(12)
    expect(omitted.size).toBe(6)
  })
  it('carries all kidnapped professors, the delay and the O’Bannion grudge into setup', () => {
    const s = game(1, 11, 'standard', [
      HN.armitageKidnapped,
      HN.morganKidnapped,
      N.riceKidnapped,
      TN.delayed,
      HN.obannion,
    ])
    expect(altarList(s, 'altarPotential')).toHaveLength(5)
    expect(s.doom).toBe(1)
    expect(s.encounterDeck).toHaveLength(32)
  })
  it('draws a hidden encounter only after the location is empty and only once', () => {
    let s = game()
    const l = Object.keys(s.locations).find((c) => c !== B.commons)!
    s = during(s, change({ location: l }), reveal(l))
    const before = poolCodes(s).length
    s = during(s, keep, specific('altarUnder', { location: l, investigator: 'a' }))
    expect(poolCodes(s)).toHaveLength(before)
    s = during(
      s,
      (x) => ({
        ...x,
        locations: { ...x.locations, [l]: { ...x.locations[l]!, clues: 0 } },
        scenarioMeta: {
          ...x.scenarioMeta,
          [`altarUnder:${l}`]: JSON.stringify({
            kind: 'treachery',
            code: B.key,
            name: 'Key',
            traits: [],
            keywords: [],
          }),
        },
      }),
      specific('altarUnder', { location: l, investigator: 'a' }),
    )
    expect(Object.values(s.assets).some((a) => a.code === B.key)).toBe(true)
    expect(s.scenarioMeta?.[`altarUnder:${l}`]).toBeUndefined()
    expect(s.encounterDiscard.some((c) => c.code === B.key)).toBe(false)
  })
  it('puts the chamber into play revealed, connects it and requires its key before entry', () => {
    let s = game()
    const l = Object.keys(s.locations).find((c) => c !== B.commons)!
    s = during(
      s,
      (x) => ({
        ...change({ location: l })(x),
        locations: { ...x.locations, [l]: { ...x.locations[l]!, clues: 0 } },
        scenarioMeta: {
          ...x.scenarioMeta,
          [`altarUnder:${l}`]: JSON.stringify({
            kind: 'treachery',
            code: B.chamber,
            name: 'The Hidden Chamber',
            traits: [],
            keywords: [],
          }),
        },
      }),
      specific('altarUnder', { location: l, investigator: 'a' }),
    )
    expect(s.locations[B.chamber]!.revealed).toBe(true)
    expect(s.locations[l]!.connections).toContain(B.chamber)
    const rule = scenarioBehavior(s.scenarioId)!
    expect(rule.canEnter!(s, 'a', l, B.chamber)).toBe(false)
    s = during(s, keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: B.key })
    const a = Object.values(s.assets).find((a) => a.code === B.key)!
    s = during(s, keep, ...availableAbilities(s, 'a').find((a) => a.key.endsWith(':unlock'))!.then)
    expect(s.assets[a.id]).toBeUndefined()
    expect(rule.canEnter!(s, 'a', l, B.chamber)).toBe(true)
  })
  it('reveals the map and moves every clue to the chamber when the first investigator enters', () => {
    let s = game(2)
    s = during(s, room(B.chamber), put(B.chamber), reveal(B.chamber))
    s = during(
      s,
      (x) => ({
        ...x,
        scenarioMeta: { ...x.scenarioMeta, altarUnlocked: 1 },
        investigators: x.investigators.map((i) => ({ ...i, clues: 2 })),
      }),
      { type: 'MoveTo', investigator: 'a', location: B.chamber },
    )
    s = settle(s)
    expect(s.actIndex).toBe(1)
    expect(Object.values(s.locations).every((l) => l.revealed)).toBe(true)
    expect(
      Object.values(s.locations)
        .filter((l) => l.id !== B.chamber)
        .every((l) => l.clues === 0),
    ).toBe(true)
    expect(s.investigators.every((i) => i.clues === 0)).toBe(true)
    const silas = Object.values(s.enemies).find((e) => e.code === B.silas)!
    expect(enemyMaxHealth(s, silas)).toBe(12)
    expect(silas.noOpportunityAttacks).toBe(true)
    expect(s.locations[B.chamber]!.clues).toBeGreaterThan(4)
  })
  it.each([B.disappearances, B.hunger])('sacrifices at the printed minimum for %s', (code) => {
    let s = game(1, 11, 'standard', [HN.armitageKidnapped])
    s = during(s, keep, { type: 'AdvanceAgenda' })
    expect(altarList(s, 'altarPotential')).toHaveLength(2)
    expect(altarList(s, 'altarSacrificed')).toHaveLength(1)
    if (code === B.hunger) {
      s = during(s, keep, { type: 'AdvanceAgenda' })
      expect(altarList(s, 'altarPotential')).toHaveLength(1)
      expect(altarList(s, 'altarSacrificed')).toHaveLength(2)
    }
  })
  it('does not sacrifice below the agenda minimum', () => {
    const s = during(game(), keep, { type: 'AdvanceAgenda' })
    expect(altarList(s, 'altarPotential')).toHaveLength(2)
    expect(altarList(s, 'altarSacrificed')).toHaveLength(0)
  })
  it('the final agenda forces resignation and sacrifices every remaining victim', () => {
    let s = during(game(), (x) => ({ ...x, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'noResolution' })
    expect(s.campaignLog!.notes).toContain(BN.ritual)
    expect(s.campaignLog!.removedCards).toEqual(expect.arrayContaining([B.zebulon, B.earl]))
    expect(getInvestigator(s, 'a').resigned).toBe(true)
  })
  it.each([1, 2, 3] as const)(
    'resolution %i records its result, rewards survivors once and grants experience',
    (n) => {
      let s = during(
        game(),
        (x) => ({ ...x, scenarioMeta: { ...x.scenarioMeta, altarSacrificed: B.zebulon } }),
        { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } },
      )
      s = settle(s, true)
      expect(s.outcome).toEqual({ type: 'resolution', resolution: n })
      expect(s.campaignLog!.notes).toContain([BN.killed, BN.restored, BN.banished][n - 1])
      expect(s.campaignLog!.values[BN.survivors]!.split(',')).not.toContain(B.zebulon)
      expect(s.campaignLog!.investigators.a!.storyAssets).not.toContain(B.zebulon)
      expect(s.campaignLog!.investigators.a!.xp).toBeGreaterThanOrEqual(2)
      expect(
        s.campaignLog!.investigators.a!.storyAssets.filter((c) => c === B.powder),
      ).toHaveLength(1)
    },
  )
  it('removes the stolen book only from defeated investigators', () => {
    let s = game()
    s = during(
      s,
      (x) => ({
        ...x,
        campaignLog: {
          ...x.campaignLog!,
          investigators: {
            a: { ...x.campaignLog!.investigators.a!, storyAssets: [M.necronomicon] },
          },
        },
      }),
      { type: 'EliminateInvestigator', investigator: 'a' },
    )
    s = settle(s)
    expect(s.campaignLog!.notes).toContain(TN.necronomiconStolen)
    expect(s.campaignLog!.investigators.a!.storyAssets).not.toContain(M.necronomicon)
  })
  it('the brook excludes a second investigator and modifies attack horror', () => {
    const s = during(
      game(2),
      (x) => change({ location: B.brookAlone })(room(B.brookAlone)(x)),
      put(B.brookAlone),
    )
    expect(scenarioBehavior(s.scenarioId)!.canEnter!(s, 'b', B.commons, B.brookAlone)).toBe(false)
    expect(
      scenarioBehavior(s.scenarioId)!.enemyHorrorModifier!(s, {
        ...huntingNightgaunt,
        id: 'e',
        maxHealth: 4,
        damageTaken: 0,
        location: B.brookHorror,
        exhausted: false,
        engagedWith: null,
      }),
    ).toBe(1)
  })
  it('ruins raise enemy evade or turn failed-investigation clues into doom', () => {
    let s = during(game(), room(B.ruinsDoom), put(B.ruinsDoom), reveal(B.ruinsDoom))
    const before = s.locations[B.ruinsDoom]!.clues
    s = during(s, keep, {
      type: 'Forced',
      trigger: {
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'investigate',
        succeeded: false,
        margin: -1,
        location: B.ruinsDoom,
      },
    })
    expect(s.locations[B.ruinsDoom]!.clues).toBe(before - 1)
    expect(s.locations[B.ruinsDoom]!.doom).toBe(1)
    expect(s.agendaIndex).toBe(0)
  })
  it('store, house and school restrict only the printed actions/cards', () => {
    let s = game()
    const r = scenarioBehavior(s.scenarioId)!
    s = change({ location: B.storePoor })(s)
    expect(r.cannotGainResources!(s, 'a')).toBe(true)
    s = change({ location: B.houseEvents })(s)
    expect(r.cannotPlay!(s, 'a', '01022')).toBe(true)
    expect(r.cannotPlay!(s, 'a', EA.rice)).toBe(false)
    s = change({ location: B.schoolSkills })(s)
    expect(r.cannotCommit!(s, 'a', '01089')).toBe(true)
    expect(r.cannotCommit!(s, 'a', EA.rice)).toBe(false)
    expect(r.cannotDiscoverClues!(s, 'a', B.schoolClues)).toBe(true)
  })
  it('Unhallowed Country blocks allies and blanks their modifiers until discarded', () => {
    let s = during(
      game(),
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      draw(B.unhallowed),
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        difficulty: 1,
        kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    expect(skillTestValue(s).total).toBe(getInvestigator(s, 'a').skills.intellect)
    const t = Object.values(s.treacheries).find((t) => t.code === B.unhallowed)!
    s = settle(s)
    s = during(
      s,
      keep,
      { type: 'DiscardTreachery', treachery: t.id },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        difficulty: 1,
        kind: { type: 'effect', source: 'Test', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
    expect(skillTestValue(s).total).toBe(getInvestigator(s, 'a').skills.intellect + 1)
  })
  it('Sordid and Silent deals end-round horror and is discarded when the agenda advances', () => {
    let s = during(game(2), keep, draw(B.sordid), {
      type: 'Forced',
      trigger: { type: 'roundEnds' },
    })
    s = settle(s)
    expect(s.investigators.every((i) => i.horror === 1)).toBe(true)
    s = during(s, keep, { type: 'AdvanceAgenda' })
    expect(Object.values(s.treacheries).some((t) => t.code === B.sordid)).toBe(false)
  })
  it('Nightgaunt doubles each negative evade token but not fight tokens', () => {
    let s = during(game(), (x) => ({ ...x, chaosBag: [-2] }), spawnAt(B.commons, huntingNightgaunt))
    const e = Object.values(s.enemies).find((e) => e.code === B.nightgaunt)!
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'agility',
      difficulty: 1,
      kind: { type: 'evade', enemy: e.id },
    })
    s = choose(s, 'choice.revealToken')
    expect(s.skillTest!.tokenModifier).toBe(-4)
  })
  it('the Song adds two damage before assignment and then discards itself', () => {
    let s = during(game(), keep, draw(B.song))
    s = settle(s)
    s = during(s, keep, { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 0 })
    s = settle(s)
    expect(getInvestigator(s, 'a').damage).toBe(3)
    expect(Object.values(s.treacheries).some((t) => t.code === B.song)).toBe(false)
  })
  it.each([1, 3])('Strange Signs puts the correct number of clues for %i players', (players) => {
    let s = during(
      game(players),
      change({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
      draw(B.signs),
    )
    s = settle(s)
    expect(s.locations[B.commons]!.clues).toBe(players >= 3 ? 2 : 1)
  })
  it('Kidnapped adds an ally to the potential pool and sacrifices on advancement', () => {
    let s = during(
      game(),
      change({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      draw(B.kidnapped),
    )
    s = settle(s)
    expect(altarList(s, 'altarPotential')).toContain(EA.rice)
    expect(Object.values(s.assets).some((a) => a.code === EA.rice)).toBe(false)
    expect(
      Object.values(s.treacheries).some(
        (t) => t.code === B.kidnapped && t.placement.type === 'agenda',
      ),
    ).toBe(true)
    s = during(s, keep, { type: 'AdvanceAgenda' })
    s = settle(s)
    expect(altarList(s, 'altarSacrificed')).toHaveLength(1)
    expect(altarList(s, 'altarPotential')).toHaveLength(2)
  })
  it('Kidnapped deals damage instead when there is no ally', () => {
    let s = during(
      game(),
      change({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
      draw(B.kidnapped),
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').damage).toBe(2)
    expect(Object.values(s.treacheries).some((t) => t.code === B.kidnapped)).toBe(false)
  })
  it('Rotting Remains scales horror by the failed margin', () => {
    let s = during(
      game(),
      change({ skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
      draw(B.remains),
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').horror).toBe(3)
  })
})
function poolCodes(s: GameState) {
  return Object.entries(s.scenarioMeta ?? {})
    .filter(([k]) => k.startsWith('altarUnder:'))
    .map(([, v]) => (JSON.parse(String(v)) as { code: string }).code)
}

it.each([B.churchEnemy, B.houseNightgaunt])(
  'revealing %s searches the printed trait and spawns it at the commons',
  (code) => {
    let s = during(
      game(),
      (x) => ({
        ...room(code)(x),
        encounterDeck: [{ ...servantOfManyMouths }, { ...huntingNightgaunt }],
      }),
      put(code),
      reveal(code),
    )
    s = settle(s)
    const wanted = code === B.churchEnemy ? B.servant : B.nightgaunt
    expect(Object.values(s.enemies).find((e) => e.code === wanted)!.location).toBe(B.commons)
    expect(s.encounterDeck).toHaveLength(1)
  },
)
it('the store searches only the top three cards for an Item and the church exchanges a card for resources', () => {
  let s = during(
    game(),
    (x) =>
      room(B.storeItems)(
        change({
          location: B.storeItems,
          deck: ['01087', '01089', '01022', '01090'],
          hand: [],
          resources: 5,
        })(x),
      ),
    put(B.storeItems),
    reveal(B.storeItems),
  )
  let a = availableAbilities(s, 'a').find((a) => a.key === 'altar:item')!
  s = during(s, keep, ...(a.costs ?? []), ...a.then)
  s = settle(s, true)
  expect(getInvestigator(s, 'a').hand).toContain('01087')
  expect(getInvestigator(s, 'a').resources).toBe(4)
  s = during(
    s,
    (x) =>
      room(B.churchResources)(
        change({ location: B.churchResources, hand: ['01089'], resources: 0 })(x),
      ),
    put(B.churchResources),
    reveal(B.churchResources),
  )
  a = availableAbilities(s, 'a').find((a) => a.key === 'altar:resources')!
  s = during(s, keep, ...(a.costs ?? []), ...a.then)
  s = settle(s)
  expect(getInvestigator(s, 'a').hand).toHaveLength(0)
  expect(getInvestigator(s, 'a').resources).toBe(2)
})
it('school clues resist effects but can be discovered by investigating', () => {
  let s = during(
    game(1, 11, 'standard', [], true),
    (x) => room(B.schoolClues)(change({ location: B.schoolClues })(x)),
    put(B.schoolClues),
    reveal(B.schoolClues),
  )
  s = during(s, keep, {
    type: 'DiscoverClues',
    investigator: 'a',
    location: B.schoolClues,
    amount: 1,
  })
  expect(s.locations[B.schoolClues]!.clues).toBe(1)
  s = choose(s, 'action.investigate', { location: 'Schoolhouse' })
  expect(scenarioBehavior(s.scenarioId)!.cannotDiscoverClues!(s, 'a', B.schoolClues, false)).toBe(
    true,
  )
  expect(scenarioBehavior(s.scenarioId)!.cannotDiscoverClues!(s, 'a', B.schoolClues, true)).toBe(
    false,
  )
  s = settle(s)
  expect(s.locations[B.schoolClues]!.clues).toBe(0)
})
it.each([false, true])('emptying the chamber resolves the act with book in play = %s', (book) => {
  let s = during(
    game(),
    room(B.chamber),
    put(B.chamber),
    reveal(B.chamber),
    ...(book
      ? [{ type: 'PutAssetIntoPlay' as const, investigator: 'a', code: M.necronomicon }]
      : []),
  )
  s = during(s, (x) => ({ ...x, actIndex: 1 }), { type: 'CheckActObjective' })
  s = settle(s)
  expect(s.outcome).toEqual({ type: 'resolution', resolution: book ? 2 : 3 })
})
it.each(['easy', 'standard', 'hard', 'expert'] as const)(
  'the %s reference counts searched locations and places doom without premature advancement',
  (difficulty) => {
    let s = game(1, 11, difficulty),
      r = scenarioBehavior(s.scenarioId)!
    expect(r.tokenEffect!(s, 'skull', 'a').modifier).toBe(-1)
    const meta = { ...s.scenarioMeta }
    for (const key of Object.keys(meta)) if (key.startsWith('altarUnder:')) delete meta[key]
    s = { ...s, scenarioMeta: meta, doom: 5 }
    expect(r.tokenEffect!(s, 'skull', 'a').modifier).toBe(
      difficulty === 'easy' || difficulty === 'standard' ? -4 : -6,
    )
    const doom = r.tokenEffect!(s, 'elderThing', 'a')
    s = during(s, keep, ...(doom.immediate ?? doom.onFail ?? []))
    expect(s.doom).toBe(6)
    expect(s.agendaIndex).toBe(0)
  },
)

it.each([1, 2, 3, 4])(
  'a full campaign run with %i real starter decks finishes and saves the next scenario',
  (players) => {
    const c = {
      ...newCampaign(
        'the-dunwich-legacy',
        ['joe', 'daniela', 'trish', 'dexter'].slice(0, players),
        'standard',
      ),
      scenarioIndex: 4,
    }
    const end = playRandomlyToEnd(startScenario(c, 700 + players, true), 700 + players, 12000)
    expect(end.outcome).toBeDefined()
    const saved = JSON.parse(JSON.stringify(finishScenario(c, end)))
    expect(currentScenario(saved)).toBe('undimensioned-and-unseen')
  },
)
it('a complete legal sequence finds the key, enters the chamber and defeats Silas', () => {
  let s = game(1, 11, 'standard', [], true)
  const trace: unknown[] = []
  for (let n = 0; n < 220 && !s.outcome; n++) {
    s = settle(s)
    if (s.outcome) break
    const p = s.pending
    if (!p) throw Error('Altar interrupted')
    const here = getInvestigator(s, 'a').location!,
      l = s.locations[here]!,
      choices = p.question.choices
    let selected = choices.findIndex(
      (c) =>
        c.label === 'action.fight' &&
        c.target?.type === 'enemy' &&
        s.enemies[c.target.id]?.code === B.silas,
    )
    if (selected < 0)
      selected = choices.findIndex(
        (c) =>
          c.label === 'action.evade' &&
          c.target?.type === 'enemy' &&
          !s.enemies[c.target.id]?.exhausted,
      )
    if (selected < 0)
      selected = choices.findIndex(
        (c) => c.label === 'ability.altar.key' || c.label === 'ability.altar.under',
      )
    if (selected < 0 && l.clues > 0 && s.scenarioMeta?.[`altarUnder:${here}`])
      selected = choices.findIndex((c) => c.label === 'action.investigate')
    if (selected < 0) {
      const visited = new Set([here]),
        q = [{ id: here, step: '' }]
      let target: string | undefined
      const goal =
        s.scenarioMeta?.altarUnlocked === 1
          ? B.chamber
          : s.locations[B.chamber] && Object.values(s.assets).some((a) => a.code === B.key)
            ? String(s.scenarioMeta?.altarChamberSource)
            : undefined
      while (q.length) {
        const v = q.shift()!
        if (v.id !== here && (goal ? v.id === goal : !!s.scenarioMeta?.[`altarUnder:${v.id}`])) {
          target = v.step
          break
        }
        for (const id of s.locations[v.id]!.connections)
          if (!visited.has(id) && s.locations[id]) {
            visited.add(id)
            q.push({ id, step: v.step || id })
          }
      }
      if (target)
        selected = choices.findIndex(
          (c) => c.label === 'action.move' && c.params?.location === s.locations[target!]!.name,
        )
    }
    if (selected < 0) selected = choices.findIndex((c) => c.label === 'action.endTurn')
    if (selected < 0) throw Error(JSON.stringify(p.question))
    trace.push({
      round: s.round,
      location: here,
      choice: choices[selected]!.label,
      params: choices[selected]!.params,
      clues: l.clues,
      doom: s.doom,
      agenda: s.agendaIndex,
    })
    s = applyInput(s, { investigator: p.investigator, choice: selected })
  }
  expect(s.outcome, JSON.stringify(trace)).toEqual({ type: 'resolution', resolution: 1 })
  expect(s.campaignLog!.notes).toContain(BN.killed)
})
it('permanent sacrifices remove unique cards from all campaign decks and purchases', () => {
  const c = { ...newCampaign('the-dunwich-legacy', ['joe'], 'standard'), scenarioIndex: 4 }
  const ally = '01033'
  c.investigators[0]!.deck[0] = ally
  let s = startScenario(c, 11, true)
  s = throughSetup(s)
  s = settle(s)
  s = during(s, (x) => ({ ...x, scenarioMeta: { ...x.scenarioMeta, altarSacrificed: ally } }), {
    type: 'EndScenario',
    outcome: { type: 'resolution', resolution: 1 },
  })
  s = settle(s)
  const saved = finishScenario(c, s)
  expect(saved.log.removedCards).toContain(ally)
  expect(saved.investigators[0]!.deck).not.toContain(ally)
  expect(purchaseOptions(saved, saved.investigators[0]!.id).some((p) => p.code === ally)).toBe(
    false,
  )
})
it('Servant of Many Mouths spawns at an empty location and offers its clue reaction', () => {
  let s = game()
  const l = Object.keys(s.locations).find((c) => c !== B.commons)!
  s = during(s, keep, reveal(l), draw(B.servant))
  s = settle(s)
  const e = Object.values(s.enemies).find((e) => e.code === B.servant)!
  expect(e.location).not.toBe(B.commons)
  expect(e.health).toBe(2)
  s = during(s, change({ location: e.location }), { type: 'DefeatEnemy', enemy: e.id, by: 'a' })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.altar.servant')).toBe(true)
})
it('On Wings of Darkness moves the failed investigator to the commons and drops ordinary enemies', () => {
  let s = game()
  const l = Object.keys(s.locations).find((c) => c !== B.commons)!
  s = during(
    s,
    change({ location: l, skills: { willpower: 0, intellect: 0, combat: 0, agility: 0 } }),
    spawnAt(l, servantOfManyMouths, 'a'),
    draw(B.wings),
  )
  s = settle(s)
  expect(getInvestigator(s, 'a').location).toBe(B.commons)
  expect(getInvestigator(s, 'a').damage).toBe(1)
  expect(getInvestigator(s, 'a').horror).toBe(1)
  expect(Object.values(s.enemies).find((e) => e.code === B.servant)!.location).toBe(l)
})
it('Zebulon reacts to willpower treachery tests and Earl reacts to evasion', () => {
  let s = during(
    game(1, 11, 'standard', [], true),
    keep,
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.zebulon },
    draw(B.remains),
  )
  s = choose(s, 'choice.revealToken')
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.altar.zebulon')).toBe(true)
  s = choose(s, 'ability.altar.zebulon')
  s = settle(s)
  expect(Object.values(s.assets).find((a) => a.code === B.zebulon)!.exhausted).toBe(true)
  s = during(
    s,
    keep,
    { type: 'DiscardAsset', asset: Object.values(s.assets).find((a) => a.code === B.zebulon)!.id },
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.earl },
    spawnAt(B.commons, huntingNightgaunt, 'a'),
  )
  const enemy = Object.values(s.enemies).find((e) => e.code === B.nightgaunt)!
  s = during(s, keep, { type: 'EvadeEnemy', enemy: enemy.id, by: 'a' })
  expect(s.pending?.question.choices.some((c) => c.label === 'ability.altar.earl')).toBe(true)
})
it('Powder enters with survivor clues and transfers them only to an exhausted local Brood', () => {
  const brood: EnemyCard = {
    kind: 'enemy',
    code: '02255',
    name: 'Brood of Yog-Sothoth',
    fight: 0,
    health: 6,
    evade: 3,
    damage: 1,
    horror: 2,
    keywords: [],
  }
  let s = during(
    game(),
    (x) => ({
      ...x,
      campaignLog: {
        ...x.campaignLog!,
        values: {
          ...x.campaignLog!.values,
          [BN.survivors]: [H.armitage, B.earl, B.zebulon].join(','),
        },
      },
    }),
    { type: 'PutAssetIntoPlay', investigator: 'a', code: B.powder },
    spawnAt(B.commons, brood),
  )
  const a = Object.values(s.assets).find((a) => a.code === B.powder)!
  expect(a.clues).toBe(3)
  expect(availableAbilities(s, 'a').some((o) => o.label === 'ability.altar.powder')).toBe(false)
  const e = Object.values(s.enemies).find((e) => e.code === '02255')!
  s = during(s, keep, { type: 'ExhaustEnemy', enemy: e.id })
  s = during(
    s,
    keep,
    ...availableAbilities(s, 'a').find((o) => o.label === 'ability.altar.powder')!.then,
  )
  expect(s.assets[a.id]!.clues).toBe(2)
  expect(s.enemies[e.id]!.clues).toBe(1)
})
