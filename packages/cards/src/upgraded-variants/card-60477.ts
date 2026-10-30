import {
  assetVitals,
  enemiesAt,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

// RR: Committing; Max 1 committed per skill test; Dealing Damage. Blood Curse (3): if the test
// succeeds, its owner must deal 1 damage to a card with health at their location (an enemy,
// an investigator or an asset with health), chosen when the effect resolves.
const code = '60477'
registerPlayerCard({
  code,
  afterCommittedTest: (state, _test, success, by) => {
    const here = getInvestigator(state, by).location
    if (!success || here === null) return []
    const people = atLocation(state, by)
    const owners = new Set(people.map((i) => i.id))
    const choices: Choice[] = [
      ...enemiesAt(state, here).map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'DamageEnemy', enemy: e.id, amount: 1, by, source: { code } }],
      })),
      ...people.map((i): Choice => ({
        label: 'choice.investigator',
        params: { name: i.name },
        target: { type: 'investigator', id: i.id },
        then: [{ type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0 }],
      })),
      ...Object.values(state.assets)
        .filter((a) => owners.has(a.owner) && assetVitals(a).health !== undefined)
        .map((a): Choice => ({
          label: 'choice.assignToAsset',
          params: { card: playerCardDef(a.code)!.name },
          target: { type: 'asset', id: a.id },
          then: [{ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 }],
        })),
    ]
    return ask(by, choices, true)
  },
})
