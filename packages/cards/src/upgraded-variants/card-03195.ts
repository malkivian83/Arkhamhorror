import { registerPlayerCard } from '@lcg/engine'
import { draw, exhaust, gain, reaction } from '../core-2026/cards'

// RR: Fast, Evade, Reactions. Pickpocketing (2): after you evade an enemy, exhaust it: draw 1
// card or gain 1 resource. If you succeeded by 2 or more at that evasion test, do both instead
// (an automatic evasion has no margin).
registerPlayerCard({
  code: '03195',
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterEvade' || trigger.investigator !== self.owner || self.exhausted)
      return []
    const test = state.skillTest
    const both =
      !!test &&
      test.investigator === self.owner &&
      test.kind.type === 'evade' &&
      test.kind.enemy === trigger.enemy &&
      !!test.succeeded &&
      (test.modifiedSkill ?? 0) - test.difficulty >= 2
    return both
      ? [
          reaction(
            self,
            'ability.pickpocketingBoth',
            [exhaust(self), draw(self.owner), gain(self.owner)],
            {},
            ':both',
          ),
        ]
      : [
          reaction(self, 'ability.drawCards', [exhaust(self), draw(self.owner)], { n: 1 }, ':draw'),
          reaction(self, 'ability.gainResource', [exhaust(self), gain(self.owner)], {}, ':gain'),
        ]
  },
})
