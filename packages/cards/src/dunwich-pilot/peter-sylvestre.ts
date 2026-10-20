import { registerPlayerCard } from '@lcg/engine'
import { reaction } from '../core-2026/cards'

// RR: Constant Abilities; Reactions. Recovery belongs to the controller's turn ending.
registerPlayerCard({
  code: '02033',
  skillModifier: (_state, _self, test) => (test.skill === 'agility' ? 1 : 0),
  reactions: (_state, trigger, self) =>
    trigger.type === 'turnEnds' && trigger.investigator === self.owner && self.horror > 0
      ? [
          reaction(
            self,
            'ability.healAsset',
            [{ type: 'HealAsset', asset: self.id, damage: 0, horror: 1 }],
            { kind: 'horror' },
          ),
        ]
      : [],
})
