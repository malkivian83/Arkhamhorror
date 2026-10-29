import {
  applyInput,
  availableAbilities,
  createGame,
  emptyCampaignLog,
  treacheryBehavior,
  type GameState,
  type Message,
  type ScenarioDefinition,
} from '@lcg/engine'
import { choose, during, keep, testInvestigator, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import './index'
import {
  spreadingFlames,
  CODES as SF,
  DR_ARMITAGE,
  cantorOfFlame,
} from './brethren-of-ash/spreading-flames'
import { queenOfAsh, CODES as QA } from './brethren-of-ash/queen-of-ash'
import { theGathering, fleshEater } from './night-of-the-zealot/the-gathering'
import { theMidnightMasks, classicEnemies } from './night-of-the-zealot/the-midnight-masks'
import { theDevourerBelow } from './night-of-the-zealot/the-devourer-below'

const context = {
  difficulty: 'standard' as const,
  seed: 7,
  investigators: ['0'],
  log: emptyCampaignLog(['0']),
}
const make = (scenario: ScenarioDefinition) =>
  throughSetup(
    createGame({
      seed: 7,
      interactive: true,
      scenario,
      investigators: [testInvestigator('0')],
      campaignLog: context.log,
    }),
  )
const encounter = (code: string): Message => ({
  type: 'ResolveEncounterCard',
  investigator: '0',
  card: { kind: 'treachery', code, name: code, traits: [], keywords: [] },
})
function finishTest(s: GameState): GameState {
  for (let n = 0; n < 30 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const choices = s.pending.question.choices
    const skip = choices.findIndex((c) => c.label === 'choice.skip' || c.label === 'choice.done')
    s = applyInput(s, { investigator: s.pending.investigator, choice: Math.max(0, skip) })
  }
  return s
}
function branches(s: GameState): GameState {
  const room = Object.values(s.locations)[0]!
  return {
    ...s,
    locations: {
      A: { ...room, id: 'A', name: 'A', connections: ['B', 'C'], clues: 0 },
      B: { ...room, id: 'B', name: 'B', connections: ['A'], clues: 0 },
      C: { ...room, id: 'C', name: 'C', connections: ['A'], clues: 0 },
    },
    investigators: s.investigators.map((i) => ({ ...i, location: 'A' })),
  }
}

describe('Brethren rules review: printed encounter effects and RR Nearest/Farthest', () => {
  it('Fire! leaves the investigator direct damage even with Armitage available', () => {
    let s = during(
      make(spreadingFlames()),
      keep,
      { type: 'PutAssetIntoPlay', investigator: '0', code: DR_ARMITAGE, noSlot: true },
      {
        type: 'PlaceSetAsideTreachery',
        code: SF.fire,
        placement: { type: 'location', location: SF.yourFriendsRoom },
      },
    )
    s = during(s, keep, { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } })
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
    expect(s.investigators[0]!.damage).toBe(1)
    expect(Object.values(s.assets)[0]!.damage).toBe(1)
  })
  it('Cosmic Evils deals direct damage and horror instead of opening assignment', () => {
    const s = make(spreadingFlames())
    const effects = treacheryBehavior(SF.cosmicEvils)!.revelation(s, '0', {
      id: 't',
      code: SF.cosmicEvils,
      kind: 'treachery',
      name: 'Cosmic Evils',
      keywords: [],
      placement: { type: 'limbo' },
    })
    const ask = effects[0]
    expect(ask?.type).toBe('Ask')
    if (ask?.type !== 'Ask') throw new Error('Missing choice')
    expect(ask.question.choices[1]!.then[0]).toMatchObject({
      type: 'TakeDamage',
      direct: true,
      damage: 1,
      horror: 1,
    })
  })
  it('Fire! lets the resolving investigator choose between equally near locations', () => {
    let s = during(make(spreadingFlames()), branches, {
      type: 'PlaceSetAsideTreachery',
      code: SF.fire,
      placement: { type: 'location', location: 'A' },
    })
    s = during(s, keep, encounter(SF.fire))
    expect(s.pending?.question.choices.map((c) => c.target)).toEqual([
      { type: 'location', id: 'B' },
      { type: 'location', id: 'C' },
    ])
    s = choose(s, 'choice.location', { location: 'C' })
    expect(
      Object.values(s.treacheries).some(
        (t) =>
          t.code === SF.fire && t.placement.type === 'location' && t.placement.location === 'C',
      ),
    ).toBe(true)
  })
  it.each(['same location', 'different locations'])(
    'Raising Suspicions offers every nearest enemy: %s',
    (placement) => {
      let s = during(
        make(spreadingFlames()),
        branches,
        { type: 'SpawnEnemy', card: classicEnemies['01137']!, location: 'B', engageWith: null },
        {
          type: 'SpawnEnemy',
          card: classicEnemies['01138']!,
          location: placement === 'same location' ? 'B' : 'C',
          engageWith: null,
        },
      )
      s = during(s, keep, encounter('12160'))
      expect(s.pending?.question.choices).toHaveLength(2)
      s = applyInput(s, { investigator: '0', choice: 1 })
      expect(Object.values(s.enemies).map((e) => e.doom ?? 0)).toEqual([0, 1])
    },
  )
  it('Dark Magician offers tied enemies from its own location, including after save/load', () => {
    let s = during(
      make(queenOfAsh()),
      branches,
      {
        type: 'SpawnEnemy',
        card: {
          kind: 'enemy',
          code: QA.darkMagician,
          name: 'Dark Magician',
          fight: 4,
          health: 4,
          evade: 2,
          damage: 1,
          horror: 1,
          keywords: [],
          traits: ['Cultist'],
        },
        location: 'A',
        engageWith: null,
      },
      { type: 'SpawnEnemy', card: classicEnemies['01137']!, location: 'B', engageWith: null },
      { type: 'SpawnEnemy', card: classicEnemies['01138']!, location: 'C', engageWith: null },
    )
    // The magician already has doom, so both other enemies are equally nearest.
    const magician = Object.values(s.enemies).find((e) => e.code === QA.darkMagician)!
    s = during(
      s,
      (g) => ({ ...g, enemies: { ...g.enemies, [magician.id]: { ...magician, doom: 1 } } }),
      { type: 'Forced', trigger: { type: 'roundEnds' } },
    )
    expect(s.pending?.question.choices).toHaveLength(2)
    const input = { investigator: s.pending!.investigator, choice: 1 }
    expect(applyInput(JSON.parse(JSON.stringify(s)), input)).toEqual(applyInput(s, input))
  })
  it('Blasphemous Invocation never puts a second doom on the same Cultist', () => {
    let s = during(make(queenOfAsh()), (g) => ({ ...g, chaosBag: [-8] }), {
      type: 'SpawnEnemy',
      card: { ...classicEnemies['01137']!, traits: ['Cultist'] },
      location: QA.sewerCulvert,
      engageWith: null,
    })
    s = finishTest(during(s, keep, encounter(QA.blasphemousInvocation)))
    expect(Object.values(s.enemies).map((e) => e.doom ?? 0)).toEqual([1])
  })
  it('Blasphemous Invocation distributes failure points between still-doomless Cultists', () => {
    let s = during(
      make(queenOfAsh()),
      (g) => ({ ...g, chaosBag: [-8] }),
      ...['01137', '01138'].map((code) => ({
        type: 'SpawnEnemy' as const,
        card: { ...classicEnemies[code]!, traits: ['Cultist'] },
        location: QA.sewerCulvert,
        engageWith: null,
      })),
    )
    s = finishTest(during(s, keep, encounter(QA.blasphemousInvocation)))
    expect(Object.values(s.enemies).map((e) => e.doom ?? 0)).toEqual([1, 1])
  })
  it('Blasphemous Invocation searches only if no doom can be placed, without adding doom to the drawn Cultist', () => {
    let s = during(make(queenOfAsh()), (g) => ({
      ...g,
      chaosBag: [-8],
      encounterDeck: [cantorOfFlame],
      encounterDiscard: [],
    }))
    s = finishTest(during(s, keep, encounter(QA.blasphemousInvocation)))
    expect(Object.values(s.enemies).map((e) => ({ code: e.code, doom: e.doom ?? 0 }))).toEqual([
      { code: SF.cantorOfFlame, doom: 0 },
    ])
    expect(s.encounterDeck).toHaveLength(0)
  })
  it('Putrid Vapors cannot discard Armitage, while an ordinary asset can be discarded', () => {
    let s = during(
      make(queenOfAsh()),
      (g) => ({ ...g, chaosBag: [-8] }),
      { type: 'PutAssetIntoPlay', investigator: '0', code: DR_ARMITAGE, noSlot: true },
      { type: 'PutAssetIntoPlay', investigator: '0', code: '12019' },
    )
    const armitage = Object.values(s.assets).find((a) => a.code === DR_ARMITAGE)!.id
    s = finishTest(during(s, keep, encounter(QA.putridVapors)))
    expect(s.assets[armitage]).toBeDefined()
    expect(Object.values(s.assets).some((a) => a.code === '12019')).toBe(false)
  })
})

