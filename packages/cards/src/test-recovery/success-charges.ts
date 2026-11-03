// RR: Skill Tests ST.7, Uses, Instead, Additional Actions, Costs.
import { getInvestigator, playerCardBehavior, registerPlayerCard, type Message } from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { margin, ownTurn } from './helpers'
const settings: Record<
  string,
  { action: 'fight' | 'investigate' | 'evade'; high: boolean; max: number }
> = {
  '08090': { action: 'fight', high: false, max: 2 },
  '08092': { action: 'fight', high: true, max: 3 },
  '08101': { action: 'investigate', high: false, max: 2 },
  '08103': { action: 'investigate', high: true, max: 3 },
  '08109': { action: 'evade', high: false, max: 1 },
  '08111': { action: 'evade', high: true, max: 2 },
}
export function registerCharges(code: string): boolean {
  const spec = settings[code]
  if (!spec) return false
  const penalty = spec.high ? 2 : 1
  registerBasicAsset(
    code,
    [
      {
        action: spec.action,
        skills:
          spec.action === 'fight'
            ? ['combat', 'willpower']
            : spec.action === 'investigate'
              ? ['intellect', 'willpower']
              : ['agility', 'willpower'],
        modifier: spec.high ? 2 : 1,
        // Only Blur has an explicit prerequisite. Brand/Divination spend charges
        // as part of their successful effects, not as an activation cost.
        available: ({ self }) => spec.action !== 'evade' || self.uses > 0,
      },
    ],
    () => ({
      beforeResults: (_s, t, a) =>
        t.succeeded ? [continuation(code, t.investigator, 'success', { asset: a.id })] : [],
      effect: (s, by, step, data) => {
        if (step !== 'success' || !s.skillTest) return []
        const t = s.skillTest,
          a = s.assets[String(data.asset)],
          cap = Math.min(a?.uses ?? 0, spec.max)
        const consequences = (n: number): Message[] => [
          ...(n > 0 ? [{ type: 'SpendUses' as const, asset: a!.id, amount: n }] : []),
          ...(spec.action === 'fight'
            ? [{ type: 'ModifySkillTest' as const, extraDamage: n - 1 }]
            : spec.action === 'investigate'
              ? [{ type: 'AddInvestigationResults' as const, extraClues: n - 1 }]
              : ownTurn(s, by)
                ? [{ type: 'GainActions' as const, investigator: by, amount: n }]
                : []),
          ...(margin(t) === 0
            ? spec.action === 'fight'
              ? [{ type: 'LoseActions' as const, investigator: by, amount: penalty }]
              : spec.action === 'investigate'
                ? [{ type: 'ChooseDiscardFromHand' as const, investigator: by, amount: penalty }]
                : [{ type: 'TakeDamage' as const, investigator: by, damage: penalty, horror: 0 }]
            : []),
        ]
        if (cap === 0) return consequences(0)
        return ask(
          by,
          Array.from({ length: cap }, (_, n) => n + 1).map((n) => ({
            label: 'choice.recoverySpend',
            params: { card: cardName(code), n },
            then: consequences(n),
          })),
        )
      },
    }),
  )
  const b = playerCardBehavior(code)!,
    abilities = b.abilities!
  registerPlayerCard({
    ...b,
    abilities: (s, a, by) =>
      abilities(s, a, by).map((o) => ({
        ...o,
        actions:
          o.actions +
          (spec.action === 'investigate'
            ? (s.locations[getInvestigator(s, by).location ?? '']?.investigateExtraActions ?? 0)
            : 0),
      })),
  })
  return true
}
