import { skillTestValue, type SkillType } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { setup } from '../basic-abilities/testing'
import { patch } from '../dunwich-pilot/testing'

// RR: Skill Tests (ST.2 player window), Resource Cost, Limits.
export function verifyTalent(code: string): void {
  const skills: SkillType[] =
    code === '02187'
      ? ['willpower', 'intellect']
      : code === '02189'
        ? ['intellect', 'agility']
        : code === '02191'
          ? ['willpower', 'combat']
          : ['combat', 'agility']
  const cost = code === '02189' ? 2 : 1
  const amount = code === '02189' || code === '02191' ? 3 : code === '02187' ? 2 : 1
  const open = (skill: SkillType, hand = 5) =>
    during(
      setup(code, { enemy: null, resources: 5 }),
      patch({ hand: Array.from({ length: hand }, (_, n) => 'unknown-' + n) }),
      {
        type: 'BeginSkillTest',
        investigator: 'a',
        skill,
        difficulty: 5,
        kind: { type: 'effect', source: 'talent', onSuccess: [], onFail: [], onFailEach: [] },
      },
    )
  for (const skill of skills)
    it(code + ' boosts ' + skill + ' with its exact cost and limit', () => {
      let s = open(skill)
      s = choose(s, code === '02191' ? 'ability.permanentPact' : 'ability.spendForSkill', { skill })
      expect(skillTestValue(s).total).toBe(3 + amount)
      expect(s.investigators[0]!.actionsRemaining).toBe(3)
      if (code === '02191') {
        expect(s.assets[code]!.doom).toBe(1)
        expect(s.pending!.question.choices.some((c) => c.label === 'ability.permanentPact')).toBe(
          false,
        )
      } else {
        expect(s.investigators[0]!.resources).toBe(5 - cost)
        s = choose(s, 'ability.spendForSkill', { skill })
        expect(skillTestValue(s).total).toBe(3 + 2 * amount)
      }
    })
  it(code + ' does not boost an unrelated skill', () => {
    const other = (['willpower', 'intellect', 'combat', 'agility'] as SkillType[]).find(
      (x) => !skills.includes(x),
    )!
    const s = open(other)
    expect(
      s.pending!.question.choices.some((c) =>
        ['ability.permanentPact', 'ability.spendForSkill'].includes(c.label),
      ),
    ).toBe(false)
  })
  if (code === '02187')
    it('Higher Education loses its abilities below five current cards in hand', () => {
      const s = open('intellect', 4)
      expect(s.pending!.question.choices.some((c) => c.label === 'ability.spendForSkill')).toBe(
        false,
      )
    })
}
