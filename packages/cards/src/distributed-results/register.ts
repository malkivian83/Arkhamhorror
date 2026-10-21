import { getInvestigator, playerCardBehavior, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { assetsHere } from '../dunwich-pilot/helpers'
import approvals from './approvals.json'

// RR: Skill Test Results, Uses, Automatic Evasion. The committer chooses targets;
// each placement is optional and rechecks the current location and remaining budget.
export function registerDistributedResult(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)?.family
  if (!family) throw new Error('Unreviewed distributed result: ' + code)
  registerPlayerCard({
    code,
    afterCommittedTest: (_s, test, success, by) => {
      if (!success) return []
      if (family === 'uses' && test.kind.type === 'investigate')
        return [continuation(code, by, 'uses', { remaining: 3 })]
      if (family === 'evade' && test.kind.type === 'evade')
        return [continuation(code, by, 'evade', { enemy: test.kind.enemy })]
      return []
    },
    effect: (s, by, step, data) => {
      if (step === 'uses') {
        const remaining = Number(data?.remaining ?? 0)
        if (remaining <= 0) return []
        const targets = assetsHere(s, by).filter(
          (a) =>
            ['charge', 'charges', 'secret', 'secrets'].includes(
              playerCardDef(a.code)?.uses?.type ?? '',
            ) && a.uses < (playerCardBehavior(a.code)?.maxUses ?? Infinity),
        )
        if (!targets.length) return []
        return ask(
          by,
          [
            { label: 'choice.skip', then: [] },
            ...targets.map((a) => ({
              label: 'choice.resultUses',
              params: { card: playerCardDef(a.code)!.name },
              target: { type: 'asset' as const, id: a.id },
              then: [
                { type: 'AddUses' as const, asset: a.id, amount: 1 },
                continuation(code, by, 'uses', { remaining: remaining - 1 }),
              ],
            })),
          ],
          true,
        )
      }
      if (step !== 'evade') return []
      const here = getInvestigator(s, by).location
      if (here === null) return []
      const targets = Object.values(s.enemies).filter(
        (e) => e.location === here && e.id !== data?.enemy,
      )
      if (!targets.length) return []
      return ask(
        by,
        [
          { label: 'choice.skip', then: [] },
          ...targets.map((e) => ({
            label: 'choice.distributedEvade',
            params: { enemy: e.name },
            target: { type: 'enemy' as const, id: e.id },
            then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by }],
          })),
        ],
        true,
      )
    },
  })
}
