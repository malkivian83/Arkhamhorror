// RR: Cancel/Ignore, Skill Tests ST.3/ST.4/ST.8, Delayed Effects, Myriad.
import {
  getInvestigator,
  poolTokensAvailable,
  type ChaosToken,
  type GameState,
  type Trigger,
} from '@lcg/engine'
import { event, option, registerAdvancedCard as registerPlayerCard } from './common'
const held = (s: GameState, t: Trigger) =>
  t.type === 'whenRevealChaosToken' ? (s.skillTest?.revealing ?? s.tokenReveal) : undefined
export function registerAdvancedToken(code: string): boolean {
  if (code === '02230' || code === '07307') {
    const upgraded = code === '07307'
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const h = held(s, t)
        if (
          !h ||
          t.type !== 'whenRevealChaosToken' ||
          t.investigator !== a.owner ||
          h.face === 'autoFail' ||
          (upgraded && h.face === 'curse')
        )
          return []
        const owner = getInvestigator(s, a.owner)
        if (upgraded ? poolTokensAvailable(s, 'curse') < 1 : owner.resources < 2) return []
        return [
          option(a, [
            upgraded
              ? { type: 'AddChaosTokens', tokens: ['curse'], scenarioOnly: true }
              : { type: 'SpendResources', investigator: a.owner, amount: 2 },
            {
              type: 'IgnoreHeldToken',
              penalty: {
                asset: a.id,
                tokens: upgraded ? ['curse', 'autoFail'] : ['autoFail'],
                ...(upgraded ? { returnToHand: true } : {}),
              },
            },
          ]),
        ]
      },
    })
    return true
  }
  if (code === '11039') {
    const symbols: ChaosToken[] = ['skull', 'cultist', 'tablet', 'elderThing']
    registerPlayerCard({
      code,
      sharedSlot: { key: code, size: 3 },
      reactions: (s, t, a) => {
        const h = held(s, t)
        if (
          !s.skillTest ||
          !h ||
          t.type !== 'whenRevealChaosToken' ||
          !symbols.includes(h.face) ||
          getInvestigator(s, t.investigator).location !== getInvestigator(s, a.owner).location
        )
          return []
        return [
          option(a, [
            { type: 'DiscardAsset', asset: a.id },
            {
              type: 'ModifySkillTest',
              onSuccess: [{ type: 'DrawCards', investigator: a.owner, amount: 1 }],
            },
            { type: 'CancelRevealedToken', redraw: true },
          ]),
        ]
      },
    })
    return true
  }
  if (code === '03312') {
    registerPlayerCard({
      code,
      onCommit: () => [{ type: 'ModifySkillTest', virtualToken: 'elderSign', noTokens: true }],
      removeAtTestEnd: true,
    })
    return true
  }
  if (code === '08112') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) =>
        t.type === 'afterRevealingChaosToken' && t.investigator === by && s.skillTest?.revealing
          ? event(code, by, [{ type: 'AddExtraTestToken', reverse: true, failOn: 'skull' }])
          : [],
    })
    return true
  }
  return false
}
