import { enemiesAt, getInvestigator, registerPlayerCards, registerPlayerCard } from '@lcg/engine'
import { EA } from './extracurricular-codes'
registerPlayerCards([
  {
    code: EA.concoction,
    name: 'Alchemical Concoction',
    type: 'asset',
    class: 'neutral',
    story: true,
    cost: 0,
    traits: ['Item', 'Science'],
  },
])
registerPlayerCard({
  code: EA.concoction,
  abilities: (state, self, investigator) => {
    const location = getInvestigator(state, investigator).location
    return location === null
      ? []
      : enemiesAt(state, location).map((enemy) => ({
          key: `${self.id}:fight:${enemy.id}`,
          label: 'ability.dunwich.concoction',
          params: { enemy: enemy.name },
          actions: 1,
          provokes: false,
          actionKind: 'fight' as const,
          then: [
            {
              type: 'BeginSkillTest' as const,
              investigator,
              skill: 'intellect' as const,
              difficulty: enemy.fight,
              source: self.id,
              kind: {
                type: 'fight' as const,
                enemy: enemy.id,
                extraDamage: enemy.code === EA.experiment ? 6 : 0,
                onSuccess: [{ type: 'RemoveAssetFromGame' as const, asset: self.id }],
              },
            },
          ],
        }))
  },
})
