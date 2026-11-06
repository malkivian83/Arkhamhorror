import { attackBlocked, fightEnemies, registerPlayerCard, type Choice } from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

registerPlayerCard({
  code: '08732',
  abilities: (state, self, investigator) => {
    if (self.uses < 1) return []
    const targets = fightEnemies(state, investigator).filter(
      (enemy) => !attackBlocked(state, investigator, enemy, self.code),
    )
    if (!targets.length) return []
    return [
      {
        key: `${self.id}:fight`,
        label: 'ability.fightWith',
        params: { card: cardName(self.code) },
        actionKind: 'fight',
        actions: 1,
        provokes: false,
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: ask(
          investigator,
          targets.map((enemy): Choice => ({
            label: 'choice.enemy',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            then: ask(
              investigator,
              [true, false].map((replace): Choice => ({
                label: replace
                  ? 'choice.edgeOfTheEarth.memorialBase'
                  : 'choice.edgeOfTheEarth.memorialBoost',
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator,
                    skill: 'combat',
                    difficulty: enemy.fight,
                    ...(replace ? { baseSkill: 5 } : { modifier: 2 }),
                    source: self.id,
                    kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
                  },
                ],
              })),
            ),
          })),
        ),
      },
    ]
  },
})
