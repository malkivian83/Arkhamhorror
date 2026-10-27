import {
  applyInput,
  availableAbilities,
  availableActions,
  createGame,
  emptyCampaignLog,
  enemyMaxHealth,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  playerCardDef,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { newCampaign, startScenario, finishScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'
import { theMiskatonicMuseum, M, MN, MUSEUM_LOCATIONS } from './the-miskatonic-museum'
import { horrorInPlay, museumSpecific as specific, MUSEUM_ENCOUNTERS } from './museum-encounters'
const change =
  (patch: Partial<GameState['investigators'][number]>, id = 'a') =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    ...(patch.location && !s.locations[patch.location]
      ? {
          setAsideLocations: {
            ...s.setAsideLocations,
            [patch.location]: Object.values(MUSEUM_LOCATIONS).find((l) => l.id === patch.location)!,
          },
        }
      : {}),
  })
function game(
  players = 1,
  seed = 11,
  blank = false,
  difficulty: Difficulty = 'standard',
  strong = false,
) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players),
    log = emptyCampaignLog(ids)
  const scenario = theMiskatonicMuseum({ difficulty, log })
  let s = throughSetup(
    createGame({
      seed,
      interactive: true,
      difficulty,
      campaignLog: log,
      scenario: { ...scenario, chaosBag: [0], ...(blank ? { encounterDeck: [] } : {}) },
      investigators: ids.map((id) =>
        testInvestigator(id, {
          health: 30,
          sanity: 30,
          ...(strong ? { skills: { willpower: 5, intellect: 5, combat: 5, agility: 5 } } : {}),
        }),
      ),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function settle(s: GameState) {
  for (
    let n = 0;
    s.pending && !s.outcome && s.pending.question.prompt !== 'prompt.chooseAction' && n < 400;
    n++
  ) {
    const p = s.pending
    let choice =
      p.question.prompt === 'prompt.story'
        ? p.question.choices.findIndex((c) => c.label === 'choice.investigator')
        : -1
    if (choice < 0)
      choice = p.question.choices.findIndex((c) =>
        ['choice.revealToken', 'choice.applyResults', 'choice.skip'].includes(c.label),
      )
    s = applyInput(s, { investigator: p.investigator, choice: choice < 0 ? 0 : choice })
  }
  return s
}
const reveal = (location: string): Message[] => [
  { type: 'PutLocationIntoPlay', location },
  { type: 'RevealLocation', location },
]
const ability = (s: GameState, key: string) => {
  const a = availableAbilities(s, 'a').find((a) => a.key.endsWith(key))
  if (!a) throw new Error('Missing ' + key)
  return a
}
const draw = (code: string): Message => ({
  type: 'ResolveEncounterCard',
  investigator: 'a',
  card: { ...MUSEUM_ENCOUNTERS.find((c) => c.code === code)! },
})
// Revised campaign guide pp. 9-10. RR: Spawn, Leaves Play, Forced Abilities, Search and Skill Tests.
describe('The Miskatonic Museum', () => {
  it.each([1, 2, 3, 4])(
    'prepares four locations and an exhibit deck with the restricted hall in its bottom half for %i players',
    (players) => {
      const s = game(players),
        deck = String(s.scenarioMeta?.museumExhibits).split(',')
      expect(Object.keys(s.locations)).toHaveLength(4)
      expect(Object.keys(s.setAsideLocations)).toHaveLength(6)
      expect(s.encounterDeck).toHaveLength(34)
      expect(s.encounterDeck.filter((c) => c.kind === 'enemy').map((c) => c.code)).toEqual([
        M.horror,
      ])
      expect(s.setAside.map((c) => c.code)).toEqual([M.shadow])
      expect(new Set(deck).size).toBe(6)
      expect(deck.indexOf(M.restrictedHall)).toBeGreaterThanOrEqual(3)
      expect(s.investigators.every((i) => i.location === M.entrance)).toBe(true)
      expect(availableActions(s, 'a').some((a) => a.kind === 'move' && a.to === M.halls)).toBe(
        false,
      )
      expect(availableActions(s, 'a').some((a) => a.kind === 'resource')).toBe(false)
    },
  )
  it('uses both office variants and all six positions over deterministic seeds', () => {
    const admins = new Set(),
      security = new Set(),
      restricted = new Set()
    for (let seed = 1; seed <= 30; seed++) {
      const s = game(1, seed)
      for (const id of [M.adminResources, M.adminHand]) if (s.locations[id]) admins.add(id)
      for (const id of [M.securitySearch, M.securityLook]) if (s.locations[id]) security.add(id)
      restricted.add(String(s.scenarioMeta?.museumExhibits).split(',').indexOf(M.restrictedHall))
    }
    expect(admins.size).toBe(2)
    expect(security.size).toBe(2)
    expect([...restricted].sort()).toEqual([3, 4, 5])
  })
  it('paying the act clues opens the halls and grants Adam without breaking the door', () => {
    let s = during(game(), change({ clues: 2 }), { type: 'AdvanceAct' })
    s = settle(s)
    expect(s.actIndex).toBe(1)
    expect(s.acts[1]!.code).toBe(M.night)
    expect(getInvestigator(s, 'a').clues).toBe(0)
    expect(s.locations[M.halls]!.revealed).toBe(true)
    expect(Object.values(s.assets).some((a) => a.code === M.adam)).toBe(true)
  })
  it('breaking the door requires combat 5 and selects the other act without spending clues', () => {
    let s = during(
      game(),
      change({ skills: { willpower: 3, intellect: 3, combat: 5, agility: 3 }, clues: 1 }),
      ...ability(game(), 'museum:break').then,
    )
    expect(s.skillTest!.difficulty).toBe(5)
    s = settle(s)
    expect(s.actIndex).toBe(1)
    expect(s.acts[1]!.code).toBe(M.breaking)
    expect(getInvestigator(s, 'a').clues).toBe(1)
    expect(Object.values(s.assets).some((a) => a.code === M.adam)).toBe(false)
  })
  it('halls draw hidden exhibits in order and spend only clues contributed at the halls', () => {
    let s = during(game(2), change({ location: M.halls, clues: 3 }), {
      type: 'RevealLocation',
      location: M.halls,
    })
    const top = String(s.scenarioMeta!.museumExhibits).split(',')[0]!
    const a = ability(s, 'museum:exhibit')
    s = during(s, keep, ...a.costs!, ...a.then)
    expect(getInvestigator(s, 'a').clues).toBe(1)
    expect(s.locations[top]!.revealed).toBe(false)
    expect(String(s.scenarioMeta!.museumExhibits).split(',')).toHaveLength(5)
    expect(s.locations[top]!.connections).toContain(M.halls)
  })
  it('the Horror is defeated into the void, keeps Shadow-spawned and returns stronger', () => {
    let s = during(game(), keep, specific('museumSpawn', { location: M.halls }))
    let e = horrorInPlay(s)!
    expect(enemyMaxHealth(s, e)).toBe(3)
    expect(Object.values(s.treacheries).find((t) => t.code === M.shadow)!.tokens).toBe(0)
    for (let n = 1; n <= 3; n++) {
      s = during(s, keep, { type: 'DefeatEnemy', enemy: e.id, by: 'a' })
      expect(horrorInPlay(s)).toBeUndefined()
      expect(s.scenarioMeta!.museumVoid).toBe(1)
      expect(s.victoryDisplay).not.toContain(M.horror)
      expect(s.encounterDiscard.some((c) => c.code === M.horror || c.code === M.shadow)).toBe(false)
      s = during(s, keep, specific('museumSpawn', { location: M.halls }))
      e = horrorInPlay(s)!
      expect(enemyMaxHealth(s, e)).toBe(3 + n)
      expect(Object.values(s.treacheries).find((t) => t.code === M.shadow)!.tokens).toBe(n)
    }
    expect(e.keywords).toContain('massive')
    expect(e.engagedWith).toBeNull()
  })
  it.each(['DiscardEnemy', 'RemoveEnemyFromGame'] as const)(
    '%s also sends the Horror to the void',
    (type) => {
      let s = during(game(), keep, specific('museumSpawn', { location: M.halls }))
      s = during(s, keep, { type, enemy: horrorInPlay(s)!.id })
      expect(horrorInPlay(s)).toBeUndefined()
      expect(s.setAside.some((c) => c.code === M.horror)).toBe(true)
    },
  )
  it('agenda backs put doom on a live Horror without immediate advancement, or spawn it and shuffle discards', () => {
    let s = during(game(), keep, specific('museumSpawn', { location: M.halls }), {
      type: 'AdvanceAgenda',
    })
    expect(s.agendaIndex).toBe(1)
    expect(horrorInPlay(s)!.doom).toBe(1)
    s = during(
      s,
      keep,
      { type: 'DefeatEnemy', enemy: horrorInPlay(s)!.id },
      { type: 'AdvanceAgenda' },
    )
    expect(s.agendaIndex).toBe(2)
    expect(horrorInPlay(s)!.location).toBe(M.halls)
    expect(s.encounterDiscard).toHaveLength(0)
  })
  it('the final agenda defeats only remaining investigators and applies exactly one physical trauma', () => {
    let s = during(game(2), keep, { type: 'Resign', investigator: 'a' })
    if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
      s = choose(s, 'choice.investigator')
    s = settle(during(s, (x) => ({ ...x, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
    expect(s.outcome).toEqual({ type: 'noResolution' })
    expect(s.campaignLog!.investigators.a!.physicalTrauma).toBe(0)
    expect(s.campaignLog!.investigators.b!.physicalTrauma).toBe(1)
  })
  it('Harold appears only on the broken-door route and boosts investigation by 2', () => {
    let s = during(
      game(),
      (x) => ({
        ...change({ location: M.restrictedHall })(x),
        actIndex: 1,
        acts: x.acts.map((a, n) => (n === 1 ? { ...a, code: M.breaking } : a)),
      }),
      ...reveal(M.restrictedHall),
      { type: 'CheckActObjective' },
    )
    s = settle(s)
    expect(s.actIndex).toBe(2)
    expect(horrorInPlay(s)!.location).toBe(M.restrictedHall)
    expect(Object.values(s.assets).some((a) => a.code === M.harold)).toBe(true)
    s = during(
      s,
      keep,
      { type: 'DefeatEnemy', enemy: horrorInPlay(s)!.id },
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill: 'intellect',
        difficulty: 3,
        kind: { type: 'investigate', location: M.restrictedHall },
      },
    )
    expect(skillTestValue(s).total).toBe(5)
  })
  it('the restricted hall cannot be investigated while the Horror is there, including card effects', () => {
    let s = during(
      game(),
      change({ location: M.restrictedHall }),
      ...reveal(M.restrictedHall),
      specific('museumSpawn', { location: M.restrictedHall }),
    )
    expect(availableActions(s, 'a').some((a) => a.kind === 'investigate')).toBe(false)
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 3,
      kind: { type: 'investigate', location: M.restrictedHall },
    })
    expect(s.skillTest).toBeNull()
  })
  it.each([0, 1, 2])('resolution %i records XP and the correct Necronomicon outcome', (n) => {
    const s = settle(
      during(game(), keep, {
        type: 'EndScenario',
        outcome: n ? { type: 'resolution', resolution: n } : { type: 'noResolution' },
      }),
    )
    expect(s.campaignLog!.notes).toContain(n === 1 ? MN.destroyed : n === 2 ? MN.kept : MN.failed)
    expect(s.campaignLog!.chaosTokens.includes('elderThing')).toBe(n === 2)
    expect(s.campaignLog!.investigators.a!.storyAssets.includes(M.necronomicon)).toBe(n === 2)
  })
  it('discarding or losing either museum ally removes it and adds a permanent tablet', () => {
    let s = during(
      game(),
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.adam },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.harold },
    )
    for (const a of Object.values(s.assets))
      s = during(s, keep, { type: 'DiscardAsset', asset: a.id })
    expect(Object.values(s.assets)).toHaveLength(0)
    expect(s.campaignLog!.chaosTokens).toEqual(['tablet', 'tablet'])
  })
  it('Adam reduces the Security Office action cost from two to one', () => {
    let s = during(game(), change({ location: M.securitySearch }), ...reveal(M.securitySearch))
    expect(ability(s, 'museum:search').actions).toBe(2)
    s = during(s, keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: M.adam })
    expect(ability(s, 'museum:search').actions).toBe(1)
  })
  it('inspecting the next exhibit reports its full face without drawing or revealing it', () => {
    let s = during(game(), change({ location: M.securityLook }), ...reveal(M.securityLook))
    const before = String(s.scenarioMeta!.museumExhibits),
      top = before.split(',')[0]!
    s = during(s, keep, ...ability(s, 'museum:look').then)
    if (s.pending?.question.prompt !== 'prompt.story') s = choose(s, 'choice.museum.top')
    expect(s.pending?.question.story?.body).toBe('story.museum.peek' + top)
    expect(s.scenarioMeta!.museumExhibits).toBe(before)
    expect(s.locations[top]).toBeUndefined()
  })
  it('office restrictions depend on resources or hand size, and the entrance prevents card resource gains', () => {
    let s = during(game(), keep, { type: 'GainResources', investigator: 'a', amount: 3 })
    expect(getInvestigator(s, 'a').resources).toBe(5)
    for (const [location, patch] of [
      [M.adminResources, { resources: 4 }],
      [M.adminHand, { hand: ['a', 'b', 'c', 'd'] }],
    ] as const) {
      s = during(
        s,
        change({
          location,
          ...patch,
          hand: 'hand' in patch ? [...patch.hand] : getInvestigator(s, 'a').hand,
        }),
        ...reveal(location),
      )
      expect(availableActions(s, 'a').some((a) => a.kind === 'investigate')).toBe(false)
    }
  })
  it('Athabaskan ends the current turn and Nature discards two random cards', () => {
    let s = during(game(), keep, ...reveal(M.athabaskan), {
      type: 'MoveTo',
      investigator: 'a',
      location: M.athabaskan,
    })
    s = settle(s)
    expect(s.round).toBeGreaterThan(1)
    s = during(s, change({ hand: ['a', 'b', 'c', 'd'] }), ...reveal(M.nature), {
      type: 'MoveTo',
      investigator: 'a',
      location: M.nature,
    })
    expect(getInvestigator(s, 'a').hand).toHaveLength(2)
  })
})

// Printed effects of each museum encounter and location; RR: Revelation and Skill Tests.
describe('museum encounters and integration', () => {
  it.each([0, 'skull', 'elderSign', 'autoFail'] as const)(
    'the enemy phase token %s readies the Horror only for a bad symbol',
    (token) => {
      let s = during(
        game(),
        (x) => ({ ...x, chaosBag: [token] }),
        specific('museumSpawn', { location: M.halls }),
      )
      const e = horrorInPlay(s)!
      s = settle(
        during(
          s,
          keep,
          { type: 'EvadeEnemy', enemy: e.id },
          { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
        ),
      )
      expect(horrorInPlay(s)!.exhausted).toBe(token === 0 || token === 'elderSign')
    },
  )
  it('Stalked in the Dark moves the Horror, readies it and attacks each local investigator', () => {
    let s = during(
      game(2),
      (x) => change({ location: M.halls }, 'b')(change({ location: M.halls })(x)),
      specific('museumSpawn', { location: M.halls, investigator: 'a', engage: true }),
    )
    s = settle(s)
    s = settle(during(s, keep, draw(M.stalked)))
    for (const id of ['a', 'b'])
      expect(getInvestigator(s, id)).toMatchObject({ damage: 1, horror: 1 })
  })
  it('Passage raises its difficulty beside the Horror and deals direct damage plus one to every controlled Ally', () => {
    let s = during(
      game(),
      change({ location: M.halls }),
      specific('museumSpawn', { location: M.halls, investigator: 'a', engage: true }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.adam },
      draw(M.passage),
    )
    expect(s.skillTest!.difficulty).toBe(5)
    s = choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
    s = choose(s, 'choice.museum.damage')
    s = settle(s)
    expect(getInvestigator(s, 'a').damage).toBe(1)
    expect(Object.values(s.assets).some((a) => a.code === M.adam)).toBe(false)
    expect(s.campaignLog!.chaosTokens).toContain('tablet')
  })
  it('Ephemeral Exhibits loses an action for each point failed by', () => {
    let s = during(
      game(),
      change({ skills: { willpower: 3, intellect: 2, combat: 3, agility: 3 } }),
      draw(M.ephemeral),
    )
    s = settle(s)
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(2)
  })
  it('Slithering Behind You spawns from the deck/void engaged, or adds doom without advancing', () => {
    let s = settle(during(game(), keep, draw(M.slithering)))
    expect(horrorInPlay(s)!.location).toBe(M.entrance)
    expect(horrorInPlay(s)!.engagedWith).toBe('a')
    s = during(s, (x) => ({ ...x, doom: 4 }), draw(M.slithering))
    expect(horrorInPlay(s)!.doom).toBe(1)
    expect(s.agendaIndex).toBe(0)
  })
  it.each([M.medusa, M.egypt, M.dead])(
    'failed investigation in %s applies the printed cost',
    (location) => {
      let s = during(
        game(),
        change({ location, skills: { willpower: 3, intellect: 2, combat: 3, agility: 3 } }),
        ...reveal(location),
        { type: 'PutAssetIntoPlay', investigator: 'a', code: M.adam },
        {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'intellect',
          difficulty: 3,
          kind: { type: 'investigate', location },
        },
      )
      s = settle(s)
      if (location === M.medusa)
        expect(Object.values(s.assets).some((a) => a.code === M.adam)).toBe(false)
      if (location === M.egypt) expect(getInvestigator(s, 'a').actionsRemaining).toBe(2)
      if (location === M.dead) expect(getInvestigator(s, 'a').horror).toBe(1)
    },
  )
  it('the Necronomicon grants intellect, consumes a hand slot and gives two resources per action', () => {
    let s = during(
      game(),
      change({ location: M.halls }),
      { type: 'RevealLocation', location: M.halls },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: M.necronomicon },
    )
    s = during(s, keep, ...ability(s, ':resources').then)
    expect(getInvestigator(s, 'a').resources).toBe(7)
    s = during(s, keep, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 0,
      kind: {
        type: 'effect',
        source: 'The Necronomicon',
        onSuccess: [],
        onFail: [],
        onFailEach: [],
      },
    })
    expect(skillTestValue(s).total).toBe(4)
  })
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'uses both reference faces correctly on %s',
    (difficulty) => {
      let s = game(1, 11, false, difficulty)
      const behavior = scenarioBehavior(s.scenarioId)!,
        hard = difficulty === 'hard' || difficulty === 'expert'
      expect(behavior.tokenEffect!(s, 'skull', 'a').modifier).toBe(hard ? -2 : -1)
      s = during(
        s,
        keep,
        specific('museumSpawn', { location: M.entrance, investigator: 'a', engage: true }),
      )
      expect(behavior.tokenEffect!(s, 'skull', 'a').modifier).toBe(hard ? -4 : -3)
      expect(behavior.tokenEffect!(s, 'cultist', 'a').modifier).toBe(hard ? -3 : -1)
      expect(behavior.tokenEffect!(s, 'elderThing', 'a').modifier).toBe(hard ? -5 : -3)
    },
  )
  it('a complete legal route retrieves and destroys the tome without state edits after preparation', () => {
    let s = game(1, 11, true, 'standard', true)
    for (let n = 0; n < 180 && !s.outcome; n++) {
      s = settle(s)
      if (s.outcome) break
      const p = s.pending
      if (!p) throw new Error('Route interrupted')
      const i = getInvestigator(s, 'a'),
        e = horrorInPlay(s),
        choices = p.question.choices
      let index = -1
      if (e && e.engagedWith === 'a')
        index = choices.findIndex(
          (c) => c.label === 'action.fight' && c.target?.type === 'enemy' && c.target.id === e.id,
        )
      if (index < 0 && s.actIndex === 0)
        index = choices.findIndex(
          (c) => c.label === (i.clues >= 2 ? 'action.advanceAct' : 'action.investigate'),
        )
      if (index < 0 && i.location && s.locations[i.location]!.clues > 0)
        index = choices.findIndex((c) => c.label === 'action.investigate')
      if (index < 0 && i.location === M.halls) {
        const hidden = Object.values(s.locations).find((l) => Number(l.id) >= 2132 && !l.revealed)
        if (hidden)
          index = choices.findIndex(
            (c) =>
              c.target?.type === 'location' &&
              c.target.id === hidden.id &&
              c.label === 'action.move',
          )
        if (index < 0 && String(s.scenarioMeta!.museumExhibits))
          index = choices.findIndex((c) => c.label === 'ability.museum.exhibit')
        if (index < 0) {
          const room = Object.values(s.locations).find(
            (l) => l.id !== M.entrance && l.id !== M.halls && (l.clues > 0 || !l.revealed),
          )
          if (room)
            index = choices.findIndex(
              (c) =>
                c.label === 'action.move' &&
                c.target?.type === 'location' &&
                c.target.id === room.id,
            )
        }
      }
      if (index < 0 && i.location !== M.halls)
        index = choices.findIndex(
          (c) =>
            c.label === 'action.move' && c.target?.type === 'location' && c.target.id === M.halls,
        )
      if (index < 0) index = choices.findIndex((c) => c.label === 'action.endTurn')
      if (index < 0) throw new Error('No route action')
      s = applyInput(s, { investigator: p.investigator, choice: index })
    }
    s = settle(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(s.campaignLog!.notes).toContain(MN.destroyed)
  })
  it.each([1, 2, 3, 4])(
    'full encounter decks terminate legally for %i real starter investigators and save the train next',
    (players) => {
      const c = {
        ...newCampaign(
          'the-dunwich-legacy',
          ['joe', 'trish', 'dexter', 'daniela'].slice(0, players),
          'standard',
        ),
        scenarioIndex: 2,
      }
      const s = playRandomlyToEnd(startScenario(c, 100 + players), 200 + players, 3500)
      expect(currentScenario(finishScenario(c, s))).toBe('the-essex-county-express')
    },
  )
})

