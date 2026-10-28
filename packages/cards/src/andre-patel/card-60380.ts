import { getInvestigator, registerPlayerCard, type SkillType } from '@lcg/engine'
import { SILVER_TONGUE_3 } from './codes'

// RR: Starting, Fast, Evade, Parley. Silver Tongue (3): Starting (it may be added to your opening
// hand after the mulligan). [fast] Spend 1 resource: +1 [intellect] for this skill test (+2 if it
// is an evasion or parley); the same for [agility].
registerPlayerCard({
  code: SILVER_TONGUE_3,
  starting: true,
  testOptions: (state, test, self) => {
    if (test.investigator !== self.owner || getInvestigator(state, self.owner).resources < 1)
      return []
    const amount = test.kind.type === 'evade' || test.tags?.includes('parley') ? 2 : 1
    return (['intellect', 'agility'] as SkillType[])
      .filter((skill) => test.skill === skill)
      .map((skill) => ({
        key: `${self.id}:${skill}`,
        investigator: self.owner,
        label: 'ability.pump',
        params: { card: 'Silver Tongue', skill, amount },
        then: [
          { type: 'SpendResources', investigator: self.owner, amount: 1 },
          { type: 'BoostSkillTest', amount },
        ],
      }))
  },
})
