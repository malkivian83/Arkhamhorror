import {
  expeditionPartners,
  tekeliliCopies,
  type CampaignLog,
  type ExpeditionPartner,
} from '@lcg/engine'
import { activeMembers, campaignLost, currentScenario, type Campaign } from '../campaign'
import { fledToMountains } from './checkpoint'
import { EOTE_FATAL_MIRAGE, EOTE_RESTFUL_NIGHT } from './ice-and-death-cards'
import { edgeOfTheEarthChaosBags, startingFrostRemoved } from './opening'

const visitsKey = 'edgeOfTheEarthRestfulNightVisits'
const research = 'edgeOfTheEarthKenslerResearch'
const scouting = 'edgeOfTheEarthScoutedMountainPass'
const partners = Object.keys(expeditionPartners) as ExpeditionPartner[]

export const restfulNightMemorials = {
  '08714': '08733',
  '08715': '08731',
  '08716': '08738',
  '08717': '08736',
  '08718': '08730',
  '08719': '08732',
  '08720': '08735',
  '08721': '08734',
  '08722': '08737',
} as const satisfies Record<ExpeditionPartner, string>

type AliveEffect =
  | 'removeWeaknesses'
  | 'startingHand'
  | 'healHorror'
  | 'healDamage'
  | 'removeFrost'
  | 'experience'
  | 'research'
  | 'scouting'
  | 'startingResources'

const aliveEffects = {
  '08714': 'removeWeaknesses',
  '08715': 'startingHand',
  '08716': 'healHorror',
  '08717': 'healDamage',
  '08718': 'removeFrost',
  '08719': 'experience',
  '08720': 'research',
  '08721': 'scouting',
  '08722': 'startingResources',
} as const satisfies Record<ExpeditionPartner, AliveEffect>

type Target = { type: 'investigator'; id: string } | { type: 'partner'; id: ExpeditionPartner }
export type RestfulNightChoice = {
  partner: ExpeditionPartner
  target?: Target
  weaknesses?: string[]
}

const alive = (campaign: Campaign, partner: ExpeditionPartner) => {
  const status = campaign.log.expedition?.partners[partner]?.status
  return status === 'safe' || status === 'resolute'
}
const isTekelili = (code: string) => Object.hasOwn(tekeliliCopies, code)

function frostRemaining(campaign: Campaign): number {
  return (
    Math.max(
      0,
      edgeOfTheEarthChaosBags[campaign.difficulty].filter((token) => token === 'frost').length -
        Number(campaign.log.values[startingFrostRemoved] ?? 0),
    ) + campaign.log.chaosTokens.filter((token) => token === 'frost').length
  )
}

function visitOptions(campaign: Campaign, partner: ExpeditionPartner) {
  const status = campaign.log.expedition?.partners[partner]?.status
  const active = activeMembers(campaign)
  const investigators: Target[] = active.map(({ id }) => ({ type: 'investigator', id }))
  if (status === 'eliminated') {
    const card = restfulNightMemorials[partner]
    if (
      Object.values(campaign.log.investigators).some(({ storyAssets }) =>
        storyAssets.includes(card),
      )
    )
      return null
    return { partner, effect: 'memorial' as const, targets: investigators, card }
  }
  if (!alive(campaign, partner)) return null
  const effect = aliveEffects[partner]
  switch (effect) {
    case 'removeWeaknesses': {
      const targets = investigators.filter(({ id }) =>
        campaign.log.investigators[id]?.storyAssets.some(isTekelili),
      )
      return targets.length ? { partner, effect, targets } : null
    }
    case 'healDamage':
    case 'healHorror': {
      const trauma = effect === 'healDamage' ? 'physicalTrauma' : 'mentalTrauma'
      const damage = effect === 'healDamage' ? 'damage' : 'horror'
      const targets: Target[] = [
        ...investigators.filter(({ id }) => (campaign.log.investigators[id]?.[trauma] ?? 0) > 0),
        ...partners
          .filter(
            (code) =>
              alive(campaign, code) && (campaign.log.expedition?.partners[code]?.[damage] ?? 0) > 0,
          )
          .map((id): Target => ({ type: 'partner', id })),
      ]
      return targets.length ? { partner, effect, targets } : null
    }
    case 'removeFrost':
      return frostRemaining(campaign) ? { partner, effect, targets: [] } : null
    case 'research':
    case 'scouting':
      return { partner, effect, targets: [] }
    default:
      return { partner, effect, targets: investigators }
  }
}

