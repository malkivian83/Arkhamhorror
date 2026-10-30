// RR: Uses, Exhaust, Skill Tests, Hand Size. Feed the Mind (3): test intellect (0), draw 1 card
// per point succeeded by (no maximum); then, success or not, take 1 horror per excess card.
import { getInvestigator, handSize, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { continuation } from '../dunwich-pilot/effects'

const code = '04267'
registerPlayerCard({
  code,
  abilities: (_s, a, by) =>
    a.exhausted || a.uses < 1
      ? []
      : [
          {
            key: a.id + ':feed',
            label: 'ability.upgradedFeedTheMind',
            params: { card: playerCardDef(code)!.name },
            actions: 1,
            provokes: true,
            costs: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'SpendUses', asset: a.id, amount: 1 },
            ],
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'intellect',
                difficulty: 0,
                source: a.id,
                kind: {
                  type: 'effect',
                  source: playerCardDef(code)!.name,
                  onSuccess: [continuation(code, by, 'draw'), continuation(code, by, 'excess')],
                  onFail: [continuation(code, by, 'excess')],
                  onFailEach: [],
                },
              },
            ],
          },
        ],
  effect: (s, by, step) => {
    if (step === 'draw') {
      const test = s.skillTest
      const amount = test ? Math.max(0, (test.modifiedSkill ?? 0) - test.difficulty) : 0
      return amount > 0 ? [{ type: 'DrawCards', investigator: by, amount }] : []
    }
    if (step !== 'excess') return []
    const excess = getInvestigator(s, by).hand.length - handSize(s, by)
    return excess > 0 ? [{ type: 'TakeDamage', investigator: by, damage: 0, horror: excess }] : []
  },
})
