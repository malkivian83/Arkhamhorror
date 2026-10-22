import { registerUpgrade } from './register'
import { cardName } from '../dunwich-pilot/effects'
// RR: Exhaust, Fight. The bonus applies to the next fight with the host this turn only.
registerUpgrade('60163', 'Firearm', {
  behavior: {
    attachedAbilities: (_s, host, index, by) =>
      host.upgrades![index]!.exhausted
        ? []
        : [
            {
              key: `upgrade:${host.id}:${index}:60163`,
              label: 'ability.ironSights',
              params: { card: cardName(host.code) },
              actions: 1,
              provokes: false,
              costs: [{ type: 'ExhaustUpgrade', asset: host.id, index }],
              then: [
                { type: 'PrimeNextFight', asset: host.id, amount: 3 },
                {
                  type: 'AtEndOfTurn',
                  investigator: by,
                  then: [{ type: 'ClearNextFight', asset: host.id }],
                },
              ],
            },
          ],
  },
})
