// RR: Investigators, Triggered Abilities, Additional Actions, Weaknesses and Costs.
import { expect, it } from 'vitest'
import {
  dispatch,
  registerPlayerCard,
  investigatorBehavior,
  playerCardBehavior,
  treacheryBehavior,
  playerCardDef,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, queue: [], pending: null })
const base = (code = '02001'): GameState => {
  const s = clear(throughSetup(newTestGame({ players: [code, 'b'] })))
  return {
    ...s,
    activeTurn: code,
    interactive: true,
    phase: 'investigation',
    chaosBag: [0],
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, clues: 4, revealed: true }]),
    ),
    investigators: s.investigators.map((i) => ({
      ...i,
      actionsRemaining: 3,
      resources: 10,
      hand: [],
      deck: ['12090', '12090', '12090', '12090'],
      horror: 0,
      damage: 0,
    })),
  }
}
const by = (s: GameState, id = s.investigators[0]!.id) => s.investigators.find((i) => i.id === id)!
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string, horror = 0): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [code]: { id: code, code, owner: by(s).id, uses: 4, exhausted: false, damage: 0, horror },
  },
})
const emit = (s: GameState, trigger: Extract<Message, { type: 'Forced' }>['trigger']) =>
  run(s, { type: 'Forced', trigger })
const has = (s: GameState, label: string) =>
  s.pending?.question.choices.some((c) => c.label === label)
const reveal = (s: GameState) => {
  for (let n = 0; n < 5 && has(s, 'choice.revealToken'); n++) s = choose(s, 'choice.revealToken')
  return s
}
const finish = (s: GameState) =>
  has(s, 'choice.applyResults') ? choose(s, 'choice.applyResults') : s
const effectTest = (s: GameState, difficulty = 1) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: by(s).id,
    skill: 'willpower',
    difficulty,
    kind: { type: 'effect', source: 'Probe', onSuccess: [], onFail: [], onFailEach: [] },
  })
