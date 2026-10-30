import { attackDamage, getInvestigator, type Choice, type Message } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask } from '../dunwich-pilot/effects'
// RR: Uses; Fight; ST.7. .45 Thompson (3): +2 [combat] and +1 damage. On a success by at least
// X, it may spend 1 more ammo to deal the attack's damage to another enemy at your location,
// where X is that enemy's fight value. Optional, and only while ammo remains.
const code = '05187'
registerBasicAsset(
  code,
  [
    {
      action: 'fight',
      cost: ['use'],
      modifier: 2,
      extraDamage: 1,
      onSuccess: ({ self, investigator }, enemy) => [
        {
          type: 'PlayerCardEffect',
          code,
          investigator,
          step: 'spray',
          data: { asset: self.id, enemy: enemy!.id },
        },
      ],
    },
  ],
  () => ({
    effect: (state, investigator, step, data) => {
      const test = state.skillTest,
        asset = state.assets[String(data.asset)],
        here = getInvestigator(state, investigator).location
      if (step !== 'spray' || !test || !asset || asset.uses < 1 || here === null) return []
      const margin = (test.modifiedSkill ?? 0) - test.difficulty
      const damage = attackDamage(state, test)
      const choices = Object.values(state.enemies)
        .filter((e) => e.location === here && e.id !== data.enemy && e.fight <= margin)
        .map((e): Choice => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [
            { type: 'SpendUses', asset: asset.id, amount: 1 },
            { type: 'DamageEnemy', enemy: e.id, amount: damage, by: investigator },
          ] as Message[],
        }))
      return choices.length
        ? ask(investigator, [...choices, { label: 'choice.skip', then: [] }], true)
        : []
    },
  }),
)
