// RR: Uses; Fight; Additional Actions (once per turn, only during your turn).
import { registerPlayerCard, turnStartedAt } from '@lcg/engine'
import { mayChoose } from '../core-2026/player-cards'
import { continuation, fightOptions } from '../dunwich-pilot/effects'
const code = '03234'
const key = (asset: string) => asset + ':derringer-action'
registerPlayerCard({
  code,
  abilities: (s, a, i) =>
    a.uses < 1
      ? []
      : fightOptions(s, a, i, 2, {
          damageIfSuccessBy: { atLeast: 1, amount: 1 },
          onSuccess: [
            {
              type: 'IfTestResult',
              atLeast: 3,
              then: [continuation(code, i, 'action', { asset: a.id })],
            },
          ],
        }).map((option) => ({
          ...option,
          costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
        })),
  effect: (s, by, step, data) => {
    const asset = String(data.asset)
    if (
      step !== 'action' ||
      s.activeTurn !== by ||
      s.abilityUses.some((u) => u.key === key(asset) && u.turn === turnStartedAt(s))
    )
      return []
    return [
      mayChoose(by, 'choice.quickThinkingAction', {}, [
        {
          type: 'UseAbility',
          investigator: by,
          key: key(asset),
          actions: 0,
          provokes: false,
          limit: { per: 'turn' },
          then: [{ type: 'GainActions', investigator: by, amount: 1 }],
        },
      ]),
    ]
  },
})
