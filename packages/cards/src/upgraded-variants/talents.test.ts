// RR: Uses, Replenish, Starting, Fast, Limits, Evade, Reactions, Skill Tests.
import {
  dispatch,
  getInvestigator,
  playerCardBehavior,
  type GameState,
  type Message,
  type SkillTestKind,
  type SkillType,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import '../index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const ready = (players = ['a']) => ({ ...clear(game(players)), interactive: true })
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)!
const effect: SkillTestKind = {
  type: 'effect',
  source: 'test',
  onSuccess: [],
  onFail: [],
  onFailEach: [],
}
const test = (
  s: GameState,
  skill: SkillType,
  kind: SkillTestKind = effect,
  tags?: string[],
): GameState =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill,
    difficulty: 9,
    kind,
    ...(tags ? { tags } : {}),
  })
const pumpAmount = (s: GameState) =>
  s.pending!.question.choices.find((c) => c.label === 'ability.pump')?.params?.amount

describe('level 4 replenishing talents', () => {
  it.each([
    ['07264', 'intellect', 'agility', 'combat'],
    ['07266', 'combat', 'agility', 'willpower'],
    ['07270', 'willpower', 'agility', 'intellect'],
    ['60428', 'willpower', 'intellect', 'agility'],
  ] as const)('%s pays from its uses or the pool, only for its skills', (code, a, b, other) => {
    let s = withAsset(patch({ resources: 3 })(ready()), code)
    expect(asset(s, code).uses).toBe(2)
    s = test(s, a)
    s = choose(s, 'ability.talentUse')
    expect(asset(s, code).uses).toBe(1)
    expect(s.skillTest!.baseModifier).toBe(1)
    expect(getInvestigator(s, 'a').resources).toBe(3)
    s = choose(s, 'ability.pump')
    expect(getInvestigator(s, 'a').resources).toBe(2)
    expect(s.skillTest!.baseModifier).toBe(2)
    expect(labels(test(withAsset(ready(), code), b))).toContain('ability.talentUse')
    const off = test(withAsset(patch({ resources: 3 })(ready()), code), other)
    expect(labels(off)).not.toContain('ability.talentUse')
    expect(labels(off)).not.toContain('ability.pump')
  })
  it('replenishes to exactly two uses at the start of each round', () => {
    let s = withAsset(patch({ resources: 0 })(ready()), '07264', { uses: 0 })
    expect(labels(test(s, 'intellect'))).not.toContain('ability.talentUse')
    s = run(s, { type: 'Forced', trigger: { type: 'roundBegins' } })
    expect(asset(s, '07264').uses).toBe(2)
    s = run(s, { type: 'Forced', trigger: { type: 'roundBegins' } })
    expect(asset(s, '07264').uses).toBe(2)
  })
})

describe('level 3 starting talents', () => {
  const evade = (s: GameState): SkillTestKind => ({
    type: 'evade',
    enemy: Object.keys(s.enemies)[0]!,
  })
  const withEnemy = (s: GameState) => run(s, spawnAt('A', ghoul, 'a'))
  it.each([
    ['60178', 'intellect', (s: GameState) => test(s, 'agility', evade(s))],
    [
      '60277',
      'combat',
      (s: GameState) => test(s, 'intellect', { type: 'investigate', location: 'A' }),
    ],
    ['60476', 'intellect', (s: GameState) => test(s, 'combat', effect, ['ritual'])],
    ['60579', 'intellect', (s: GameState) => test(s, 'agility', effect, ['scenario'])],
  ] as const)('%s is Starting and doubles its bonus only when printed', (code, off, doubled) => {
    expect(playerCardBehavior(code)?.starting).toBe(true)
    const s = withAsset(patch({ resources: 2 })(withEnemy(ready())), code)
    let boosted = doubled(s)
    expect(pumpAmount(boosted)).toBe(2)
    boosted = choose(boosted, 'ability.pump')
    expect(boosted.skillTest!.baseModifier).toBe(2)
    expect(getInvestigator(boosted, 'a').resources).toBe(1)
    expect(labels(test(s, off))).not.toContain('ability.pump')
    expect(labels(test(patch({ resources: 0 })(s), off))).not.toContain('ability.pump')
  })
  it('gives only +1 outside the printed situation', () => {
    const s = withAsset(patch({ resources: 2 })(ready()), '60178')
    expect(pumpAmount(test(s, 'combat'))).toBe(1)
    expect(pumpAmount(test(withAsset(ready(), '60476'), 'willpower'))).toBe(1)
    expect(pumpAmount(test(withAsset(ready(), '60579'), 'willpower', effect, ['spell']))).toBe(1)
  })
})

describe('54006: Well Connected (3)', () => {
  it('+1 per 4 resources; spend 2 resources to ready it once per round', () => {
    let s = withAsset(patch({ resources: 9 })(ready()), '54006')
    expect(playerCardBehavior('54006')?.limitTitle).toBe(true)
    s = test(s, 'intellect')
    s = choose(s, 'ability.exhaustForBonus', { amount: 2 })
    expect(s.skillTest!.baseModifier).toBe(2)
    s = choose(s, 'ability.wellConnectedReady')
    expect(asset(s, '54006').exhausted).toBe(false)
    expect(getInvestigator(s, 'a').resources).toBe(7)
    s = choose(s, 'ability.exhaustForBonus', { amount: 1 })
    expect(labels(s)).not.toContain('ability.wellConnectedReady')
  })
})

describe('03195: Pickpocketing (2)', () => {
  const evadeBy = (agility: number) => {
    let s = run(
      withAsset(
        patch({ skills: { willpower: 0, intellect: 0, combat: 0, agility } })(ready()),
        '03195',
      ),
      spawnAt('A', { ...ghoul, evade: 2 }, 'a'),
    )
    s = { ...s, chaosBag: [0] }
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'agility',
      difficulty: 2,
      kind: { type: 'evade', enemy: Object.keys(s.enemies)[0]! },
    })
    while (s.pending && !labels(s).some((l) => l.startsWith('ability.')))
      s = choose(s, labels(s).includes('choice.revealToken') ? 'choice.revealToken' : labels(s)[0]!)
    return s
  }
  it('draws and gains after succeeding by 2 or more', () => {
    let s = evadeBy(4)
    expect(labels(s)).toContain('ability.pickpocketingBoth')
    expect(labels(s)).not.toContain('ability.gainResource')
    const before = getInvestigator(s, 'a')
    s = choose(s, 'ability.pickpocketingBoth')
    expect(asset(s, '03195').exhausted).toBe(true)
    expect(getInvestigator(s, 'a').resources).toBe(before.resources + 1)
    expect(getInvestigator(s, 'a').hand.length).toBe(before.hand.length + 1)
  })
  it('draws or gains after a narrower evasion', () => {
    let s = evadeBy(3)
    expect(labels(s)).toEqual(expect.arrayContaining(['ability.drawCards', 'ability.gainResource']))
    expect(labels(s)).not.toContain('ability.pickpocketingBoth')
    const before = getInvestigator(s, 'a').resources
    s = choose(s, 'ability.gainResource')
    expect(getInvestigator(s, 'a').resources).toBe(before + 1)
    expect(asset(s, '03195').exhausted).toBe(true)
  })
  it('offers one choice after an automatic evasion', () => {
    let s = run(withAsset(ready(), '03195'), spawnAt('A', ghoul, 'a'))
    s = run(s, { type: 'EvadeEnemy', enemy: Object.keys(s.enemies)[0]!, by: 'a' })
    expect(labels(s)).toEqual(expect.arrayContaining(['ability.drawCards', 'ability.gainResource']))
  })
})
