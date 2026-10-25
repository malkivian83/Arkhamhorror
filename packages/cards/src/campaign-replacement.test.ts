import { describe, expect, it } from 'vitest'
import {
  campaignLost,
  canPlayNext,
  newCampaign,
  replaceableMembers,
  replaceInvestigator,
  replacementOptions,
  startScenario,
  type Campaign,
} from './campaign'
import { starterDeck, starterInvestigator } from './core-2026/player-cards'
import './index'
import { CLASP_OF_BLACK_ONYX } from './the-path-to-carcosa/echoes-assets'

const JOE = starterInvestigator('joe').id
const TRISH = starterInvestigator('trish').id
const DANIELA = starterInvestigator('daniela').id

/** Marca a los investigadores como enloquecidos; el primero lleva el Broche. */
function insane(campaign: Campaign, ids: string[], clasp = false): Campaign {
  const investigators = { ...campaign.log.investigators }
  for (const [n, id] of ids.entries())
    investigators[id] = {
      ...investigators[id]!,
      insane: true,
      storyAssets: clasp && n === 0 ? [CLASP_OF_BLACK_ONYX] : [],
    }
  return { ...campaign, log: { ...campaign.log, investigators } }
}

describe('campaign: replacing investigators who left', () => {
  const start = newCampaign('the-path-to-carcosa', ['joe', 'trish'], 'standard')

  it('everyone insane is not a loss while new investigators remain', () => {
    const out = insane(start, [JOE, TRISH], true)
    expect(replaceableMembers(out)).toEqual([JOE, TRISH])
    expect(campaignLost(out)).toBe(false)
    expect(canPlayNext(out)).toBe(false)
  })

  it('the newcomer gets a level 0 deck, no experience and the Clasp left behind', () => {
    const out = insane(start, [JOE, TRISH], true)
    const next = replaceInvestigator(out, JOE, 'daniela')
    expect(next.investigators.map((i) => i.id)).toEqual([JOE, TRISH, DANIELA])
    expect(next.investigators[2]!.deck).toEqual(starterDeck('daniela'))
    expect(next.log.investigators[DANIELA]).toMatchObject({ xp: 0, physicalTrauma: 0 })
    expect(next.log.investigators[DANIELA]!.storyAssets).toEqual([CLASP_OF_BLACK_ONYX])
    expect(next.log.investigators[JOE]!.storyAssets).toEqual([])
    expect(replaceableMembers(next)).toEqual([TRISH])
    expect(canPlayNext(next)).toBe(true)
    expect(startScenario(next, 3).investigators.map((i) => i.id)).toEqual([DANIELA])
  })

  it('an investigator already used in the campaign cannot return', () => {
    const out = insane(start, [JOE])
    expect(replacementOptions(out)).not.toContain('trish')
    expect(replacementOptions(out)).not.toContain('joe')
    expect(() => replaceInvestigator(out, JOE, 'trish')).toThrow()
    expect(() => replaceInvestigator(out, TRISH, 'daniela')).toThrow()
    const next = replaceInvestigator(out, JOE, 'daniela')
    expect(() => replaceInvestigator(next, JOE, 'dexter')).toThrow()
  })

  it('the campaign is lost when no unused investigator remains', () => {
    let campaign = newCampaign('the-path-to-carcosa', ['joe'], 'standard')
    for (;;) {
      const [leaving] = campaign.investigators.slice(-1)
      campaign = insane(campaign, [leaving!.id])
      const [key] = replacementOptions(campaign)
      if (!key) break
      expect(campaignLost(campaign)).toBe(false)
      campaign = replaceInvestigator(campaign, leaving!.id, key)
    }
    expect(campaign.investigators.length).toBeGreaterThan(4)
    expect(campaignLost(campaign)).toBe(true)
  })
})
