import { registerEnemy, registerPlayerCard } from '@lcg/engine'
import { MATEO, SERPENTS_OF_YIG } from './codes'

// RR: Weakness, Enemy, Prey, Hunter, Seal. Serpents of Yig spawns engaged with Father Mateo
// and, on revelation, seals the [elder_sign] token on itself until it leaves play.
registerPlayerCard({
  code: SERPENTS_OF_YIG,
  enemy: {
    kind: 'enemy',
    code: SERPENTS_OF_YIG,
    name: 'Serpents of Yig',
    traits: ['Humanoid', 'Monster', 'Serpent'],
    prey: { type: 'only', investigator: MATEO },
    fight: 2,
    health: 3,
    evade: 2,
    damage: 1,
    horror: 1,
    keywords: ['hunter'],
  },
})
registerEnemy({
  code: SERPENTS_OF_YIG,
  forced: (_state, trigger, self) =>
    trigger.type === 'enemySpawned' && trigger.enemy === self.id && self.owner
      ? [
          {
            type: 'SealToken',
            investigator: self.owner,
            code: SERPENTS_OF_YIG,
            token: 'elderSign',
            holder: { type: 'enemy', id: self.id },
          },
        ]
      : [],
})
