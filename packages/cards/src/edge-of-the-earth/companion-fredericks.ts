import {
  attackBlocked,
  fightEnemies,
  turnActionTiming,
  type AbilitiesFn,
  type Asset,
  type Choice,
  type Message,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

export function fredericks(resolute: boolean): AbilitiesFn<Asset> {
  return (state, self, investigator) => {
    if (self.exhausted || self.uses < 1 || (resolute && !turnActionTiming(state, investigator)))
      return []
    const targets = fightEnemies(state, investigator).filter(
      (enemy) => !attackBlocked(state, investigator, enemy, self.code),
    )
    if (!targets.length) return []
    return [
      {
        key: `${self.id}:fight`,
        label: 'ability.edgeOfTheEarth.fredericks',
        actionKind: 'fight',
        actions: resolute ? 0 : 1,
        provokes: false,
        costs: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'ExhaustAsset', asset: self.id },
        ],
        then: ask(
          investigator,
          targets.map((enemy): Choice => {
            const onSuccess: Message[] = enemy.traits?.includes('Elite')
              ? []
              : [{ type: 'EnemySkipsAttacks', enemy: enemy.id, allPhases: true }]
            return {
              label: 'choice.enemy',
              params: { enemy: enemy.name },
              target: { type: 'enemy', id: enemy.id },
              then: [
                {
                  type: 'BeginSkillTest',
                  investigator,
                  skill: 'combat',
                  difficulty: enemy.fight,
                  baseSkill: resolute ? 6 : 5,
                  source: self.id,
                  kind: { type: 'fight', enemy: enemy.id, extraDamage: 0, onSuccess },
                },
              ],
            }
          }),
        ),
      },
    ]
  }
}
