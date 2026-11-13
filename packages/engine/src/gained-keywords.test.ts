// RR: Aloof ("does not engage when it spawns"), Keywords gained or lost by card effects.
import { expect, it } from 'vitest'
import { registerScenario } from './index'
import { during, ghoul, keep, newTestGame } from './testing'
import type { GameState } from './types'

registerScenario({
  id: 'gained-aloof-test',
  enemyKeyword: (_s, enemy, keyword) =>
    keyword === 'aloof' && enemy.code === ghoul.code ? true : null,
})

const spawnFromEncounter = (s: GameState): GameState =>
  during(s, keep, {
    type: 'ResolveEncounterCard',
    investigator: 'a',
    card: ghoul,
    withoutDraw: true,
  })

it('an enemy that gains aloof does not engage the investigator it spawns at', () => {
  const s = spawnFromEncounter(newTestGame({ scenario: { id: 'gained-aloof-test' } }))
  const enemy = Object.values(s.enemies)[0]!
  expect(enemy.location).toBe('A')
  expect(enemy.engagedWith).toBeNull()
})

it('an enemy without aloof engages the investigator it spawns at', () => {
  const s = spawnFromEncounter(newTestGame())
  expect(Object.values(s.enemies)[0]!.engagedWith).toBe('a')
})
