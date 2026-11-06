import { registerEnemy } from '@lcg/engine'
import { enemy } from '../scenario-helpers'

export const horrifyingShade = enemy({
  code: '08584',
  name: 'Horrifying Shade',
  fight: 3,
  health: 3,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['aloof', 'hunter'],
  traits: ['Monster', 'Eidolon'],
})

registerEnemy({
  code: horrifyingShade.code,
  forced: (_state, trigger, self) => {
    if (trigger.type !== 'afterDiscoverClues' && trigger.type !== 'afterTakeControlOfClues')
      return []
    const amount = trigger.amount ?? 0
    return trigger.location === self.location && amount > 0
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount }]
      : []
  },
})
