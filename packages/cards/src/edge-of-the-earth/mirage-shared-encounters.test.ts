import { dispatch, emptyCampaignLog, registerScenario } from '@lcg/engine'
import { choose, newTestGame } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { fatalMirageExploration } from './fatal-mirage-exploration'
import { fatalMirage } from './fatal-mirage'
import {
  blasphemousVisions,
  glimpseTheUnspeakable,
  madnessWithin,
  miasmaticTorment,
  nebulousMiasma,
  nightmarishVapors,
  primordialEvil,
} from './mirage-shared-encounters'
import { registerTekelili } from './tekelili'

registerScenario(fatalMirageExploration)
registerTekelili()
const duringMirage = () => ({
  ...newTestGame({ scenario: { id: fatalMirageExploration.id, chaosBag: [-1] } }),
  queue: [],
  pending: null,
  tekeliliDeck: ['08723'],
})

describe('Shared encounters in Fatal Mirage', () => {
  it('builds the complete encounter deck and restores the third visit setup', () => {
    const log = emptyCampaignLog(['a'])
    const context = { difficulty: 'expert' as const, investigators: ['a'], seed: 1, log }
    const first = fatalMirage(context)
    expect(first.encounterDeck).toHaveLength(38)
    expect(first.agendas[0]?.code).toBe('08550')
    const third = fatalMirage({
      ...context,
      log: {
        ...log,
        values: {
          edgeOfTheEarthMirageVisits: '2',
          edgeOfTheEarthDiscoveredMemories: '08557',
          edgeOfTheEarthBanishedMemories: '08577b',
        },
      },
    })
    expect(third.agendas[0]?.code).toBe('08552')
    expect(third.locations.map(({ id }) => id)).toEqual(['08556', '08557'])
    expect(third.setup).toContainEqual({ type: 'PlaceDoom', amount: 2 })
    expect(third.setup).toContainEqual({
      type: 'ScenarioSpecific',
      key: 'mirageRestoreVictory',
      data: { codes: '08577b' },
    })
  })
  it('uses one Tekeli-li or attacks when the deck is empty', () => {
    // RR: "Forced Abilities".
    const spawned = dispatch(duringMirage(), {
      type: 'SpawnEnemy',
      card: primordialEvil,
      location: 'A',
      engageWith: null,
    })
    const id = Object.keys(spawned.enemies)[0]!
    const hit = { type: 'DamageEnemy' as const, enemy: id, amount: 1, by: 'a' }
    const shuffled = dispatch(spawned, hit)
    expect(shuffled.investigators[0]?.deck).toContain('08723')
    const attacked = dispatch(shuffled, hit)
    expect(attacked.investigators[0]).toMatchObject({ damage: 2, horror: 1 })
  })

  it('takes horror for the portion of a failed test that cannot be paid in weaknesses', () => {
    const state = dispatch(
      { ...duringMirage(), encounterDeck: [madnessWithin] },
      {
        type: 'DrawEncounterCard',
        investigator: 'a',
      },
    )
    expect(state.investigators[0]?.deck).toContain('08723')
    expect(state.investigators[0]?.horror).toBe(1)
  })

  it('shuffles two weaknesses when choosing that option for Nightmarish Vapors', () => {
    const state = dispatch(
      {
        ...duringMirage(),
        encounterDeck: [nightmarishVapors],
        tekeliliDeck: ['08723', '08724'],
      },
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    const resolved = choose(state, 'choice.edgeOfTheEarth.mirageTwoTekelili')
    expect(resolved.tekeliliDeck).toEqual([])
    expect(resolved.investigators[0]?.deck).toEqual(expect.arrayContaining(['08723', '08724']))
  })

  it('attaches Nebulous Miasma, inflicts direct horror and discards it at round end', () => {
    const state = dispatch(
      { ...duringMirage(), encounterDeck: [nebulousMiasma] },
      {
        type: 'DrawEncounterCard',
        investigator: 'a',
      },
    )
    expect(Object.values(state.treacheries)[0]?.placement).toEqual({
      type: 'location',
      location: 'A',
    })
    const horrified = dispatch(state, {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    expect(horrified.investigators[0]?.horror).toBe(1)
    const expired = dispatch(horrified, { type: 'Forced', trigger: { type: 'roundEnds' } })
    expect(expired.treacheries).toEqual({})
  })

  it('repeats the effects of a Tekeli-li weakness with Blasphemous Visions', () => {
    const attached = dispatch(
      { ...duringMirage(), encounterDeck: [blasphemousVisions] },
      {
        type: 'DrawEncounterCard',
        investigator: 'a',
      },
    )
    const drawn = dispatch(attached, { type: 'ResolveWeakness', investigator: 'a', code: '08723' })
    expect(drawn.investigators[0]?.horror).toBe(2)
    expect(drawn.tekeliliDeck).toEqual(['08723'])
  })

  it('resolves a weakness drawn by Glimpse and shuffles it into the chosen deck', () => {
    const players = newTestGame({
      players: ['a', 'b'],
      scenario: { id: fatalMirageExploration.id },
    })
    const drawn = dispatch(
      {
        ...players,
        queue: [],
        pending: null,
        encounterDeck: [glimpseTheUnspeakable],
        tekeliliDeck: ['08723'],
      },
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    expect(drawn.investigators[0]?.horror).toBe(1)
    const resolved = choose(drawn, 'choice.edgeOfTheEarth.mirageGlimpseRecipient', { name: 'B' })
    expect(resolved.investigators[0]?.deck).not.toContain('08723')
    expect(resolved.investigators[1]?.deck).toContain('08723')
    expect(resolved.campaignLog?.investigators.b?.storyAssets).toContain('08723')
  })

  it('keeps a tormented partner exhausted and harms it at the end of the turn', () => {
    const state = dispatch(
      {
        ...duringMirage(),
        assets: {
          partner: {
            id: 'partner',
            code: '08722',
            owner: 'a',
            expeditionPartner: '08722',
            exhausted: false,
            damage: 0,
            horror: 0,
            uses: 0,
          },
        },
        encounterDeck: [miasmaticTorment],
      },
      { type: 'DrawEncounterCard', investigator: 'a' },
    )
    const readied = dispatch(state, { type: 'ReadyAsset', asset: 'partner' })
    expect(readied.assets.partner?.exhausted).toBe(true)
    const prompted = dispatch(readied, {
      type: 'Forced',
      trigger: { type: 'turnEnds', investigator: 'a' },
    })
    const hurt = choose(prompted, 'choice.edgeOfTheEarth.miragePartnerHorror')
    expect(hurt.assets.partner?.horror).toBe(1)
  })
})
