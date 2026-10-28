import { registerPlayerCard } from '@lcg/engine'
import { fightOptions } from '../dunwich-pilot/effects'
import { DERRINGER_2 } from './codes'

// RR: Uses (ammo), Fight. .18 Derringer (2): [action] spend 1 ammo: Fight, +2 [combat] and +1
// damage. If you fail, place 1 ammo on it and the next time you trigger this ability this
// round you get an additional +1 [combat] for that attack (cleared when the round ends).
registerPlayerCard({
  code: DERRINGER_2,
  abilities: (state, self, investigator) =>
    self.uses < 1
      ? []
      : fightOptions(state, self, investigator, 2, {
          extraDamage: 1,
          onFail: [
            { type: 'AddUses', asset: self.id, amount: 1 },
            {
              type: 'AfterCurrentSkillTest',
              then: [{ type: 'PrimeNextFight', asset: self.id, amount: 1 }],
            },
          ],
        }).map((o) => ({
          ...o,
          costs: [{ type: 'SpendUses' as const, asset: self.id, amount: 1 }],
        })),
  forced: (_state, trigger, self) =>
    trigger.type === 'roundEnds' && self.nextFightBonus
      ? [{ type: 'ClearNextFight', asset: self.id }]
      : [],
})
