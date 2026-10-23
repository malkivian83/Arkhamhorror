import { playerCardDef, registerPlayerCard } from '@lcg/engine'
import { assetsHere } from '../dunwich-pilot/helpers'
import { ask, continuation } from '../dunwich-pilot/effects'

// RR: Uses, Replenish. Cannot exceed the printed starting number of secrets.
registerPlayerCard({
  code: '60269',
  afterCommittedTest: (_s, _t, success, by) =>
    success ? [continuation('60269', by, 'replenish')] : [],
  effect: (s, by) =>
    ask(
      by,
      assetsHere(s, by)
        .filter((a) => {
          const def = playerCardDef(a.code)
          return (
            def?.traits.includes('Tome') &&
            !!def.uses &&
            ['secret', 'secrets'].includes(def.uses.type) &&
            a.uses < def.uses.count
          )
        })
        .map((a) => ({
          label: 'choice.assignToAsset',
          params: { card: playerCardDef(a.code)!.name },
          target: { type: 'asset' as const, id: a.id },
          then: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }],
        })),
    ),
})
