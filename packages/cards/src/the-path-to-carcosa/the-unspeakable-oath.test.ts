import {
  actBehavior,
  agendaBehavior,
  applyInput,
  availableAbilities,
  availableActions,
  createGame,
  getInvestigator,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, startScenario } from '../campaign'
import '../index'
import { CLASP_OF_BLACK_ONYX } from './echoes-assets'
import { beastOfAldebaran, screechingByakhee, SETS, spawnOfHali } from './encounter-sets'
import { carcosaCount } from './log'
import { COURAGE, DANIEL_ALLY } from './oath-assets'
import { afterEchoes } from './oath-playthrough.test'
import {
  ALL,
  atAct,
  atAgenda,
  behavior,
  draw,
  enemyOf,
  game,
  halls,
  monstersSetAside,
  placeAt,
  prep,
  readAll,
  resolveTest,
  reveal,
  spawn,
  treacheryOf,
  update,
  withBag,
  type Mod,
} from './oath-testing'
import {
  asylumGorger,
  CODES,
  danielEnemy,
  KEYS_BY_FORCE,
  madPatient,
  MEMORIES,
  remembered,
  theUnspeakableOath,
} from './the-unspeakable-oath'

// Guía ES p. 14, "Preparación".
describe('The Unspeakable Oath: setup', () => {
  for (const players of [1, 2, 3, 4])
    for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
      it(`${players} investigator(s), ${difficulty}`, () => {
        const state = game(players, difficulty)
        // 1 copia de cada ala de los Pasillos y los 6 Lugares fijos.
        expect(Object.keys(state.locations)).toHaveLength(8)
        const inPlay = halls(state)
        expect(inPlay).toHaveLength(2)
        expect(inPlay.some((c) => c === CODES.westernWingA || c === CODES.westernWingB)).toBe(true)
        expect(Object.keys(state.setAsideLocations).sort()).toEqual(
          [CODES.danielsCell, CODES.occupiedCell, CODES.drearyCell, CODES.familiarCell].sort(),
        )
        // 7 Monstruos, 7 Lunáticos, Daniel (enemigo) y Constance Dumaine, apartados.
        expect(monstersSetAside(state)).toHaveLength(7)
        expect(state.setAside.filter((c) => (c.traits ?? []).includes('Lunatic'))).toHaveLength(
          7 + 2,
        )
        expect(state.setAside).toHaveLength(16)
        // Mazo: juramento (7), regalo de Hastur (2), delirios (6), podredumbre (6), signo (2).
        expect(state.encounterDeck).toHaveLength(23)
        expect(
          state.encounterDeck.some((c) => c.kind === 'enemy' && c.code !== SETS.roachSwarm),
        ).toBe(false)
        const added = { easy: -2, standard: -3, hard: -4, expert: -5 }[difficulty]
        expect(state.campaignLog!.chaosTokens).toEqual([added])
        expect(state.chaosBag).toContain(added)
        expect(state.investigators.every((i) => i.location === inPlay[0])).toBe(true)
        expect(state.acts[1]!.code).toBe(CODES.theReallyBadOnesV2)
      })

  it('each investigator chooses an Asylum Halls to begin play', () => {
    let state = createGame({
      seed: 3,
      interactive: true,
      investigators: [testInvestigator('a'), testInvestigator('b')],
      scenario: theUnspeakableOath({ difficulty: 'standard', seed: 3 }),
    })
    for (
      let n = 0;
      n < 20 && state.pending?.question.prompt !== 'prompt.chooseStartingLocation';
      n++
    )
      state = choose(state, state.pending!.question.choices[0]!.label)
    const [, second] = state.pending!.question.choices
    state = applyInput(state, { investigator: state.pending!.investigator, choice: 1 })
    state = throughSetup(state)
    const target = (second!.target as { id: string }).id
    expect(getInvestigator(state, 'a').location).toBe(target)
    expect(state.locations[target]!.revealed).toBe(true)
  })

  it('with the onyx clasp, act 2 v. I is used', () => {
    const state = game(1, 'standard', 3, ['carcosaTookTheOnyxClasp'])
    expect(state.acts.map((a) => a.code)).toEqual([
      CODES.arkhamAsylum,
      CODES.theReallyBadOnesV1,
      CODES.planningTheEscape,
      CODES.noAsylum,
    ])
    expect(state.agendas.map((a) => a.doomThreshold)).toEqual([2, 7, 8])
  })

  it('Constance’s Information: the top card of each deck becomes a Courage asset', () => {
    const before = game(2)
    const state = game(2, 'standard', 3, ['carcosaInterviewedConstance'])
    for (const id of ['a', 'b']) {
      const courage = Object.values(state.assets).find((a) => a.code === COURAGE && a.owner === id)
      expect(courage).toBeDefined()
      expect(getInvestigator(state, id).deck.length).toBe(
        getInvestigator(before, id).deck.length - 1,
      )
    }
    // Si abandona el juego, la carta real se descarta.
    const courage = Object.values(state.assets).find((a) => a.code === COURAGE && a.owner === 'a')!
    const top = state.scenarioMeta!['carcosa:courage:a']
    const after = prep(state, [], { type: 'DiscardAsset', asset: courage.id })
    expect(after.assets[courage.id]).toBeUndefined()
    expect(getInvestigator(after, 'a').discard).toContain(top)
  })
})

