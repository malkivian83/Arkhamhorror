import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  scenarioBehavior,
  type Choice,
} from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'
import { assetsHere, atLocation } from '../dunwich-pilot/helpers'
// RR: "Then", Healing. Bizarre Diagnosis: place 1 of your clues on your location; only then
// heal 3 damage from an investigator or an Ally asset at your location.
const code = '09046'
const targets = (state: Parameters<typeof atLocation>[0], investigator: string): Choice[] => [
  ...atLocation(state, investigator)
    .filter((other) => other.damage > 0)
    .map((other): Choice => ({
      label: 'choice.pilotHealDamage',
      params: { n: 3, name: other.name },
      target: { type: 'investigator', id: other.id },
      then: [{ type: 'Heal', investigator: other.id, damage: 3, horror: 0 }],
    })),
  ...assetsHere(state, investigator)
    .filter((a) => a.damage > 0 && playerCardDef(a.code)?.traits.includes('Ally'))
    .map((a): Choice => ({
      label: 'choice.pilotHealDamage',
      params: { n: 3, name: playerCardDef(a.code)!.name },
      target: { type: 'asset', id: a.id },
      then: [{ type: 'HealAsset', asset: a.id, damage: 3, horror: 0 }],
    })),
]
registerPlayerCard({
  code,
  canPlay: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    return (
      me.clues > 0 &&
      me.location !== null &&
      !scenarioBehavior(state.scenarioId)?.cannotPlaceClues?.(state, me.location)
    )
  },
  play: (_state, investigator) => [
    { type: 'PlaceCluesOnLocation', investigator, amount: 1 },
    continuation(code, investigator, 'heal'),
  ],
  effect: (state, investigator) => {
    const choices = targets(state, investigator)
    return choices.length
      ? [
          {
            type: 'Ask',
            investigator,
            question: { kind: 'chooseOne', prompt: 'prompt.pilotTarget', choices },
          },
        ]
      : []
  },
})
