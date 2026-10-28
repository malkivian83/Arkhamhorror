import { registerPlayerCard } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { DUMB_LUCK, DUMB_LUCK_2 } from './codes'

// RR: Fast, Evade, Elite. Dumb Luck: play after you fail a skill test by 2 or less (level 2:
// 3 or less) during an evasion attempt against a non-Elite enemy. Place that enemy on top
// (level 2: on the bottom) of the encounter deck; its Alert attack no longer resolves.
for (const [code, within, bottom] of [
  [DUMB_LUCK, 2, false],
  [DUMB_LUCK_2, 3, true],
] as const)
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (state, trigger, investigator) => {
      if (
        trigger.type !== 'afterSkillTest' ||
        trigger.investigator !== investigator ||
        trigger.succeeded ||
        trigger.kind !== 'evade' ||
        trigger.margin < -within ||
        !trigger.enemy
      )
        return []
      const enemy = state.enemies[trigger.enemy]
      if (!enemy || enemy.traits?.includes('Elite')) return []
      return [
        {
          key: 'hand:' + code,
          investigator,
          label: 'ability.playCard',
          params: { card: cardName(code) },
          then: [
            {
              type: 'PlayCard',
              investigator,
              code,
              effect: [{ type: 'PutEnemyOnEncounterDeck', enemy: enemy.id, bottom }],
            },
          ],
        },
      ]
    },
  })
