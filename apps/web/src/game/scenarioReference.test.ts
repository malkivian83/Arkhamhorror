import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { allCampaigns } from '@lcg/cards'
import { describe, expect, it } from 'vitest'
import { scenarioReference } from './scenarioReference'
import manifest from './cardImageManifest.json'

describe('scenario symbol reference', () => {
  for (const campaign of allCampaigns())
    for (const scenario of campaign.scenarios) {
      // Los escenarios pendientes aún no tienen cartas de referencia publicadas.
      if (!scenario.build) continue
      it.each(['easy', 'standard', 'hard', 'expert'] as const)(
        `${scenario.id}: selects the %s face with a local image`,
        (difficulty) => {
          const card = scenarioReference({ scenarioId: scenario.id, difficulty })
          expect(card).not.toBeNull()
          expect(card!.back).toBe(difficulty === 'hard' || difficulty === 'expert')
          const art = `${card!.code}${card!.back ? 'b' : ''}`
          for (const locale of ['en', 'es'] as const) {
            const images = manifest[locale] as Record<string, string>
            const image = images[art] ?? (manifest.en as Record<string, string>)[art]
            expect(image).toBeTruthy()
            expect(existsSync(resolve(import.meta.dirname, '../../public', `.${image}`))).toBe(true)
          }
        },
      )
    }
  it('does not display the reference of a different scenario for unknown content', () => {
    expect(scenarioReference({ scenarioId: 'unknown', difficulty: 'standard' })).toBeNull()
  })
})
