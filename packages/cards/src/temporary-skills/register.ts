// RR: Skill Test Results, In Play and Out of Play, Lasting Effects, Revelation.
import { registerPlayerCard, type SkillType } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
export function registerTemporarySkill(code: string): void {
  if (code === '04192') {
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, test, success, by, copy) =>
        success && copy
          ? [
              {
                type: 'PutCommittedIntoPlay',
                investigator: by,
                code,
                index: test.committed.indexOf(copy),
              },
            ]
          : [],
      skillModifier: (_s, _a, test) => (test.skill === 'willpower' ? 0 : 1),
      forced: (_s, trigger, self) =>
        trigger.type === 'roundEnds' ? [{ type: 'DiscardAsset', asset: self.id }] : [],
    })
    return
  }
  if (code !== '09106') throw Error('Unreviewed temporary skill')
  registerPlayerCard({
    code,
    dilemma: true,
    canPlay: () => false,
    revelation: (_s, by) => [continuation(code, by, 'choose')],
    effect: (s, by, step, data) => {
      if (step === 'choose') {
        const first = data.first as SkillType | undefined
        return ask(
          by,
          skills
            .filter((skill) => skill !== first)
            .map((skill) => ({
              label: 'choice.chargedSkill',
              params: { skill },
              then: [
                continuation(
                  code,
                  by,
                  first ? 'apply' : 'choose',
                  first ? { first, second: skill } : { first: skill },
                ),
              ],
            })),
          true,
        )
      }
      if (step !== 'apply') return []
      const round = Math.max(1, s.round) + (s.phase === 'enemy' || s.phase === 'upkeep' ? 1 : 0)
      return s.investigators
        .filter((i) => !i.eliminated)
        .flatMap((i) =>
          skills.map((skill) => ({
            type: 'UntilPhaseSkillBonus' as const,
            investigator: i.id,
            code,
            skill,
            amount: skill === data.first || skill === data.second ? 1 : -1,
            phase: 'investigation' as const,
            round,
          })),
        )
    },
  })
}
