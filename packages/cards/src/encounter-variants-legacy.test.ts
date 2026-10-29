import { describe, expect, it } from 'vitest'
import {
  applyInput,
  enemyBehavior,
  scenarioBehavior,
  totalDoom,
  type GameState,
  type EncounterCard,
} from '@lcg/engine'
import { choose, during, keep, throughSetup } from '@lcg/engine/testing'
import { newCampaign, startScenario, type DeckKey } from './campaign'
import { campaignDefinition, type ScenarioContext } from './campaign-definition'
import {
  CHAPTER_TWO_SUBSTITUTIONS,
  prepareEncounterVariant,
  supportsChapterTwoEncounters,
} from './encounter-variants'
import { isEncounterGhoul } from './encounter-variant-rules'
import { CODES as S } from './brethren-of-ash/spreading-flames'
import { CODES as M } from './brethren-of-ash/smoke-and-mirrors'
import { CODES as Q } from './brethren-of-ash/queen-of-ash'
import { ZEALOT_NOTES } from './night-of-the-zealot/the-gathering'
import { CULTISTS, MIDNIGHT } from './night-of-the-zealot/the-midnight-masks'
import { SETS } from './the-path-to-carcosa/encounter-sets'
import { CODES as O } from './the-path-to-carcosa/the-unspeakable-oath'

const team: DeckKey[] = ['joe', 'daniela', 'trish', 'dexter']
const replacements = CHAPTER_TWO_SUBSTITUTIONS.flatMap((s) => s.replacement)
const card = (code: string): EncounterCard => replacements.find((c) => c.code === code)!
const oldCodes = new Set(CHAPTER_TWO_SUBSTITUTIONS.flatMap((s) => s.original.map((c) => c.code)))
const count = (cards: EncounterCard[], code: string) => cards.filter((c) => c.code === code).length
function game(campaignId: string, index: number, players = 1, seed = 7): GameState {
  const campaign = {
    ...newCampaign(
      campaignId,
      team.slice(0, players),
      'standard',
      1,
      [],
      [],
      undefined,
      'chapter-two',
    ),
    scenarioIndex: index,
  }
  let state = throughSetup(startScenario(campaign, seed))
  for (
    let n = 0;
    n < 30 && state.pending && state.pending.question.prompt !== 'prompt.chooseAction';
    n++
  )
    state = applyInput(state, { investigator: state.pending.investigator, choice: 0 })
  expect(state.pending?.question.prompt).toBe('prompt.chooseAction')
  return state
}

