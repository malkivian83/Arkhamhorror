import { registerPlayerCard, type SkillType } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
import { GRIT_YOUR_TEETH } from './codes'

const SKILLS: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']

// RR: Fast, Triggered Abilities ("after"). Grit Your Teeth: play after you fail a skill test.
// You get +1 to each of your skills for the remainder of the round.
registerPlayerCard({
  code: GRIT_YOUR_TEETH,
  canPlay: () => false,
  handReactions: (_state, trigger, investigator) =>
    trigger.type === 'afterSkillTest' && trigger.investigator === investigator && !trigger.succeeded
      ? [
          {
            key: 'hand:' + GRIT_YOUR_TEETH,
            investigator,
            label: 'ability.playCard',
            params: { card: cardName(GRIT_YOUR_TEETH) },
            then: [
              {
                type: 'PlayCard',
                investigator,
                code: GRIT_YOUR_TEETH,
                effect: SKILLS.map((skill) => ({
                  type: 'RoundSkillBonus' as const,
                  investigator,
                  skill,
                  amount: 1,
                  code: GRIT_YOUR_TEETH,
                })),
              },
            ],
          },
        ]
      : [],
})
