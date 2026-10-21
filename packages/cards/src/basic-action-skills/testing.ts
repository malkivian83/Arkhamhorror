// RR: Basic Actions, Committing Cards, Skill Test Results, Automatic Evasion.
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
  type SkillTestKind,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'
import { newCampaign, purchase, purchaseOptions, startScenario } from '../campaign'
import { isStandard } from '../decks'
import approvals from './approvals.json'

export function open(code: string, by = 'a', difficulty = 4, basic = true): GameState {
  const family = approvals.cards.find((c) => c.code === code)!.family
  let s = during(
    game(['a', 'b']),
    patch({ hand: [code] }, by),
    spawnAt('A', { ...ghoul, health: 10, fight: difficulty, evade: difficulty }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Other', health: 10 }, 'b'),
  )
  s = {
    ...s,
    locations: { ...s.locations, A: { ...s.locations.A!, clues: 10, shroud: difficulty } },
  }
  const enemy = Object.keys(s.enemies)[0]!
  if (basic)
    return during(s, (s) => s, {
      type: 'PerformAction',
      investigator: 'a',
      action:
        family === 'fight'
          ? { kind: 'fight', enemy }
          : family === 'evade'
            ? { kind: 'evade', enemy }
            : { kind: 'investigate' },
    })
  const kind: SkillTestKind =
    family === 'fight'
      ? { type: 'fight', enemy }
      : family === 'evade'
        ? { type: 'evade', enemy }
        : { type: 'investigate', location: 'A' }
  return during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    kind,
    difficulty,
    skill: family === 'fight' ? 'combat' : family === 'evade' ? 'agility' : 'intellect',
  })
}

export function verifyBasicActionSkill(code: string): void {
  const family = approvals.cards.find((c) => c.code === code)!.family
  const def = playerCardDef(code)!
  const finish = (s: GameState, by: string) => {
    s = choose(s, by === 'a' ? 'choice.commit' : 'choice.commitFrom', { card: def.name })
    return family === 'evade' &&
      s.pending?.question.choices.some((c) => c.label === 'choice.distributedEvade')
      ? choose(s, 'choice.distributedEvade', { enemy: 'Other' })
      : s
  }
  describe(code + ' / basic action skills', () => {
    for (const by of ['a', 'b'])
      it('adds icons and its result bonus to a real basic action with committer ' + by, () => {
        const before = open(code, by)
        expect(before.skillTest!.basicAction).toBe(true)
        const restored = JSON.parse(JSON.stringify(before)) as GameState
        const s = finish(restored, by)
        if (family === 'fight') expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
        if (family === 'investigate') {
          expect(s.locations.A!.clues).toBe(8)
          expect(s.investigators[0]!.clues).toBe(2)
          expect(s.investigators[1]!.clues).toBe(0)
        }
        if (family === 'evade') expect(Object.values(s.enemies)[1]!.exhausted).toBe(true)
      })
    for (const difficulty of [5, 99])
      it('does not grant result bonuses at difficulty ' + difficulty, () => {
        const s = finish(open(code, 'a', difficulty), 'a')
        if (family === 'fight')
          expect(Object.values(s.enemies)[0]!.damageTaken).toBe(difficulty === 5 ? 1 : 0)
        if (family === 'investigate') expect(s.locations.A!.clues).toBe(difficulty === 5 ? 9 : 10)
        if (family === 'evade') expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
      })
    it('keeps only the printed icon and normal result on a nonbasic test even without an asset source', () => {
      const before = open(code, 'a', 1, false)
      expect(before.skillTest!.basicAction).toBeUndefined()
      expect(playerCardBehavior(code)!.additionalIcons!(before, before.skillTest!, 'a')).toEqual({})
      const s = finish(before, 'a')
      if (family === 'fight') expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
      if (family === 'investigate') expect(s.locations.A!.clues).toBe(9)
      if (family === 'evade') expect(Object.values(s.enemies)[1]!.exhausted).toBe(false)
    })
    it('does not add icons for a different basic action', () => {
      const s = open(code)
      const t = {
        ...s.skillTest!,
        kind: {
          type: 'effect' as const,
          source: 'other',
          onSuccess: [],
          onFail: [],
          onFailEach: [],
        },
      }
      expect(playerCardBehavior(code)!.additionalIcons!(s, t, 'a')).toEqual({})
    })
    it('enforces maximum one committed copy', () => {
      const s = open(code)
      const next = dispatch(
        { ...patch({ hand: [code, code] })(s), pending: null, queue: [] },
        { type: 'CommitCard', investigator: 'a', code },
        { type: 'CommitCard', investigator: 'a', code },
      )
      expect(next.skillTest!.committed).toHaveLength(1)
    })
    it('can be bought with experience and used in a real scenario deck', () => {
      let c = newCampaign('brethren-of-ash', ['isabelle'], 'easy')
      const id = c.investigators[0]!.id
      c.log.investigators[id]!.xp = def.xp ?? 0
      const option = purchaseOptions(c, id).find((o) => o.code === code)!
      expect(option).toBeDefined()
      c = purchase(
        c,
        id,
        code,
        option.replaces
          ? { upgrade: true }
          : { remove: c.investigators[0]!.deck.find(isStandard)! },
      )
      const i = startScenario(c, 3, false).investigators[0]!
      expect([...i.hand, ...i.deck, ...i.discard]).toContain(code)
    })
  })
}
