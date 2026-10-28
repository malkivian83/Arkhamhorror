import { getInvestigator, registerPlayerCard, registerPlayerCards } from '@lcg/engine'
import { B, BN } from './altar-codes'
registerPlayerCards([
  {
    code: B.powder,
    name: 'Powder of Ibn Ghazi',
    type: 'asset',
    class: 'neutral',
    story: true,
    cost: 0,
    traits: ['Item'],
  },
])
registerPlayerCard({
  code: B.powder,
  forced: (s, t, a) =>
    t.type === 'afterAssetEntersPlay' && t.asset === a.id
      ? [
          {
            type: 'PlaceCluesOnAsset',
            asset: a.id,
            amount: (s.campaignLog?.values[BN.survivors] ?? '').split(',').filter(Boolean).length,
          },
        ]
      : [],
  abilities: (s, a) =>
    !a.clues
      ? []
      : Object.values(s.enemies)
          .filter(
            (e) =>
              e.code === '02255' &&
              e.exhausted &&
              e.location === getInvestigator(s, a.owner).location,
          )
          .map((e) => ({
            key: `${a.id}:${e.id}`,
            label: 'ability.altar.powder',
            actions: 0,
            provokes: false,
            then: [{ type: 'MoveAssetCluesToEnemy', asset: a.id, enemy: e.id, amount: 1 }],
          })),
})
