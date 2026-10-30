import { registerPlayerCard } from '@lcg/engine'
import { mayChoose } from '../core-2026/player-cards'
import { attackable, cardName } from '../dunwich-pilot/effects'

// RR: Fight, Exhaust. Pocketknife: [action] Fight using combat or agility, +1 skill value. If
// this attack defeats an enemy, you may exhaust it (if ready) to gain 1 resource.
const code = '60559'
registerPlayerCard({
  code,
  abilities: (state, self, investigator) =>
    attackable(state, investigator).flatMap((enemy) =>
      (['combat', 'agility'] as const).map((skill) => ({
        key: `${self.id}:fight:${skill}`,
        label: 'ability.fightWithSkill',
        params: { card: cardName(code), enemy: enemy.name, skill },
        target: { type: 'enemy' as const, id: enemy.id },
        actions: 1,
        provokes: false,
        then: [
          {
            type: 'BeginSkillTest' as const,
            investigator,
            source: self.id,
            skill,
            difficulty: enemy.fight,
            modifier: 1,
            kind: {
              type: 'fight' as const,
              enemy: enemy.id,
              onDefeat: [
                {
                  type: 'PlayerCardEffect' as const,
                  code,
                  investigator,
                  step: 'resource',
                  data: { asset: self.id },
                },
              ],
            },
          },
        ],
      })),
    ),
  effect: (state, investigator, step, data) => {
    const asset = state.assets[String(data.asset)]
    return step === 'resource' && asset && !asset.exhausted
      ? [
          mayChoose(investigator, 'ability.gainResource', { card: cardName(code) }, [
            { type: 'ExhaustAsset', asset: asset.id },
            { type: 'GainResources', investigator, amount: 1 },
          ]),
        ]
      : []
  },
})
