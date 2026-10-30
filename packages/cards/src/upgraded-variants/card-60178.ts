import { getInvestigator, registerPlayerCard, type SkillTest, type SkillType } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'

// RR: Starting, Fast. Level 3 talents: the level 0 text plus Starting (it may be added to the
// opening hand after the mulligan). [fast] Spend 1 resource: +1 to one of its two skills for this
// skill test (+2 instead in the printed situation).
export function registerStartingTalent(
  code: string,
  skills: readonly [SkillType, SkillType],
  doubled: (test: SkillTest) => boolean,
): void {
  registerPlayerCard({
    code,
    starting: true,
    testOptions: (state, test, self) => {
      if (test.investigator !== self.owner || getInvestigator(state, self.owner).resources < 1)
        return []
      const amount = doubled(test) ? 2 : 1
      return skills
        .filter((skill) => test.skill === skill)
        .map((skill) => ({
          key: `${self.id}:${skill}`,
          investigator: self.owner,
          label: 'ability.pump',
          params: { card: cardName(code), skill, amount },
          then: [
            { type: 'SpendResources', investigator: self.owner, amount: 1 },
            { type: 'BoostSkillTest', amount },
          ],
        }))
    },
  })
}

export const tagged = (test: SkillTest, ...tags: string[]) =>
  (test.tags ?? []).some((tag) => tags.includes(tag))

// Endurance (3): +2 instead during an attack or evasion.
registerStartingTalent('60178', ['combat', 'agility'], (t) =>
  ['fight', 'evade'].includes(t.kind.type),
)
