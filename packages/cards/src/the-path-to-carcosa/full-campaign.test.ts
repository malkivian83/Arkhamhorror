import { describe, expect, it } from 'vitest'
import {
  campaignLost,
  canPlayNext,
  chooseTransferHeir,
  currentScenario,
  finishScenario,
  newCampaign,
  pendingTransfers,
  replaceableMembers,
  replaceInvestigator,
  replacementOptions,
  type Campaign,
} from '../campaign'
import '../index'
import { THE_PATH_TO_CARCOSA } from './campaign'
import { playRandom } from './echoes-playthrough.test'

const TEAMS = [
  ['lola'],
  ['joe', 'trish'],
  ['lola', 'daniela', 'dexter'],
  ['isabelle', 'pete', 'jenny', 'lola'],
] as const

/** Juega la campaña entera con decisiones al azar; devuelve la campaña final y su recorrido. */
export function playCampaign(team: readonly string[], seed: number) {
  let campaign: Campaign = newCampaign('the-path-to-carcosa', [...team], 'standard', seed)
  const path: string[] = []
  for (let n = 0; n < 8 && currentScenario(campaign); n++) {
    // Cada jugador cuyo investigador se fue elige otro mientras queden (reglamento).
    for (const leaving of replaceableMembers(campaign)) {
      const [key] = replacementOptions(campaign)
      if (key) campaign = replaceInvestigator(campaign, leaving, key, seed)
    }
    for (const transfer of pendingTransfers(campaign))
      campaign = chooseTransferHeir(campaign, transfer.card, transfer.candidates[0]!)
    if (!canPlayNext(campaign)) break
    const state = playRandom(campaign, seed * 31 + n)
    expect(state.outcome, `${currentScenario(campaign)} (${seed})`).not.toBeNull()
    path.push(`${state.scenarioId}:${JSON.stringify(state.outcome)}`)
    campaign = finishScenario(campaign, state)
  }
  return { campaign, path }
}

describe('The Path to Carcosa: the whole campaign with random inputs', () => {
  it.each(TEAMS.map((team, n) => [team.join('+'), team, n] as const))(
    '%s: every scenario chains into the next until the campaign ends',
    (_name, team, n) => {
      for (const seed of [1, 2, 3].map((s) => s + n * 10)) {
        const { campaign, path } = playCampaign(team, seed)
        const ended = !currentScenario(campaign)
        expect(ended || campaignLost(campaign), path.join('\n')).toBe(true)
        if (ended) expect(path).toHaveLength(THE_PATH_TO_CARCOSA.scenarios.length)
      }
    },
  )
})
