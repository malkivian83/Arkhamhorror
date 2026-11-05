import { createGame, emptyCampaignLog, expeditionPartners } from '@lcg/engine'
import { choose, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { edgeOfTheEarthOpening } from './opening'

const investigators = ['a', 'b']
const log = emptyCampaignLog(investigators)
const context = { difficulty: 'standard' as const, seed: 44, investigators, log }
const build = (options: Partial<typeof context> = {}) =>
  edgeOfTheEarthOpening({ ...context, ...options }, testScenario())
const start = () =>
  createGame({
    seed: context.seed,
    scenario: build(),
    interactive: true,
    investigators: investigators.map((id) => testInvestigator(id)),
  })

// Campaign guide, pp. 3–5 and 7–8, campaign setup, prologue, and plane crash.
describe('Edge of the Earth opening', () => {
  it.each([
    ['easy', [1, 1, 1, 0, 0, -1, -1, -1, -2, -2], 0],
    ['standard', [1, 0, 0, -1, -1, -1, -2, -2, -3, -4], 1],
    ['hard', [0, 0, -1, -1, -2, -2, -3, -4, -4, -5], 2],
    ['expert', [0, -1, -2, -2, -3, -4, -4, -5, -7], 3],
  ] as const)('uses the printed %s starting bag', (difficulty, numbers, frost) => {
    const bag = edgeOfTheEarthOpening({ ...context, difficulty }, testScenario()).chaosBag
    expect(bag.filter((token) => typeof token === 'number')).toEqual(numbers)
    expect(bag.filter((token) => token === 'frost')).toHaveLength(frost)
    expect(bag.filter((token) => token !== 'frost' && typeof token !== 'number')).toEqual([
      'skull',
      'skull',
      'cultist',
      'tablet',
      'elderSign',
      'autoFail',
    ])
  })

  it.each([
    ['believeDyer', 'cultist', 'edgeOfTheEarthConvincedDyer'],
    ['doubtDyer', 'tablet', 'edgeOfTheEarthDoubtedDyer'],
  ] as const)('records the elected lead’s %s decision before preparation', (label, token, note) => {
    const begun = choose(start(), 'choice.investigator', { name: testInvestigator('b').name })
    expect(begun.pending?.investigator).toBe('b')
    const decided = choose(begun, `choice.edgeOfTheEarth.${label}`)
    expect(decided.campaignLog?.chaosTokens).toEqual([token])
    expect(decided.chaosBag.filter((face) => face === token)).toHaveLength(2)
    expect(decided.campaignLog?.notes).toContain(note)
    const game = throughSetup(decided)
    const victim = game.campaignLog?.values.edgeOfTheEarthCrash as keyof typeof expeditionPartners
    expect(game.campaignLog?.expedition?.partners[victim]?.status).toBe('eliminated')
    expect(
      Object.values(game.campaignLog!.expedition!.partners).filter((p) => p.status === 'safe'),
    ).toHaveLength(8)
    expect(game.tekeliliDeck).toHaveLength(16)
  })

  it('reconstructs the same casualty from the seed and omits recorded opening decisions', () => {
    const casualty = (seed: number) =>
      build({ seed }).setup?.find((message) => message.type === 'SetExpeditionPartnerStatus')
    expect(casualty(context.seed)).toEqual(casualty(context.seed))
    expect(new Set(Array.from({ length: 40 }, (_, seed) => casualty(seed)?.partner)).size).toBe(9)
    const options = {
      log: {
        ...log,
        notes: ['edgeOfTheEarthConvincedDyer', 'edgeOfTheEarthCrash'],
        values: { edgeOfTheEarthCrash: '08714' },
      },
    }
    expect(build(options).intro).toEqual([])
    expect(build(options).setup?.map((message) => message.type)).toEqual([
      'InitializeExpedition',
      'InitializeTekeliliDeck',
      'ChooseExpeditionPartners',
    ])
  })

  it('selects the alternate introduction when Winifred is in the expedition', () => {
    expect(build({ investigators: ['60301'] }).intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'story.edgeOfTheEarth.winifred.title' }),
      ]),
    )
    expect(build().intro).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: 'story.edgeOfTheEarth.flight.title' }),
      ]),
    )
  })
})
