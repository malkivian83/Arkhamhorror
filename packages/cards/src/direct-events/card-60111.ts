import { registerPlayerCard } from '@lcg/engine'
import { ask, attackable } from '../dunwich-pilot/effects'

// RR: Fight, Attacks of Opportunity. Resources precede the test, regardless of its result.
registerPlayerCard({
  code: '60111',
  noAttacksOfOpportunity: true,
  canPlay: (s, by) => attackable(s, by).length > 0,
  play: (s, by) => [
    { type: 'GainResources', investigator: by, amount: 2 },
    ...ask(
      by,
      attackable(s, by).map((e) => ({
        label: 'choice.equipmentAttack',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'BeginSkillTest',
            investigator: by,
            source: '60111',
            skill: 'combat',
            difficulty: e.fight,
            kind: { type: 'fight', enemy: e.id },
          },
        ],
      })),
    ),
  ],
})
