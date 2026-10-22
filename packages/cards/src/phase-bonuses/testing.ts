import {
  dispatch,
  playerCardBehavior,
  skillTestValue,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { choose } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { setup } from '../basic-abilities/testing'

export function value(s: GameState, skill: SkillType = 'intellect', by = 'a'): number {
  const t: NonNullable<GameState['skillTest']> = {
    investigator: by,
    skill,
    committed: [],
    baseModifier: 0,
    kind: { type: 'investigate', location: 'A' },
    difficulty: 1,
    tokens: [],
    tokenModifier: 0,
    autoFail: false,
    tokenOnFail: [],
    tokenOnFailBy: [],
    modifiedSkill: null,
    succeeded: null,
  }
  return skillTestValue({ ...s, skillTest: t }).total
}
// RR: Lasting Effects, Activate, Costs, Attack of Opportunity.
export function verifyEncyclopedia(code: string): void {
  it(code + ' spends its action and costs, affects a nearby chosen skill for the phase', () => {
    let s = setup(code, { enemy: null, players: ['a', 'b'], asset: { uses: 5 } })
    s = choose(s, 'ability.phaseEncyclopedia')
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(s.assets[code]!.uses).toBe(code === '60208' ? 4 : 5)
    expect(s.investigators[0]!.actionsRemaining).toBe(2)
    s = choose(s, 'choice.investigator', { name: 'B' })
    s = choose(s, 'choice.phaseSkill', { skill: 'willpower' })
    expect(value(s, 'willpower', 'b')).toBe(5)
    expect(value(s, 'willpower')).toBe(3)
    expect(value(s, 'intellect', 'b')).toBe(3)
    s = JSON.parse(JSON.stringify({ ...s, assets: {} })) as GameState
    expect(value(s, 'willpower', 'b')).toBe(5)
    expect(value({ ...s, phase: 'enemy' }, 'willpower', 'b')).toBe(3)
    expect(value({ ...s, round: s.round + 1 }, 'willpower', 'b')).toBe(3)
  })
  it(code + ' rejects exhausted or empty sources and distant recipients', () => {
    const s = setup(code, { enemy: null, players: ['a', 'b'], asset: { exhausted: true } })
    const abilities = playerCardBehavior(code)!.abilities!
    expect(abilities(s, s.assets[code]!, 'a')).toEqual([])
    if (code === '60208')
      expect(abilities(s, { ...s.assets[code]!, exhausted: false, uses: 0 }, 'a')).toEqual([])
    const remote = {
      ...s,
      pending: null,
      queue: [],
      investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, location: 'B' } : i)),
    }
    const next = dispatch(remote, {
      type: 'PlayerCardEffect',
      code,
      investigator: 'a',
      step: 'recipient',
    })
    expect(next.pending!.question.choices.some((c) => c.params?.name === 'B')).toBe(false)
  })
  it(code + ' provokes an attack of opportunity before resolving the benefit', () => {
    const s = choose(setup(code, { asset: { uses: 5 } }), 'ability.phaseEncyclopedia')
    expect(s.investigators[0]!.damage + s.investigators[0]!.horror).toBeGreaterThan(0)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(s.pending!.question.choices.some((c) => c.label === 'choice.investigator')).toBe(true)
  })
}
