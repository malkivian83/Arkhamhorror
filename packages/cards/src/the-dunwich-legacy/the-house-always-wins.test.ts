import {
  applyInput,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  enemyBehavior,
  playerCardBehavior,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, spawnAt, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { newCampaign, startScenario, finishScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
import { theHouseAlwaysWins, H, HN, HOUSE_SETS } from './the-house-always-wins'
const change =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
function game(players = 1, late = false, blank = false, difficulty: Difficulty = 'standard') {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  log.values.openingScenario = late ? 'extracurricular-activity' : 'the-house-always-wins'
  let s = throughSetup(
    createGame({
      seed: 11,
      interactive: true,
      difficulty,
      campaignLog: log,
      scenario: {
        ...theHouseAlwaysWins({ log, difficulty }),
        chaosBag: [0],
        ...(blank ? { encounterDeck: [] } : {}),
      },
      investigators: ids.map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function settle(s: GameState): GameState {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 300;
    n++
  ) {
    const p = s.pending
    const reward =
      p.question.prompt === 'prompt.story'
        ? p.question.choices.findIndex((c) => c.label === 'choice.investigator')
        : -1
    const choice =
      reward >= 0
        ? reward
        : p.question.choices.findIndex(
            (c) =>
              c.label === 'choice.skip' ||
              c.label === 'choice.revealToken' ||
              c.label === 'choice.applyResults',
          )
    s = applyInput(s, { investigator: p.investigator, choice: choice < 0 ? 0 : choice })
  }
  return s
}
const ability = (s: GameState, key: string, i = 'a') => {
  const a = availableAbilities(s, i).find((a) => a.key.endsWith(key))
  if (!a) throw new Error('Missing ' + key)
  return a
}
const boss = (s: GameState) => Object.values(s.enemies).find((e) => e.code === H.boss)!
const cards = Object.values(HOUSE_SETS).flat()
const draw = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: { ...cards.find((c) => c.code === code)! },
})
const reveal = (location: string): Message[] => [
  { type: 'PutLocationIntoPlay', location },
  { type: 'RevealLocation', location },
]
// Revised Dunwich guide pp. 6-8; card faces 02062-02099.
describe('The House Always Wins', () => {
  it.each([1, 2, 3, 4])('sets up the original sets for %i players', (players) => {
    const s = game(players)
    expect(s.encounterDeck).toHaveLength(19)
    expect(s.setAside).toHaveLength(13)
    expect(Object.keys(s.locations)).toHaveLength(4)
    expect(Object.keys(s.setAsideLocations)).toHaveLength(4)
    expect(boss(s).location).toBe(H.lounge)
    expect(boss(s).engagedWith).toBeNull()
    expect(s.investigators.every((i) => i.location === H.bella)).toBe(true)
    expect(s.acts[2]!.code).toBe(H.allIn)
  })
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'uses the %s campaign bag and late act',
    (difficulty) => {
      const log = emptyCampaignLog(['a'])
      log.values.openingScenario = 'extracurricular-activity'
      expect(theHouseAlwaysWins({ log, difficulty }).acts[2]?.code).toBe(H.fold)
      expect(theHouseAlwaysWins({ difficulty }).chaosBag).toContain('elderSign')
    },
  )
  it('drinks grant two bank clues, draw two and may only be used once by each investigator', () => {
    let s = during(game(2), change({ location: H.bar }), {
      type: 'RevealLocation',
      location: H.bar,
    })
    const before = getInvestigator(s, 'a')
    s = during(s, keep, ...ability(s, 'bar:drink').costs!, ...ability(s, 'bar:drink').then)
    expect(getInvestigator(s, 'a').clues).toBe(2)
    expect(getInvestigator(s, 'a').resources).toBe(before.resources - 2)
    expect(getInvestigator(s, 'a').hand.length).toBe(before.hand.length + 2)
    expect(availableAbilities(s, 'a').some((a) => a.key === 'bar:drink')).toBe(false)
    expect(s.scenarioMeta?.['hawDrink:a']).toBe(1)
  })
  it('a lounge Ally must come from hand and pays the discard before gaining clues', () => {
    let s = during(game(), change({ location: H.lounge, hand: ['01033'] }), {
      type: 'RevealLocation',
      location: H.lounge,
    })
    const a = ability(s, 'lounge:ally')
    s = during(s, keep, ...a.then)
    s = settle(s)
    expect(getInvestigator(s, 'a').hand).not.toContain('01033')
    expect(getInvestigator(s, 'a').discard).toContain('01033')
    expect(getInvestigator(s, 'a').clues).toBe(2)
    expect(availableAbilities(s, 'a').some((a) => a.key === 'lounge:ally')).toBe(false)
  })
  it.each([
    [0, 2, 0],
    [-2, 2, 0],
    [1, 0, 0],
    ['autoFail', 0, 0],
    ['elderSign', 2, 2],
  ] as const)('gambling token %s gives %i clues and %i resources', (token, clues, resources) => {
    const s = during(game(2), (x) => ({ ...x, chaosBag: [token] }), {
      type: 'RevealTokenOutsideTest',
      investigator: 'a',
      then: { type: 'ScenarioSpecific', key: 'hawBet', data: { investigator: 'a' } },
    })
    const done = settle(s)
    expect(getInvestigator(done, 'a').clues).toBe(clues)
    expect(getInvestigator(done, 'a').resources).toBe(5 + resources)
  })
  it('the pit boss readies, engages and attacks for bank clues even while aloof', () => {
    const start = game(),
      id = boss(start).id
    const s = settle(
      during(
        start,
        (x) => ({
          ...change({ location: H.lounge })(x),
          enemies: { ...x.enemies, [id]: { ...x.enemies[id]!, exhausted: true } },
        }),
        { type: 'GainClues', investigator: 'a', amount: 1 },
      ),
    )
    expect(boss(s).engagedWith).toBe('a')
    expect(boss(s).exhausted).toBe(false)
    expect(getInvestigator(s, 'a').damage).toBe(2)
  })
  it('criminal damage advances immediately and losing aloof engages enemies in the room', () => {
    let s = game()
    s = during(s, change({ location: H.lounge }), {
      type: 'DamageEnemy',
      enemy: boss(s).id,
      amount: 1,
      by: 'a',
    })
    expect(s.agendaIndex).toBe(1)
    expect(boss(s).engagedWith).toBe('a')
  })
  it('the late route skips agenda 2a and adds both sets without duplicating the spawned enemy', () => {
    const s = settle(during(game(1, true), keep, { type: 'AdvanceAgenda' }))
    expect(s.agendaIndex).toBe(2)
    expect(s.locations[H.bella]).toBeUndefined()
    expect(getInvestigator(s, 'a').location).toBe(H.lounge)
    expect(s.encounterDeck.length + Object.keys(s.enemies).length).toBe(33)
    expect(s.setAside).toHaveLength(0)
  })
  it('act 1 spends four clues per investigator and reveals a guarded hall', () => {
    let s = game()
    s = during(
      s,
      keep,
      { type: 'GainClues', investigator: 'a', amount: 5 },
      { type: 'CheckActObjective' },
    )
    expect(s.actIndex).toBe(1)
    expect(getInvestigator(s, 'a').clues).toBe(1)
    expect(s.locations[H.hall]).toBeDefined()
    expect(
      Object.values(s.enemies).some((e) => e.location === H.hall && e.traits?.includes('Criminal')),
    ).toBe(true)
    s = during(s, keep, { type: 'RevealLocation', location: H.hall })
    for (const id of [H.gallery, H.vip, H.alley]) expect(s.locations[id]).toBeDefined()
    expect(
      new Set([H.gallery, H.vip, H.alley].map((id) => s.locations[id]!.position?.[0])).size,
    ).toBe(3)
  })
  it.each([false, true])('the VIP objective only spends local clues, late=%s', (late) => {
    let s = during(
      game(2, late),
      (x) => ({ ...change({ clues: 8, location: H.vip })(x), actIndex: 1 }),
      ...reveal(H.vip),
    )
    expect(availableAbilities(s, 'a').some((a) => a.key === 'vip:advance')).toBe(true)
    s = during(s, keep, ...ability(s, 'vip:advance').then)
    if (late) s = settle(s)
    expect(s.actIndex).toBe(2)
    expect(getInvestigator(s, 'a').clues).toBe(4)
    expect(
      Object.values(s.placedAssets ?? {}).some((a) => a.code === (late ? H.peter : H.morgan)),
    ).toBe(true)
  })
  it('parley requires one successful willpower test per investigator, Peter is hurt while uncontrolled', () => {
    let s = during(
      game(2, true),
      (x) => ({ ...change({ location: H.bar })(x), actIndex: 2 }),
      {
        type: 'PlaceAsset',
        code: H.peter,
        name: 'Peter Clover',
        placement: { type: 'location', location: H.bar },
      },
      { type: 'RevealLocation', location: H.bar },
    )
    s = during(s, keep, { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } })
    expect(Object.values(s.placedAssets!)[0]!.damage).toBe(1)
    s = settle(during(s, keep, ...ability(s, ':parley').then))
    expect(Object.values(s.placedAssets!)[0]!.clues).toBe(1)
    s = settle(during(s, keep, ...ability(s, ':parley').then))
    expect(
      Object.values(s.assets).some((a) => a.code === H.peter && a.owner === 'a' && a.damage === 1),
    ).toBe(true)
  })
  it('VIP blocks only upkeep draw and resources; the thug blocks resource gain while engaged', () => {
    let s = during(game(), change({ location: H.vip }), ...reveal(H.vip))
    const hand = getInvestigator(s, 'a').hand.length,
      resources = getInvestigator(s, 'a').resources
    s = during(s, keep, { type: 'UpkeepPhase' })
    expect(getInvestigator(s, 'a').hand.length).toBe(hand)
    expect(getInvestigator(s, 'a').resources).toBe(resources)
    s = during(s, (x) => ({ ...x, phase: 'investigation' }), {
      type: 'GainResources',
      investigator: 'a',
      amount: 2,
    })
    expect(getInvestigator(s, 'a').resources).toBe(resources + 2)
    s = during(
      s,
      keep,
      spawnAt(H.vip, HOUSE_SETS.naomi[0] as import('@lcg/engine').EnemyCard, 'a'),
      { type: 'GainResources', investigator: 'a', amount: 3 },
    )
    expect(getInvestigator(s, 'a').resources).toBe(resources + 2)
  })
  it.each([1, 2, 3, 4])(
    'records resolution %i, XP, trauma, cheating and the late interlude',
    (n) => {
      const s = settle(
        during(
          game(1, true),
          (x) => ({ ...x, scenarioMeta: { ...x.scenarioMeta, hawCheated: 1 } }),
          { type: 'EndScenario', outcome: { type: 'resolution', resolution: n } },
        ),
      )
      expect(s.outcome).toEqual({ type: 'resolution', resolution: n })
      expect(s.campaignLog?.notes).toContain(n === 3 ? HN.naomi : HN.obannion)
      expect(s.campaignLog?.notes).toContain(n === 2 ? HN.morganRescued : HN.morganKidnapped)
      expect(s.campaignLog?.notes).toContain(n === 4 ? HN.armitageKidnapped : HN.armitageRescued)
      expect(s.campaignLog?.chaosTokens).toContain('elderThing')
      expect(s.campaignLog?.investigators.a?.physicalTrauma).toBe(n === 4 ? 1 : 0)
    },
  )
  it.each([false, true])(
    'resigning with the objective asset produces the proper resolution, late=%s',
    (late) => {
      const s = settle(
        during(
          game(1, late),
          (x) => ({ ...x, actIndex: 2 }),
          {
            type: 'PutAssetIntoPlay',
            investigator: 'a',
            code: late ? H.peter : H.morgan,
            noSlot: true,
          },
          { type: 'Resign', investigator: 'a' },
        ),
      )
      expect(s.outcome).toEqual({ type: 'resolution', resolution: late ? 3 : 2 })
    },
  )
  it('all defeated after act 3 still goes to R1, even if the asset was controlled', () => {
    const s = settle(
      during(
        game(),
        (x) => ({ ...x, actIndex: 2 }),
        { type: 'PutAssetIntoPlay', investigator: 'a', code: H.morgan, noSlot: true },
        { type: 'EliminateInvestigator', investigator: 'a' },
      ),
    )
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
  })
  it('a legal complete route rescues Morgan without editing state after preparation', () => {
    let s = game(1, false, true)
    const act = (label: string, params: Record<string, string> = {}) => {
      s = settle(s)
      if (!s.pending) throw new Error(`Route stopped before ${label}: ${JSON.stringify(s.outcome)}`)
      if (
        !s.pending?.question.choices.some(
          (c) => c.label === label && Object.entries(params).every(([k, v]) => c.params?.[k] === v),
        )
      )
        s = settle(choose(s, 'action.endTurn'))
      s = settle(choose(s, label, params))
    }
    act('action.investigate', { location: 'La Bella Luna' })
    act('action.move', { location: 'Clover Club Lounge' })
    act('action.move', { location: 'Clover Club Bar' })
    act('ability.house.drink')
    for (let n = 0; n < 4; n++) act('action.fight', { enemy: 'Clover Club Pit Boss' })
    act('action.move', { location: 'Clover Club Cardroom' })
    act('ability.house.bet')
    expect(s.actIndex).toBe(1)
    act('action.move', { location: 'Darkened Hall' })
    act('action.move', { location: 'Art Gallery' })
    act('action.investigate', { location: 'Art Gallery' })
    act('action.move', { location: 'Darkened Hall' })
    act('action.move', { location: 'VIP Area' })
    act('ability.house.findMorgan')
    act('ability.house.parley')
    act('action.move', { location: 'Darkened Hall' })
    act('action.move', { location: 'Back Alley' })
    act('ability.resign')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.investigators.a?.storyAssets).toContain(H.morgan)
  })
  it.each([1, 2, 3, 4])(
    'full decks terminate legally for %i players and save the opposite opener',
    (players) => {
      const c = newCampaign(
        'the-dunwich-legacy',
        ['joe', 'trish', 'dexter', 'daniela'].slice(0, players),
        'standard',
        11,
        [],
        [],
        'the-house-always-wins',
      )
      const s = playRandomlyToEnd(startScenario(c, 100 + players), 200 + players, 2500)
      const next = finishScenario(c, s)
      expect(currentScenario(next)).toBe('extracurricular-activity')
      expect(next.results).toHaveLength(1)
    },
  )
})

