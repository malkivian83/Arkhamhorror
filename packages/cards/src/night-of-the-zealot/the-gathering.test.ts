import {
  applyInput,
  availableAbilities,
  createGame,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  choose,
  during,
  keep,
  spawnAt,
  testInvestigator,
  testScenario,
  throughSetup,
  withBag,
} from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { campaignDefinition } from '../campaign-definition'
import {
  finishScenario,
  newCampaign,
  pendingTransfers,
  replaceInvestigator,
  startScenario,
  chooseTransferHeir,
} from '../campaign'
import { NIGHT_OF_THE_ZEALOT, ZEALOT_CHAOS_BAGS } from './campaign'
import {
  CODES,
  fleshEater,
  ghoulPriest,
  icyGhoul,
  theGathering,
  THE_GATHERING,
  ZEALOT_NOTES,
} from './the-gathering'
import { LITA_CHANTLER } from './lita'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'

function game(players = 1, difficulty: Difficulty = 'standard', interactive = true) {
  let state = throughSetup(
    createGame({
      seed: 7,
      difficulty,
      interactive,
      scenario: theGathering(difficulty),
      investigators: ['a', 'b', 'c', 'd'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    state = choose(state, 'choice.investigator')
  return state
}
function stories(state: GameState) {
  let s = state
  for (let n = 0; s.pending?.question.prompt === 'prompt.story' && n < 20; n++)
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}
function act2(players = 1) {
  return stories(
    during(
      game(players),
      (s) => ({
        ...s,
        investigators: s.investigators.map((i, n) => ({ ...i, clues: n ? 0 : 2 * players })),
      }),
      { type: 'AdvanceAct', paid: true },
    ),
  )
}
function act3(players = 1) {
  let s = stories(during(act2(players), keep, { type: 'AdvanceAct', paid: true }))
  // Resolve the lead's tied-prey engagement decision before returning the action window.
  while (s.pending && s.pending.question.prompt !== 'prompt.chooseAction') {
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  }
  return s
}
function finishTest(state: GameState) {
  let s = state
  if (s.pending?.question.choices.some((c) => c.label === 'choice.revealToken'))
    s = choose(s, 'choice.revealToken')
  if (s.pending?.question.choices.some((c) => c.label === 'choice.applyResults'))
    s = choose(s, 'choice.applyResults')
  return s
}

// Guía ES p. 1; RR: "Setup", "Campaign Play".
describe('Night of the Zealot: campaign and setup', () => {
  it('registers three scenarios in order, with all three scenarios playable', () => {
    const def = campaignDefinition(NIGHT_OF_THE_ZEALOT.id)
    expect(def.scenarios.map((s) => s.id)).toEqual(NIGHT_OF_THE_ZEALOT.scenarios)
    expect(def.scenarios.map((s) => !!s.build)).toEqual([true, true, true])
    expect(() => startScenario(newCampaign(def.id, ['joe'], 'standard'), 7)).not.toThrow()
  })
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    '%s uses the classic cultist, not an elder thing',
    (difficulty) => {
      const bag = ZEALOT_CHAOS_BAGS[difficulty]
      expect(bag.filter((t) => typeof t === 'string').sort()).toEqual([
        'autoFail',
        'cultist',
        'elderSign',
        'skull',
        'skull',
        'tablet',
      ])
      expect(bag.length).toBe(difficulty === 'expert' ? 18 : difficulty === 'hard' ? 17 : 16)
      for (const players of [1, 2, 3, 4]) {
        const s = game(players, difficulty)
        expect(Object.keys(s.locations)).toEqual([CODES.study])
        expect(s.locations[CODES.study]).toMatchObject({ revealed: true, clues: 2 * players })
        expect(s.encounterDeck).toHaveLength(26)
        expect(s.setAside.map((c) => c.code)).toEqual([CODES.ghoulPriest])
        expect(Object.keys(s.setAsideLocations)).toHaveLength(4)
        expect(Object.values(s.placedAssets ?? {})).toHaveLength(0)
        expect(s.agendas.map((a) => a.doomThreshold)).toEqual([3, 7, 10])
      }
    },
  )
})

// Cartas 01108–01115; Grimorio: "Acción de activar", "Mover", "Objetivo".
describe('The Gathering: acts and rooms', () => {
  it('requires 2 clues per investigator and discards Study enemies before placing the group', () => {
    let s = during(game(2), keep, spawnAt(CODES.study, ENCOUNTER_SETS.rats[0]!, 'a'))
    s = during(s, keep, { type: 'AdvanceAct', paid: true })
    expect(s.actIndex).toBe(1)
    expect(s.locations[CODES.study]).toBeUndefined()
    expect(Object.keys(s.locations).sort()).toEqual(
      [CODES.attic, CODES.cellar, CODES.hallway, CODES.parlor].sort(),
    )
    expect(s.investigators.every((i) => i.location === CODES.hallway)).toBe(true)
    expect(s.enemies).toEqual({})
    expect(s.encounterDiscard.some((c) => c.code === '01159')).toBe(true)
    expect(s.investigators.every((i) => i.damage === 0 && i.horror === 0)).toBe(true)
    const act = game(2).acts[0]!
    expect(act).toMatchObject({
      clueThreshold: 2,
      cluesPerInvestigator: true,
      advanceTiming: 'anytime',
    })
  })
  it('blocks the Parlor before act 2 advances, including movement by effects', () => {
    let s = act2()
    expect(availableAbilities(s, 'a').some((a) => a.key === 'parlor:resign')).toBe(false)
    expect(scenarioBehavior(THE_GATHERING)!.canEnter!(s, 'a', CODES.hallway, CODES.parlor)).toBe(
      false,
    )
    s = during(s, keep, { type: 'MoveTo', investigator: 'a', location: CODES.parlor })
    expect(getInvestigator(s, 'a').location).toBe(CODES.hallway)
    expect(s.acts[1]).toMatchObject({
      clueThreshold: 3,
      cluesPerInvestigator: true,
      advanceTiming: 'endOfRound',
      cluesAtLocation: CODES.hallway,
    })
  })
  it('opens the Parlor, places uncontrolled Lita and spawns the Priest scaled to the starting group', () => {
    const s = act3(2)
    expect(s.actIndex).toBe(2)
    expect(s.locations[CODES.parlor]?.revealed).toBe(true)
    expect(Object.values(s.placedAssets ?? {})).toEqual([
      expect.objectContaining({
        code: LITA_CHANTLER,
        placement: { type: 'location', location: CODES.parlor },
      }),
    ])
    expect(Object.values(s.enemies)).toEqual([
      expect.objectContaining({ code: CODES.ghoulPriest, location: CODES.hallway, maxHealth: 10 }),
    ])
    expect(s.setAside).toHaveLength(0)
  })
  it('the Attic and Cellar deal their different entry effects on every entry', () => {
    let s = act2()
    for (const location of [CODES.attic, CODES.cellar, CODES.attic]) {
      s = during(s, keep, { type: 'MoveTo', investigator: 'a', location })
      s = during(s, keep, { type: 'MoveTo', investigator: 'a', location: CODES.hallway })
    }
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 1, horror: 2 })
  })
  it.each([fleshEater, icyGhoul])(
    '$name fails to spawn while its room is apart and spawns there once in play',
    (card) => {
      const early = during(game(), keep, { type: 'ResolveEncounterCard', investigator: 'a', card })
      expect(Object.values(early.enemies)).toHaveLength(0)
      expect(early.encounterDiscard.map((c) => c.code)).toContain(card.code)
      const later = during(act2(), keep, { type: 'ResolveEncounterCard', investigator: 'a', card })
      expect(Object.values(later.enemies)[0]?.location).toBe(
        card === fleshEater ? CODES.attic : CODES.cellar,
      )
    },
  )
  it('defeating the Priest opens the house decision and applies the chosen R2', () => {
    const s = act3()
    const priest = Object.values(s.enemies).find((e) => e.code === CODES.ghoulPriest)!
    let won = during(s, keep, { type: 'DamageEnemy', enemy: priest.id, amount: 10, by: 'a' })
    expect(won.pending?.question.choices.map((c) => c.label)).toContain('story.theGathering.keep')
    won = stories(choose(won, 'story.theGathering.keep'))
    expect(won.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(won.campaignLog?.investigators.a?.xp).toBe(5)
    expect(won.campaignLog?.investigators.a?.storyAssets).toEqual([])
  })
})

// Cartas 01105–01107; RR: "Doom", "Enemy Phase", "Elimination".
describe('The Gathering: agendas', () => {
  it('agenda 1 lets the lead choose random discards for each investigator', () => {
    let s = during(game(2), keep, { type: 'AdvanceAgenda' })
    s = choose(s, 'choice.zealot.discardRandomEach')
    expect(s.investigators.map((i) => i.hand.length)).toEqual([4, 4])
    expect(s.agendaIndex).toBe(1)
  })
  it('agenda 1 alternative deals horror only to the lead', () => {
    let s = during(game(2), keep, { type: 'AdvanceAgenda' })
    s = choose(s, 'choice.zealot.leadHorror')
    expect(s.investigators.map((i) => i.horror)).toEqual([2, 0])
  })
  it('agenda 2 shuffles the discard and discards until a Ghoul, not any enemy', () => {
    const s = during(
      game(),
      (s) => ({
        ...s,
        agendaIndex: 1,
        encounterDeck: [...ENCOUNTER_SETS.rats],
        encounterDiscard: [ENCOUNTER_SETS.ghouls[0]!],
      }),
      { type: 'AdvanceAgenda' },
    )
    expect(s.agendaIndex).toBe(2)
    expect(Object.values(s.enemies)).toEqual([
      expect.objectContaining({ traits: expect.arrayContaining(['Ghoul']) }),
    ])
    expect(s.encounterDeck.length + s.encounterDiscard.length).toBe(3)
  })
  it('agenda 3 moves only unengaged Ghouls and counts all Ghouls in Hallway/Parlor for doom', () => {
    let s = during(
      act2(),
      (s) => ({ ...s, agendaIndex: 2 }),
      spawnAt(CODES.attic, fleshEater),
      spawnAt(CODES.hallway, icyGhoul, 'a'),
      spawnAt(CODES.attic, ENCOUNTER_SETS.rats[0]!),
    )
    s = during(s, keep, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
    expect(Object.values(s.enemies).find((e) => e.code === CODES.fleshEater)?.location).toBe(
      CODES.hallway,
    )
    expect(Object.values(s.enemies).find((e) => e.code === '01159')?.location).toBe(CODES.attic)
    s = during(s, keep, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(s.doom).toBe(2)
  })
  it('agenda 3 at act 1 kills non-resigned investigators, with no XP, and leaves Lita for replacements', () => {
    const s = stories(during(game(), (s) => ({ ...s, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(s.campaignLog?.investigators.a).toMatchObject({ killed: true, xp: 0, storyAssets: [] })
    expect(s.campaignLog?.values['transfer:' + LITA_CHANTLER]).toBe('a')
  })
  it('agenda 3 at act 3 defeats remaining investigators and adds one physical trauma', () => {
    const s = stories(during(act3(2), (s) => ({ ...s, agendaIndex: 2 }), { type: 'AdvanceAgenda' }))
    expect(s.outcome).toEqual({ type: 'noResolution' })
    expect(s.investigators.every((i) => i.eliminated)).toBe(true)
    expect(
      Object.values(s.campaignLog!.investigators).every((r) => r.physicalTrauma === 1 && !r.killed),
    ).toBe(true)
    expect(s.campaignLog?.investigators.b?.storyAssets).toContain(LITA_CHANTLER)
  })
})

// Referencia 01104; Grimorio: "Fichas de Caos", "Pruebas de habilidad".
describe('The Gathering: chaos symbols', () => {
  it('normal skull counts only Ghouls at the testing investigator’s location', () => {
    const s = during(
      game(),
      keep,
      spawnAt(CODES.study, ghoulPriest, 'a'),
      spawnAt(CODES.study, ENCOUNTER_SETS.rats[0]!, 'a'),
    )
    expect(scenarioBehavior(THE_GATHERING)!.tokenEffect!(s, 'skull', 'a').modifier).toBe(-1)
  })
  it.each(['standard', 'hard'] as const)(
    '%s tablet hurts immediately, even on success, only with a Ghoul present',
    (difficulty) => {
      const s = during(
        game(1, difficulty, false),
        withBag('tablet'),
        spawnAt(CODES.study, ghoulPriest, 'a'),
      )
      const tested = choose(
        during(s, (s) => ({
          ...s,
          enemies: Object.fromEntries(
            Object.entries(s.enemies).map(([id, e]) => [id, { ...e, exhausted: true }]),
          ),
        })),
        'action.investigate',
      )
      expect(getInvestigator(tested, 'a')).toMatchObject({
        damage: 1,
        horror: difficulty === 'hard' ? 1 : 0,
      })
      const absent = choose(
        during(game(1, difficulty, false), withBag('tablet')),
        'action.investigate',
      )
      expect(getInvestigator(absent, 'a')).toMatchObject({ damage: 0, horror: 0 })
    },
  )
  it('normal cultist adds one horror on failure', () => {
    const s = choose(
      during(game(1, 'standard', false), (s) => ({
        ...s,
        chaosBag: ['cultist'],
        investigators: s.investigators.map((i) => ({
          ...i,
          skills: { ...i.skills, intellect: 1 },
        })),
      })),
      'action.investigate',
    )
    expect(getInvestigator(s, 'a').horror).toBe(1)
  })
  it('hard cultist reveals another token and inflicts two horror only on failure', () => {
    const effect = scenarioBehavior(THE_GATHERING)!.tokenEffect!(game(1, 'hard'), 'cultist', 'a')
    expect(effect).toMatchObject({
      modifier: 0,
      revealAnother: true,
      onFail: [{ type: 'TakeDamage', horror: 2 }],
    })
  })
  it('hard skull searches after the failed test and offers Ghouls from both deck and discard', () => {
    const base = game(1, 'hard', false)
    let s = choose(
      during(base, (s) => ({
        ...s,
        chaosBag: ['skull'],
        encounterDeck: [fleshEater],
        encounterDiscard: [icyGhoul],
      })),
      'action.investigate',
    )
    expect(s.skillTest).toBeNull()
    expect(s.pending?.question.prompt).toBe('prompt.zealot.chooseGhoul')
    expect(s.pending?.question.choices).toHaveLength(2)
    s = choose(s, 'choice.enemy', { enemy: 'Icy Ghoul' })
    // Cellar is apart: the selected enemy cannot spawn and returns to discard.
    expect(s.encounterDiscard.filter((c) => c.code === CODES.icyGhoul)).toHaveLength(1)
    expect(s.encounterDeck.map((c) => c.code)).toEqual([CODES.fleshEater])
  })
})

// Guía ES pp. 2–3; RR: "Campaign Play", "Victory Display", "Trauma".
describe('The Gathering: campaign consequences', () => {
  it.each([0, 1, 2, 3])('resolution %i records its own XP, trauma, Lita and house state', (n) => {
    const outcome = n
      ? { type: 'resolution' as const, resolution: n }
      : { type: 'noResolution' as const }
    const s = stories(during(game(2), keep, { type: 'EndScenario', outcome }))
    const a = s.campaignLog!.investigators.a!
    const b = s.campaignLog!.investigators.b!
    expect(a.xp).toBe(n === 3 ? 0 : n === 2 ? 3 : 2)
    expect(b.xp).toBe(n === 3 ? 0 : 2)
    expect(a.mentalTrauma).toBe(n === 1 ? 1 : 0)
    expect(b.mentalTrauma).toBe(0)
    expect(a.storyAssets.includes(LITA_CHANTLER)).toBe(n === 0 || n === 1)
    expect(s.campaignLog!.notes).toContain(
      n === 1 ? ZEALOT_NOTES.houseBurned : ZEALOT_NOTES.houseStanding,
    )
    expect(s.campaignLog!.notes.includes(ZEALOT_NOTES.priestAlive)).toBe(n === 0 || n === 3)
  })
  it('R3 spares resigned investigators and lets them gain Lita when the chief dies', () => {
    let s = game(2)
    s = during(
      s,
      (s) => ({
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === 'b' ? { ...i, resigned: true, eliminated: true } : i,
        ),
      }),
      { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } },
    )
    s = stories(s)
    expect(s.campaignLog!.investigators.a!.killed).toBe(true)
    expect(s.campaignLog!.investigators.b!.killed).not.toBe(true)
    expect(s.campaignLog!.investigators.b!.storyAssets).toContain(LITA_CHANTLER)
  })
  it('keeps XP and notes through save/load and opens The Midnight Masks', () => {
    const campaign = newCampaign(NIGHT_OF_THE_ZEALOT.id, ['joe'], 'standard')
    let s = throughSetup(startScenario(campaign, 7))
    s = stories(
      during(s, keep, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 1 } }),
    )
    const next = JSON.parse(JSON.stringify(finishScenario(campaign, s)))
    expect(next.scenarioIndex).toBe(1)
    expect(Object.values(next.log.investigators)).toEqual([
      expect.objectContaining({ xp: 2, mentalTrauma: 1, storyAssets: [LITA_CHANTLER] }),
    ])
    expect(startScenario(next, 8).scenarioId).toBe('the-midnight-masks')
  })
  it('R3 can replace a killed investigator and assign pending Lita to the replacement', () => {
    const campaign = newCampaign(NIGHT_OF_THE_ZEALOT.id, ['joe'], 'standard')
    let s = throughSetup(startScenario(campaign, 7))
    s = stories(
      during(s, keep, { type: 'EndScenario', outcome: { type: 'resolution', resolution: 3 } }),
    )
    let next = finishScenario(campaign, s)
    next = replaceInvestigator(next, campaign.investigators[0]!.id, 'daniela')
    const pending = pendingTransfers(next)[0]!
    expect(pending.card).toBe(LITA_CHANTLER)
    expect(pending.candidates).toHaveLength(1)
    next = chooseTransferHeir(next, LITA_CHANTLER, pending.candidates[0]!)
    expect(next.log.investigators[pending.candidates[0]!]!.storyAssets).toContain(LITA_CHANTLER)
  })
})

// Carta 01117; el aura y la reacción deben servir fuera de esta campaña.
describe('Lita Chantler: shared behavior', () => {
  it('an uncontrolled Lita can be parleyed with, then gives combat to both investigators here', () => {
    let s = during(
      act3(2),
      (s) => ({ ...s, enemies: {} }),
      { type: 'MoveTo', investigator: 'a', location: CODES.parlor },
      { type: 'MoveTo', investigator: 'b', location: CODES.parlor },
    )
    const parley = availableAbilities(s, 'a').find((a) => a.key.endsWith(':parley'))!
    expect(parley).toMatchObject({ actions: 1, provokes: false, parley: true })
    s = during(s, (s) => ({ ...s, chaosBag: [1] }), ...parley.then)
    s = finishTest(s)
    expect(Object.values(s.assets).some((a) => a.code === LITA_CHANTLER && a.owner === 'a')).toBe(
      true,
    )
    expect(Object.values(s.placedAssets ?? {})).toHaveLength(0)
    for (const investigator of ['a', 'b']) {
      const t = during(s, keep, {
        type: 'BeginSkillTest',
        investigator,
        skill: 'combat',
        difficulty: 1,
        kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
      })
      expect(skillTestValue(t).passive).toBe(1)
      expect(skillTestValue(t).sources).toContainEqual({ name: 'Lita Chantler', amount: 1 })
    }
  })
  it('works in a generic scenario and stops helping when the controller is elsewhere or Lita leaves play', () => {
    let s = throughSetup(
      createGame({
        seed: 1,
        interactive: true,
        scenario: testScenario({ encounterDeck: [], chaosBag: [0] }),
        investigators: [testInvestigator('a'), testInvestigator('b')],
      }),
    )
    s = choose(s, 'choice.investigator')
    s = during(s, keep, { type: 'PutAssetIntoPlay', investigator: 'a', code: LITA_CHANTLER })
    const test: Message = {
      type: 'BeginSkillTest',
      investigator: 'b',
      skill: 'combat',
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    }
    expect(skillTestValue(during(s, keep, test)).passive).toBe(1)
    expect(
      skillTestValue(
        during(
          s,
          (s) => ({
            ...s,
            investigators: s.investigators.map((i) => (i.id === 'a' ? { ...i, location: 'B' } : i)),
          }),
          test,
        ),
      ).passive,
    ).toBe(0)
    expect(skillTestValue(during(s, (s) => ({ ...s, assets: {} }), test)).passive).toBe(0)
  })
  it('offers the controller a reaction to increase a teammate’s successful Monster attack damage', () => {
    let s = act2(2)
    s = during(
      s,
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: LITA_CHANTLER },
      spawnAt(CODES.hallway, icyGhoul, 'b'),
    )
    const target = Object.values(s.enemies)[0]!
    s = during(s, withBag(0), {
      type: 'BeginSkillTest',
      investigator: 'b',
      skill: 'combat',
      difficulty: 3,
      kind: { type: 'fight', enemy: target.id },
    })
    s = finishTest(s)
    expect(s.pending?.investigator).toBe('a')
    expect(s.pending?.question.choices.map((c) => c.label)).toContain('ability.zealot.litaDamage')
    s = finishTest(choose(s, 'ability.zealot.litaDamage'))
    // May still offer other reactions, but Lita's reaction is used once in this window.
    expect(s.enemies[target.id]?.damageTaken).toBe(2)
  })
})
