import {
  availableAbilities,
  availableActions,
  enemyBehavior,
  getInvestigator,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { finishScenario, startScenario } from '../campaign'
import '../index'
import { CLASP_OF_BLACK_ONYX } from './echoes-assets'
import {
  beastOfAldebaran,
  byakheeStat,
  screechingByakhee,
  SETS,
  spawnOfHali,
} from './encounter-sets'
import { DANIEL_ALLY } from './oath-assets'
import { afterEchoes } from './oath-playthrough.test'
import {
  atAct,
  draw,
  enemyOf,
  game,
  halls,
  placeAt,
  prep,
  readAll,
  resolveTest,
  reveal,
  spawn,
  treacheryOf,
  update,
  withBag,
  withHalls,
} from './oath-testing'
import { asylumGorger, CODES, danielEnemy, madPatient } from './the-unspeakable-oath'

const here = (state: GameState) => getInvestigator(state, 'a').location!
const fight = (state: GameState, enemy: string): Message => ({
  type: 'BeginSkillTest',
  investigator: 'a',
  skill: 'combat',
  difficulty: 1,
  kind: { type: 'fight', enemy },
})

describe('The Unspeakable Oath: Daniel Chesterfield', () => {
  it('assigning horror to another asset triggers Daniel once for the whole effect', () => {
    // 03182a: at least one horror not assigned to Daniel, including other assets.
    let state = prep(
      game(),
      [],
      { type: 'PutAssetIntoPlay', investigator: 'a', code: DANIEL_ALLY },
      { type: 'PutAssetIntoPlay', investigator: 'a', code: '12058' },
      { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 2 },
    )
    state = choose(state, 'choice.assignToAsset', { card: 'Cloak of Resonance' })
    state = choose(state, 'choice.assignToAsset', { card: 'Cloak of Resonance' })
    state = readAll(state)
    expect(getInvestigator(state, 'a').damage).toBe(1)
    expect(getInvestigator(state, 'a').horror).toBe(0)
  })

  it('assigning all horror to Daniel does not trigger his damage', () => {
    let state = prep(
      game(),
      [],
      { type: 'PutAssetIntoPlay', investigator: 'a', code: DANIEL_ALLY },
      { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 2 },
    )
    state = choose(state, 'choice.assignToAsset', { card: 'Daniel Chesterfield' })
    state = choose(state, 'choice.assignToAsset', { card: 'Daniel Chesterfield' })
    expect(getInvestigator(state, 'a').damage).toBe(0)
  })

  it('as an ally: horror not assigned to him deals 1 damage; he can be given away', () => {
    let state = prep(game(2), [], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: DANIEL_ALLY,
    })
    state = readAll(
      prep(state, [], {
        type: 'TakeDamage',
        investigator: 'a',
        damage: 0,
        horror: 1,
        direct: true,
      }),
    )
    expect(getInvestigator(state, 'a').damage).toBe(1)
    const give = availableAbilities(state, 'a').find((a) => a.label === 'ability.oath.giveDaniel')!
    state = readAll(choose(state, give.label, give.params))
    const daniel = Object.values(state.assets).find((a) => a.code === DANIEL_ALLY)!
    expect(daniel.owner).toBe('b')
    expect(daniel.exhausted).toBe(true)
  })

  it('as an ally, he is removed from the game if he leaves play', () => {
    let state = prep(game(), [], { type: 'PutAssetIntoPlay', investigator: 'a', code: DANIEL_ALLY })
    const daniel = Object.values(state.assets).find((a) => a.code === DANIEL_ALLY)!
    state = prep(state, [], { type: 'DiscardAsset', asset: daniel.id })
    expect(state.assets[daniel.id]).toBeUndefined()
    expect(getInvestigator(state, 'a').discard).not.toContain(DANIEL_ALLY)
  })

  it('as an enemy: parley with the Clasp of Black Onyx adds him to the victory display', () => {
    let state = prep(game(), [], spawn(danielEnemy, here(game())))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.oath.showClasp')).toBe(
      false,
    )
    state = prep(state, [], {
      type: 'PutAssetIntoPlay',
      investigator: 'a',
      code: CLASP_OF_BLACK_ONYX,
    })
    const show = availableAbilities(state, 'a').find((a) => a.label === 'ability.oath.showClasp')!
    state = readAll(choose(state, show.label, show.params))
    expect(enemyOf(state, CODES.danielEnemy)).toBeUndefined()
    expect(state.victoryDisplay).toContain(CODES.danielEnemy)
  })
})