// RR: Revelation, Forced Abilities, Spawn, Prey, Skill Tests and resource/clue gains.
describe('Clover Club encounters and story allies', () => {
  it('Cursed Luck stacks, affects only its bearer, and discards on success by at least one', () => {
    let s = during(game(), keep, draw(H.cursed), draw(H.cursed), {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 'Cursed Luck', onSuccess: [], onFail: [], onFailEach: [] },
    })
    expect(skillTestValue(s).total).toBe(1)
    s = settle(s)
    expect(Object.values(s.treacheries).filter((t) => t.code === H.cursed)).toHaveLength(2)
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 0,
      kind: { type: 'effect', source: 'Cursed Luck', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = settle(s)
    expect(Object.values(s.treacheries).filter((t) => t.code === H.cursed)).toHaveLength(0)
  })
  it.each([
    [1, 0, 0],
    ['elderSign', 0, 0],
    [0, 1, 0],
    [-2, 1, 0],
    ['autoFail', 0, 2],
  ] as const)('Twist of Fate %s deals %i damage and %i horror', (token, damage, horror) => {
    const s = settle(
      during(game(), (x) => ({ ...x, actIndex: 1, chaosBag: [token] }), draw(H.twist)),
    )
    expect(getInvestigator(s, 'a')).toMatchObject({ damage, horror })
  })
  it('Lupine Thrall uses all farthest locations, including occupied ones', () => {
    const s = game()
    expect(enemyBehavior(H.lupine)!.spawn!(s, 'a').sort()).toEqual([H.bar, H.cardroom].sort())
  })
  it.each([
    ['01016', 2],
    [H.morgan, 5],
  ] as const)(
    'Avian Thrall adjusts the fight difficulty only for the printed weapon traits: %s',
    (code, difficulty) => {
      let s = during(
        game(),
        change({ location: H.bar }),
        { type: 'PutAssetIntoPlay', investigator: 'a', code, noSlot: true },
        spawnAt(H.bar, HOUSE_SETS.abominations[0] as import('@lcg/engine').EnemyCard, 'a'),
      )
      const asset = Object.values(s.assets).find((a) => a.code === code)!
      const e = Object.values(s.enemies).find((e) => e.code === H.avian)!
      s = during(s, keep, {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'combat',
        source: asset.id,
        difficulty: 5,
        kind: { type: 'fight', enemy: e.id },
      })
      expect(s.skillTest!.difficulty).toBe(difficulty)
    },
  )
  it('Altered Beast heals an Abomination and punishes entering its location', () => {
    let s = during(
      game(),
      keep,
      spawnAt(H.bar, HOUSE_SETS.abominations[0] as import('@lcg/engine').EnemyCard),
    )
    const e = Object.values(s.enemies).find((e) => e.code === H.avian)!
    s = during(s, keep, { type: 'DamageEnemy', enemy: e.id, amount: 2 }, draw(H.altered))
    s = settle(s)
    expect(s.enemies[e.id]!.damageTaken).toBe(0)
    expect(
      Object.values(s.treacheries).some(
        (t) => t.code === H.altered && t.placement.type === 'enemy',
      ),
    ).toBe(true)
    s = settle(during(s, keep, { type: 'MoveTo', investigator: 'a', location: H.bar }))
    expect(getInvestigator(s, 'a').horror).toBe(1)
  })
  it('Mobster loses one resource after its attack and Hunted Down moves unengaged criminals', () => {
    let s = during(
      game(),
      (x) => ({ ...change({ location: H.bar })(x), agendaIndex: 1 }),
      spawnAt(H.lounge, HOUSE_SETS.naomi[2] as import('@lcg/engine').EnemyCard),
    )
    s = settle(during(s, keep, draw(H.hunted)))
    const e = Object.values(s.enemies).find((e) => e.code === H.mobster)!
    expect(e.location).toBe(H.bar)
    expect(e.engagedWith).toBe('a')
    expect(getInvestigator(s, 'a').resources).toBe(4)
    expect(getInvestigator(s, 'a').damage).toBe(3)
  })
  it('an Abomination at the start of agenda 3 enemy phase discards, rather than defeats, criminals', () => {
    const s = during(
      game(),
      (x) => ({ ...x, agendaIndex: 2 }),
      spawnAt(H.lounge, HOUSE_SETS.abominations[0] as import('@lcg/engine').EnemyCard),
      { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
    )
    expect(Object.values(s.enemies).some((e) => e.code === H.boss)).toBe(false)
    expect(s.victoryDisplay).not.toContain(H.boss)
    expect(s.encounterDiscard.some((c) => c.code === H.boss)).toBe(true)
  })
  it('Something in the Drinks affects only drinkers and Arousing Suspicions puts doom on each local criminal', () => {
    let s = during(game(2), (x) => ({
      ...change({ location: H.lounge })(x),
      scenarioMeta: { ...x.scenarioMeta, 'hawDrink:a': 1 },
    }))
    const drinks = {
      kind: 'treachery' as const,
      code: H.drinks,
      name: 'Something in the Drinks',
      traits: ['Poison', 'Illicit'],
      keywords: [],
    }
    s = during(s, keep, { type: 'ResolveEncounterCard', investigator: 'b', card: drinks })
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(2)
    expect(getInvestigator(s, 'b').actionsRemaining).toBe(0)
    s = during(s, keep, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { ...drinks, code: H.suspicions },
    })
    expect(boss(s).doom).toBe(1)
    const before = getInvestigator(s, 'b').resources
    s = during(s, keep, {
      type: 'ResolveEncounterCard',
      investigator: 'b',
      card: { ...drinks, code: H.suspicions },
    })
    expect(getInvestigator(s, 'b').resources).toBe(before - 2)
  })
  it('cheating changes an outside-test gambling token, is group limited, and adds the campaign penalty', () => {
    let s = during(game(2), (x) => ({ ...x, chaosBag: [1, 'elderSign'] }), {
      type: 'RevealTokenOutsideTest',
      investigator: 'a',
      token: 1,
      then: { type: 'ScenarioSpecific', key: 'hawBet', data: { investigator: 'a' } },
    })
    expect(s.pending?.question.choices.some((c) => c.label === 'ability.house.cheat')).toBe(true)
    s = choose(s, 'ability.house.cheat')
    s = choose(s, 'choice.house.tokens.elderSign')
    s = settle(s)
    expect(getInvestigator(s, 'a').clues).toBe(2)
    expect(s.scenarioMeta?.hawCheated).toBe(1)
    expect(
      scenarioBehavior(s.scenarioId)
        ?.reactions?.(s, { type: 'whenRevealChaosToken', investigator: 'b', token: 1 })
        .some((r) => r.key === 'haw:cheat'),
    ).toBe(false)
  })
  it.each(['standard', 'hard'] as const)(
    'skull payment uses the exact %s cost and treats the held token as 0',
    (difficulty) => {
      let s = during(
        game(1, false, false, difficulty),
        (x) => ({ ...x, actIndex: 1, chaosBag: ['skull'] }),
        {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'willpower',
          difficulty: 3,
          kind: { type: 'effect', source: 'Skull', onSuccess: [], onFail: [], onFailEach: [] },
        },
      )
      s = choose(s, 'choice.revealToken')
      s = choose(s, 'ability.house.paySkull')
      s = settle(s)
      expect(getInvestigator(s, 'a').resources).toBe(difficulty === 'hard' ? 2 : 3)
    },
  )
  it('Morgan grants combat and a draw reaction; Peter can evade an unengaged Criminal; Armitage trades the drawn card', () => {
    let s = during(
      game(),
      change({ location: H.lounge }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: H.morgan, noSlot: true },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: H.peter },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: H.armitage, noSlot: true },
    )
    const a = availableAbilities(s, 'a').find((a) => a.key.includes(':evade:'))!
    expect(a).toBeDefined()
    s = during(s, keep, ...a.costs!, ...a.then)
    expect(boss(s).exhausted).toBe(true)
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 0,
      kind: { type: 'effect', source: 'Morgan', onSuccess: [], onFail: [], onFailEach: [] },
    })
    expect(skillTestValue(s).total).toBe(4)
    s = settle(s)
    const source = Object.values(s.assets).find((a) => a.code === H.armitage)!
    const card = getInvestigator(s, 'a').hand[0]!
    // Read the registered optional reaction; the actual discard, exhaust and resource messages resolve in-engine.
    const reaction = playerCardBehavior(H.armitage)!.reactions!(
      s,
      { type: 'afterDrawCard', investigator: 'a', card },
      source,
    )[0]!
    const resources = getInvestigator(s, 'a').resources
    s = during(s, keep, ...reaction.then)
    expect(getInvestigator(s, 'a').hand).not.toContain(card)
    expect(getInvestigator(s, 'a').resources).toBe(resources + 3)
    expect(s.assets[source.id]!.exhausted).toBe(true)
  })
})

