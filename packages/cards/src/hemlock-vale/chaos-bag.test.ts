import { newValley, type CampaignLog, type ChaosToken } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import { hemlockValeChaosBag, hemlockValeChaosBags, randomValleyTime } from './chaos-bag'

const log = (fatigue = newValley().fatigue): CampaignLog => ({
  notes: [],
  crossedOut: [],
  values: {},
  chaosTokens: [],
  investigators: {},
  valley: { ...newValley(), fatigue },
})
const context = (difficulty: 'easy' | 'standard' | 'hard' | 'expert', l = log()) => ({
  difficulty,
  log: l,
  seed: 1,
  investigators: [],
})
const numbers = (bag: ChaosToken[]) => bag.filter((t) => typeof t === 'number')

// Guía, p. 3, «Preparación de la campaña», con la errata v2.3 de la FAQ para Experto.
describe('La fiesta del Valle de la Cicuta: bolsa del caos', () => {
  it('usa la bolsa de cada dificultad, sin fallo automático inicial', () => {
    expect(numbers(hemlockValeChaosBags.easy)).toEqual([1, 1, 0, 0, 0, -1, -1, -1, -2, -2, -3])
    expect(numbers(hemlockValeChaosBags.standard)).toEqual([
      1, 0, 0, -1, -1, -1, -2, -2, -3, -3, -4,
    ])
    expect(numbers(hemlockValeChaosBags.hard)).toEqual([
      0, 0, 0, -1, -1, -2, -2, -3, -3, -5, -5, -7,
    ])
    expect(numbers(hemlockValeChaosBags.expert)).toEqual([
      0, -1, -1, -2, -2, -3, -3, -4, -5, -5, -6, -7, -8,
    ])
    for (const bag of Object.values(hemlockValeChaosBags)) {
      expect(bag.filter((t) => typeof t !== 'number')).toEqual(['skull', 'skull', 'elderSign'])
    }
  })

  it('aplica la fatiga anotada al preparar el escenario siguiente', () => {
    const bag = hemlockValeChaosBag(
      context(
        'standard',
        log([
          { from: 1, to: 0 },
          { from: 0, to: -1 },
        ]),
      ),
    )
    expect(numbers(bag)).toEqual([-1, 0, 0, -1, -1, -1, -2, -2, -3, -3, -4])
    expect(hemlockValeChaosBag(context('hard'))).toEqual(hemlockValeChaosBags.hard)
  })

  it('elige día y hora al azar de forma reproducible en partidas independientes', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 60; seed++) {
      const time = randomValleyTime(seed)
      expect(randomValleyTime(seed)).toEqual(time)
      seen.add(`${time.time}${time.day}`)
    }
    expect(seen.size).toBe(6)
  })
})
