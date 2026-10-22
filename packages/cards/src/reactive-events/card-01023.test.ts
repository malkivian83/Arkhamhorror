import { registerEnemy } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'

function attack(by = 'a', resources = 3, location = 'A', exhaustAfter = true) {
  const s = during(
    game(['a', 'b']),
    patch({ hand: ['01023'], resources, location }, by),
    spawnAt('A', { ...ghoul, code: 'dodge-trigger-enemy' }, 'a'),
  )
  return during(s, (s) => s, {
    type: 'EnemyAttack',
    enemy: Object.keys(s.enemies)[0]!,
    investigator: 'a',
    exhaustAfter,
  })
}
// RR: Cancel, Enemy Attacks. Canceled attacks neither deal damage nor trigger after-attacks.
describe('Dodge (0)', () => {
  registerEnemy({
    code: 'dodge-trigger-enemy',
    forced: (_s, t) =>
      t.type === 'afterEnemyAttack' || t.type === 'afterEnemyPhaseAttack'
        ? [{ type: 'GainResources', investigator: t.investigator, amount: 10 }]
        : [],
  })
  for (const by of ['a', 'b'])
    for (const exhaust of [true, false])
      it(`protects a from ${by}, exhaustAfter=${exhaust}`, () => {
        const s = choose(attack(by, 3, 'A', exhaust), 'ability.playCard', { card: 'Dodge' })
        expect(s.investigators[0]!.damage).toBe(0)
        expect(s.investigators[0]!.horror).toBe(0)
        expect(s.investigators[0]!.resources).toBe(by === 'a' ? 2 : 5)
        expect(s.investigators.find((i) => i.id === by)!.resources).toBe(2)
        expect(s.investigators.find((i) => i.id === by)!.discard).toContain('01023')
        expect(s.investigators[0]!.actionsRemaining).toBe(3)
        expect(Object.values(s.enemies)[0]!.exhausted).toBe(exhaust)
        expect(s.canceledAttack).toBeNull()
      })
  it('requires a shared location and affordable cost', () => {
    for (const s of [attack('b', 3, 'B'), attack('a', 0)]) {
      expect(s.pending?.question.choices.some((c) => c.params?.card === 'Dodge')).toBeFalsy()
      expect(s.investigators[0]!.damage).toBe(1)
    }
  })
  it('allows declining, and cancels only one attack', () => {
    const declined = choose(attack(), 'choice.skip')
    expect(declined.investigators[0]!.damage).toBe(1)
    const canceled = choose(attack('a', 3, 'A', false), 'ability.playCard', { card: 'Dodge' })
    const next = during(canceled, (s) => s, {
      type: 'EnemyAttack',
      enemy: Object.keys(canceled.enemies)[0]!,
      investigator: 'b',
      exhaustAfter: false,
    })
    expect(next.investigators[1]!.damage).toBe(1)
  })
})