it.each([
  ['standard', 'cultist', 0, 8],
  ['hard', 'cultist', 1, 2],
  ['standard', 'tablet', 1, 5],
  ['standard', 'tablet', 2, 2],
  ['hard', 'tablet', 1, 2],
] as const)(
  'the %s %s token at difficulty %i leaves %i resources',
  (difficulty, token, target, resources) => {
    let s = during(
      game(1, false, true, difficulty),
      (x) => ({ ...x, actIndex: 1, chaosBag: [token] }),
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'willpower',
        difficulty: target,
        kind: {
          type: 'effect',
          source: 'Scenario token',
          onSuccess: [],
          onFail: [],
          onFailEach: [],
        },
      },
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').resources).toBe(resources)
  },
)
it('Arousing Suspicions cannot immediately advance the agenda when it reaches its threshold', () => {
  const s = during(game(), (x) => ({ ...change({ location: H.lounge })(x), doom: 3 }), {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: { kind: 'treachery', code: H.suspicions, name: 'Arousing Suspicions', keywords: [] },
  })
  expect(s.agendaIndex).toBe(0)
  expect(boss(s).doom).toBe(1)
  const next = settle(during(s, keep, { type: 'CheckAgenda' }))
  expect(next.agendaIndex).toBe(1)
})
it.each(['extracurricular-activity', 'the-house-always-wins'])(
  'both legal campaign orders reach Armitage once and keep the museum blocked: %s',
  (first) => {
    let c = newCampaign('the-dunwich-legacy', ['joe'], 'standard', 1, [], [], first)
    for (let n = 0; n < 2; n++) {
      const started = throughSetup(startScenario(c, 50 + n))
      const ended = settle(
        during(started, keep, {
          type: 'EndScenario',
          outcome: { type: 'resolution', resolution: 4 },
        }),
      )
      c = finishScenario(c, ended)
    }
    expect(c.results).toHaveLength(2)
    expect(currentScenario(c)).toBe('the-miskatonic-museum')
    expect(c.log.notes).toContain(HN.armitageKidnapped)
    expect(
      c.log.investigators['01501']?.xp ?? Object.values(c.log.investigators)[0]!.xp,
    ).toBeGreaterThanOrEqual(4)
    expect(c.log.notes.filter((n) => n === HN.armitageKidnapped)).toHaveLength(1)
  },
)
