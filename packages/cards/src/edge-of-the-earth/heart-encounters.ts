import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  registerEnemy,
  registerTreachery,
  type EncounterCard,
  type EnemyCard,
} from '@lcg/engine'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { ENCOUNTER_SETS, SETS } from '../the-path-to-carcosa/encounter-sets'
import { albinoPenguin, forgottenShoggoth, rampagingShoggoth } from './city-encounters'
import { heartMessage, GATE, collapsed, isPylon, seals, sealLocation } from './heart-common'
import {
  primordialEvil,
  madnessWithin,
  miasmaticTorment,
  nebulousMiasma,
  blasphemousVisions,
  glimpseTheUnspeakable,
  nightmarishVapors,
} from './mirage-shared-encounters'

export const namelessMadness = enemy({
  code: '08679',
  name: 'The Nameless Madness',
  fight: 1,
  evade: 1,
  health: 1,
  damage: 1,
  horror: 1,
  traits: ['Ancient One', 'Eidolon', 'Elite'],
  keywords: ['alert', 'massive', 'retaliate'],
  encounterBack: false,
})
export const protoplasmicMass = enemy({
  code: '08669',
  name: 'Protoplasmic Mass',
  fight: 6,
  evade: 3,
  health: 4,
  damage: 1,
  horror: 1,
  traits: ['Monster', 'Shoggoth'],
  keywords: ['hunter'],
})
export const unsealedPhantasm = enemy({
  code: '08680',
  name: 'Unsealed Phantasm',
  fight: 5,
  evade: 4,
  health: 5,
  damage: 2,
  horror: 2,
  traits: ['Monster', 'Eidolon', 'Shoggoth'],
  keywords: [],
  victory: 1,
})
registerEnemy({
  code: '08679',
  forced: (_s, t, self) =>
    t.type === 'skillTestEnded' &&
    t.succeeded &&
    t.enemy === self.id &&
    (t.kind === 'fight' || t.kind === 'evade')
      ? [heartMessage('exhaustNearest', { investigator: t.investigator, amount: t.margin })]
      : [],
})
registerEnemy({
  code: '08669',
  spawn: (s, by) => {
    const at = getInvestigator(s, by).location
    if (!at) return []
    const d = distancesFrom(s, at),
      outer = Object.values(s.locations).filter(
        (l) =>
          l.position &&
          Math.max(Math.abs(l.position[0] - 6), Math.abs(l.position[1] - 6)) === 6 &&
          d.has(l.id),
      )
    const max = Math.max(...outer.map((l) => d.get(l.id)!))
    return outer.filter((l) => d.get(l.id) === max).map((l) => l.id)
  },
})
registerEnemy({
  code: '08680',
  spawn: (s, by) => {
    const here = getInvestigator(s, by).location
    if (!here) return []
    const d = distancesFrom(s, here),
      places = Object.values(s.locations).filter(
        (l) => isPylon(l.id) && l.revealed && !collapsed(s, l.id) && d.has(l.id),
      )
    if (!places.length) return [here]
    const near = Math.min(...places.map((l) => d.get(l.id)!))
    return places.filter((l) => d.get(l.id) === near).map((l) => l.id)
  },
})
for (const [code, skill] of [
  ['08657', 'willpower'],
  ['08658', 'agility'],
] as const)
  registerTreachery({
    code,
    revelation: (s, by) => {
      const here = getInvestigator(s, by).location,
        dist = here ? (distancesFrom(s, here).get(GATE) ?? 0) : 0
      return [
        effectTest(by, code, skill, 2 + dist, {
          onFail: [
            {
              type: 'TakeDamage',
              investigator: by,
              damage: code === '08658' ? 2 : 0,
              horror: code === '08657' ? 2 : 0,
            },
          ],
        }),
      ]
    },
  })
registerTreachery({
  code: '08670',
  revelation: (s) =>
    activeInvestigators(s).flatMap((i) => {
      const local = seals(s).filter((t) => sealLocation(s, t) === i.location)
      return local.length
        ? [
            {
              type: 'TakeDamage' as const,
              investigator: i.id,
              damage: Number(local.some((t) => t.active)),
              horror: 1,
            },
          ]
        : []
    }),
})

/** Exact encounter-set membership; unused cards are removed, not left in the discard. */
export function heartDeck(
  part: 1 | 2,
  players: number,
): { encounterDeck: EncounterCard[]; setAside: EnemyCard[] } {
  const base: EncounterCard[] = [
    ...copies(
      treachery({ code: '08657', name: 'Primeval Terror', traits: ['Terror'], keywords: [] }),
      3,
    ),
    ...copies(
      treachery({ code: '08658', name: 'Roots of the Earth', traits: ['Hazard'], keywords: [] }),
      3,
    ),
    ...copies(miasmaticTorment, 2),
    ...copies(nebulousMiasma, 2),
    ...copies(blasphemousVisions, 2),
    ...copies(glimpseTheUnspeakable, 2),
    ...copies(nightmarishVapors, 2),
    ...copies(albinoPenguin, 2),
    ...copies(treachery({ code: '08709', name: 'Wuk! Wuk! Wuk!', keywords: [] }), 2),
    ...ENCOUNTER_SETS.ancientEvils,
  ]
  if (part === 1)
    return {
      encounterDeck: [
        ...base,
        ...copies(protoplasmicMass, 2),
        ...copies(
          treachery({
            code: '08670',
            name: 'Electrostatic Discharge',
            traits: ['Hazard'],
            keywords: ['surge'],
          }),
          2,
        ),
        ...copies(forgottenShoggoth, 2),
        rampagingShoggoth(players),
        ...ENCOUNTER_SETS.lockedDoors,
      ],
      setAside: [],
    }
  return {
    encounterDeck: [
      ...base,
      ...copies(unsealedPhantasm, 2),
      ...copies(primordialEvil, 2),
      ...copies(madnessWithin, 2),
      ...ENCOUNTER_SETS.chillingCold,
      ...ENCOUNTER_SETS.strikingFear.filter((c) => c.code !== SETS.rottingRemains),
    ],
    setAside: copies(namelessMadness, 15),
  }
}