/** Campaign guide, pp. 18–22. A visit with no legal benefit does not use the allowance. */
export function restfulNight(campaign: Campaign) {
  if (
    campaign.id !== 'edge-of-the-earth' ||
    currentScenario(campaign) !== EOTE_RESTFUL_NIGHT ||
    campaignLost(campaign) ||
    !activeMembers(campaign).length ||
    !campaign.log.expedition
  )
    return null

  const visited = String(campaign.log.values[visitsKey] ?? '')
    .split(',')
    .filter(Boolean)
  const limit = campaign.log.notes.includes(fledToMountains) ? 4 : 3
  const remaining = Math.max(0, limit - visited.length)
  const options = remaining
    ? partners
        .filter((partner) => !visited.includes(partner))
        .flatMap((partner) => {
          const option = visitOptions(campaign, partner)
          return option ? [option] : []
        })
    : []
  const losses = partners.filter(
    (partner) => campaign.log.expedition?.partners[partner]?.status === 'eliminated',
  ).length
  return { remaining, options, canContinue: options.length === 0, offersMirage: losses >= 3 }
}

function recordNote(log: CampaignLog, note: string): CampaignLog {
  return { ...log, notes: [...new Set([...log.notes, note])] }
}

export function applyRestfulNightVisit(campaign: Campaign, choice: RestfulNightChoice): Campaign {
  const option = restfulNight(campaign)?.options.find(({ partner }) => partner === choice.partner)
  if (
    !option ||
    (option.targets.length
      ? !option.targets.some(
          (target) => target.id === choice.target?.id && target.type === choice.target.type,
        )
      : choice.target !== undefined)
  )
    throw new Error('The Restful Night visit is unavailable')

  const id = choice.target?.id
  const record = id ? campaign.log.investigators[id] : undefined
  const update = (fields: Partial<NonNullable<typeof record>>): CampaignLog => ({
    ...campaign.log,
    investigators: { ...campaign.log.investigators, [id!]: { ...record!, ...fields } },
  })
  let log = campaign.log
  switch (option.effect) {
    case 'memorial': {
      log = update({ storyAssets: [...record!.storyAssets, option.card] })
      break
    }
    case 'removeWeaknesses': {
      const selected = choice.weaknesses ?? []
      if (selected.length < 1 || selected.length > 5)
        throw new Error('Choose one to five Tekeli-li cards')
      const storyAssets = [...record!.storyAssets]
      for (const code of selected) {
        const index = storyAssets.indexOf(code)
        if (index < 0 || !isTekelili(code)) throw new Error('That weakness is not in the deck')
        storyAssets.splice(index, 1)
      }
      log = update({ storyAssets })
      break
    }
    case 'healDamage':
    case 'healHorror': {
      if (choice.target?.type === 'investigator') {
        const trauma = option.effect === 'healDamage' ? 'physicalTrauma' : 'mentalTrauma'
        log = update({ [trauma]: record![trauma] - 1 })
      } else if (choice.target?.type === 'partner') {
        const expedition = log.expedition!
        const partner = expedition.partners[choice.target.id]!
        const field = option.effect === 'healDamage' ? 'damage' : 'horror'
        log = {
          ...log,
          expedition: {
            ...expedition,
            partners: {
              ...expedition.partners,
              [choice.target.id]: { ...partner, [field]: partner[field] - 1 },
            },
          },
        }
      }
      break
    }
    case 'removeFrost': {
      const index = log.chaosTokens.indexOf('frost')
      log =
        index >= 0
          ? { ...log, chaosTokens: log.chaosTokens.filter((_, n) => n !== index) }
          : {
              ...log,
              values: {
                ...log.values,
                [startingFrostRemoved]: String(Number(log.values[startingFrostRemoved] ?? 0) + 1),
              },
            }
      break
    }
    case 'experience':
      log = update({ xp: record!.xp + 1 })
      break
    case 'research':
      log = recordNote(log, research)
      break
    case 'scouting':
      log = recordNote(log, scouting)
      break
    case 'startingHand':
    case 'startingResources':
      log = { ...log, values: { ...log.values, [`edgeOfTheEarthPeaks:${option.effect}`]: id! } }
      break
  }
  const visited = [log.values[visitsKey], choice.partner].filter(Boolean).join(',')
  return { ...campaign, log: { ...log, values: { ...log.values, [visitsKey]: visited } } }
}

export function completeRestfulNight(campaign: Campaign, route: 'mirage' | 'peaks'): Campaign {
  const interlude = restfulNight(campaign)
  if (
    !interlude?.canContinue ||
    (route !== 'peaks' && !(route === 'mirage' && interlude.offersMirage))
  )
    throw new Error('The Restful Night route is unavailable')
  return {
    ...campaign,
    scenarioIndex: campaign.scenarioIndex + (route === 'mirage' ? 1 : 2),
    results:
      route === 'mirage'
        ? campaign.results
        : [
            ...campaign.results,
            {
              scenario: EOTE_FATAL_MIRAGE,
              skipped: true,
              outcome: { type: 'noResolution' },
              xp: {},
            },
          ],
  }
}
