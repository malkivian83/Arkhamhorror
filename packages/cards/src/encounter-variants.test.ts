import { describe, expect, it } from 'vitest'
import {
  enemyBehavior,
  treacheryBehavior,
  scenarioBehavior,
  type EncounterCard,
  type GameState,
} from '@lcg/engine'
import { choose, during, keep, throughSetup, withBag } from '@lcg/engine/testing'
import { campaignDefinition } from './campaign-definition'
import { newCampaign, startScenario, finishScenario, campaignScenarios } from './campaign'
import { CHAPTER_TWO_SUBSTITUTIONS, prepareEncounterVariant } from './encounter-variants'
import { CODES as S } from './brethren-of-ash/spreading-flames'
import { CODES as M } from './brethren-of-ash/smoke-and-mirrors'
import { CODES as Q } from './brethren-of-ash/queen-of-ash'
import { B } from './the-dunwich-legacy/altar-codes'

const ID = 'the-dunwich-legacy'
const campaign = (variant?: 'original' | 'chapter-two', opening?: string) =>
  newCampaign(ID, ['joe'], 'standard', 1, [], [], opening, variant)
const count = (cards: EncounterCard[], code: string) => cards.filter((c) => c.code === code).length
const card = (code: string) =>
  CHAPTER_TWO_SUBSTITUTIONS.flatMap((s) => s.replacement).find((c) => c.code === code)!
function game(index: number): GameState {
  return throughSetup(startScenario({ ...campaign('chapter-two'), scenarioIndex: index }, 7))
}

