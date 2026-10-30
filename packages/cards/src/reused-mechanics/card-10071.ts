import { enemiesAt, getInvestigator, registerPlayerCard, type Enemy } from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

// RR: Parley; Skill Tests. Grift: choose an enemy at your location and test [agility] (0). Gain 1
// resource per point succeeded by (max 6); if you fail, that enemy attacks you.
const code = '10071'
const enemiesHere = (state: Parameters<typeof getInvestigator>[0], investigator: string) => {
  const here = getInvestigator(state, investigator).location
  return here === null ? [] : enemiesAt(state, here)
}
registerPlayerCard({
  code,
  parley: true,
  canPlay: (state, investigator) => enemiesHere(state, investigator).length > 0,
  play: (state, investigator) =>
    ask(
      investigator,
      enemiesHere(state, investigator).map((e: Enemy) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'agility',
            difficulty: 0,
            effectSource: code,
            tags: ['parley'],
            kind: {
              type: 'effect',
              source: cardName(code),
              onSuccess: [continuation(code, investigator, 'gain')],
              onFail: [{ type: 'EnemyAttack', enemy: e.id, investigator, exhaustAfter: false }],
              onFailEach: [],
            },
          },
        ],
      })),
      true,
    ),
  effect: (state, investigator) => {
    const test = state.skillTest
    const margin = test ? (test.modifiedSkill ?? 0) - test.difficulty : 0
    const amount = Math.min(6, margin)
    return amount > 0 ? [{ type: 'GainResources', investigator, amount }] : []
  },
})
