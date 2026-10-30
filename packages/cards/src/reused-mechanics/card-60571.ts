import { getInvestigator, playerCardDef, registerPlayerCard, type Choice } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { assetsHere, atLocation } from '../dunwich-pilot/helpers'

// RR: Fast, Healing. Field Dressing (1): play after a Creature or Monster enemy at your location
// is defeated: heal up to 3 damage, one at a time, from among investigators and/or Ally assets
// at your location. The player may stop before healing all 3.
const code = '60571'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'enemyDefeated') return []
    const here = getInvestigator(state, investigator).location
    const traits = trigger.enemy.traits ?? []
    if (
      here === null ||
      trigger.enemy.location !== here ||
      !(traits.includes('Creature') || traits.includes('Monster'))
    )
      return []
    return [
      {
        key: 'hand:' + code,
        investigator,
        label: 'ability.playCard',
        params: { card: cardName(code) },
        then: [
          {
            type: 'PlayCard',
            investigator,
            code,
            effect: [continuation(code, investigator, 'heal', { left: 3 })],
          },
        ],
      },
    ]
  },
  effect: (state, investigator, step, data) => {
    const left = Number(data.left)
    if (step !== 'heal' || left < 1) return []
    const next = left > 1 ? [continuation(code, investigator, 'heal', { left: left - 1 })] : []
    const choices: Choice[] = [
      ...atLocation(state, investigator)
        .filter((other) => other.damage > 0)
        .map((other) => ({
          label: 'choice.healDamageOf',
          params: { name: other.name },
          target: { type: 'investigator' as const, id: other.id },
          then: [{ type: 'Heal' as const, investigator: other.id, damage: 1, horror: 0 }, ...next],
        })),
      ...assetsHere(state, investigator)
        .filter((a) => a.damage > 0 && playerCardDef(a.code)?.traits.includes('Ally'))
        .map((a) => ({
          label: 'choice.healDamageOf',
          params: { name: cardName(a.code) },
          target: { type: 'asset' as const, id: a.id },
          then: [{ type: 'HealAsset' as const, asset: a.id, damage: 1, horror: 0 }, ...next],
        })),
    ]
    return choices.length
      ? ask(investigator, [...choices, { label: 'choice.skip', then: [] }], true)
      : []
  },
})
