// RR: Modifiers (multiply before add), Skill Tests ST.8, Alert, Retaliate, Commit Limits.
import {
  dispatch,
  enemyHasKeyword,
  playerCardDef,
  registerTreachery,
  type GameState,
  type SkillTestKind,
} from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, me, patch } from '../dunwich-pilot/testing'

for (const base of [1, 2, 3])
  for (const order of [
    ['09112', '02026'],
    ['02026', '09112'],
  ])
    it(
      'keeps difficulty modifiers independent of commit order: ' + base + ' / ' + order.join(','),
      () => {
        const s = during(game(), patch({ hand: order }), {
          type: 'BeginSkillTest',
          investigator: 'a',
          skill: 'willpower',
          difficulty: base,
          kind: { type: 'effect', source: 'modifiers', onSuccess: [], onFail: [], onFailEach: [] },
        })
        let next: GameState = { ...s, pending: null, queue: [] }
        for (const code of order)
          next = dispatch(JSON.parse(JSON.stringify(next)) as GameState, {
            type: 'CommitCard',
            investigator: 'a',
            code,
          })
        expect(next.skillTest!.difficulty).toBe(Math.max(0, base * 2 - 2))
        const removed = dispatch(next, { type: 'ReturnCommittedToHand', except: '02026' })
        expect(removed.skillTest!.difficulty).toBe(base * 2)
        expect(me(removed).hand).toContain('09112')
        const resolved = {
          ...next,
          skillTest: { ...next.skillTest!, succeeded: false, modifiedSkill: 0 },
        }
        const afterResults = dispatch(resolved, { type: 'ReturnCommittedToHand', except: '02026' })
        expect(afterResults.skillTest!.difficulty).toBe(next.skillTest!.difficulty)
      },
    )

const combat = (cards: string[], evade: boolean, keywords: ('retaliate' | 'alert')[] = []) => {
  const s = during(
    game(),
    patch({ hand: cards, deck: ['01072'], resources: 0 }),
    spawnAt('A', { ...ghoul, health: 10, keywords }, 'a'),
  )
  const enemy = Object.values(s.enemies)[0]!
  const kind: SkillTestKind = evade
    ? { type: 'evade', enemy: enemy.id }
    : { type: 'fight', enemy: enemy.id, extraDamage: 0 }
  return during(s, (s) => s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: evade ? 'agility' : 'combat',
    difficulty: 99,
    kind,
  })
}

it('exposes Daring keywords to the common enemy rules only for the test target', () => {
  const s = combat(['06111'], false)
  const next = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'CommitCard', investigator: 'a', code: '06111' },
  )
  const enemy = Object.values(next.enemies)[0]!
  expect(enemyHasKeyword(next, enemy, 'retaliate')).toBe(true)
  expect(enemyHasKeyword(next, enemy, 'alert')).toBe(true)
  expect(enemyHasKeyword(next, { ...enemy, id: 'different' }, 'alert')).toBe(false)
  expect(enemyHasKeyword({ ...next, skillTest: null }, enemy, 'alert')).toBe(false)
})

for (const evade of [false, true])
  it(
    'Adapt ignores both printed and Daring-granted keywords during ' +
      (evade ? 'evasion' : 'attack'),
    () => {
      let s = combat(['60167', '06111'], evade, ['alert', 'retaliate'])
      s = choose(s, 'choice.commit', { card: playerCardDef('60167')!.name })
      s = choose(s, 'choice.commit', { card: playerCardDef('06111')!.name })
      expect(me(s).damage + me(s).horror).toBe(0)
      expect(me(s).hand).toContain('01072')
      expect(Object.values(s.enemies)[0]!.keywords).toEqual(['alert', 'retaliate'])
    },
  )

it('Daring draws after cleanup and its temporary keywords do not remain in a subsequent test', () => {
  let s = combat(['06111'], false)
  s = { ...s, investigators: s.investigators.map((i) => ({ ...i, deck: [], discard: [] })) }
  s = choose(s, 'choice.commit')
  expect(me(s).hand).toContain('06111')
  expect(me(s).discard).not.toContain('06111')
  expect(me(s).damage).toBe(1)
  const enemy = Object.values(s.enemies)[0]!
  s = during(s, patch({ hand: [] }), {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 99,
    kind: { type: 'fight', enemy: enemy.id, extraDamage: 0 },
  })
  expect(me(s).damage).toBe(1)
})

registerTreachery({
  code: 'modifier-loses-alert',
  revelation: () => [],
  attachedEnemy: { loses: ['alert'] },
})

for (const code of ['06111', '60167'])
  it(code + ' keeps its test-duration keyword effect if the card leaves commitment early', () => {
    const s = combat([code], false, code === '60167' ? ['retaliate'] : [])
    const next = dispatch(
      { ...s, pending: null, queue: [] },
      { type: 'CommitCard', investigator: 'a', code },
      { type: 'ReturnCommittedToHand', except: 'none' },
      { type: 'RevealChaosToken', token: 0 },
      { type: 'ResolveSkillTest' },
      { type: 'EndSkillTest' },
    )
    expect(me(next).damage).toBe(code === '06111' ? 1 : 0)
  })
it('respects an attachment removing alert even when Daring grants it', () => {
  let s = combat(['06111'], true)
  const enemy = Object.values(s.enemies)[0]!
  s = {
    ...s,
    treacheries: {
      ...s.treacheries,
      removed: {
        id: 'removed',
        kind: 'treachery',
        code: 'modifier-loses-alert',
        name: 'Synthetic attachment',
        keywords: [],
        placement: { type: 'enemy', enemy: enemy.id },
      },
    },
  }
  s = choose(s, 'choice.commit')
  expect(me(s).damage + me(s).horror).toBe(0)
})
