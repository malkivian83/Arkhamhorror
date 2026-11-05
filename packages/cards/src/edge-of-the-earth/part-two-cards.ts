import { type EnemyCard, type ExpeditionPartner } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'

export const possessedPartners = {
  '08714': '08535',
  '08715': '08536',
  '08716': '08537',
  '08717': '08538',
  '08718': '08539',
  '08719': '08540',
  '08720': '08541',
  '08721': '08542',
  '08722': '08543',
} as const satisfies Record<ExpeditionPartner, string>

export const partnerForEnemy = Object.fromEntries(
  Object.entries(possessedPartners).map(([partner, code]) => [code, partner as ExpeditionPartner]),
)

const traits = ['Humanoid', 'Possessed']
export const possessed: EnemyCard[] = (
  [
    ['08535', 'Professor William Dyer', 4, 2, 2, 0, 2],
    ['08536', 'Danforth', 2, 2, 4, 0, 2],
    ['08537', 'Eliyah Ashevak', 1, 3, 4, 1, 1],
    ['08538', 'Dr. Mala Sinha', 3, 2, 4, 1, 1],
    ['08539', 'Avery Claypool', 1, 3, 3, 2, 1],
    ['08540', 'James "Cookie" Fredericks', 3, 4, 1, 2, 0],
    ['08541', 'Dr. Amy Kensler', 4, 2, 3, 1, 1],
    ['08542', 'Roald Ellsworth', 3, 2, 1, 1, 2],
    ['08543', 'Takada Hiroko', 3, 3, 3, 2, 0],
  ] as const
).map(([code, name, fight, health, evade, damage, horror]) =>
  enemy({
    code,
    name,
    fight,
    health,
    evade,
    damage,
    horror,
    traits: [...traits, 'Elite'],
    keywords: code === '08540' ? ['retaliate'] : [],
    victory: 1,
  }),
)

export const searchStories = [
  ['08527', 'Dead End'],
  ['08528', 'Cracks in the Ice'],
  ['08529', 'Somber Remains'],
  ['08530', 'Disappearing Footprints'],
  ['08531', 'Dissected Explorer'],
  ['08532', 'Evil Within'],
  ['08533', 'Bloody Evidence'],
  ['08534', 'Madness Inside'],
].map(([code, name]) => treachery({ code: code!, name: name!, traits: [], keywords: [] }))

export const leftBehind = [
  ...copies(
    enemy({
      code: '08700',
      name: 'Lost Researcher',
      fight: 1,
      health: 1,
      evade: 1,
      damage: 1,
      horror: 1,
      traits,
      keywords: [],
      startingDoom: 1,
    }),
    2,
  ),
  ...copies(
    enemy({
      code: '08701',
      name: 'Frenzied Explorer',
      fight: 2,
      health: 2,
      evade: 2,
      damage: 1,
      horror: 1,
      traits,
      keywords: [],
      startingDoom: 1,
    }),
    2,
  ),
  ...copies(
    treachery({ code: '08702', name: 'Abandoned to Madness', traits: ['Curse'], keywords: [] }),
    2,
  ),
]