describe('Chapter Two — remaining legacy campaigns (Grimoire p. 46)', () => {
  it.each(['night-of-the-zealot', 'the-path-to-carcosa'])(
    'prepares every scenario in %s with 1–4 players on all difficulties',
    (id) => {
      for (const difficulty of ['easy', 'standard', 'hard', 'expert'] as const)
        for (const players of [1, 2, 3, 4]) {
          const c = newCampaign(id, team.slice(0, players), difficulty)
          for (const entry of campaignDefinition(id).scenarios) {
            const context: ScenarioContext = {
              difficulty,
              log: c.log,
              seed: 7,
              investigators: c.investigators.map((i) => i.id),
            }
            const original = entry.build!(context)
            const snapshot = JSON.parse(JSON.stringify(original))
            expect(prepareEncounterVariant(original, id)).toBe(original)
            const alternative = prepareEncounterVariant(
              entry.build!({ ...context, encounterSetVariant: 'chapter-two' }),
              id,
              'chapter-two',
            )
            expect(original).toEqual(snapshot)
            expect(
              [...alternative.encounterDeck, ...(alternative.setAside ?? [])].some((c) =>
                oldCodes.has(c.code),
              ),
              entry.id,
            ).toBe(false)
            for (const field of [
              'id',
              'acts',
              'agendas',
              'chaosBag',
              'tokenValues',
              'intro',
            ] as const)
              expect(alternative[field]).toEqual(original[field])
            if (entry.id !== MIDNIGHT) {
              expect(alternative.locations).toEqual(original.locations)
              expect(alternative.startingLocation).toEqual(original.startingLocation)
            }
            expect(entry.build!(context)).toEqual(snapshot)
          }
        }
    },
  )

  it.each(['night-of-the-zealot', 'the-path-to-carcosa'])(
    'keeps the explicit original mode identical in %s',
    (id) => {
      const original = newCampaign(id, ['joe'], 'standard')
      expect(startScenario({ ...original, encounterSetVariant: 'original' }, 7)).toEqual(
        startScenario(original, 7),
      )
    },
  )
  it('does not offer reverse substitutions or pretend standalone encounter sets need replacing', () => {
    for (const id of [
      'brethren-of-ash',
      'the-midwinter-gala',
      'murder-at-the-excelsior-hotel',
      'fortune-and-folly',
    ])
      expect(supportsChapterTwoEncounters(id)).toBe(false)
  })

  it.each([1, 2, 3, 4])(
    'Midnight Masks uses real Arkham locations and distributes exactly three Zealots across setup and deck for %i investigators',
    (players) => {
      const s = game('night-of-the-zealot', 1, players)
      expect(Object.keys(s.locations)).toHaveLength(9)
      expect(s.investigators.every((i) => i.location === M.merchantDistrict)).toBe(true)
      for (const l of Object.values(s.locations))
        for (const connection of l.connections) expect(s.locations[connection]).toBeDefined()
      expect(count(s.encounterDeck, Q.zealot)).toBe(4 - players)
      expect(Object.values(s.enemies).filter((e) => e.code === Q.zealot)).toHaveLength(players - 1)
      expect(totalDoom(s)).toBe(players - 1)
      expect(count(s.encounterDeck, M.raisingSuspicions)).toBe(2)
      expect(count(s.encounterDeck, M.redHerring)).toBe(2)
      const expected = [
        s.locations[M.downtownBank] ? M.downtownBank : M.downtownSanatorium,
        M.frenchHill,
        s.locations[M.universityInFlames] ? M.universityInFlames : M.universityQuietCampus,
        M.northside,
        M.southside,
      ]
      for (const [n, code] of CULTISTS.filter((c) => c !== '01121b').entries())
        expect(enemyBehavior(code)?.spawn?.(s, s.investigators[0]!.id)).toEqual([expected[n]])
    },
  )
  it('preserves the burned-house setup and actual new University and Waterfront rules', () => {
    const c = newCampaign(
      'night-of-the-zealot',
      ['joe'],
      'standard',
      1,
      [],
      [],
      undefined,
      'chapter-two',
    )
    c.log.notes.push(ZEALOT_NOTES.houseBurned)
    const s = throughSetup(startScenario({ ...c, scenarioIndex: 1 }, 9))
    expect(s.investigators[0]?.location).toBe(M.waterfrontDistrict)
    expect(s.locations[M.merchantDistrict]).toBeUndefined()
    expect(s.locations[M.waterfrontDistrict]?.investigateExtraActions).toBe(1)
    expect(Object.keys(s.locations)).toHaveLength(8)
    for (const l of Object.values(s.locations))
      for (const target of l.connections) expect(s.locations[target]).toBeDefined()
  })
  it('Gathering ghoul references include the substituted enemies without inventing printed traits', () => {
    let s = game('night-of-the-zealot', 0)
    const enemy = card(S.hellhound)
    expect(enemy.traits).not.toContain('Ghoul')
    expect(isEncounterGhoul(s, enemy)).toBe(true)
    expect(isEncounterGhoul({ ...s, scenarioMeta: {} }, enemy)).toBe(false)
    s = during(s, (s) => ({ ...s, encounterDeck: [enemy], encounterDiscard: [] }), {
      type: 'ScenarioSpecific',
      key: 'scatterGhouls',
      data: {},
    })
    expect(Object.values(s.enemies).some((e) => e.code === S.hellhound)).toBe(true)
    expect(s.encounterDeck).toHaveLength(0)
    expect(
      scenarioBehavior(s.scenarioId)?.tokenEffect?.(s, 'skull', s.investigators[0]!.id)?.modifier,
    ).toBe(-1)
    s = during(s, (s) => ({ ...s, enemies: {}, encounterDeck: [enemy], encounterDiscard: [] }), {
      type: 'ScenarioSpecific',
      key: 'searchGhoul',
      data: { investigator: s.investigators[0]!.id },
    })
    expect(Object.values(s.enemies).some((e) => e.code === S.hellhound)).toBe(true)
  })
  it('Devourer substitutes all four randomly selected Agent sets', () => {
    const found = new Set<string>()
    for (let seed = 1; seed < 70; seed++) {
      const c = newCampaign(
        'night-of-the-zealot',
        ['joe'],
        'standard',
        1,
        [],
        [],
        undefined,
        'chapter-two',
      )
      const s = startScenario({ ...c, scenarioIndex: 2 }, seed)
      for (const code of [S.unspeakableTruths, S.extraplanarVisions, S.mutated, Q.unnaturalDecay])
        if (s.encounterDeck.some((c) => c.code === code)) found.add(code)
      expect(s.encounterDeck.some((c) => oldCodes.has(c.code))).toBe(false)
    }
    expect(found.size).toBe(4)
  })
  it('Oath keeps Hallucinations in the encounter deck and only actual Monsters in its set-aside pool', () => {
    const s = game('the-path-to-carcosa', 3)
    expect(count(s.encounterDeck, S.extraplanarVisions)).toBe(2)
    expect(count(s.encounterDeck, S.wildCompulsion)).toBe(2)
    expect(s.setAside.some((c) => c.code === SETS.screechingByakhee)).toBe(false)
    expect(
      s.setAside.filter((c) =>
        new Set<string>([O.asylumGorger, SETS.beastOfAldebaran, SETS.spawnOfHali]).has(c.code),
      ),
    ).toHaveLength(5)
    const moved = during(s, keep, { type: 'ScenarioSpecific', key: 'oathMonster', data: {} })
    expect(moved.underAct).toHaveLength(1)
    expect(moved.underAct?.includes(SETS.screechingByakhee)).toBe(false)
  })
  it('Phantom removes and restores the substitute treacheries when its belief changes', () => {
    let s = game('the-path-to-carcosa', 4)
    expect(count(s.encounterDeck, M.raisingSuspicions)).toBe(0)
    expect(count(s.encounterDeck, M.redHerring)).toBe(2)
    s = during(
      s,
      (s) => ({
        ...s,
        campaignLog: {
          ...s.campaignLog!,
          values: { ...s.campaignLog!.values, carcosaConviction: '3' },
        },
      }),
      { type: 'ScenarioSpecific', key: 'phantomBelief', data: {} },
    )
    expect(count(s.encounterDeck, M.raisingSuspicions)).toBe(2)
    expect(count(s.encounterDeck, M.redHerring)).toBe(0)
    expect(
      s.encounterDeck.some((c) =>
        [SETS.falseLead, SETS.huntingShadow].includes(c.code as typeof SETS.falseLead),
      ),
    ).toBe(false)
  })
  it('Pallid Mask searches the replacement ghoul group in deck and discard', () => {
    let s = game('the-path-to-carcosa', 5)
    s = during(s, (s) => ({ ...s, encounterDeck: [], encounterDiscard: [card(M.rogueGangster)] }), {
      type: 'ScenarioSpecific',
      key: 'pallidFindGhoul',
      data: { investigator: s.investigators[0]!.id },
    })
    expect(Object.values(s.enemies).some((e) => e.code === M.rogueGangster)).toBe(true)
    expect(s.encounterDiscard).toHaveLength(0)
  })
  it('Black Stars Rise grants surge to Cosmic Evils once the relevant agenda reaches 2a', () => {
    let s = game('the-path-to-carcosa', 6)
    s = during(s, (s) => ({ ...s, agendaIndex: 1, encounterDeck: [card(S.unspeakableTruths)] }), {
      type: 'ResolveEncounterCard',
      investigator: s.investigators[0]!.id,
      card: card(S.cosmicEvils),
    })
    s = choose(s, 'choice.placeDoom')
    for (let n = 0; n < 10 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++)
      s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
    expect(Object.values(s.treacheries).some((t) => t.code === S.unspeakableTruths)).toBe(true)
    expect(s.encounterDeck).toHaveLength(0)
  })
})
