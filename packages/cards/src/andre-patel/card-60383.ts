import { getInvestigator, registerPlayerCard, type SkillTest } from '@lcg/engine'
import { CONTINGENCY } from './codes'

/** Tests targeting an enemy: attacks, evasions and abilities printed on an enemy. */
const targetsEnemy = (test: SkillTest) =>
  test.kind.type === 'fight' || test.kind.type === 'evade' || !!test.tags?.includes('enemy')

// RR: Committing Cards, Skill Test (ST.3), Chaos Tokens. Contingency: while committed to a skill
// test targeting an enemy, after revealing chaos tokens, its committer may spend 3 resources to
// cancel a revealed token, return it to the bag and reveal a new one (any number of times).
registerPlayerCard({
  code: CONTINGENCY,
  committedReactions: (state, trigger, by) => {
    const test = state.skillTest
    if (
      trigger.type !== 'afterRevealingChaosToken' ||
      !test?.revealing ||
      !targetsEnemy(test) ||
      getInvestigator(state, by).resources < 3
    )
      return []
    return [
      {
        key: `${CONTINGENCY}:${by}`,
        investigator: by,
        label: 'ability.contingency',
        params: { token: String(test.revealing.face) },
        then: [
          { type: 'SpendResources', investigator: by, amount: 3 },
          { type: 'CancelRevealedToken', redraw: true },
        ],
      },
    ]
  },
})