describe('The Unspeakable Oath: enemies', () => {
  it('Mad Patient spawns at the nearest Asylum Halls; attacking it costs 1 horror', () => {
    let state = game()
    state = readAll(prep(state, [], draw({ ...madPatient })))
    const patient = enemyOf(state, CODES.madPatient)!
    expect(halls(state)).toContain(patient.location)
    state = prep(state, [withBag(0), placeAt(patient.location)], fight(state, patient.id))
    // 03184: "when you attack", before committing/revealing tokens, not after the test.
    expect(getInvestigator(state, 'a').horror).toBe(1)
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').horror).toBe(1)
  })

  it('Mad Patient: the horror is taken even when the attack defeats it', () => {
    let state = game()
    state = readAll(prep(state, [], draw({ ...madPatient })))
    const patient = enemyOf(state, CODES.madPatient)!
    state = prep(
      state,
      [
        withBag(0),
        placeAt(patient.location),
        (s) => ({
          ...s,
          enemies: { ...s.enemies, [patient.id]: { ...s.enemies[patient.id]!, damageTaken: 1 } },
        }),
      ],
      fight(state, patient.id),
    )
    state = readAll(resolveTest(state))
    expect(enemyOf(state, CODES.madPatient)).toBeUndefined()
    expect(getInvestigator(state, 'a').horror).toBe(1)
  })

  it('Asylum Gorger spawns in the Basement Hall and does not attack after hunting', () => {
    let state = readAll(prep(game(), [], draw({ ...asylumGorger })))
    const gorger = enemyOf(state, CODES.asylumGorger)!
    expect(gorger.location).toBe(CODES.basementHall)
    expect(enemyBehavior(CODES.asylumGorger)?.noAttackAfterHunting).toBe(true)
    state = prep(state, [(s) => ({ ...s, phase: 'enemy' })], { type: 'HuntersMove' } as Message)
    expect(state.enemies[gorger.id]!.huntedRound).toBe(state.round)
    const horror = getInvestigator(state, 'a').horror
    state = readAll(
      prep(state, [(s) => ({ ...s, phase: 'enemy' })], {
        type: 'EnemyAttack',
        enemy: gorger.id,
        investigator: 'a',
        exhaustAfter: false,
      }),
    )
    expect(getInvestigator(state, 'a').horror).toBe(horror)
  })

  it('Beast of Aldebaran assigns damage to a single card while it can take more', () => {
    let state = prep(game(), [], { type: 'PutAssetIntoPlay', investigator: 'a', code: DANIEL_ALLY })
    state = prep(state, [], spawn(beastOfAldebaran, here(state), 'a'))
    const beast = enemyOf(state, SETS.beastOfAldebaran)!
    state = prep(state, [], {
      type: 'AssignDamage',
      investigator: 'a',
      damage: 2,
      horror: 0,
      enemy: beast.id,
    })
    // Daniel solo aguanta 1 daño: tras elegir al investigador, todo va a él.
    state = choose(state, 'choice.assignToInvestigator', { name: 'A' })
    state = readAll(state)
    expect(getInvestigator(state, 'a').damage).toBe(2)
  })

  it('Spawn of Hali: 1 horror after evading it by 2 or less', () => {
    const state = game()
    const hali = { ...spawnOfHali, id: 'h', location: here(state) } as never
    const forced = enemyBehavior(SETS.spawnOfHali)!.forced!
    const trigger = (margin: number) =>
      ({
        type: 'afterSkillTest',
        investigator: 'a',
        kind: 'evade',
        succeeded: true,
        margin,
        enemy: 'h',
      }) as const
    expect(forced(state, trigger(2), hali)).toHaveLength(1)
    expect(forced(state, trigger(3), hali)).toHaveLength(0)
  })

  it('Screeching Byakhee: +1 fight and evade engaged with 4 or less remaining sanity', () => {
    const state = prep(game(), [update('a', { sanity: 7, horror: 3 })])
    const byakhee = { ...screechingByakhee, engagedWith: 'a' } as never
    expect(byakheeStat(state, byakhee)).toBe(1)
    expect(byakheeStat(prep(game(), [update('a', { sanity: 7, horror: 0 })]), byakhee)).toBe(0)
  })
})