describe('The Unspeakable Oath: locations', () => {
  it('Kitchen, Garden and Basement Hall cannot be entered unrevealed during act 1', () => {
    let state = game()
    const west = halls(state).find((c) => c === CODES.westernWingA || c === CODES.westernWingB)!
    const east = halls(state).find((c) => c === CODES.easternWingA || c === CODES.easternWingB)!
    state = prep(state, [placeAt(east)], ...reveal(east))
    const moves = () =>
      availableActions(state, 'a').flatMap((a) => (a.kind === 'move' ? [a.to] : []))
    expect(moves()).not.toContain(CODES.basementHall)
    state = prep(state, [atAct(1)])
    expect(moves()).toContain(CODES.basementHall)
    state = prep(state, [placeAt(CODES.yard), atAct(0)], ...reveal(CODES.yard))
    expect(moves()).not.toContain(CODES.garden)
    expect(moves()).toContain(west)
  })

  it('the Basement Hall puts the cells into play; entering one unrevealed costs 1 clue', () => {
    let state = game(1, 'standard', 3, ['carcosaTookTheOnyxClasp'])
    state = prep(state, [placeAt(CODES.basementHall), atAct(1)], ...reveal(CODES.basementHall))
    for (const code of [CODES.danielsCell, CODES.occupiedCell])
      expect(state.locations[code]?.revealed).toBe(false)
    const moves = () =>
      availableActions(state, 'a').flatMap((a) => (a.kind === 'move' ? [a.to] : []))
    expect(moves()).not.toContain(CODES.occupiedCell)
    state = prep(state, [update('a', { clues: 2 })])
    expect(moves()).toContain(CODES.occupiedCell)
    state = prep(state, [], { type: 'MoveTo', investigator: 'a', location: CODES.occupiedCell })
    expect(getInvestigator(state, 'a').location).toBe(CODES.occupiedCell)
    expect(getInvestigator(state, 'a').clues).toBe(1)
  })

  it('revealing Daniel’s Cell advances act 2: v. I gives Daniel as an ally', () => {
    let state = game(1, 'standard', 3, ['carcosaTookTheOnyxClasp'])
    state = prep(state, [placeAt(CODES.basementHall), atAct(1)], ...reveal(CODES.basementHall))
    state = prep(state, [update('a', { clues: 1 })], {
      type: 'MoveTo',
      investigator: 'a',
      location: CODES.danielsCell,
    })
    state = readAll(state)
    expect(state.acts[state.actIndex]!.code).toBe(CODES.planningTheEscape)
    expect(Object.values(state.assets).some((a) => a.code === DANIEL_ALLY)).toBe(true)
  })

  it('v. II spawns Daniel Chesterfield as an enemy at his cell', () => {
    let state = game()
    state = prep(state, [placeAt(CODES.basementHall), atAct(1)], ...reveal(CODES.basementHall))
    state = readAll(
      prep(state, [update('a', { clues: 1 })], {
        type: 'MoveTo',
        investigator: 'a',
        location: CODES.danielsCell,
      }),
    )
    expect(state.actIndex).toBe(2)
    expect(enemyOf(state, CODES.danielEnemy)?.location).toBe(CODES.danielsCell)
  })

  it('memory abilities: Kitchen with no clues, willpower (2)', () => {
    let state = game()
    state = prep(state, [placeAt(CODES.kitchen), atAct(2), withBag(0)], ...reveal(CODES.kitchen))
    const kitchen = () =>
      availableAbilities(state, 'a').find((a) => a.key.endsWith('setAFireInTheKitchen'))
    expect(kitchen()).toBeUndefined()
    state = prep(state, [
      (s) => ({
        ...s,
        locations: {
          ...s.locations,
          [CODES.kitchen]: { ...s.locations[CODES.kitchen]!, clues: 0 },
        },
      }),
    ])
    const ability = kitchen()!
    state = resolveTest(choose(state, ability.label, ability.params))
    state = readAll(state)
    expect(remembered(state, 'setAFireInTheKitchen')).toBe(true)
    expect(kitchen()).toBeUndefined()
  })

  it('Yard: +1 shroud for each horror while investigating it', () => {
    const state = game()
    const test = {
      investigator: 'a',
      kind: { type: 'investigate', location: CODES.yard },
    } as Parameters<NonNullable<ReturnType<typeof behavior>['skillModifier']>>[1]
    const scared = prep(state, [update('a', { horror: 2 })])
    expect(behavior().skillModifier!(scared, test)).toBe(-2)
  })

  it('Asylum Halls (03169): Lunatic enemies there get +1 horror', () => {
    const state = game()
    const lunatic = { ...madPatient, location: CODES.westernWingB } as never
    const gorger = { ...asylumGorger, location: CODES.westernWingB } as never
    expect(behavior().enemyHorrorModifier!(state, lunatic)).toBe(1)
    expect(behavior().enemyHorrorModifier!(state, gorger)).toBe(0)
  })

  it('Infirmary: heal 1 damage and take 1 direct horror (once per round)', () => {
    let state = game()
    state = prep(
      state,
      [placeAt(CODES.infirmary), update('a', { damage: 2 })],
      ...reveal(CODES.infirmary),
    )
    const heal = availableAbilities(state, 'a').find((a) => a.label === 'ability.oath.healDamage')!
    state = readAll(choose(state, heal.label, heal.params))
    expect(getInvestigator(state, 'a').damage).toBe(1)
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.oath.healDamage')).toBe(
      false,
    )
  })
})

