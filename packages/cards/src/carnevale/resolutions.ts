import {
  allPlayerCardDefs,
  playerCardBehavior,
  treacheryBehavior,
  leadInvestigator,
  nextInt,
  push,
  type Choice,
  type GameState,
  type Message,
  type ScenarioOutcome,
} from '@lcg/engine'
import { endScenario, recordNote } from '../scenario-helpers'
import { C } from './codes'
import { onSpecific, rescued, sacrificed, specific } from './helpers'
import { MASKS } from './rewards'

export const story = (key: string) => ({
  title: `story.carnevale.${key}Title`,
  body: `story.carnevale.${key}`,
})
onSpecific('carnevaleRewards', (s, data) => {
  const index = Number(data.index ?? 0)
  const investigator = s.investigators[index]
  if (!investigator) return push(s, specific('carnevaleAdditionalRewards'))
  const owned = new Set(
    Object.values(s.campaignLog?.investigators ?? {}).flatMap((i) => i.storyAssets),
  )
  const choices: Choice[] = MASKS.filter((c) => !owned.has(c)).map((code) => ({
    label: 'choice.carnevale.mask',
    params: { card: allPlayerCardDefs().find((c) => c.code === code)!.name },
    then: [{ type: 'AddStoryAsset', investigator: investigator.id, code }],
  }))
  choices.push({ label: 'choice.skip', then: [] })
  return push(
    s,
    {
      type: 'Ask',
      investigator: investigator.id,
      question: { kind: 'chooseOne', prompt: 'prompt.carnevale.mask', choices },
    },
    specific('carnevaleRewards', { index: index + 1 }),
  )
})
onSpecific('carnevaleAdditionalRewards', (s) => {
  if (!rescued(s).length && sacrificed(s).length) {
    const pool = allPlayerCardDefs().filter(
      (c) =>
        c.weakness === 'basicweakness' &&
        (!!playerCardBehavior(c.code) || !!treacheryBehavior(c.code)) &&
        c.traits.some((t) => ['Madness', 'Injury', 'Monster'].includes(t)),
    )
    let rng = s.rng
    const messages: Message[] = [{ type: 'Story', entry: story('sacrifice') }]
    for (const i of s.investigators) {
      const [n, next] = nextInt(rng, pool.length)
      rng = next
      messages.push({ type: 'AddStoryAsset', investigator: i.id, code: pool[n]!.code })
    }
    return push({ ...s, rng }, ...messages)
  }
  if (rescued(s).length === 3 && !sacrificed(s).length)
    return push(
      s,
      { type: 'Story', entry: story('abbess') },
      {
        type: 'Ask',
        investigator: (leadInvestigator(s) ?? s.investigators[0]!).id,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.carnevale.abbess',
          choices: [
            ...s.investigators.map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [{ type: 'AddStoryAsset' as const, investigator: i.id, code: C.abbess }],
            })),
            { label: 'choice.skip', then: [] },
          ],
        },
      },
    )
  return s
})
onSpecific('carnevaleLostReveler', (s) => {
  const saved = rescued(s)
  if (!saved.length) return s
  return {
    ...s,
    scenarioDecks: {
      ...s.scenarioDecks,
      carnevaleRescued: saved.slice(1),
      carnevaleSacrificed: [...sacrificed(s), saved[0]!],
    },
  }
})
export function resolutionStory(_s: GameState, outcome: ScenarioOutcome): Message[] {
  const key = outcome.type === 'noResolution' ? 'noResolution' : `resolution${outcome.resolution}`
  return [
    { type: 'Story', entry: story(key) },
    recordNote(`carnevale${key}`),
    { type: 'EarnExperience', amount: 0, victory: true },
    ...(outcome.type === 'noResolution' ? [specific('carnevaleLostReveler')] : []),
    { type: 'Story', entry: story('additionalRewards') },
    specific('carnevaleRewards'),
    endScenario(outcome),
  ]
}
