import { registerScenario } from '@lcg/engine'
import { guestAbilities } from './guests'
import { runSpecific } from './helpers'
import { locationReactions } from './locations'
import { enemyDefeatEffects } from './enemies'
import './encounters'
import './plot'
import { specific } from './helpers'
import { C, CARNEVALE, carnevaleSetup } from './setup'
import { across, around, ring } from './topology'
import { tokenEffect } from './tokens'
import { resolutionStory } from './resolutions'

registerScenario({
  id: CARNEVALE,
  rulesVersion: 1,
  tokenEffect,
  resolution: resolutionStory,
  abilities: (s, _self, investigator) => guestAbilities(s, investigator),
  specific: runSpecific,
  reactions: locationReactions,
  sequentialEnemyMovement: true,
  simultaneousAssetAssignment: true,
  forced: enemyDefeatEffects,
  insteadOfEncounterDraw: (s, investigator) =>
    s.acts[s.actIndex]?.code === C.row
      ? [specific('carnevaleRowEncounter', { investigator })]
      : null,
  enemyConnections: (state, location, enemy) => {
    const destination =
      enemy?.code === C.lagorio
        ? around(ring(state), location, -1)
        : enemy?.code === C.corvi
          ? across(ring(state), location)
          : null
    return destination && state.locations[destination] ? [destination] : []
  },
  enemyStat: (s, enemy, stat, _source, investigatorId) => {
    if (enemy.code !== C.neri) return 0
    const investigator = s.investigators.find((i) => i.id === investigatorId)
    return investigator?.skills[stat === 'fight' ? 'combat' : 'agility'] ?? 0
  },
})

export const carnevaleOfHorrors = carnevaleSetup
