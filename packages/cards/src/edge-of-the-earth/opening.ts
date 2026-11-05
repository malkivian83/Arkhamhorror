import {
  expeditionPartners,
  nextInt,
  seedRng,
  type ChaosToken,
  type Difficulty,
  type ExpeditionPartner,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'

const symbols: ChaosToken[] = ['skull', 'skull', 'cultist', 'tablet', 'elderSign', 'autoFail']

// Campaign guide, p. 3, Campaign Setup. The prologue adds a symbol to these bags.
export const edgeOfTheEarthChaosBags: Record<Difficulty, ChaosToken[]> = {
  easy: [1, 1, 1, 0, 0, -1, -1, -1, -2, -2, ...symbols],
  standard: [1, 0, 0, -1, -1, -1, -2, -2, -3, -4, 'frost', ...symbols],
  hard: [0, 0, -1, -1, -2, -2, -3, -4, -4, -5, 'frost', 'frost', ...symbols],
  expert: [0, -1, -2, -2, -3, -4, -4, -5, -7, 'frost', 'frost', 'frost', ...symbols],
}

export const startingFrostRemoved = 'edgeOfTheEarthStartingFrostRemoved'

export function edgeOfTheEarthStartingBag(context: ScenarioContext): ChaosToken[] {
  const bag = edgeOfTheEarthChaosBags[context.difficulty]
  let removed = Number(context.log.values[startingFrostRemoved] ?? 0)
  return bag.filter((token) => token !== 'frost' || removed-- <= 0)
}

const story = (part: string): StoryEntry => ({
  title: `story.edgeOfTheEarth.${part}.title`,
  body: `story.edgeOfTheEarth.${part}.body`,
})
const read = (part: string): Message => ({ type: 'Story', entry: story(part) })

const convinced = 'edgeOfTheEarthConvincedDyer'
const doubted = 'edgeOfTheEarthDoubtedDyer'
const crash = 'edgeOfTheEarthCrash'
const partners = Object.keys(expeditionPartners) as ExpeditionPartner[]

/** Adds the campaign opening to the first scenario after the players elect their lead. */
export function edgeOfTheEarthOpening(
  context: ScenarioContext,
  scenario: ScenarioDefinition,
): ScenarioDefinition {
  const intro: StoryEntry[] = []
  if (!context.log.notes.includes(convinced) && !context.log.notes.includes(doubted)) {
    intro.push(
      {
        ...story('dyer'),
        choices: [
          {
            label: 'choice.edgeOfTheEarth.believeDyer',
            then: [
              { type: 'RecordNote', note: convinced },
              { type: 'AddChaosTokens', tokens: ['cultist'] },
              read('convinced'),
            ],
          },
          {
            label: 'choice.edgeOfTheEarth.doubtDyer',
            then: [
              { type: 'RecordNote', note: doubted },
              { type: 'AddChaosTokens', tokens: ['tablet'] },
              read('doubted'),
            ],
          },
        ],
      },
      story('team'),
    )
  }
  const setup: Message[] = [{ type: 'InitializeExpedition' }]
  if (!context.log.values[crash]) {
    const [index] = nextInt(seedRng(context.seed), partners.length)
    const partner = partners[index]!
    intro.push(
      story('antarctica'),
      story(context.investigators.includes('60301') ? 'winifred' : 'flight'),
      story('crash'),
      story(`victim${partner}`),
    )
    setup.push(
      { type: 'SetExpeditionPartnerStatus', partner, status: 'eliminated' },
      { type: 'RecordNote', note: crash, value: partner },
    )
  }
  return {
    ...scenario,
    intro: [...intro, ...(scenario.intro ? [scenario.intro].flat() : [])],
    chaosBag: edgeOfTheEarthStartingBag(context),
    setup: [
      ...setup,
      { type: 'InitializeTekeliliDeck' },
      { type: 'ChooseExpeditionPartners' },
      ...(scenario.setup ?? []),
    ],
  }
}
