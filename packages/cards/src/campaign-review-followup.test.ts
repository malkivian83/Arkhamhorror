import {
  createGame,
  enemyBehavior,
  locationBehavior,
  scenarioBehavior,
  treacheryBehavior,
  type Enemy,
  type GameState,
  type Message,
  type Treachery,
} from '@lcg/engine'
import { during, ghoul, keep, testInvestigator, testScenario } from '@lcg/engine/testing'
import { handle } from '../../engine/src/handlers'
import { describe, expect, it } from 'vitest'
import './index'
import { CODES as EX, EXCELSIOR } from './excelsior/cards'
import { B } from './the-dunwich-legacy/altar-codes'
import { PART_TWO_CODES } from './fortune-and-folly/cards'
import { nearestExtradimensional } from './fortune-and-folly/encounter-two'

// Printed cards 84009/22/29/32/36, 02329/30, 03338, 02209, 88050/51 and
// 71056/58/59. RR: Doom, Search, Ownership and Control, Cannot, Costs, Nearest/Farthest.
const table = () =>
  createGame({
    seed: 7,
    scenario: testScenario(),
    investigators: [testInvestigator('a', { deck: Array(20).fill('12089') })],
  })
const enemy = (code: string, id = code, location = 'A'): Enemy => ({
  ...ghoul,
  code,
  id,
  name: id,
  location,
  damageTaken: 0,
  maxHealth: ghoul.health,
  exhausted: false,
  engagedWith: null,
})
const treachery = (code: string): Treachery => ({
  kind: 'treachery',
  code,
  id: code,
  name: code,
  keywords: [],
  placement: { type: 'limbo' },
})
const specific = (key: string, data = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data: { investigator: 'a', ...data },
})
const put = (code: string): Message => ({ type: 'PutAssetIntoPlay', investigator: 'a', code })
const branch = (s: GameState): GameState => ({
  ...s,
  locations: {
    ...s.locations,
    A: { ...s.locations.A!, connections: ['B', 'C'] },
    C: { ...s.locations.C!, connections: ['A'] },
  },
})
const ask = (messages: Message[]) => {
  const result = messages.find((m) => m.type === 'Ask')
  if (result?.type !== 'Ask') throw new Error('Expected a choice')
  return result
}

describe('Doom waits for the mythos threshold check', () => {
  it('Manager feast and Encephalon Signal also wait for the mythos check', () => {
    const s = { ...table(), doom: 2, queue: [] }
    const manager = enemy(EX.hotelManager, 'manager')
    const meddler = enemy(EX.otherworldlyMeddler, 'meddler')
    s.enemies = { manager, meddler, guest: { ...enemy(EX.hotelGuest, 'guest'), traits: ['Guest'] } }
    const feast = scenarioBehavior(EXCELSIOR)!.specific!(s, 'feast', { enemy: manager.id })
    const afterFeast = during(s, keep, ...feast.queue)
    expect(afterFeast.enemies.manager!.doom).toBe(2)
    expect(afterFeast.enemies.guest).toBeUndefined()
    expect(afterFeast.agendaIndex).toBe(0)
    const signal = treacheryBehavior(EX.encephalonSignal)!.revelation(
      s,
      'a',
      treachery(EX.encephalonSignal),
    )
    const afterSignal = during(s, keep, ...signal)
    expect(afterSignal.enemies.meddler!.doom).toBe(1)
    expect(afterSignal.agendaIndex).toBe(0)
  })
  it.each([
    [EX.arkhamOfficer, { type: 'enemyPhaseEnds' }],
    [EX.hotelGuest, { type: 'enemyPhaseEnds' }],
    [EX.otherworldlyMeddler, { type: 'investigatorDefeated', investigator: 'a' }],
    ['02329', { type: 'enemyWouldEnterLocation', enemy: 'e', location: 'A' }],
    ['02330', { type: 'whenEnemyAttacks', enemy: 'e', investigator: 'a' }],
  ] as const)('%s adds doom without advancing immediately', (code, trigger) => {
    let s = table()
    const e = enemy(code, 'e')
    s = {
      ...s,
      doom: 2,
      enemies: { e },
      locations: { ...s.locations, A: { ...s.locations.A!, clues: 1 } },
      investigators: s.investigators.map((i) => ({ ...i, discard: Array(11).fill('12089') })),
    }
    // Hotel crime scenes are location codes, not the printed trait.
    if (code === EX.hotelGuest) {
      e.location = EX.room225
      s.locations[EX.room225] = { ...s.locations.A!, id: EX.room225 }
    }
    const effects = enemyBehavior(code)!.forced!(s, trigger, e)
    expect(effects.some((m) => m.type === 'PlaceDoomOnEnemy')).toBe(true)
    s = during(s, keep, ...effects)
    expect(s.enemies.e!.doom).toBeGreaterThan(0)
    expect(s.agendaIndex).toBe(0)
    s = during(s, keep, { type: 'CheckAgenda' })
    expect(s.agendaIndex).toBe(1)
  })
  it('Enclave symbol adds doom without an immediate check', () => {
    const s = { ...table(), doom: 2, queue: [] }
    const result = scenarioBehavior(EXCELSIOR)!.specific!(s, 'enclaveTokenRevealed', {
      investigator: 'a',
      token: 'skull',
    })
    expect(result.queue.some((m) => m.type === 'PlaceDoom')).toBe(true)
    const resolved = during(s, keep, ...result.queue)
    expect(resolved.doom).toBe(3)
    expect(resolved.agendaIndex).toBe(0)
  })
})