describe('The Unspeakable Oath: chaos tokens', () => {
  const effect = (
    state: GameState,
    token: Parameters<ReturnType<typeof behavior>['tokenEffect'] & {}>[1],
  ) => behavior().tokenEffect!(state, token, 'a')

  it('cultist: -X horror on you; tablet: -X base shroud of your location', () => {
    const state = prep(game(), [update('a', { horror: 3 })])
    expect(effect(state, 'cultist').modifier).toBe(-3)
    const here = getInvestigator(state, 'a').location!
    expect(effect(state, 'tablet').modifier).toBe(-state.locations[here]!.shroud)
    const hard = prep(game(1, 'hard'), [update('a', { horror: 1 })])
    expect(effect(hard, 'cultist').onFail).toHaveLength(1)
  })

  it('skull: -1 and a Monster beneath the act deck if you fail', () => {
    let state = game()
    const skull = effect(state, 'skull')
    expect(skull.modifier).toBe(-1)
    state = prep(state, [], ...skull.onFail!)
    expect(state.underAct).toHaveLength(1)
    expect(monstersSetAside(state)).toHaveLength(6)
    // Hard: revela otra ficha (límite una vez por prueba).
    expect(effect(game(1, 'hard'), 'skull').revealAnother).toBe(true)
  })

  it('elder thing: a Monster beneath the act deck or an automatic failure', () => {
    let state = prep(game(), [
      withBag('elderThing'),
      update('a', { skills: { willpower: 9, intellect: 9, combat: 9, agility: 9 } }),
    ])
    state = prep(state, [], {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 1,
      kind: {
        type: 'effect',
        source: 'x',
        onSuccess: [],
        onFail: [{ type: 'GainResources', investigator: 'a', amount: 3 }],
        onFailEach: [],
      },
    })
    state = choose(state, 'choice.revealToken')
    expect(labels(state)).toEqual(['choice.oath.monsterBeneathAct', 'choice.oath.autoFail'])
    const resources = getInvestigator(state, 'a').resources
    state = readAll(choose(choose(state, 'choice.oath.autoFail'), 'choice.applyResults'))
    expect(getInvestigator(state, 'a').resources).toBe(resources + 3)
  })
})

