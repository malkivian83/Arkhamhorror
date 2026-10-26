import { enemiesAt, getInvestigator, registerPlayerCard, type GameState } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
function targets(s: GameState, by: string, used: string[] = []) {
  const i = getInvestigator(s, by)
  return i.eliminated || i.location === null
    ? []
    : enemiesAt(s, i.location).filter(
        (e) => e.engagedWith !== by && !e.keywords.includes('massive') && !used.includes(e.id),
      )
}
export function registerTaunt(code: string, upgraded: boolean): void {
  registerPlayerCard({
    code,
    playInAnyFastWindow: true,
    canPlay: (s, by) => {
      const root = s.immediateActions?.[0]
      const turn = root ? (root.endedTurn ? null : root.activeTurn) : s.activeTurn
      return (upgraded || turn === by) && targets(s, by).length > 0
    },
    play: (_s, by) => [continuation(code, by, 'choose', { used: '[]' })],
    effect: (s, by, step, data) => {
      if (step !== 'choose' || getInvestigator(s, by).eliminated) return []
      const used = JSON.parse(String(data.used ?? '[]')) as string[]
      const enemies = targets(s, by, used)
      return enemies.length
        ? ask(
            by,
            [
              { label: 'choice.pilotDone', then: [] },
              ...enemies.map((e) => ({
                label: 'action.engage',
                params: { enemy: e.name },
                target: { type: 'enemy' as const, id: e.id },
                then: [
                  { type: 'EngageEnemy' as const, investigator: by, enemy: e.id },
                  ...(upgraded
                    ? [
                        {
                          type: 'DamageEnemy' as const,
                          enemy: e.id,
                          by,
                          amount: 1,
                          source: { traits: ['Tactic'] },
                        },
                      ]
                    : []),
                  { type: 'DrawCards' as const, investigator: by, amount: 1 },
                  continuation(code, by, 'choose', { used: JSON.stringify([...used, e.id]) }),
                ],
              })),
            ],
            true,
          )
        : []
    },
  })
}
