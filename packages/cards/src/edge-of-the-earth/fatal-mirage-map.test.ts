import { describe, expect, it } from 'vitest'
import { emptyCampaignLog } from '@lcg/engine'
import {
  mirageClueCost,
  mirageDestinations,
  mirageLocation,
  prepareMirageMap,
  PRISON_OF_MEMORIES,
  readMirageMemories,
  recordMirageMemories,
} from './fatal-mirage-map'

describe('Fatal Mirage map (campaign guide, pp. 24–25)', () => {
  it('starts the first visit at the Prison and keeps the other eighteen locations set aside', () => {
    const { locations, setAsideLocations } = prepareMirageMap(1, new Set(), new Set())
    expect(locations).toMatchObject([{ id: PRISON_OF_MEMORIES, shroud: 1, clueValue: 3 }])
    expect(setAsideLocations).toHaveLength(18)
    expect(new Set(setAsideLocations.map(({ id }) => id)).size).toBe(18)
  })

  it('restores discoveries and reduces clues for destinations already present or banished', () => {
    const { locations, setAsideLocations } = prepareMirageMap(
      3,
      new Set(['08558', '08559', '08566']),
      new Set(['08566b', '08573b']),
    )
    expect(locations.map(({ id }) => id)).toEqual([PRISON_OF_MEMORIES, '08558', '08559'])
    expect(locations[0]).toMatchObject({ shroud: 3, clueValue: 1 })
    expect(setAsideLocations.some(({ id }) => id === '08566')).toBe(false)
    expect(setAsideLocations.find(({ id }) => id === '08562')?.clueValue).toBe(0)
  })

  it('uses printed connections and distinguishes the paid ability from clue placement', () => {
    const present = new Set(['08562'])
    expect(mirageDestinations('08557', present)).toEqual(['08561', '08564'])
    expect(mirageLocation('08557', 2, present)).toMatchObject({
      symbol: 'triangle',
      connectsTo: ['circle', 'triangle', 'trefoil', 'square', 'spade'],
      clueValue: 2,
    })
    expect(mirageClueCost('08557', 3, present)).toBe(3)
    expect(mirageClueCost('08566', 3, present)).toBe(6)
    expect(mirageClueCost('08566', 3, new Set(['08577']))).toBeUndefined()
  })

  it('carries discovered locations into later visits and awards story XP only once', () => {
    const first = recordMirageMemories(
      emptyCampaignLog(['investigator']),
      [PRISON_OF_MEMORIES, '08558', '08566', '08570'],
      ['08566b', '08576b', '08576b', '08584'],
    )
    expect(first.storyXp).toBe(3)
    const memories = readMirageMemories(first.log)
    expect([...memories.banished]).toEqual(['08566b', '08576b'])
    expect([...memories.discovered]).toEqual(['08558'])
    const restored = prepareMirageMap(2, memories.discovered, memories.banished)
    expect(restored.locations.map(({ id }) => id)).toEqual([PRISON_OF_MEMORIES, '08558'])
    expect(restored.setAsideLocations.find(({ id }) => id === '08570')?.clueValue).toBe(0)
    const second = recordMirageMemories(first.log, ['08558', '08570'], ['08566b', '08570b'])
    expect(second.storyXp).toBe(2)
    expect([...readMirageMemories(second.log).discovered]).toEqual(['08558'])
  })
})
