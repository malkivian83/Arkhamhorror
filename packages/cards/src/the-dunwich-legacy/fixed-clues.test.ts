// Doc 100, F3: printed clue values without the per-investigator icon stay fixed.
import { describe, expect, it } from 'vitest'
import { campaignScenarios, newCampaign, startScenario } from '../index'
import { FIXED_CLUE_LOCATIONS } from './fixed-clues'

const team = ['joe', 'rex', 'jenny', 'pete']
const start = (id: string) => {
  const campaign = newCampaign('the-dunwich-legacy', team, 'standard', 1)
  const index = campaignScenarios(campaign).findIndex((s) => s.id === id)
  return startScenario({ ...campaign, scenarioIndex: index }, 3, false)
}

describe('pistas fijas de El legado de Dunwich', () => {
  it.each([
    'the-miskatonic-museum',
    'the-essex-county-express',
    'blood-on-the-altar',
    'undimensioned-and-unseen',
  ])('%s: solo los Lugares sin icono de investigador multiplican sus pistas', (id) => {
    const s = start(id)
    const locations = [...Object.values(s.locations), ...Object.values(s.setAsideLocations)]
    expect(locations.length).toBeGreaterThan(0)
    // Locations without printed clues (The Hidden Chamber) do not care about the icon.
    for (const l of locations.filter((l) => l.clueValue > 0))
      expect(l.cluesPerInvestigator, l.id).toBe(!FIXED_CLUE_LOCATIONS.has(l.id))
  })

  it('Museo con 4 investigadores: el acto 1 pide 2 pistas y la Entrada tiene 2', () => {
    const s = start('the-miskatonic-museum')
    expect(s.acts[0]).toMatchObject({ clueThreshold: 2, cluesPerInvestigator: false })
    expect(s.locations['02126']?.clues).toBe(2)
  })
})
