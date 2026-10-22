import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type GameState,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
// Moonlight Ritual: remove all doom from 1 card you control (your investigator or an asset).
const options = (s: GameState, by: string): Choice[] => {
  const me = getInvestigator(s, by)
  return [
    ...((me.doom ?? 0) > 0
      ? [
          {
            label: 'choice.investigator',
            params: { name: me.name },
            target: { type: 'investigator' as const, id: me.id },
            then: [
              {
                type: 'RemoveDoom' as const,
                target: { type: 'investigator' as const, id: me.id },
                amount: me.doom!,
              },
            ],
          },
        ]
      : []),
    ...Object.values(s.assets)
      .filter((a) => a.owner === by && (a.doom ?? 0) > 0)
      .map((a): Choice => ({
        label: 'choice.assignToAsset',
        params: { card: playerCardDef(a.code)!.name },
        target: { type: 'asset', id: a.id },
        then: [{ type: 'RemoveDoom', target: { type: 'asset', id: a.id }, amount: a.doom! }],
      })),
  ]
}
registerPlayerCard({
  code: '02267',
  canPlay: (s, by) => options(s, by).length > 0,
  play: (s, by) => ask(by, options(s, by)),
})