describe('The Unspeakable Oath: acts and agendas', () => {
  it('act 1b: failed tests leave the other options; force records the keys', () => {
    let state = game(1)
    state = prep(state, [withBag(-8)], ...actBehavior(CODES.arkhamAsylum)!.onAdvance!(state))
    expect(labels(state)).toEqual([
      'choice.oath.keys.combat',
      'choice.oath.keys.agility',
      'choice.oath.keys.intellect',
      'choice.oath.keys.force',
    ])
    state = resolveTest(choose(state, 'choice.oath.keys.combat'))
    expect(labels(state)).toEqual([
      'choice.oath.keys.agility',
      'choice.oath.keys.intellect',
      'choice.oath.keys.force',
    ])
    state = readAll(choose(state, 'choice.oath.keys.force'))
    expect(remembered(state, KEYS_BY_FORCE)).toBe(true)
  })

  it('act 3 advances with 4 memories; with 3 Monsters shuffled in, the lowest willpower draws one', () => {
    let state = game(2)
    const objective = actBehavior(CODES.planningTheEscape)!.objectiveMet!
    const memories = MEMORIES.slice(0, 4).map((m): Message => ({
      type: 'SetScenarioMeta',
      key: m,
      value: 1,
    }))
    expect(objective(state)).toBe(false)
    state = prep(state, [], ...memories.slice(0, 3))
    expect(objective(state)).toBe(false)
    state = prep(state, [], ...memories.slice(3))
    expect(objective(state)).toBe(true)
    // A Way Out.
    state = prep(
      state,
      [update('b', { skills: { willpower: 1, intellect: 3, combat: 3, agility: 3 } })],
      { type: 'ScenarioSpecific', key: 'oathMonster', data: {} },
      { type: 'ScenarioSpecific', key: 'oathMonster', data: {} },
      { type: 'ScenarioSpecific', key: 'oathMonster', data: {} },
    )
    expect(state.underAct).toHaveLength(3)
    const enemies = Object.keys(state.enemies).length
    state = readAll(prep(state, [], ...actBehavior(CODES.planningTheEscape)!.onAdvance!(state)))
    expect(state.underAct).toEqual([])
    expect(Object.keys(state.enemies).length).toBe(enemies + 1)
  })

  it('agenda 1b shuffles the Lunatics in; agenda 2b spawns Constance in the Garden', () => {
    let state = game()
    state = prep(state, [], ...agendaBehavior(CODES.lockedInside)!.onAdvance!(state))
    expect(state.setAside.filter((c) => (c.traits ?? []).includes('Lunatic'))).toHaveLength(2)
    expect(state.encounterDeck).toHaveLength(23 + 7)
    expect(state.underAct).toHaveLength(1)
    state = readAll(prep(state, [], ...agendaBehavior(CODES.torturousDescent)!.onAdvance!(state)))
    expect(state.encounterDeck).toHaveLength(31)
    expect(enemyOf(state, '03065b')?.location).toBe(CODES.garden)
  })

  it('His Domain: Monsters go to the encounter deck instead of beneath the act', () => {
    const state = prep(game(), [atAgenda(2)], {
      type: 'ScenarioSpecific',
      key: 'oathMonster',
      data: {},
    })
    expect(state.underAct ?? []).toEqual([])
    expect(state.encounterDeck).toHaveLength(24)
  })

  it('act 4: the Garden gains resign while no ready enemy is there', () => {
    let state = prep(game(), [atAct(3), placeAt(CODES.garden)], ...reveal(CODES.garden))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.resign')).toBe(true)
    state = prep(state, [], spawn(madPatient, CODES.garden))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.resign')).toBe(false)
  })
})