describe('Chapter Two encounter variant — Grimoire p. 46', () => {
  const expected = [
    { deck: { '12124': 3, '12157': 2, '12125': 2, '12126': 2 }, aside: {} },
    { deck: { '12123': 3 }, aside: { '12193': 2, '12194': 2, '12195': 2 } },
    { deck: { '12157': 2, '12158': 2, '12159': 2 }, aside: {} },
    {
      deck: { '12193': 2, '12194': 2, '12195': 2, '12124': 3, '12188': 3, '12189': 1, '12190': 2 },
      aside: {},
    },
    { deck: { '12124': 3, '12162': 2, '12163': 2 }, aside: {} },
    { deck: { '12193': 2, '12194': 2, '12195': 2 }, aside: {} },
    { deck: { '12193': 2, '12194': 2, '12195': 2, '12124': 3, '12158': 2, '12159': 2 }, aside: {} },
    { deck: { '12125': 2, '12126': 2 }, aside: {} },
  ]
  it.each(['easy', 'standard', 'hard', 'expert'] as const)(
    'preserves the original preparation and replaces only complete core sets on %s',
    (difficulty) => {
      const c = { ...campaign(), difficulty }
      for (const [index, entry] of campaignDefinition(ID).scenarios.entries()) {
        const original = entry.build!({
          difficulty,
          log: c.log,
          seed: 11,
          investigators: c.investigators.map((i) => i.id),
        })
        const snapshot = JSON.parse(JSON.stringify(original))
        expect(prepareEncounterVariant(original, ID)).toBe(original)
        expect(prepareEncounterVariant(original, ID, 'original')).toBe(original)
        const alternative = prepareEncounterVariant(original, ID, 'chapter-two')
        expect(original).toEqual(snapshot)
        const newCards = [...alternative.encounterDeck, ...(alternative.setAside ?? [])]
        const oldCodes = new Set(
          CHAPTER_TWO_SUBSTITUTIONS.flatMap((s) => s.original.map((c) => c.code)),
        )
        expect(newCards.some((c) => oldCodes.has(c.code))).toBe(false)
        for (const [code, n] of Object.entries(expected[index]!.deck))
          expect(count(alternative.encounterDeck, code)).toBe(n)
        for (const [code, n] of Object.entries(expected[index]!.aside))
          expect(count(alternative.setAside ?? [], code)).toBe(n)
        const unchanged = (cards: EncounterCard[]) =>
          cards.filter((c) => !oldCodes.has(c.code) && !c.code.startsWith('12'))
        expect(unchanged(newCards)).toEqual(
          unchanged([...original.encounterDeck, ...(original.setAside ?? [])]),
        )
        const { encounterDeck: _deck, setAside: _aside, setup: _setup, ...rest } = alternative
        expect(rest).toEqual(
          Object.fromEntries(
            Object.entries(original).filter(
              ([key]) => !['encounterDeck', 'setAside', 'setup'].includes(key),
            ),
          ),
        )
        expect(alternative.setup!.slice(1)).toEqual(original.setup ?? [])
      }
    },
  )

  it('keeps old campaign and game JSON unchanged with the default or explicit original option', () => {
    expect(campaign()).not.toHaveProperty('encounterSetVariant')
    expect(campaign('original')).toEqual(campaign())
    expect(startScenario(campaign('original'), 9)).toEqual(startScenario(campaign(), 9))
    expect(startScenario(campaign(), 9).scenarioMeta?.chapterTwoEncounters).toBeUndefined()
  })
  it('retains the variant through resolutions and either opening order', () => {
    for (const opening of ['extracurricular-activity', 'the-house-always-wins']) {
      const c = campaign('chapter-two', opening)
      const initial = startScenario(c, 3)
      expect(initial.scenarioId).toBe(opening)
      expect(initial.scenarioMeta?.chapterTwoEncounters).toBe(1)
      const next = finishScenario(c, { ...initial, outcome: { type: 'resolution', resolution: 1 } })
      expect(next.encounterSetVariant).toBe('chapter-two')
      const second = startScenario(next, 4)
      expect(second.scenarioId).toBe(campaignScenarios(c)[1]!.id)
      expect(second.scenarioMeta?.chapterTwoEncounters).toBe(1)
    }
  })
  it('rejects unavailable variants and incomplete sets rather than silently changing rules', () => {
    expect(() =>
      newCampaign('brethren-of-ash', ['joe'], 'standard', 1, [], [], undefined, 'chapter-two'),
    ).toThrow('Unsupported')
    expect(() => campaign('invalid' as 'chapter-two')).toThrow('Unsupported')
    const definition = campaignDefinition(ID).scenarios[0]!.build!({
      difficulty: 'standard',
      log: campaign().log,
      seed: 1,
      investigators: ['12004'],
    })
    expect(() =>
      prepareEncounterVariant(
        {
          ...definition,
          encounterDeck: definition.encounterDeck.filter((c) => c.code !== '01178'),
        },
        ID,
        'chapter-two',
      ),
    ).toThrow('Incomplete')
  })
  it('uses registered Chapter Two treacheries and the Dark Magician behavior', () => {
    for (const c of CHAPTER_TWO_SUBSTITUTIONS.flatMap((s) => s.replacement)) {
      if (c.kind === 'treachery') expect(treacheryBehavior(c.code)?.revelation).toBeDefined()
    }
    expect(enemyBehavior(Q.darkMagician)?.forced).toBeDefined()
  })

  it('Cosmic Evils offers the actual peril choice, direct damage/horror and surge in Dunwich', () => {
    let s = game(0)
    const id = s.investigators[0]!.id
    s = during(s, (s) => ({ ...s, encounterDeck: [card(S.unspeakableTruths)] }), {
      type: 'ResolveEncounterCard',
      investigator: id,
      card: card(S.cosmicEvils),
    })
    expect(s.pending?.question.choices.map((c) => c.label)).toEqual([
      'choice.placeDoom',
      'choice.damageHorrorSurge',
    ])
    const doom = s.doom
    const withDoom = choose(s, 'choice.placeDoom')
    expect(withDoom.doom).toBe(doom + 1)
    s = choose(s, 'choice.damageHorrorSurge')
    expect(s.investigators[0]).toMatchObject({ damage: 1, horror: 1 })
    expect(Object.values(s.treacheries).some((t) => t.code === S.unspeakableTruths)).toBe(true)
    expect(s.doom).toBe(doom)
  })
  it('the House agenda shuffles the six set-aside Torment cards into the encounter deck', () => {
    let s = game(1)
    s = during(s, keep, { type: 'ScenarioSpecific', key: 'hawChaos', data: {} })
    const all = [...s.encounterDeck, ...s.encounterDiscard]
    for (const code of [Q.languor, Q.dissonance, Q.torment]) expect(count(all, code)).toBe(2)
    expect(
      s.setAside.some((c) =>
        [Q.languor, Q.dissonance, Q.torment].includes(c.code as typeof Q.languor),
      ),
    ).toBe(false)
  })
  it('House in the Reeds searches for Bat Horror and spawns it at the commons', () => {
    let s = game(4)
    const bat = card(M.batHorror)
    s = during(s, (s) => ({ ...s, encounterDeck: [bat, card(S.bystander)] }), {
      type: 'ScenarioSpecific',
      key: 'altarSearchEnemy',
      data: { investigator: s.investigators[0]!.id, trait: 'Nightgaunt' },
    })
    expect(Object.values(s.enemies).find((e) => e.code === M.batHorror)?.location).toBe(B.commons)
    expect(s.encounterDeck.map((c) => c.code)).toEqual([S.bystander])
  })
  it('Blasphemous Invocation searches, draws and dooms a Cultist in Essex rather than dropping its deferred effect', () => {
    let s = game(3)
    const id = s.investigators[0]!.id
    const zealot = card(Q.zealot)
    s = during(
      s,
      (s) => ({
        ...s,
        enemies: {},
        encounterDeck: [zealot],
        encounterDiscard: [card(Q.darkMagician)],
        chaosBag: ['autoFail'],
      }),
      { type: 'ResolveEncounterCard', investigator: id, card: card(Q.blasphemousInvocation) },
    )
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'choice.applyResults')
    s = choose(s, 'choice.zealot.searchDeckEnemy', { enemy: 'Zealot' })
    expect(Object.values(s.enemies).find((e) => e.code === Q.zealot)?.doom).toBe(1)
    expect(s.encounterDeck).toHaveLength(0)
    // RR ST.7: for each point failed choose a Cultist without doom at resolution time.
    const dark = card(Q.darkMagician)
    if (dark.kind !== 'enemy') throw new Error('Expected enemy')
    s = during(
      s,
      withBag('autoFail'),
      { type: 'SpawnEnemy', card: dark, location: s.investigators[0]!.location!, engageWith: null },
      { type: 'ResolveEncounterCard', investigator: id, card: card(Q.blasphemousInvocation) },
    )
    s = choose(s, 'choice.revealToken')
    s = choose(s, 'choice.applyResults')
    expect(Object.values(s.enemies).find((e) => e.code === Q.darkMagician)?.doom).toBe(1)
    expect(scenarioBehavior(s.scenarioId)).toBeDefined()
  })
})
