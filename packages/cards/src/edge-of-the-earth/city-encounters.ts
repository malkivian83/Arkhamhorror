import type { EncounterCard, EnemyCard } from '@lcg/engine'
import { copies, enemy, treachery } from '../scenario-helpers'
import { ENCOUNTER_SETS } from '../the-path-to-carcosa/encounter-sets'
import { BENIGN, CITY_TERROR, REAWAKENED, type CityVersion } from './city-cards'
import { peaksEncounters } from './forbidden-peaks-cards'
import { creatures, encounters } from './ice-and-death-cards'
import {
  blasphemousVisions,
  glimpseTheUnspeakable,
  miasmaticTorment,
  nebulousMiasma,
  nightmarishVapors,
} from './mirage-shared-encounters'

const elderThing = ['Monster', 'Elder Thing']
export const cityTerror = (players: number): EnemyCard =>
  enemy({
    code: CITY_TERROR,
    name: 'Terror of the Stars',
    fight: 4,
    health: 3 + 3 * players,
    evade: 3,
    damage: 2,
    horror: 2,
    keywords: ['hunter', 'massive'],
    traits: ['Monster', 'Eidolon', 'Elite'],
    victory: 1,
  })
export const benign = enemy({
  code: BENIGN,
  name: 'Benign Elder Thing',
  fight: 1,
  health: 1,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: [],
  traits: elderThing,
})
export const reawakened = enemy({
  code: REAWAKENED,
  name: 'Reawakened Elder Thing',
  fight: 2,
  health: 3,
  evade: 1,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  traits: elderThing,
})
export const albinoPenguin = enemy({
  code: '08708',
  name: 'Giant Albino Penguin',
  fight: 2,
  health: 3,
  evade: 2,
  damage: 1,
  horror: 1,
  keywords: ['aloof'],
  traits: ['Creature'],
})
const shoggoth = ['Monster', 'Shoggoth']
export const forgottenShoggoth = enemy({
  code: '08710',
  name: 'Forgotten Shoggoth',
  fight: 3,
  health: 6,
  evade: 2,
  damage: 1,
  horror: 2,
  keywords: ['hunter'],
  traits: shoggoth,
})
export const rampagingShoggoth = (players: number): EnemyCard =>
  enemy({
    code: '08711',
    name: 'Rampaging Shoggoth',
    fight: 3,
    health: 4 + 2 * players,
    evade: 1,
    damage: 2,
    horror: 1,
    keywords: ['hunter', 'massive'],
    traits: [...shoggoth, 'Elite'],
    victory: 1,
  })
const hazard = (code: string, name: string, quantity: number, trait = 'Hazard') =>
  copies(treachery({ code, name, traits: [trait], keywords: [] }), quantity)

const cityTreacheries = [
  ...hazard('08644', 'Dawning of the Truth', 3, 'Terror'),
  ...hazard('08645', 'Crumbling Ruins', 3),
]
const elderThings = peaksEncounters.filter(({ code }) => ['08695', '08696', '08697'].includes(code))
const miasma = [miasmaticTorment, nebulousMiasma].flatMap((card) => copies(card, 2))
const namelessHorrors = [blasphemousVisions, glimpseTheUnspeakable, nightmarishVapors].flatMap(
  (card) => copies(card, 2),
)
const penguins = [...copies(albinoPenguin, 2), ...hazard('08709', 'Wuk! Wuk! Wuk!', 2)]
const shoggoths = (players: number) => [...copies(forgottenShoggoth, 2), rampagingShoggoth(players)]
const silence = encounters.filter(({ code }) => code === '08712' || code === '08713')

/** Campaign guide, pp. 37–38: the encounter sets of each version and the set-aside ones. */
export function cityEncounters(
  version: CityVersion,
  players: number,
): { encounterDeck: EncounterCard[]; setAside: EncounterCard[] } {
  switch (version) {
    case 1:
      return {
        encounterDeck: [
          ...copies(reawakened, 3),
          ...cityTreacheries,
          ...elderThings,
          ...miasma,
          ...namelessHorrors,
          ...penguins,
          ...ENCOUNTER_SETS.lockedDoors,
        ],
        setAside: [...shoggoths(players), cityTerror(players)],
      }
    case 2:
      return {
        encounterDeck: [
          ...copies(reawakened, 3),
          ...cityTreacheries,
          ...elderThings,
          ...namelessHorrors,
          ...penguins,
          ...silence,
          ...ENCOUNTER_SETS.chillingCold,
        ],
        setAside: [...creatures],
      }
    case 3:
      return {
        encounterDeck: [
          ...copies(benign, 3),
          ...cityTreacheries,
          ...creatures,
          ...miasma,
          ...penguins,
          ...ENCOUNTER_SETS.chillingCold,
          ...ENCOUNTER_SETS.lockedDoors,
        ],
        setAside: shoggoths(players),
      }
  }
}
