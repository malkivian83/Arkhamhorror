import { expeditionPartners, shuffle, type ExpeditionPartner, type StoryEntry } from '@lcg/engine'
import { activeMembers, campaignLost, currentScenario, type Campaign } from '../campaign'

import { ICE_CHECKPOINT_ONE, ICE_CHECKPOINT_TWO, ICE_PART_TWO } from './ice-and-death-cards'

const decisionNote = 'edgeOfTheEarthDisappearanceDecision'
const codes = Object.keys(expeditionPartners) as ExpeditionPartner[]

export type DisappearanceDecision = 'search' | 'leave'
const story = (part: string): StoryEntry => ({
  title: 'story.edgeOfTheEarth.disappearance.title',
  body: `story.edgeOfTheEarth.${part}.body`,
})

/** For new saves use the final scenario RNG. Older saves get a repeatable draw from their log. */
function disappearanceSeed(campaign: Campaign): number {
  const saved = campaign.log.expedition?.disappearanceSeed
  if (typeof saved === 'number') return saved
  const source = [
    campaign.log.values.edgeOfTheEarthCrash,
    campaign.log.expedition?.camp?.location,
    campaign.difficulty,
    ...campaign.investigators.map(({ id }) => id),
  ].join(':')
  return (
    Array.from(source).reduce(
      (seed, char) => Math.imul(seed ^ char.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0
  )
}

export function disappearance(campaign: Campaign) {
  if (
    campaign.id !== 'edge-of-the-earth' ||
    campaignLost(campaign) ||
    !activeMembers(campaign).length ||
    currentScenario(campaign) !== ICE_CHECKPOINT_ONE ||
    campaign.log.values[decisionNote] !== undefined
  )
    return null
  const expedition = campaign.log.expedition
  if (!expedition?.camp) return null
  const survivors = codes.filter((code) => {
    const status = expedition.partners[code]?.status
    return status === 'safe' || status === 'resolute'
  })
  const [shuffled] = shuffle(survivors, disappearanceSeed(campaign))
  const missing = shuffled.slice(expedition.camp.shelter)
  const choices: DisappearanceDecision[] = missing.length ? ['search', 'leave'] : ['leave']
  return { story: story('disappearance'), missing, choices }
}

export function resolveDisappearance(
  campaign: Campaign,
  decision: DisappearanceDecision,
): Campaign {
  const checkpoint = disappearance(campaign)
  if (!checkpoint?.choices.includes(decision))
    throw new Error('The disappearance checkpoint choice is unavailable')
  const expedition = campaign.log.expedition!
  const partners = { ...expedition.partners }
  for (const code of checkpoint.missing) {
    partners[code] = {
      ...partners[code]!,
      status: decision === 'search' ? 'missing' : 'eliminated',
    }
  }
  return {
    ...campaign,
    scenarioIndex: campaign.scenarioIndex + (decision === 'search' ? 1 : 2),
    results:
      decision === 'search'
        ? campaign.results
        : [
            ...campaign.results,
            { scenario: ICE_PART_TWO, skipped: true, outcome: { type: 'noResolution' }, xp: {} },
          ],
    log: {
      ...campaign.log,
      expedition: { ...expedition, partners },
      values: { ...campaign.log.values, [decisionNote]: decision },
    },
  }
}

export function disappearanceResult(campaign: Campaign): StoryEntry | null {
  if (campaign.id !== 'edge-of-the-earth') return null
  const next = currentScenario(campaign)
  const decision = campaign.log.values[decisionNote]
  if (next === ICE_PART_TWO && decision === 'search') return story('disappearanceSearch')
  if (next === ICE_CHECKPOINT_TWO && decision === 'leave') return story('disappearanceLeave')
  return null
}