it('printed exhibit symbols add connections only when both faces are revealed', () => {
  let s = during(game(), keep, ...reveal(M.medusa), {
    type: 'PutLocationIntoPlay',
    location: M.egypt,
  })
  expect(s.locations[M.medusa]!.connections).not.toContain(M.egypt)
  s = during(s, keep, { type: 'RevealLocation', location: M.egypt })
  expect(s.locations[M.medusa]!.connections).toContain(M.egypt)
  expect(s.locations[M.egypt]!.connections).toContain(M.medusa)
  expect(playerCardDef(M.necronomicon)!.icons).toEqual({ intellect: 1 })
})

it.each(['ShuffleAssetIntoDeck', 'ReturnAssetToHand', 'RemoveAssetFromGame'] as const)(
  'museum allies are removed with a tablet when %s would move them',
  (type) => {
    let s = during(game(), keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: M.harold })
    const a = Object.values(s.assets).find((a) => a.code === M.harold)!
    s = during(s, keep, { type, asset: a.id })
    expect(s.assets[a.id]).toBeUndefined()
    expect(getInvestigator(s, 'a').hand).not.toContain(M.harold)
    expect(getInvestigator(s, 'a').deck).not.toContain(M.harold)
    expect(s.campaignLog!.chaosTokens).toEqual(['tablet'])
  },
)