it('Zoey gains a resource on every engagement, without a round limit', () => {
  let s = run(base(), spawnAt('A', { ...ghoul, health: 8 }, '02001'))
  s = choose(s, 'ability.zoeyEngage')
  expect(by(s).resources).toBe(11)
  const id = Object.keys(s.enemies)[0]!
  s = emit(s, { type: 'afterEngage', investigator: '02001', enemy: id })
  s = choose(s, 'ability.zoeyEngage')
  expect(by(s).resources).toBe(12)
  expect(
    investigatorBehavior('02001')!.reactions!(
      s,
      { type: 'afterEngage', investigator: 'b', enemy: id },
      by(s),
    ),
  ).toEqual([])
})
it('Zoey may gain her resource before paying for her Cross in the same engagement window', () => {
  let s = asset(base(), '02006')
  by(s).resources = 0
  s = run(s, spawnAt('A', { ...ghoul, health: 8 }, '02001'))
  s = choose(s, 'ability.zoeyEngage')
  expect(has(s, 'ability.advancedTest')).toBe(true)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('02006')!.name })
  expect(by(s).resources).toBe(0)
  expect(s.assets['02006']!.exhausted).toBe(true)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
})
it('Zoey’s elder sign adds one damage to a successful attack', () => {
  let s = run(base(), spawnAt('A', { ...ghoul, health: 8 }, '02001'))
  s = choose(s, 'choice.skip')
  const id = Object.keys(s.enemies)[0]!
  s.chaosBag = ['elderSign']
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: '02001',
    skill: 'combat',
    difficulty: 1,
    kind: { type: 'fight', enemy: id },
  })
  s = finish(reveal(s))
  expect(s.enemies[id]!.damageTaken).toBe(2)
  expect(investigatorBehavior('02001')!.elderSign!(base(), by(s)).immediate).toBeUndefined()
})
it('Smite discards through the first enemy, spawns it farthest and attaches the weakness to that instance', () => {
  let s = base()
  s.encounterDeck = [
    { kind: 'treachery', code: 'smite-filler', name: 'Filler', keywords: [] },
    { ...ghoul, code: 'smite-ghoul', health: 8 },
    { kind: 'treachery', code: 'remaining', name: 'Remaining', keywords: [] },
  ]
  s = run(s, { type: 'ResolveWeakness', investigator: '02001', code: '02007' })
  if (has(s, 'choice.location')) s = choose(s, 'choice.location')
  const e = Object.values(s.enemies).find((e) => e.code === 'smite-ghoul')!,
    t = Object.values(s.treacheries).find((t) => t.code === '02007')!
  expect(e.location).toBe('C')
  expect(t.placement).toEqual({ type: 'enemy', enemy: e.id })
  expect(s.encounterDiscard.some((c) => c.code === 'smite-filler')).toBe(true)
  expect(s.encounterDiscard.some((c) => c.code === 'smite-ghoul')).toBe(false)
  expect(s.encounterDeck.map((c) => c.code)).toEqual(['remaining'])
  expect(treacheryBehavior('02007')!.whenGameEnds!(s, t)).toMatchObject([
    { type: 'SufferTrauma', mental: 1 },
  ])
  s = run(s, { type: 'DamageEnemy', enemy: e.id, amount: 8, by: '02001' })
  if (has(s, 'ability.zoeyEngage')) s = choose(s, 'choice.skip')
  expect(s.treacheries[t.id]).toBeUndefined()
})
it('Smite discards itself with no trauma if the encounter deck contains no enemy', () => {
  let s = base()
  s.encounterDeck = [{ kind: 'treachery', code: 'empty-filler', name: 'Filler', keywords: [] }]
  s = run(s, { type: 'ResolveWeakness', investigator: '02001', code: '02007' })
  expect(Object.values(s.treacheries).some((t) => t.code === '02007')).toBe(false)
  expect(by(s).discard).toContain('02007')
  expect(s.encounterDeck).toEqual([])
})
it('Jim treats only the skull modifier as zero while keeping its symbol', () => {
  let s = base('02004')
  s.chaosBag = ['skull']
  s.tokenValues = { ...s.tokenValues, skull: -4 }
  s = reveal(effectTest(s))
  expect(s.skillTest!.tokens).toEqual(['skull'])
  expect(s.skillTest!.tokenModifier).toBe(0)
  expect(investigatorBehavior('02004')!.tokenModifier!(s, by(s), 'cultist', -3)).toBe(-3)
})
it('Jim may treat his elder sign as a skull, or keep its printed +1', () => {
  let s = base('02004')
  s.chaosBag = ['elderSign']
  s = reveal(effectTest(s))
  s = choose(s, 'ability.jimSkull')
  expect(s.skillTest!.tokens).toEqual(['skull'])
  expect(s.skillTest!.tokenModifier).toBe(0)
  let kept = base('02004')
  kept.chaosBag = ['elderSign']
  kept = reveal(effectTest(kept))
  kept = choose(kept, 'choice.skip')
  expect(kept.skillTest!.tokens).toEqual(['elderSign'])
  expect(kept.skillTest!.tokenModifier).toBe(1)
})
it('Jim’s Trumpet heals an investigator at a connecting location on anyone’s skull reveal', () => {
  let s = asset(base('02004'), '02012')
  by(s, 'b').location = 'B'
  by(s, 'b').horror = 2
  s.chaosBag = ['skull']
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'b',
    skill: 'willpower',
    difficulty: 1,
    kind: { type: 'effect', source: 'Probe', onSuccess: [], onFail: [], onFailEach: [] },
  })
  s = reveal(s)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('02012')!.name })
  s = choose(s, 'choice.healHorrorOf', { name: by(s, 'b').name })
  expect(by(s, 'b').horror).toBe(1)
  expect(s.assets['02012']!.exhausted).toBe(true)
})
it('Jim’s Trumpet cannot react to skulls outside a skill test', () => {
  const s = asset(base('02004'), '02012')
  by(s).horror = 1
  expect(
    playerCardBehavior('02012')!.reactions!(
      s,
      { type: 'whenRevealChaosToken', investigator: '02004', token: 'skull' },
      s.assets['02012']!,
    ),
  ).toEqual([])
})
it('Final Rhapsody reveals five held tokens, then deals one damage and horror for each skull or auto-fail', () => {
  let s = base('02004')
  s.chaosBag = ['skull', 'skull', 'autoFail', 0, -1]
  s = run(s, { type: 'ResolveWeakness', investigator: '02004', code: '02013' })
  expect(by(s).damage).toBe(3)
  expect(by(s).horror).toBe(3)
  expect(s.chaosBag).toHaveLength(5)
  expect(Object.values(s.heldChaosTokens ?? {})).toEqual([])
})
it('Final Rhapsody terminates on an exhausted physical bag and returns its tokens exactly once', () => {
  let s = base('02004')
  s.chaosBag = ['skull', 'autoFail']
  s = run(s, { type: 'ResolveWeakness', investigator: '02004', code: '02013' })
  expect(by(s).damage).toBe(2)
  expect(by(s).horror).toBe(2)
  expect(s.chaosBag.map(String).sort()).toEqual(['autoFail', 'skull'])
})
it('Final Rhapsody preserves five logical draws with Olive and returns seven physical tokens', () => {
  let s = asset(base('02004'), '04197')
  by(s).health = 10
  by(s).sanity = 10
  s.chaosBag = Array(7).fill('skull')
  s = run(s, ...playerCardBehavior('04197')!.wouldRevealOptions!(s, s.assets['04197']!)[0]!.then, {
    type: 'ResolveWeakness',
    investigator: '02004',
    code: '02013',
  })
  s = choose(s, 'choice.resolveToken', { token: 'skull' })
  s = choose(s, 'choice.resolveToken', { token: 'skull' })
  for (let n = 0; n < 12 && has(s, 'choice.assignToInvestigator'); n++)
    s = choose(s, 'choice.assignToInvestigator')
  expect(by(s).damage).toBe(6)
  expect(by(s).horror).toBe(6)
  expect(s.chaosBag).toHaveLength(7)
})
it('Jim may convert elder signs revealed outside a test by Final Rhapsody', () => {
  let s = base('02004')
  by(s).health = 10
  by(s).sanity = 10
  s.chaosBag = Array(5).fill('elderSign')
  s = run(s, { type: 'ResolveWeakness', investigator: '02004', code: '02013' })
  for (let n = 0; n < 5; n++) s = choose(s, 'ability.jimSkull')
  expect(by(s).damage).toBe(5)
  expect(by(s).horror).toBe(5)
  expect(s.chaosBag).toEqual(Array(5).fill('elderSign'))
})
it('Jim’s converted elder sign also opens the Trumpet’s skull reaction', () => {
  let s = asset(base('02004'), '02012')
  by(s).horror = 2
  s.chaosBag = ['elderSign']
  s = reveal(effectTest(s))
  s = choose(s, 'ability.jimSkull')
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('02012')!.name })
  s = choose(s, 'choice.healHorrorOf', { name: by(s).name })
  expect(by(s).horror).toBe(1)
  expect(s.assets['02012']!.exhausted).toBe(true)
})

it('Jim’s conversion treats the token as a skull without canceling it', () => {
  let cancellations = 0
  registerPlayerCard({
    code: 'jim-cancel-probe',
    forced: (_s, t) => {
      if (t.type === 'afterTokenManipulated' && t.operation === 'cancel') cancellations++
      return []
    },
  })
  let s = asset(base('02004'), 'jim-cancel-probe')
  s.chaosBag = ['elderSign']
  s = reveal(effectTest(s))
  s = choose(s, 'ability.jimSkull')
  expect(s.skillTest!.tokens).toEqual(['skull'])
  expect(cancellations).toBe(0)
})