describe('The Unspeakable Oath: locations and treacheries', () => {
  it('Gift of Madness (Misery): no [action] abilities on locations', () => {
    let state = prep(game(), [placeAt(CODES.infirmary)], ...reveal(CODES.infirmary))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.oath.healDamage')).toBe(
      true,
    )
    state = readAll(prep(state, [], draw(treacheryOf(CODES.giftOfMadnessMisery))))
    expect(availableAbilities(state, 'a').some((a) => a.label === 'ability.oath.healDamage')).toBe(
      false,
    )
  })

  it('Asylum Halls (03170): take 1 horror to automatically evade a Lunatic', () => {
    let state = prep(game(), [withHalls(CODES.easternWingA), placeAt(CODES.easternWingA)])
    state = readAll(prep(state, [], spawn(madPatient, CODES.easternWingA, 'a')))
    const evade = availableAbilities(state, 'a').find((a) => a.label === 'ability.oath.autoEvade')!
    state = readAll(choose(state, evade.label, evade.params))
    expect(getInvestigator(state, 'a').horror).toBe(1)
    expect(enemyOf(state, CODES.madPatient)!.engagedWith).toBeNull()
  })

  it('The Yellow Sign: on a failure, 2 horror and a Madness weakness is drawn', () => {
    let state = prep(game(), [withBag(-8), update('a', { deck: ['12097', '01016', '01017'] })])
    state = resolveTest(prep(state, [], draw(treacheryOf(SETS.theYellowSign))))
    state = readAll(state)
    expect(getInvestigator(state, 'a').horror).toBe(2)
    expect(getInvestigator(state, 'a').deck).not.toContain('12097')
  })

  it('Mess Hall: after investigating it successfully, discard a chosen card', () => {
    let state = prep(game(), [placeAt(CODES.messHall), withBag(0)], ...reveal(CODES.messHall))
    const hand = getInvestigator(state, 'a').hand.length
    state = prep(
      state,
      [update('a', { skills: { willpower: 3, intellect: 9, combat: 3, agility: 3 } })],
      {
        type: 'PerformAction',
        investigator: 'a',
        action: { kind: 'investigate' },
      } as Message,
    )
    state = readAll(resolveTest(state))
    expect(getInvestigator(state, 'a').hand.length).toBe(hand - 1)
  })
})

describe('The Unspeakable Oath: escaping through the Garden', () => {
  it('resigning in act 4 leads to R3 and Interlude II; Daniel survived grants 2 XP', () => {
    const campaign = afterEchoes(1)
    let state = readAll(startScenario(campaign, 5))
    state = during(state, (s) => atAct(3)(placeAt(CODES.garden)(s)), ...reveal(CODES.garden), {
      type: 'PutAssetIntoPlay',
      investigator: state.investigators[0]!.id,
      code: DANIEL_ALLY,
    })
    const id = state.investigators[0]!.id
    const resign = availableAbilities(state, id).find((a) => a.label === 'ability.resign')!
    state = choose(state, resign.label, resign.params)
    const seen: string[] = []
    for (let n = 0; n < 20 && !state.outcome; n++) {
      seen.push(state.pending!.question.prompt, ...labels(state))
      state = choose(
        state,
        labels(state).includes('story.oath.ignoreChoice')
          ? 'story.oath.ignoreChoice'
          : labels(state)[0]!,
      )
    }
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 3 })
    const next = finishScenario(campaign, state)
    expect(next.log.notes).toContain('carcosaEscapedTheAsylum')
    expect(next.log.notes).toContain('carcosaIgnoredDanielsWarning')
    // Daniel sobrevivió: 2 de experiencia adicional (la zona de victoria está vacía).
    expect(seen).toContain('prompt.story')
    expect(next.log.investigators[id]!.xp).toBe(2)
  })

  it('without resigning, His Domain defeats everyone (R1)', () => {
    const campaign = afterEchoes(1)
    let state = readAll(startScenario(campaign, 5))
    state = during(state, (s) => ({ ...s, agendaIndex: 2 }), { type: 'AdvanceAgenda' })
    for (let n = 0; n < 20 && !state.outcome; n++) state = choose(state, labels(state)[0]!)
    expect(state.outcome).toEqual({ type: 'resolution', resolution: 1 })
    expect(state.campaignLog!.notes).toContain('carcosaKingClaimedItsVictims')
  })

  it('available fight actions ignore Lunatics only with Gift of Madness (Pity)', () => {
    const state = prep(game(), [], spawn(madPatient, here(game()), 'a'))
    expect(availableActions(state, 'a').some((a) => a.kind === 'fight')).toBe(true)
  })
})
