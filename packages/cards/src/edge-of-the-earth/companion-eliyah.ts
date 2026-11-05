import {
  engagedEnemies,
  playerCardDef,
  turnActionTiming,
  type AbilitiesFn,
  type Asset,
  type Choice,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

export function eliyah(fast: boolean): AbilitiesFn<Asset> {
  return (state, self, investigator) => {
    if (self.exhausted || self.uses < 1 || (fast && !turnActionTiming(state, investigator)))
      return []
    const enemies = engagedEnemies(state, investigator)
    if (!enemies.length) return []
    return [
      {
        key: `${self.id}:evade`,
        label: 'ability.edgeOfTheEarth.evade',
        params: { card: playerCardDef(self.code)?.name ?? self.code },
        actionKind: 'evade',
        actions: fast ? 0 : 1,
        provokes: false,
        costs: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'ExhaustAsset', asset: self.id },
        ],
        then: ask(
          investigator,
          enemies.map((enemy): Choice => ({
            label: 'choice.enemy',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'agility',
                difficulty: enemy.evade,
                baseSkill: fast ? 6 : 5,
                kind: {
                  type: 'evade',
                  enemy: enemy.id,
                  onSuccess: [{ type: 'ChooseMove', investigator }],
                },
              },
            ],
          })),
        ),
      },
    ]
  }
}
