import { canEnter, engagedEnemies, registerPlayerCard, type Message } from '@lcg/engine'
import { ask, continuation, moveChoices } from '../dunwich-pilot/effects'

// RR: Skill Test Results, Automatic Evasion, Move. Survival Instinct benefits
// the evading investigator; Nimble moves the committer after the test resolves.
export function registerMovementSkill(code: string): void {
  registerPlayerCard({
    code,
    afterCommittedTest: (_s, test, success) => {
      if (!success) return []
      if (code === '60317') return []
      return test.kind.type === 'evade' ? [continuation(code, test.investigator, 'enemies')] : []
    },
    afterCommittedTestEnds: (_s, test, success, by) => {
      if (code !== '60317' || !success) return []
      const remaining = Math.min(3, (test.modifiedSkill ?? 0) - test.difficulty)
      return remaining > 0 ? [continuation(code, by, 'move', { remaining })] : []
    },
    effect: (s, by, step, data) => {
      if (step === 'enemies') {
        const enemies = engagedEnemies(s, by)
        const next = continuation(code, by, 'move', { remaining: 1 })
        if (!enemies.length) return [next]
        const effects: Message[] =
          code === '01081'
            ? [{ type: 'DisengageAll', investigator: by }]
            : enemies.map((e) => ({ type: 'EvadeEnemy', enemy: e.id, by }))
        return ask(
          by,
          [
            { label: 'choice.skip', then: [next] },
            {
              label: code === '01081' ? 'choice.survivalDisengage' : 'choice.survivalEvade',
              then: [...effects, next],
            },
          ],
          true,
        )
      }
      if (step !== 'move') return []
      const remaining = Number(data?.remaining ?? 0)
      if (remaining <= 0) return []
      const moves = moveChoices(s, by).filter(
        (c) => c.target?.type === 'location' && canEnter(s, by, c.target.id),
      )
      if (!moves.length) return []
      return ask(
        by,
        [
          { label: 'choice.skip', then: [] },
          ...moves.map((c) => ({
            ...c,
            then: [...c.then, continuation(code, by, 'move', { remaining: remaining - 1 })],
          })),
        ],
        true,
      )
    },
  })
}
