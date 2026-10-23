import { registerPlayerCard } from '@lcg/engine'
import { attackable, ask } from '../dunwich-pilot/effects'
import { controlledClasses } from '../synergy/classes'
// RR: Fight, Lasting Effects, Limbo. Each class grants both bonuses dynamically.
registerPlayerCard({
  code: '08022',
  noAttacksOfOpportunity: true,
  canPlay: (s, by) => attackable(s, by).length > 0,
  play: (s, by) =>
    ask(
      by,
      attackable(s, by).map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'BeginSkillTest',
            investigator: by,
            skill: 'combat',
            difficulty: e.fight,
            effectSource: '08022',
            kind: { type: 'fight', enemy: e.id },
          },
        ],
      })),
    ),
  effectSkillModifier: (s, t) =>
    t.kind.type === 'fight' && t.skill === 'combat' ? controlledClasses(s, t.investigator) : 0,
  effectAttackDamage: (s, t) => controlledClasses(s, t.investigator),
})
