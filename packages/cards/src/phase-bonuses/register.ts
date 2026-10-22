import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'

// RR: Lasting Effects, Activate. The bonus survives its source leaving play;
// it changes only tests of the selected skill within this phase and round.
export function registerPhaseAsset(code: string): void {
  if (code === '07152' || code === '02185') {
    registerPlayerCard({
      code,
      ...(code === '02185' ? { permanent: {} } : {}),
      fastOptions: (s, a) =>
        getInvestigator(s, a.owner).resources < 2
          ? []
          : (['intellect', 'combat'] as const).map((skill) => ({
              key: a.id + ':' + skill,
              investigator: a.owner,
              label: 'ability.phaseKeenEye',
              params: { card: playerCardDef(code)!.name, skill, n: 2 },
              then: [
                { type: 'SpendResources', investigator: a.owner, amount: 2 },
                { type: 'PhaseSkillBonus', investigator: a.owner, skill, amount: 1, code },
              ],
            })),
    })
    return
  }
  registerPlayerCard({
    code,
    abilities: (s, a) =>
      a.exhausted ||
      (code === '60208' && a.uses < 1) ||
      getInvestigator(s, a.owner).location === null
        ? []
        : [
            {
              key: a.id + ':encyclopedia',
              label: 'ability.phaseEncyclopedia',
              params: { card: playerCardDef(code)!.name },
              actions: 1,
              provokes: true,
              costs: [
                { type: 'ExhaustAsset', asset: a.id },
                ...(code === '60208'
                  ? [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }]
                  : []),
              ],
              then: [continuation(code, a.owner, 'recipient')],
            },
          ],
    effect: (s, by, step, data) => {
      const here = getInvestigator(s, by).location
      if (here === null) return []
      if (step === 'recipient')
        return ask(
          by,
          s.investigators
            .filter((i) => !i.eliminated && i.location === here)
            .map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [continuation(code, by, 'skill', { target: i.id })],
            })),
          true,
        )
      if (step !== 'skill') return []
      const target = s.investigators.find(
        (i) => i.id === data?.target && !i.eliminated && i.location === here,
      )
      if (!target) return []
      return ask(
        by,
        (['willpower', 'intellect', 'combat', 'agility'] as SkillType[]).map((skill) => ({
          label: 'choice.phaseSkill',
          params: { skill, name: target.name },
          then: [
            { type: 'PhaseSkillBonus', investigator: target.id, code, skill, amount: 2 } as Message,
          ],
        })),
        true,
      )
    },
  })
}