describe('Night of the Zealot rules review: RR Weakness and Search', () => {
  const hand = ['12019', '12019', '12019', '12137']
  it('Herman requires four cards that can legally be discarded as a cost', () => {
    const s = during(
      make(theMidnightMasks(context)),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand })) }),
      { type: 'SpawnEnemy', card: classicEnemies['01138']!, location: '01124', engageWith: '0' },
    )
    expect(availableAbilities(s, '0').some((a) => a.key.endsWith(':parley'))).toBe(false)
  })
  it('chosen discards never offer a weakness and still discard ordinary cards', () => {
    let s = during(
      make(theMidnightMasks(context)),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand })) }),
      { type: 'ChooseDiscardFromHand', investigator: '0', amount: 4 },
    )
    s = finishTest(s)
    expect(s.investigators[0]!.hand).toEqual(['12137'])
    expect(s.investigators[0]!.discard).toEqual(['12019', '12019', '12019'])
  })
  it('random discards can still discard weaknesses, as required by RR Weakness', () => {
    const s = during(
      make(theMidnightMasks(context)),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand: ['12137'] })) }),
      { type: 'DiscardRandomFromHand', investigator: '0', amount: 1 },
    )
    expect(s.investigators[0]!.hand).toEqual([])
    expect(s.investigators[0]!.discard).toContain('12137')
  })
  it('Wrath cannot discard a weakness to avoid damage and horror', () => {
    const s = during(
      make(theDevourerBelow(context)),
      (g) => ({ ...g, investigators: g.investigators.map((i) => ({ ...i, hand: ['12137'] })) }),
      { type: 'ScenarioSpecific', key: 'devourerWrath', data: { investigator: '0' } },
    )
    expect(s.investigators[0]).toMatchObject({ hand: ['12137'], damage: 1, horror: 1 })
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
  it.each(['deck', 'discard'])(
    'Gathering searches the selected %s when both have the same Ghoul',
    (zone) => {
      let s = during(
        make(theGathering()),
        (g) => ({
          ...g,
          encounterDeck: [fleshEater],
          encounterDiscard: [fleshEater],
        }),
        { type: 'PutLocationIntoPlay', location: '01113' },
      )
      s = during(s, keep, {
        type: 'ScenarioSpecific',
        key: 'searchGhoul',
        data: { investigator: '0' },
      })
      expect(s.pending?.question.choices).toHaveLength(2)
      s = choose(
        s,
        zone === 'deck' ? 'choice.zealot.searchDeckEnemy' : 'choice.zealot.searchDiscardEnemy',
      )
      expect(s.encounterDeck.filter((c) => c.code === fleshEater.code)).toHaveLength(
        zone === 'deck' ? 0 : 1,
      )
      expect(s.encounterDiscard.filter((c) => c.code === fleshEater.code)).toHaveLength(
        zone === 'discard' ? 0 : 1,
      )
    },
  )
})