describe('Discard restrictions and costs', () => {
  it.each(['12095', '05019'])('Realm of Madness cannot loop on immovable asset %s', (code) => {
    let s = during(table(), keep, put(code))
    s = during(
      s,
      (g) => ({
        ...g,
        scenarioId: 'dim-carcosa',
        investigators: g.investigators.map((i) => ({ ...i, hand: [], horror: 3 })),
      }),
      specific('dimRealm', { remaining: 3, discarded: false }),
    )
    expect(Object.values(s.assets).some((a) => a.code === code)).toBe(true)
    expect(s.investigators[0]!.horror).toBe(5)
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it('Church resources require a discardable hand card', () => {
    const s = table(),
      location = { ...s.locations.A!, code: B.churchResources }
    const options = (hand: string[]) =>
      locationBehavior(B.churchResources)!.abilities!(
        { ...s, investigators: s.investigators.map((i) => ({ ...i, hand })) },
        location,
        'a',
      )
    expect(options(['12137']).some((a) => a.key === 'altar:resources')).toBe(false)
    expect(options(['12137', '12089']).some((a) => a.key === 'altar:resources')).toBe(true)
  })
  it('Cold cannot be paid with a weakness or permanent; ordinary cards remain choices', () => {
    let s = during(table(), keep, put('12095'))
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, hand: ['12137'] })) }
    const choices = (g: GameState) =>
      ask(
        scenarioBehavior('the-midwinter-gala')!.specific!({ ...g, queue: [] }, 'coldChoice', {
          investigator: 'a',
        }).queue,
      ).question.choices
    expect(choices(s).map((c) => c.label)).toEqual(['choice.takeDamage'])
    s = { ...s, investigators: s.investigators.map((i) => ({ ...i, hand: ['12089'] })) }
    expect(choices(s).map((c) => c.label)).toContain('choice.gala.discardFromHand')
  })
})

