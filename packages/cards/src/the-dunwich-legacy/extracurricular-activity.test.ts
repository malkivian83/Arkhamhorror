import {
  applyInput,
  actBehavior,
  availableAbilities,
  availableActions,
  createGame,
  emptyCampaignLog,
  enemyMaxHealth,
  getInvestigator,
  scenarioBehavior,
  skillTestValue,
  type Difficulty,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, keep, spawnAt, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import {
  extracurricularActivity,
  EA,
  DUNWICH_NOTES as N,
  experiment,
  EXTRACURRICULAR_ACTIVITY,
} from './extracurricular-activity'
import { DUNWICH_ENCOUNTER_SETS, DUNWICH_SETS as S } from './encounter-sets'
import { finishScenario, newCampaign, startScenario, currentScenario } from '../campaign'
import { playRandomlyToEnd } from '../scenario-testing'

const change =
  (id: string, patch: Partial<GameState['investigators'][number]>) =>
  (s: GameState): GameState => ({
    ...s,
    investigators: s.investigators.map((i) => (i.id === id ? { ...i, ...patch } : i)),
  })
function game(players = 1, difficulty: Difficulty = 'standard', second = false, blank = false) {
  const ids = ['a', 'b', 'c', 'd'].slice(0, players)
  const log = emptyCampaignLog(ids)
  if (second) log.values.openingScenario = 'the-house-always-wins'
  const scenario = extracurricularActivity({ difficulty, log })
  let s = throughSetup(
    createGame({
      seed: 11,
      interactive: true,
      difficulty,
      campaignLog: log,
      scenario: { ...scenario, chaosBag: [0], ...(blank ? { encounterDeck: [] } : {}) },
      investigators: ids.map((id) => testInvestigator(id, { health: 30, sanity: 30 })),
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = choose(s, 'choice.investigator')
  return s
}
function stories(s: GameState) {
  while (s.pending?.question.prompt === 'prompt.story')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return s
}
const ability = (s: GameState, key: string, investigator = 'a') => {
  const found = availableAbilities(s, investigator).find((a) => a.key.endsWith(key))
  if (!found) throw new Error(`Missing ability ${key}`)
  return found
}
const test = (s: GameState) => choose(choose(s, 'choice.revealToken'), 'choice.applyResults')
const drawn = (code: string, investigator = 'a'): Message => ({
  type: 'ResolveEncounterCard',
  investigator,
  card: {
    ...Object.values(DUNWICH_ENCOUNTER_SETS)
      .flat()
      .find((c) => c.code === code)!,
  },
})
const reveal = (location: string): Message[] => [
  { type: 'PutLocationIntoPlay', location },
  { type: 'RevealLocation', location },
]
const monster = (s: GameState) => Object.values(s.enemies).find((e) => e.code === EA.experiment)!

// Revised guide pp. 4–5; scenario and encounter card texts 02041–02061.
describe('Extracurricular Activity', () => {
  it.each([1, 2, 3, 4])(
    'sets up all eight sets and the six initial locations for %i players',
    (players) => {
      const s = game(players)
      expect(s.encounterDeck).toHaveLength(32)
      expect(Object.keys(s.locations)).toHaveLength(6)
      expect(s.locations[EA.science]).toBeDefined()
      expect(s.setAside.map((c) => c.code).sort()).toEqual([EA.experiment, EA.jazz])
      expect(s.setAsideLocations[EA.facultyEarly]).toBeDefined()
      expect(s.setAsideLocations[EA.facultyLate]).toBeUndefined()
      expect(s.investigators.every((i) => i.location === EA.quad)).toBe(true)
      const revealed = during(s, keep, { type: 'RevealLocation', location: EA.union })
      expect(revealed.locations[EA.union]?.clues).toBe(2)
    },
  )

  it('puts the late offices aside only when Rice is investigated second', () => {
    expect(game(1, 'standard', true).setAsideLocations[EA.facultyLate]).toBeDefined()
    expect(game(1, 'standard', true).setAsideLocations[EA.facultyEarly]).toBeUndefined()
  })

  it('the first act shuffles Jazz and the discard into the encounter deck after paying group clues', () => {
    let s = game()
    s = during(
      s,
      (s) => ({
        ...change('a', { clues: 3 })(s),
        encounterDiscard: [s.encounterDeck[0]!],
        encounterDeck: s.encounterDeck.slice(1),
      }),
      { type: 'AdvanceAct' },
    )
    expect(s.actIndex).toBe(1)
    expect(s.encounterDeck).toHaveLength(33)
    expect(s.encounterDeck.filter((c) => c.code === EA.jazz)).toHaveLength(1)
    expect(s.encounterDiscard).toEqual([])
    expect(getInvestigator(s, 'a').clues).toBe(0)
  })

  it.each([1, 2])(
    'finds discarded Jazz in act 2 with the correct search length (%i players)',
    (players) => {
      let s = during(game(players), (s) => ({
        ...change('a', { clues: 2 })(s),
        actIndex: 1,
        encounterDeck: [
          { kind: 'treachery', code: EA.jazz, name: '"Jazz" Mulligan', keywords: [] },
          ...s.encounterDeck,
        ],
      }))
      const search = ability(s, 'rice:search')
      expect(search.then).toHaveLength(players === 1 ? 10 : 5)
      s = during(s, keep, ...(search.costs ?? []), ...search.then)
      expect(Object.values(s.placedAssets ?? {}).filter((a) => a.code === EA.jazz)).toHaveLength(1)
      expect(s.encounterDiscard.some((c) => c.code === EA.jazz)).toBe(false)
      expect(s.encounterDeck.some((c) => c.code === EA.jazz)).toBe(false)
      s = test(during(s, keep, ...ability(s, ':parley').then))
      expect(s.actIndex).toBe(2)
      expect(Object.values(s.assets).some((a) => a.code === EA.jazz)).toBe(true)
      expect(monster(s).location).toBe(EA.labs)
      expect(enemyMaxHealth(s, monster(s))).toBe(7 + 3 * players)
    },
  )

  it('locked rooms require Jazz until revealed; losing him after revealing leaves the room accessible', () => {
    let s = during(game(), keep, ...reveal(EA.union), {
      type: 'MoveTo',
      investigator: 'a',
      location: EA.union,
    })
    expect(availableActions(s, 'a').some((a) => a.kind === 'move' && a.to === EA.dormitories)).toBe(
      false,
    )
    s = during(
      s,
      keep,
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.jazz },
      { type: 'MoveTo', investigator: 'a', location: EA.dormitories },
    )
    expect(getInvestigator(s, 'a').location).toBe(EA.dormitories)
    expect(s.locations[EA.dormitories]?.clues).toBe(3)
    const jazz = Object.values(s.assets).find((a) => a.code === EA.jazz)!
    s = during(
      s,
      keep,
      { type: 'RemoveAssetFromGame', asset: jazz.id },
      { type: 'MoveTo', investigator: 'a', location: EA.union },
      { type: 'MoveTo', investigator: 'a', location: EA.dormitories },
    )
    expect(getInvestigator(s, 'a').location).toBe(EA.dormitories)
  })

  it('an off-turn investigator finds Jazz at their own location, not the active investigator’s', () => {
    let s = during(game(2), (s) => ({
      ...change('b', { location: EA.humanities, clues: 1 })(s),
      actIndex: 1,
      encounterDeck: [{ kind: 'treachery', code: EA.jazz, name: '"Jazz" Mulligan', keywords: [] }],
    }))
    const search = actBehavior(EA.ricesWhereabouts)!.abilities!(s, s.acts[1]!, 'b')[0]!
    s = during(s, keep, ...(search.costs ?? []), ...search.then)
    const jazz = Object.values(s.placedAssets ?? {}).find((a) => a.code === EA.jazz)
    expect(jazz?.placement).toEqual({ type: 'location', location: EA.humanities })
  })

  it('Humanities and Administration discard cards at the end of the relevant investigator turn', () => {
    let s = during(
      game(),
      change('a', { horror: 2, location: EA.humanities }),
      { type: 'RevealLocation', location: EA.humanities },
      { type: 'Forced', trigger: { type: 'turnEnds', investigator: 'a' } },
    )
    expect(getInvestigator(s, 'a').discard).toHaveLength(2)
    s = during(s, change('a', { location: EA.administration }), {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    expect(getInvestigator(s, 'a').discard).toHaveLength(3)
  })

  it('Student Union heals both damage and horror and Science punishes failed willpower tests', () => {
    let s = during(game(), change('a', { location: EA.union, damage: 2, horror: 3 }), {
      type: 'RevealLocation',
      location: EA.union,
    })
    expect(ability(s, 'union:heal').actions).toBe(2)
    s = during(s, keep, ...ability(s, 'union:heal').then)
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 1, horror: 2 })
    s = during(s, change('a', { location: EA.science }), drawn(S.visionsOfFuturesPast))
    s = test(s)
    expect(getInvestigator(s, 'a').damage).toBe(2)
  })

  it('Orne Library costs two actions to investigate and Rice reacts when the last clue is discovered', () => {
    let s = during(
      game(),
      change('a', { location: EA.library }),
      { type: 'RevealLocation', location: EA.library },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
    )
    const hand = getInvestigator(s, 'a').hand.length
    s = test(choose(s, 'action.investigate', { location: 'Orne Library' }))
    expect(getInvestigator(s, 'a').actionsRemaining).toBe(1)
    s = choose(s, 'ability.dunwich.riceDraw')
    expect(getInvestigator(s, 'a').hand).toHaveLength(hand + 1)
    expect(Object.values(s.assets).find((a) => a.code === EA.rice)?.exhausted).toBe(true)
  })

  it('revealing the early Faculty Offices searches both encounter piles for a Humanoid', () => {
    let s = during(game(), keep, ...reveal(EA.facultyEarly))
    s = choose(s, 'choice.enemy', { enemy: 'Thrall' })
    expect(
      Object.values(s.enemies).some((e) => e.code === S.thrall && e.location === EA.facultyEarly),
    ).toBe(true)
  })

  it.each([
    [EA.facultyEarly, 2, 1],
    [EA.dormitories, 3, 2],
  ] as const)(
    'objective %s requires its exact group clue cost from investigators at that location',
    (location, perPlayer, result) => {
      let s = during(
        game(2, 'standard', false, true),
        (s) => change('b', { clues: 1 })(change('a', { location, clues: perPlayer * 2 - 1 })(s)),
        ...reveal(location),
      )
      expect(availableAbilities(s, 'a').some((a) => a.key.endsWith(':objective'))).toBe(false)
      s = during(s, change('b', { location }))
      const objective = ability(s, ':objective')
      expect(objective.then[0]).toEqual({
        type: 'PayGroupClues',
        amount: perPlayer * 2,
        from: ['a', 'b'],
      })
      s = during(s, keep, ...objective.then)
      while (s.pending?.question.prompt === 'prompt.whoPaysClue')
        s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
      s = stories(s)
      expect(s.outcome).toEqual({ type: 'resolution', resolution: result })
    },
  )

  it('discarding controlled Jazz sends him to the encounter discard rather than the player deck', () => {
    let s = during(game(), (s) => ({ ...s, actIndex: 2 }), {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: EA.jazz,
    })
    const jazz = Object.values(s.assets).find((a) => a.code === EA.jazz)!
    s = during(s, keep, { type: 'DiscardAsset', asset: jazz.id })
    expect(s.assets[jazz.id]).toBeUndefined()
    expect(s.encounterDiscard.some((c) => c.code === EA.jazz)).toBe(true)
    expect(getInvestigator(s, 'a').discard).not.toContain(EA.jazz)
  })

  it('quiet halls uses discard thresholds; the late version skips the second agenda front', () => {
    let s = during(
      game(2),
      (s) =>
        change('b', { discard: Array(10).fill('x') })(
          change('a', { discard: Array(5).fill('x') })(s),
        ),
      { type: 'AdvanceAgenda' },
    )
    expect(s.investigators.map((i) => i.horror)).toEqual([1, 2])
    expect(s.agendaIndex).toBe(1)
    s = during(game(1, 'standard', true), keep, { type: 'AdvanceAgenda' })
    expect(s.agendaIndex).toBe(2)
    expect(monster(s).location).toBe(EA.science)
  })

  it('Dead of Night reduces hand size by three only during upkeep', () => {
    let s = during(
      game(),
      (s) => ({ ...change('a', { hand: ['1', '2', '3', '4', '5', '6'] })(s), agendaIndex: 1 }),
      { type: 'CheckHandSize', investigator: 'a' },
    )
    expect(getInvestigator(s, 'a').hand).toHaveLength(6)
    s = during(s, (s) => ({ ...s, phase: 'upkeep' }), { type: 'CheckHandSize', investigator: 'a' })
    s = choose(s, 'choice.discard')
    expect(getInvestigator(s, 'a').hand).toHaveLength(5)
  })

  it('agenda 3 repeatedly removes all doom and moves only the Experiment; its arrival resolves R4', () => {
    let s = during(game(), keep, { type: 'AdvanceAgenda' }, { type: 'AdvanceAgenda' })
    s = during(s, (s) => ({ ...s, doom: 2 }), { type: 'CheckAgenda' })
    expect(monster(s).location).toBe(EA.quad)
    expect(s.doom).toBe(0)
    s = during(s, (s) => ({ ...s, doom: 2 }), { type: 'CheckAgenda' })
    expect(monster(s).location).toBe(EA.union)
    s = during(s, (s) => ({ ...s, doom: 2 }), { type: 'CheckAgenda' })
    s = stories(s)
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 4 })
    expect(s.campaignLog?.notes).toContain(N.unconscious)
    expect(s.campaignLog?.chaosTokens).toContain('tablet')
    expect(getInvestigator(s, 'a').horror).toBe(3)
  })

  it('Experiment readies at the beginning of the enemy phase and its defeat resolves R3', () => {
    let s = during(game(), keep, spawnAt(EA.quad, experiment), {
      type: 'ExhaustEnemy',
      enemy: 'unused',
    })
    s = during(
      s,
      keep,
      { type: 'ExhaustEnemy', enemy: monster(s).id },
      { type: 'Forced', trigger: { type: 'enemyPhaseBegins' } },
    )
    expect(monster(s).exhausted).toBe(false)
    s = stories(during(s, keep, { type: 'DamageEnemy', enemy: monster(s).id, amount: 10, by: 'a' }))
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 3 })
    expect(s.campaignLog?.notes).toContain(N.experimentDefeated)
    expect(s.campaignLog?.investigators.a?.xp).toBe(2)
  })

  it.each([0, 1, 2, 3, 4])(
    'resolution %i records the correct consequences and victory experience',
    (n) => {
      const initial = game()
      let s = during(
        initial,
        (s) => ({
          ...s,
          locations: {
            ...s.locations,
            [EA.library]: { ...s.locations[EA.library]!, revealed: true, clues: 0 },
          },
        }),
        {
          type: 'EndScenario',
          outcome: n ? { type: 'resolution', resolution: n } : { type: 'noResolution' },
        },
      )
      s = stories(s)
      expect(s.campaignLog?.notes).toContain(n === 1 ? N.riceRescued : N.riceKidnapped)
      expect(s.campaignLog?.chaosTokens).toEqual(n === 0 || n === 1 || n === 4 ? ['tablet'] : [])
      expect(s.campaignLog?.investigators.a?.xp).toBe(n === 0 || n === 4 ? 2 : 1)
      if (n === 1) expect(s.campaignLog?.investigators.a?.storyAssets).toContain(EA.rice)
    },
  )

  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'resolves the exact %s reference symbols',
    (difficulty) => {
      const s = change('a', { discard: Array(10).fill('x'), deck: ['12043', '12115', '12043'] })(
        game(1, difficulty),
      )
      const token = scenarioBehavior(EXTRACURRICULAR_ACTIVITY)!.tokenEffect!
      const hard = difficulty === 'hard' || difficulty === 'expert'
      expect(token(s, 'cultist', 'a').modifier).toBe(hard ? -5 : -3)
      expect(token(s, 'skull', 'a')).toMatchObject({
        modifier: hard ? -2 : -1,
        onFail: [{ type: 'MillDeck', amount: hard ? 5 : 3 }],
      })
      expect(token(s, 'elderThing', 'a').immediate).toEqual([
        { type: 'MillDeck', investigator: 'a', amount: hard ? 3 : 2 },
      ])
    },
  )

  it('Rice gives intellect and the Concoction uses intellect, adds six damage against the Experiment, and leaves on success', () => {
    let s = during(
      game(),
      change('a', { location: EA.quad }),
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.rice },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: EA.concoction },
      spawnAt(EA.quad, experiment),
    )
    s = during(s, keep, ...availableAbilities(s, 'a').find((a) => a.key.includes(':fight:'))!.then)
    expect(s.skillTest?.skill).toBe('intellect')
    expect(skillTestValue(s).passive).toBe(1)
    s = test(s)
    expect(monster(s).damageTaken).toBe(7)
    expect(Object.values(s.assets).some((a) => a.code === EA.concoction)).toBe(false)
  })

  it('the late Alchemy investigation recovers the Concoction in place of clues', () => {
    let s = during(game(1, 'standard', true), (s) => ({ ...s, actIndex: 1, chaosBag: [2] }), {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: EA.jazz,
    })
    // The objective advances at the next player window.
    expect(s.actIndex).toBe(2)
    s = during(s, change('a', { location: EA.labs }), { type: 'RevealLocation', location: EA.labs })
    s = test(during(s, keep, ...ability(s, 'labs:investigate').then))
    expect(Object.values(s.assets).some((a) => a.code === EA.concoction)).toBe(true)
    expect(getInvestigator(s, 'a').clues).toBe(0)
  })

  it('a full legal action sequence rescues students without editing the state after setup', () => {
    let s = game(1, 'standard', false, true)
    const settle = (next: GameState): GameState => {
      for (
        let n = 0;
        next.pending &&
        !next.outcome &&
        next.pending.question.prompt !== 'prompt.chooseAction' &&
        n < 100;
        n++
      ) {
        const prompt = next.pending.question.prompt
        if (prompt === 'prompt.commit') throw new Error('unexpected commit')
        next = applyInput(next, { investigator: next.pending.investigator, choice: 0 })
      }
      return next
    }
    const act = (label: string, params: Record<string, string> = {}) => {
      s = settle(s)
      if (
        !s.pending?.question.choices.some(
          (c) => c.label === label && Object.entries(params).every(([k, v]) => c.params?.[k] === v),
        )
      )
        s = settle(choose(s, 'action.endTurn'))
      s = settle(choose(s, label, params))
    }
    act('action.move', { location: 'Humanities Building' })
    act('action.investigate', { location: 'Humanities Building' })
    act('action.investigate', { location: 'Humanities Building' })
    act('action.move', { location: 'Miskatonic Quad' })
    act('action.move', { location: 'Student Union' })
    act('action.investigate', { location: 'Student Union' })
    act('action.advanceAct')
    // Next mythos draws the only card, Jazz; parley to unlock the Dormitories.
    s = settle(choose(s, 'action.endTurn'))
    const parley = availableAbilities(s, 'a').find((a) => a.key.endsWith(':parley'))!
    expect(parley).toBeDefined()
    act('ability.dunwich.parleyJazz')
    act('action.move', { location: 'Dormitories' })
    for (let n = 0; n < 3; n++) act('action.investigate', { location: 'Dormitories' })
    act('ability.dunwich.rescue')
    expect(s.outcome).toEqual({ type: 'resolution', resolution: 2 })
    expect(s.campaignLog?.notes).toContain(N.studentsRescued)
  })

  it.each([1, 2, 3, 4])(
    'full encounter deck terminates with legal reproducible decisions for %i players',
    (players) => {
      const campaign = newCampaign(
        'the-dunwich-legacy',
        ['joe', 'trish', 'dexter', 'daniela'].slice(0, players),
        'standard',
      )
      const ended = playRandomlyToEnd(startScenario(campaign, 100 + players), 200 + players, 2500)
      const next = finishScenario(campaign, ended)
      expect(currentScenario(next)).toBe('the-house-always-wins')
      expect(next.results).toHaveLength(1)
    },
  )
})
