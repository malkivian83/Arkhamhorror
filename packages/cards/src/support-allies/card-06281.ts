import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { cardName, enemiesHere } from './register'
// Delilah O'Rourke (3): +1 combat and agility. Fast: exhaust her and spend resources equal
// to the evade of an enemy at your location to deal it 1 damage (2 if it is exhausted).
registerPlayerCard({
  code: '06281',
  skillModifier: (_s, _self, test) => (['combat', 'agility'].includes(test.skill) ? 1 : 0),
  fastOptions: (s, self) => {
    if (self.exhausted) return []
    const resources = getInvestigator(s, self.owner).resources
    return enemiesHere(s, self.owner)
      .filter((enemy) => resources >= enemy.evade)
      .map((enemy) => {
        const damage = enemy.exhausted ? 2 : 1
        return {
          key: `${self.id}:damage:${enemy.id}`,
          investigator: self.owner,
          label: 'ability.supportDelilah',
          params: { card: cardName('06281'), enemy: enemy.name, n: enemy.evade, damage },
          target: { type: 'enemy' as const, id: enemy.id },
          then: [
            { type: 'ExhaustAsset' as const, asset: self.id },
            { type: 'SpendResources' as const, investigator: self.owner, amount: enemy.evade },
            { type: 'DamageEnemy' as const, enemy: enemy.id, amount: damage, by: self.owner },
          ],
        }
      })
  },
})