describe('The Unspeakable Oath: encounter cards', () => {
  it('Straitjacket takes a body slot and 2 hand slots, returning those assets to hand', () => {
    let state = prep(game(), [], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: '01016',
    })
    const hand = getInvestigator(state, 'a').hand.length
    state = readAll(prep(state, [], draw(treacheryOf(CODES.straitjacket))))
    expect(Object.values(state.assets).some((a) => a.code === '01016')).toBe(false)
    expect(getInvestigator(state, 'a').hand.length).toBe(hand + 1)
    expect(
      Object.values(state.treacheries).some(
        (t) => t.code === CODES.straitjacket && t.placement.type === 'threatArea',
      ),
    ).toBe(true)
  })

  it('Gift of Madness (Pity): you cannot attack Lunatic enemies', () => {
    let state = prep(game(), [], spawn(madPatient, getInvestigator(game(), 'a').location!, 'a'))
    expect(availableActions(state, 'a').some((a) => a.kind === 'fight')).toBe(true)
    state = readAll(prep(state, [], draw(treacheryOf(CODES.giftOfMadnessPity))))
    expect(availableActions(state, 'a').some((a) => a.kind === 'fight')).toBe(false)
    const gift = availableAbilities(state, 'a').find(
      (a) => a.label === 'ability.oath.giftOfMadness',
    )
    expect(gift).toBeDefined()
  })

  it('Walls Closing In: horror for each point failed, or a Monster beneath the act', () => {
    let state = prep(game(), [withBag(-8)], draw(treacheryOf(CODES.wallsClosingIn)))
    state = resolveTest(state)
    expect(labels(state)).toEqual(['choice.oath.wallsHorror', 'choice.oath.monsterBeneathAct'])
    state = readAll(choose(state, 'choice.oath.monsterBeneathAct'))
    expect(state.underAct).toHaveLength(1)
  })

  it('enemy data: Monsters and Lunatics', () => {
    expect(asylumGorger.noOpportunityAttacks).toBe(true)
    expect(madPatient.prey).toEqual({ type: 'mostRemainingSanity' })
    expect(danielEnemy.prey).toEqual({ type: 'highestSkill', skill: 'combat' })
    expect(beastOfAldebaran.keywords).toContain('massive')
    expect(spawnOfHali.prey).toEqual({ type: 'mostHorror' })
    expect(screechingByakhee.prey).toEqual({ type: 'lowestRemainingSanity' })
    expect(ALL.filter((c) => c.code === SETS.theYellowSign)).toHaveLength(2)
  })
})

describe('The Unspeakable Oath: resolutions and Interlude II', () => {
  const finish = (campaign = afterEchoes(2), outcome = 3, mods: Mod[] = []) => {
    let state = startScenario(campaign, 5)
    state = readAll(state)
    state = during(state, (s) => mods.reduce((n, m) => m(n), s), {
      type: 'EndScenario',
      outcome: { type: 'resolution', resolution: outcome },
    })
    return { campaign, state }
  }

  it('R3 leads to Interlude II: heeding the warning marks 2 Convictions and 1 XP', () => {
    const { campaign, state: ended } = finish()
    let state = ended
    for (
      let n = 0;
      n < 10 && state.pending && !labels(state).includes('story.oath.heedChoice');
      n++
    )
      state = choose(state, labels(state)[0]!)
    state = readAll(choose(state, 'story.oath.heedChoice'))
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 3 })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaEscapedTheAsylum')
    expect(next.log.notes).toContain('carcosaHeededDanielsWarning')
    expect(carcosaCount(next.log, 'conviction')).toBe(2)
    expect(next.log.chaosTokens.filter((t) => t === 'elderThing')).toHaveLength(2)
  })

  it('R1: defeated investigators are driven insane and Interlude II is skipped', () => {
    const campaign = afterEchoes(2, ['carcosaTookTheOnyxClasp'])
    let state = readAll(startScenario(campaign, 5))
    state = during(state, (s) => s, {
      type: 'DefeatInvestigator',
      investigator: state.investigators[0]!.id,
    })
    state = readAll(state)
    const id = state.investigators[0]!.id
    state = readAll(
      during(state, (s) => s, {
        type: 'EndScenario',
        outcome: { type: 'resolution', resolution: 1 },
      }),
    )
    expect(state.campaignLog!.investigators[id]!.insane).toBe(true)
    expect(state.campaignLog!.notes).toContain('carcosaKingClaimedItsVictims')
    expect(state.campaignLog!.notes).not.toContain('carcosaHeededDanielsWarning')
  })

  it('R2: each investigator suffers 1 physical trauma', () => {
    const { state: ended } = finish(afterEchoes(1), 2)
    const state = readAll(ended)
    const record = Object.values(state.campaignLog!.investigators)[0]!
    expect(record.physicalTrauma).toBe(1)
    expect(state.campaignLog!.notes).toContain('carcosaAttackedEscapingTheAsylum')
  })

  it('R1: if the clasp bearer is driven insane, another investigator takes the clasp', () => {
    const campaign = afterEchoes(2, ['carcosaTookTheOnyxClasp'])
    const [first, bearer] = campaign.investigators.map((i) => i.id)
    let state = readAll(startScenario(campaign, 5))
    state = readAll(during(state, (s) => s, { type: 'DefeatInvestigator', investigator: bearer! }))
    state = readAll(
      during(state, (s) => s, {
        type: 'EndScenario',
        outcome: { type: 'resolution', resolution: 1 },
      }),
    )
    const next = finishScenario(campaign, state)
    expect(next.log.investigators[bearer!]!.insane).toBe(true)
    expect(next.log.investigators[first!]!.storyAssets).toContain(CLASP_OF_BLACK_ONYX)
  })
})
