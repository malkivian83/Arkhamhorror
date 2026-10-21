import {
  enemyMaxHealth,
  engagedEnemies,
  playerCardDef,
  registerPlayerCard,
  type AbilityOption,
  type SkillTestKind,
} from '@lcg/engine'
import { attackable } from '../dunwich-pilot/effects'
import approvals from './approvals.json'

export function registerCombatTool(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed combat tool: ' + code)
  const family = entry.family
  registerPlayerCard({
    code,
    ...(family === 'bow' ? { maxUses: 1 } : {}),
    abilities: (s, a, i) => {
      const options: AbilityOption[] = []
      if (family === 'bow' && a.uses < 1)
        options.push({
          key: a.id + ':reload',
          label: 'ability.combatReload',
          params: { card: playerCardDef(code)!.name },
          actions: 1,
          provokes: true,
          then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
        })
      if ('uses' in entry && a.uses < 1) return options
      if (family === 'garrote' && (a.exhausted || s.activeTurn !== i)) return []
      for (const enemy of attackable(s, i)) {
        if (family === 'springfield' && engagedEnemies(s, i).some((e) => e.id === enemy.id))
          continue
        if (family === 'garrote' && enemyMaxHealth(s, enemy) - enemy.damageTaken !== 1) continue
        const spends =
          family === 'bar'
            ? Array.from({ length: Math.min(5, a.uses) }, (_, n) => n + 1)
            : ['uses' in entry ? 1 : 0]
        for (const spent of spends) {
          const modifier =
            family === 'springfield' ? 3 : family === 'bar' ? spent : family === 'knuckles' ? 0 : 2
          const extraDamage =
            family === 'springfield' || family === 'bow'
              ? 2
              : family === 'bar'
                ? spent - 1
                : family === 'garrote'
                  ? 0
                  : 1
          const kind: Extract<SkillTestKind, { type: 'fight' }> = {
            type: 'fight',
            enemy: enemy.id,
            extraDamage,
            ...(family === 'safe-pistol' ? { ignoreRetaliate: true } : {}),
            ...(family === 'knuckles' ? { forceRetaliate: true } : {}),
            ...(family === 'derringer'
              ? { onFail: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }] }
              : {}),
          }
          options.push({
            key: a.id + ':fight:' + spent,
            label: family === 'bar' ? 'ability.combatAmmo' : 'ability.fightWith',
            params: { card: playerCardDef(code)!.name, enemy: enemy.name, n: spent },
            target: { type: 'enemy', id: enemy.id },
            actions: family === 'garrote' ? 0 : 1,
            provokes: false,
            costs:
              family === 'garrote'
                ? [{ type: 'ExhaustAsset', asset: a.id }]
                : spent
                  ? [{ type: 'SpendUses', asset: a.id, amount: spent }]
                  : [],
            then: [
              {
                type: 'BeginSkillTest',
                investigator: i,
                source: a.id,
                skill: family === 'bow' ? 'agility' : 'combat',
                difficulty: enemy.fight,
                modifier,
                kind,
              },
            ],
          })
        }
      }
      return options
    },
  })
}
