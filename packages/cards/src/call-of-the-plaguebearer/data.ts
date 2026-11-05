import { copies, enemy, treachery } from '../scenario-helpers'
import { C } from './helpers'

export const greyson = enemy({
  code: C.greyson,
  name: 'Agent Greyson',
  traits: ['Humanoid', 'Agency', 'Elite'],
  fight: 3,
  health: 3,
  healthPerInvestigator: true,
  evade: 3,
  damage: 2,
  horror: 1,
  keywords: ['alert', 'retaliate'],
  victory: 2,
  encounterBack: false,
})
export const first = enemy({
  code: C.first,
  name: 'First Among Many',
  traits: ['Humanoid', 'Infected', 'Monster', 'Elite'],
  fight: 2,
  health: 5,
  healthPerInvestigator: true,
  evade: 2,
  damage: 2,
  horror: 2,
  keywords: ['hunter', 'massive'],
  victory: 2,
  prey: { type: 'mostTreacheries', trait: 'Terror' },
  encounterBack: false,
})
export const troubleshooter = enemy({
  code: C.troubleshooter,
  name: 'Agency Troubleshooter',
  traits: ['Humanoid', 'Agency'],
  fight: 4,
  health: 3,
  evade: 1,
  damage: 2,
  horror: 0,
  keywords: ['hunter', 'retaliate'],
})
export const panicked = enemy({
  code: C.panicked,
  name: 'Panicked Agent',
  traits: ['Humanoid', 'Agency'],
  fight: 2,
  health: 2,
  evade: 3,
  damage: 1,
  horror: 0,
  keywords: ['alert'],
})
export const supplicant = enemy({
  code: C.supplicant,
  name: 'Twisted Supplicant',
  traits: ['Monster', 'Infected'],
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  prey: { type: 'mostTreacheries', trait: 'Terror' },
})
export const thrall = enemy({
  code: C.thrall,
  name: 'Mindless Thrall',
  traits: ['Humanoid', 'Infected'],
  fight: 1,
  health: 1,
  evade: 2,
  damage: 0,
  horror: 0,
  keywords: ['aloof'],
})
export const devoted = enemy({
  code: C.devoted,
  name: 'Worshipful Thrall',
  traits: ['Humanoid', 'Infected'],
  fight: 4,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['aloof'],
  victory: 1,
})
export const treacheries = [
  treachery({ code: C.evidence, name: 'Jury-Rigged Incendiary', traits: ['Trap'], keywords: [] }),
  treachery({ code: C.suppression, name: 'Suppressing Fire', traits: ['Hazard'], keywords: [] }),
  treachery({ code: C.hands, name: 'Idle Hands', traits: ['Terror'], keywords: [] }),
  treachery({ code: C.skin, name: 'Under Your Skin', traits: ['Terror'], keywords: [] }),
  treachery({ code: C.urge, name: 'Driving Urge', traits: ['Madness'], keywords: [] }),
  treachery({ code: C.another, name: 'Not Yourself', traits: ['Terror'], keywords: [] }),
]
export const sharedDeck = () => [
  ...copies(panicked, 2),
  ...copies(thrall, 3),
  devoted,
  ...treacheries.flatMap((c) => copies(c, c.code === C.suppression || c.code === C.urge ? 3 : 2)),
]