describe('Fortune and Folly preserves tied enemy choices', () => {
  it('Hypnosis determines the nearest enemies after the failed test, including a saved continuation', () => {
    const s = branch(table())
    const hypnosis = {
      ...treachery(PART_TWO_CODES.hypnosis[0]),
      placement: { type: 'location' as const, location: 'A' },
    }
    s.treacheries = { [hypnosis.id]: hypnosis }
    const behavior = scenarioBehavior('fortune-and-folly-part-2')!
    const effects = behavior.beforeMove!(s, { type: 'MoveTo', investigator: 'a', location: 'B' })!
    const test = effects[0]!
    if (test.type !== 'BeginSkillTest' || test.kind.type !== 'effect')
      throw new Error('Expected effect test')
    // Enemies entering play during the test must be included when its failure resolves.
    s.enemies = {
      left: { ...enemy('test', 'left', 'B'), traits: ['Extradimensional'] },
      right: { ...enemy('test', 'right', 'C'), traits: ['Extradimensional'] },
    }
    const continuation = JSON.parse(JSON.stringify(test.kind.onFail)) as Message[]
    const failed = during(
      s,
      (g) => ({ ...g, scenarioId: 'fortune-and-folly-part-2' }),
      ...continuation,
    )
    expect(failed.pending?.question.choices).toHaveLength(2)
    expect(failed.investigators[0]!.location).toBe('A')
  })
  it.each(['left', 'right'])('Hypnosis permits selecting the %s tied enemy', (target) => {
    const s = branch(table())
    s.enemies = Object.fromEntries(
      ['left', 'right'].map((id, n) => [
        id,
        {
          ...enemy('test', id, n ? 'C' : 'B'),
          traits: ['Extradimensional'],
        },
      ]),
    )
    const prompt = ask(nearestExtradimensional(s, 'a'))
    expect(prompt.investigator).toBe('a')
    expect(prompt.question.choices).toHaveLength(2)
    const chosen = prompt.question.choices.find(
      (c) => c.target?.type === 'enemy' && c.target.id === target,
    )!
    const result = during(s, keep, ...chosen.then)
    expect(result.enemies[target]!.location).toBe('A')
    expect(result.enemies[target === 'left' ? 'right' : 'left']!.location).not.toBe('A')
  })
  it.each(['first', 'second'])(
    'Displacer can discard the %s Casino at a shared location',
    (target) => {
      const s = table(),
        self = enemy(PART_TWO_CODES.displacers[0], 'displacer')
      s.enemies = {
        displacer: self,
        ...Object.fromEntries(
          ['first', 'second'].map((id) => [
            id,
            {
              ...enemy('88035a', id),
              traits: ['Casino'],
            },
          ]),
        ),
      }
      const effects = enemyBehavior(self.code)!.forced!(
        s,
        { type: 'enemySpawned', enemy: self.id, location: 'A' },
        self,
      )
      const prompt = ask(effects)
      expect(prompt.question.choices).toHaveLength(2)
      const choice = prompt.question.choices.find(
        (c) => c.target?.type === 'enemy' && c.target.id === target,
      )!
      const result = during(s, keep, ...choice.then)
      expect(result.enemies[target]).toBeUndefined()
      expect(result.enemies[target === 'first' ? 'second' : 'first']).toBeDefined()
    },
  )
})

