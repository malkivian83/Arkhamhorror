import { copies, enemy, treachery } from '../scenario-helpers'
import { C } from './codes'

// El objetivo lo lleva a la zona de victoria sin otorgar experiencia impresa.
export const cnidathqua = enemy({
  code: C.cnidathqua,
  name: 'Cnidathqua',
  traits: ['Monster', 'Ancient One', 'Elite'],
  fight: 4,
  health: 8,
  healthPerInvestigator: true,
  evade: 0,
  cannotBeEvaded: true,
  global: true,
  damage: 2,
  horror: 2,
  keywords: [],
  victory: 0,
})
export const balefulReveler = enemy({
  code: C.reveler,
  name: 'Baleful Reveler',
  traits: ['Humanoid', 'Cultist', 'Elite'],
  fight: 4,
  health: 5,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  victory: 2,
})
export const poleman = enemy({
  code: C.poleman,
  name: 'Poleman',
  traits: ['Monster', 'Deep One'],
  fight: 4,
  health: 4,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  spawnAt: C.canal,
  prey: { type: 'mostAssets', code: C.innocent },
})
export const sentinel = enemy({
  code: C.sentinel,
  name: 'Carnevale Sentinel',
  traits: ['Humanoid', 'Cultist'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 2,
  horror: 0,
  keywords: ['retaliate'],
})
export const appendage = enemy({
  code: C.appendage,
  name: 'Writhing Appendage',
  traits: ['Monster', 'Tentacle'],
  fight: 2,
  health: 2,
  evade: 4,
  damage: 1,
  horror: 0,
  keywords: ['retaliate'],
})
export const TREACHERIES = [
  treachery({ code: C.hysteria, name: 'Mass Hysteria', traits: ['Hazard'], keywords: ['peril'] }),
  treachery({ code: C.lost, name: 'Lost in Venice', traits: ['Blunder'], keywords: ['peril'] }),
  treachery({ code: C.gaze, name: "Watchers' Gaze", traits: ['Terror'], keywords: [] }),
  treachery({ code: C.water, name: 'Chaos in the Water', traits: ['Hazard'], keywords: [] }),
  treachery({ code: C.mesmerize, name: 'Mesmerize', traits: ['Hex'], keywords: [] }),
  treachery({ code: C.abduction, name: 'Abduction', traits: ['Scheme'], keywords: [] }),
  treachery({ code: C.miasma, name: 'Acrid Miasma', traits: ['Hazard'], keywords: [] }),
]
export const encounterDeck = () => [
  ...copies(poleman, 2),
  ...copies(sentinel, 3),
  ...copies(appendage, 3),
  ...TREACHERIES.flatMap((card, index) => copies(card, index < 4 ? 3 : 2)),
]
