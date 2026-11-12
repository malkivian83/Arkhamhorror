// RR: Fast Events, Skill Tests ST.1, Costs/Uses, Reveal Additional Chaos Tokens.
import { usesLenders, playerCardDef } from '@lcg/engine'
import { ask, event, local, registerAdvancedCard as registerPlayerCard } from './common'
export function registerAdvancedEvent(code: string): boolean {
  if (code === '07161') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) =>
        t.type === 'afterSkillTestInitiated' &&
        s.skillTest &&
        !s.skillTest.noTokens &&
        local(s, s.skillTest, by)
          ? event(code, by, [{ type: 'ModifySkillTest', tokenRetries: 2 }])
          : [],
    })
    return true
  }
  if (code === '03304' || code === '52002') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) => {
        const test = s.skillTest
        const a = test?.source ? s.assets[test.source] : undefined
        if (
          t.type !== 'afterSkillTestInitiated' ||
          test?.investigator !== by ||
          test.kind.type !== 'fight' ||
          !a ||
          a.owner !== by ||
          !playerCardDef(a.code)?.traits.includes('Firearm')
        )
          return []
        const uses = a.uses + usesLenders(s, a).reduce((n, lender) => n + lender.uses, 0)
        if (code === '52002' && uses < 1) return []
        const values = code === '52002' ? [1] : Array.from({ length: uses + 1 }, (_, n) => n)
        return event(
          code,
          by,
          ask(
            by,
            values.map((n) => ({
              label: 'choice.advancedExtraAmmo',
              params: { n },
              then: [
                ...(n ? [{ type: 'SpendUses' as const, asset: a.id, amount: n }] : []),
                {
                  type: 'ReplaceNextTokenReveal' as const,
                  replacement: { investigator: by, reveal: n + 1 },
                },
              ],
            })),
            true,
          ),
        )
      },
    })
    return true
  }
  return false
}