describe('Excelsior searches both zones', () => {
  it('Staff search offers every matching enemy and shuffles even when no card matches', () => {
    const s = {
      ...table(),
      queue: [],
      encounterDeck: [
        { ...ghoul, code: 'one', traits: ['Staff'] },
        { ...ghoul, code: 'two', traits: ['Staff'] },
      ],
      encounterDiscard: [{ ...ghoul, code: 'three', traits: ['Staff'] }],
    }
    const result = handle(s, { type: 'SearchEncounterForTrait', investigator: 'a', trait: 'Staff' })
    expect(ask(result.queue).question.choices).toHaveLength(3)
    const noMatch = handle(s, {
      type: 'SearchEncounterForTrait',
      investigator: 'a',
      trait: 'Monster',
    })
    expect(noMatch.queue).toEqual([])
    expect(noMatch.encounterDeck).toHaveLength(2)
    expect(noMatch.encounterDiscard).toEqual(s.encounterDiscard)
    expect(noMatch.rng).not.toEqual(s.rng)
  })
  it.each(['deck', 'discard'] as const)('can draw the chosen copy from %s and shuffle', (zone) => {
    const s = {
      ...table(),
      queue: [],
      encounterDeck: [
        { ...ghoul, code: 'match', traits: ['Humanoid', 'Staff'] },
        { ...ghoul, code: 'other' },
        { ...ghoul, code: 'another' },
      ],
      encounterDiscard: [{ ...ghoul, code: 'match', traits: ['Humanoid', 'Staff'] }],
    }
    const choices = ask(
      handle(s, { type: 'SearchEncounterForTrait', investigator: 'a', trait: 'Humanoid' }).queue,
    ).question.choices
    expect(choices).toHaveLength(2)
    const choice = choices.find(
      (c) =>
        c.label ===
        (zone === 'deck' ? 'choice.zealot.searchDeckEnemy' : 'choice.zealot.searchDiscardEnemy'),
    )!
    const next = handle(s, choice.then[0]!)
    expect(next.encounterDeck).toHaveLength(zone === 'deck' ? 2 : 3)
    expect(next.encounterDiscard).toHaveLength(zone === 'discard' ? 0 : 1)
    expect(next.queue).toContainEqual(
      expect.objectContaining({
        type: 'ResolveEncounterCard',
        card: expect.objectContaining({ code: 'match' }),
      }),
    )
    expect(next.rng).not.toEqual(s.rng)
  })
})

describe('Gala movement and ownership', () => {
  it('Fumes requires moving after success while optional movement still allows skipping', () => {
    const s = table()
    const revelation = treacheryBehavior('71058')!.revelation(s, 'a', treachery('71058'))
    const test = ask(revelation).question.choices[0]!.then[0]!
    if (test.type !== 'BeginSkillTest' || test.kind.type !== 'effect')
      throw new Error('Expected effect test')
    const move = test.kind.onSuccess[0]!
    const options = ask(handle({ ...s, queue: [] }, move).queue).question.choices
    expect(options.map((c) => c.label)).not.toContain('choice.skip')
    const result = during(s, keep, ...options[0]!.then)
    expect(result.investigators[0]!.location).toBe('B')
    expect(
      ask(
        handle({ ...s, queue: [] }, { type: 'ChooseMove', investigator: 'a' }).queue,
      ).question.choices.map((c) => c.label),
    ).toContain('choice.skip')
  })
  it('Pushed cannot select or remove Baron Samedi below three doom', () => {
    const s = during(table(), keep, put('05019'))
    expect(treacheryBehavior('71059')!.revelation(s, 'a', treachery('71059'))).toEqual([])
    const asset = Object.values(s.assets)[0]!
    const next = scenarioBehavior('the-midwinter-gala')!.specific!(s, 'pushed', {
      investigator: 'a',
      asset: asset.id,
    })
    expect(next.assets[asset.id]).toEqual(asset)
  })
  it('Pushed shuffles and mills the original owner’s deck; horror belongs to the drawing investigator', () => {
    let s = during(table(), keep, put('01016'))
    const asset = Object.values(s.assets)[0]!
    s = during(
      s,
      (g) => ({
        ...g,
        scenarioId: 'the-midwinter-gala',
        assets: { [asset.id]: { ...asset, originalOwner: 'b' } },
        investigators: [
          ...g.investigators,
          { ...g.investigators[0]!, id: 'b', deck: ['12089', '12089'], hand: [], discard: [] },
        ],
      }),
      specific('pushed', { asset: asset.id }),
    )
    expect(s.assets[asset.id]).toBeUndefined()
    expect(s.investigators[1]!.discard).toEqual(expect.arrayContaining(['01016', '12089', '12089']))
    expect(s.investigators[1]!.deck).toEqual([])
    expect(s.investigators[0]!.horror).toBe(2)
    expect(s.investigators[1]!.horror).toBe(0)
  })
})
