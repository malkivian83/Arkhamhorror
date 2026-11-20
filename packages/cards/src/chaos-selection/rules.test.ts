// RR: Chaos bag, Seal, Costs, multiple reveals and ST.3-ST.8.
import { expect, it } from 'vitest'
import {
  dispatch,
  playerCardBehavior,
  playerCardDef,
  type GameState,
  type Asset,
  type Message,
  type AbilityOption,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import './index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (): GameState => {
  const s = clear(throughSetup(newTestGame({ players: ['a', 'b'] })))
  return {
    ...s,
    activeTurn: 'a',
    phase: 'investigation' as const,
    interactive: true,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 3 }]),
    ),
    investigators: s.investigators.map((i) => ({
      ...i,
      actionsRemaining: 3,
      resources: 20,
      hand: [],
      deck: ['normal', 'normal', 'normal'],
      damage: 3,
      horror: 3,
    })),
  }
}
const owned = (code: string, uses = 4): GameState => {
  const s = base()
  const a: Asset = { id: code, code, owner: 'a', uses, exhausted: false, damage: 0, horror: 0 }
  return { ...s, assets: { [code]: a } }
}
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const by = (s: GameState, id = 'a') => s.investigators.find((i) => i.id === id)!
const use = (s: GameState, code: string) => {
  const a = s.assets[code]!,
    o: AbilityOption = playerCardBehavior(code)!.abilities!(s, a, 'a')[0]!
  expect(o).toBeDefined()
  return run(s, { type: 'UseAbility', investigator: 'a', ...o })
}
import {
  registerPlayerCard,
  skillTestValue,
  revealedEncounterTop,
  allPlayerCardDefs,
  type ChaosToken,
  type SkillType,
} from '@lcg/engine'
import { nextToken, resolvedFaces, resolvedPhysical } from '../chaos-allies/common'
import { sealedOn } from '../sealed-tokens/cards'
import { newCampaign, purchaseOptions } from '../campaign'
const behavior = (code: string) => playerCardBehavior(code)!
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
const reveal = (s: GameState) => {
  for (let n = 0; n < 4 && has(s, 'choice.revealToken'); n++) s = choose(s, 'choice.revealToken')
  return s
}
const finish = (s: GameState) =>
  has(s, 'choice.applyResults') ? choose(s, 'choice.applyResults') : s
const effectTest = (
  s: GameState,
  skill: SkillType = 'willpower',
  who = 'a',
  difficulty = 2,
): GameState =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: who,
    skill,
    difficulty,
    kind: { type: 'effect', source: 'Probe', onSuccess: [], onFail: [], onFailEach: [] },
  })
const declare = (s: GameState, code: string) =>
  run(s, ...behavior(code).wouldRevealOptions!(s, s.assets[code]!)[0]!.then)
it.each(['04197', '10097'])(
  '%s exhausts and resolves exactly two selected physical tokens',
  (code) => {
    let s = owned(code)
    s.chaosBag = code === '04197' ? [0, -1, -2] : [0, -1, -2, 'autoFail']
    s = declare(s, code)
    s = reveal(effectTest(s))
    s = choose(s, 'choice.resolveToken', { token: '0' })
    s = choose(s, 'choice.resolveToken', { token: '-1' })
    expect(s.skillTest!.tokens).toEqual([0, -1])
    expect(s.skillTest!.autoFail).toBe(false)
    expect(s.assets[code]!.exhausted).toBe(true)
    expect(behavior(code).wouldRevealOptions!(s, s.assets[code]!)).toEqual([])
    s = finish(s)
    expect(s.chaosBag).toHaveLength(code === '04197' ? 3 : 4)
  },
)
it('offers Olive in the actual would-reveal window', () => {
  let s = effectTest(owned('04197'))
  if (!has(s, 'ability.advancedTest')) s = choose(s, 'choice.revealToken')
  expect(has(s, 'ability.advancedTest')).toBe(true)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('04197')!.name })
  expect(s.assets['04197']!.exhausted).toBe(true)
})
it('resolves identical physical tokens twice without returning ignored tokens twice', () => {
  let s = owned('04197')
  s.chaosBag = [0, 0, -2]
  s = reveal(effectTest(declare(s, '04197')))
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(s.skillTest!.tokens).toEqual([0, 0])
  s = finish(s)
  expect(s.chaosBag.filter((t) => t === 0)).toHaveLength(2)
  expect(s.chaosBag).toHaveLength(3)
})
it('auto-fails when both selected physical Frost tokens resolve', () => {
  let s = owned('04197')
  s.chaosBag = ['frost', 'frost', 0]
  s = reveal(effectTest(declare(s, '04197')))
  s = choose(s, 'choice.resolveToken', { token: 'frost' })
  s = choose(s, 'choice.resolveToken', { token: 'frost' })
  expect(s.skillTest!.autoFail).toBe(true)
  s = finish(s)
  expect(s.chaosBag).toHaveLength(3)
})
it('collects a replaced held reveal once, with all selected and ignored physical tokens', () => {
  const observed: ChaosToken[][] = []
  registerPlayerCard({
    code: 'group-probe',
    effect: (_s, by, step, d) =>
      step === 'draw'
        ? [nextToken('group-probe', by, d)]
        : step === 'token'
          ? (observed.push(resolvedFaces(d).filter((t): t is ChaosToken => t !== null)),
            [
              {
                type: 'StoreHeldChaosTokens',
                group: String(d.group),
                tokens: [...resolvedPhysical(d), ...JSON.parse(String(d.ignored ?? '[]'))],
              },
              { type: 'ReturnHeldChaosTokens', group: String(d.group) },
            ])
          : [],
  })
  let s = owned('04197')
  s.chaosBag = [0, -1, -2]
  s = declare(s, '04197')
  s = run(s, {
    type: 'StartTokenGroup',
    then: {
      type: 'PlayerCardEffect',
      investigator: 'a',
      code: 'group-probe',
      step: 'draw',
      data: { faces: '[]' },
    },
  })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '-1' })
  expect(observed).toEqual([[0, -1]])
  expect(s.chaosBag.map(String).sort()).toEqual(['-1', '-2', '0'])
  expect(s.pendingOutsideTokens ?? []).toEqual([])
})
it('resolves each selected token separately for an ordinary outside effect', () => {
  const observed: ChaosToken[] = []
  registerPlayerCard({
    code: 'plain-probe',
    effect: (_s, _by, _step, d) => {
      observed.push(d.token as ChaosToken)
      return []
    },
  })
  let s = owned('04197')
  s.chaosBag = [0, -1, -2]
  s = declare(s, '04197')
  s = run(s, {
    type: 'RevealTokenOutsideTest',
    investigator: 'a',
    then: { type: 'PlayerCardEffect', investigator: 'a', code: 'plain-probe', step: 'token' },
  })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '-1' })
  expect(observed).toEqual([0, -1])
  expect(s.chaosBag).toHaveLength(3)
})
it('resolves all physical tokens sealed on one Premonition in the next test', () => {
  let s = base()
  s.sealed = [
    { token: 0, code: 'premonition-probe', investigator: 'a' },
    { token: -1, code: 'premonition-probe', investigator: 'a' },
  ]
  s.chaosBag = [-2]
  s = reveal(effectTest(s))
  expect(s.skillTest!.tokens).toEqual([0, -1])
  expect(s.sealed).toHaveLength(0)
  expect(by(s).discard.filter((c) => c === 'premonition-probe')).toHaveLength(1)
  s = finish(s)
  expect(s.chaosBag).toHaveLength(3)
})
it('Shards spends a charge, gains skill for sealed zeroes, seals the revealed zero and deals three damage', () => {
  let s = run(owned('04310', 3), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s.chaosBag = [0]
  s.sealed = [
    { token: 0, code: '04310', investigator: 'a', holder: { type: 'asset', id: '04310' } },
  ]
  s = use(s, '04310')
  s = reveal(s)
  expect(s.assets['04310']!.uses).toBe(2)
  expect(sealedOn(s, '04310')).toHaveLength(2)
  expect(skillTestValue(s).total).toBe(7)
  s = finish(s)
  expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
  expect(s.chaosBag).toHaveLength(0)
})
it('Shards can release a sealed token instead of spending a charge', () => {
  let s = run(owned('04310', 0), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s.chaosBag = []
  s.sealed = [
    { token: 0, code: '04310', investigator: 'a', holder: { type: 'asset', id: '04310' } },
  ]
  s = use(s, '04310')
  expect(s.assets['04310']!.uses).toBe(0)
  expect(s.sealed).toHaveLength(0)
  expect(s.chaosBag).toEqual([0])
  s = reveal(s)
  s = finish(s)
  expect(s.sealed).toHaveLength(1)
})
it('Dial of Cataclysm seals a failed local test’s token, then pays or releases each token at round end', () => {
  let s = owned('11046', 4)
  s.chaosBag = ['autoFail']
  s = reveal(effectTest(s, 'willpower', 'b'))
  s = finish(s)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('11046')!.name })
  s = choose(s, 'choice.sealTokenOn', { token: 'autoFail' })
  expect(s.sealed).toHaveLength(1)
  expect(s.chaosBag).toHaveLength(0)
  s = run(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
  s = choose(s, 'choice.chaosKeepSealed')
  expect(s.assets['11046']!.uses).toBe(3)
  s = run(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
  s = choose(s, 'choice.chaosRelease')
  expect(s.sealed).toHaveLength(0)
  expect(s.chaosBag).toContain('autoFail')
})
it.each(['fight', 'evade'] as const)(
  'Dial of Aberration %s succeeds for one extra damage without requiring a charge',
  (kind) => {
    let s = run(owned('11047', 0), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
    s.chaosBag = [0]
    const a = s.assets['11047']!,
      o = behavior('11047').abilities!(s, a, 'a').find((o) =>
        o.then.some((m) => m.type === 'BeginSkillTest' && m.kind.type === kind),
      )!
    s = run(s, { type: 'UseAbility', investigator: 'a', ...o })
    s = finish(reveal(s))
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(kind === 'fight' ? 2 : 1)
    expect(s.assets['11047']!.uses).toBe(0)
  },
)
it('Dial of Aberration spends a charge to cancel and redraw, resolving only the replacement token', () => {
  let s = run(owned('11047', 1), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s.chaosBag = [0]
  s = use(s, '11047')
  s = reveal(s)
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('11047')!.name })
  expect(s.assets['11047']!.uses).toBe(0)
  expect(s.skillTest!.tokens).toHaveLength(1)
  s = finish(s)
  expect(s.chaosBag).toHaveLength(1)
})
it('Dial of Revelation exhausts and spends a charge to investigate quickly, choosing one from one plus all local enemies', () => {
  let s = run(
    owned('11048', 4),
    spawnAt('A', { ...ghoul, health: 8 }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Elite', traits: ['Elite'], health: 8 }, 'a'),
  )
  s.chaosBag = [0, -1, -2]
  s = use(s, '11048')
  s = reveal(s)
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(s.skillTest!.tokens).toEqual([0])
  expect(s.skillTest!.ignoredTokens).toHaveLength(2)
  expect(s.assets['11048']!.uses).toBe(3)
  expect(s.assets['11048']!.exhausted).toBe(true)
  expect(by(s).actionsRemaining).toBe(3)
  expect(by(s).damage).toBe(3)
  s = finish(s)
  expect(s.chaosBag).toHaveLength(3)
})
it('Dial of Revelation exposes its fast ability only during its controller’s turn', () => {
  const s = owned('11048'),
    a = s.assets['11048']!
  expect(behavior('11048').fastOptions!(s, a)).toHaveLength(1)
  expect(behavior('11048').fastOptions!({ ...s, activeTurn: 'b' }, a)).toEqual([])
})
it('Obscure exhausts and releases a seal to evade its engaged enemy with the current shroud as base skill', () => {
  let s = run(owned('11060'), spawnAt('A', { ...ghoul, health: 8 }))
  const e = Object.values(s.enemies)[0]!
  s.sealed = [
    { token: 0, code: '11060', investigator: 'a', holder: { type: 'asset', id: '11060' } },
  ]
  s = run(s, { type: 'EngageEnemy', investigator: 'a', enemy: e.id })
  s = choose(s, 'ability.advancedTest', { card: playerCardDef('11060')!.name })
  s = choose(s, 'action.evade')
  expect(skillTestValue(s).base).toBe(2)
  s.locations.A = { ...s.locations.A!, shroud: 4 }
  expect(skillTestValue(s).base).toBe(4)
  expect(s.assets['11060']!.exhausted).toBe(true)
  expect(s.sealed).toHaveLength(0)
  s = finish(reveal(s))
  expect(s.enemies[e.id]!.exhausted).toBe(true)
})
it.each(['afterRevealLocation', 'afterPutLocation'] as const)(
  'Obscure may seal another zero after its owner triggers %s, even exhausted',
  (type) => {
    let s = owned('11060')
    s.assets['11060']!.exhausted = true
    s.chaosBag = [0]
    s = run(s, { type: 'Forced', trigger: { type, investigator: 'a', location: 'A' } })
    s = choose(s, 'ability.advancedTest', { card: playerCardDef('11060')!.name })
    expect(sealedOn(s, '11060')).toHaveLength(1)
    expect(s.chaosBag).toHaveLength(0)
  },
)
it('Flute pays X and can seal at most X physical curses', () => {
  let s = base()
  s.chaosBag = ['curse', 'curse', 'curse', 'curse', 0]
  s.investigators[0]!.hand = ['07268']
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '07268', x: 3 })
  expect(s.pending!.question.choices.map((c) => c.params?.n)).toEqual([3, 2, 1, 0])
  s = choose(s, 'choice.sealCount', { n: 2 })
  expect(by(s).resources).toBe(17)
  expect(s.sealed).toHaveLength(2)
  expect(s.chaosBag.filter((t) => t === 'curse')).toHaveLength(2)
})
it('Flute chooses a non-Elite donor but may damage an Elite recipient and provokes no attacks', () => {
  let s = run(
    owned('07268', 0),
    spawnAt('A', { ...ghoul, name: 'Donor', damage: 2, health: 8 }, 'a'),
    spawnAt('A', { ...ghoul, name: 'Elite', traits: ['Elite'], health: 8 }, 'a'),
  )
  s.sealed = [
    { token: 'curse', code: '07268', investigator: 'a', holder: { type: 'asset', id: '07268' } },
  ]
  s = use(s, '07268')
  expect(s.pending!.question.choices.map((c) => c.params?.enemy)).toEqual(['Donor'])
  s = choose(s, 'choice.enemy', { enemy: 'Donor' })
  s = choose(s, 'choice.chaosFluteDamage', { enemy: 'Elite' })
  expect(Object.values(s.enemies).find((e) => e.name === 'Elite')!.damageTaken).toBe(2)
  expect(by(s).damage).toBe(3)
  expect(s.assets['07268']!.exhausted).toBe(true)
  expect(s.chaosBag).toContain('curse')
})
it('Flute moves only the chosen enemy one connection and leaves the investigator in place', () => {
  let s = run(owned('07268'), spawnAt('A', { ...ghoul, name: 'Donor', health: 8 }, 'a'))
  s.sealed = [
    { token: 'curse', code: '07268', investigator: 'a', holder: { type: 'asset', id: '07268' } },
  ]
  s = use(s, '07268')
  s = choose(s, 'choice.enemy', { enemy: 'Donor' })
  s = choose(s, 'choice.chaosFluteMove', { location: 'Room B' })
  expect(Object.values(s.enemies)[0]!.location).toBe('B')
  expect(Object.values(s.enemies)[0]!.engagedWith).toBeNull()
  expect(by(s).location).toBe('A')
})
it('Eye adds one willpower for its controller and continuously reveals the actual top encounter only while active', () => {
  let s = owned('11073')
  expect(revealedEncounterTop(s)).toBe(s.encounterDeck[0])
  expect(skillTestValue(effectTest(s)).total).toBe(4)
  expect(skillTestValue(effectTest(s, 'intellect')).total).toBe(3)
  expect(skillTestValue(effectTest(s, 'willpower', 'b')).total).toBe(3)
  const next = s.encounterDeck[1]!
  s.encounterDeck = s.encounterDeck.slice(1)
  expect(revealedEncounterTop(s)).toBe(next)
  s = run(s, { type: 'DiscardAsset', asset: '11073' })
  expect(revealedEncounterTop(s)).toBeUndefined()
})
it('all three researched Dials require the existing campaign note and upgrading the unidentified version', () => {
  const c = newCampaign('night-of-the-zealot', ['harvey'], 'standard'),
    i = c.investigators[0]!
  i.deck.push('11035')
  c.scenarioIndex = 1
  c.results = [{ scenario: 'the-gathering', outcome: { type: 'noResolution' }, xp: { [i.id]: 0 } }]
  c.log.investigators[i.id]!.xp = 20
  const codes = ['11046', '11047', '11048']
  expect(purchaseOptions(c, i.id).some((o) => codes.includes(o.code))).toBe(false)
  c.log.notes.push('calculatedReckoning')
  for (const code of codes) {
    expect(purchaseOptions(c, i.id).some((o) => o.code === code && o.replaces === '11035')).toBe(
      true,
    )
    expect(playerCardDef(code)!.deckLimit).toBe(1)
  }
})
it('registers the nine reviewed standard designs/levels once', () => {
  for (const code of [
    '04197',
    '10097',
    '04310',
    '11046',
    '11047',
    '11048',
    '11060',
    '07268',
    '11073',
  ]) {
    expect(allPlayerCardDefs().filter((c) => c.code === code)).toHaveLength(1)
    expect(playerCardBehavior(code)).toBeTruthy()
  }
})
it('Flute allows X above the resource pool when an actual cost reduction pays the difference', () => {
  registerPlayerCard({ code: 'x-discount-probe', playedCardCostModifier: () => -2 })
  let s = owned('x-discount-probe', 0)
  s.investigators[0]!.resources = 1
  s.investigators[0]!.hand = ['07268']
  s.chaosBag = ['curse', 'curse', 'curse', 0]
  expect(behavior('07268').xOptions!(s, 'a')).toContain(3)
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '07268', x: 3 })
  s = choose(s, 'choice.sealCount', { n: 3 })
  expect(by(s).resources).toBe(0)
  expect(s.sealed).toHaveLength(3)
})
it('Flute played without paying its cost fixes X to zero, including an explicit attempted X', () => {
  let s = base()
  s.investigators[0]!.hand = ['07268']
  s.chaosBag = ['curse', 'curse', 0]
  s = run(s, {
    type: 'PlayCard',
    investigator: 'a',
    code: '07268',
    x: 2,
    noCost: true,
    byEffect: true,
  })
  expect(s.pending!.question.choices.map((c) => c.params?.n)).toEqual([0])
  s = choose(s, 'choice.sealCount', { n: 0 })
  expect(s.sealed ?? []).toHaveLength(0)
  expect(by(s).resources).toBe(20)
})
import { poolTokensAvailable } from '@lcg/engine'
it('keeps ignored held tokens out of the bag when one selected outside token is canceled and redrawn', () => {
  const seen: ChaosToken[][] = []
  registerPlayerCard({
    code: 'held-cancel-probe',
    reactions: (_s, t, a) =>
      t.type === 'whenRevealChaosToken' && !a.exhausted
        ? [
            {
              key: 'cancel-probe',
              label: 'probe.cancel',
              investigator: a.owner,
              then: [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'CancelRevealedToken', redraw: true },
              ],
            },
          ]
        : [],
  })
  registerPlayerCard({
    code: 'held-capture-probe',
    effect: (_s, by, step, d) =>
      step === 'draw'
        ? [nextToken('held-capture-probe', by, d)]
        : step === 'token'
          ? (seen.push(resolvedFaces(d).filter((t): t is ChaosToken => t !== null)),
            [
              {
                type: 'StoreHeldChaosTokens',
                group: String(d.group),
                tokens: [...resolvedPhysical(d), ...JSON.parse(String(d.ignored ?? '[]'))],
              },
              { type: 'ReturnHeldChaosTokens', group: String(d.group) },
            ])
          : [],
  })
  let s = owned('04197')
  s.assets.cancel = {
    id: 'cancel',
    code: 'held-cancel-probe',
    owner: 'a',
    uses: 0,
    exhausted: false,
    damage: 0,
    horror: 0,
  }
  s.chaosBag = [0, 'curse', 'bless']
  s = declare(s, '04197')
  s = run(s, {
    type: 'StartTokenGroup',
    then: { type: 'PlayerCardEffect', investigator: 'a', code: 'held-capture-probe', step: 'draw' },
  })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: 'curse' })
  expect(s.chaosBag).toHaveLength(0)
  s = choose(s, 'probe.cancel')
  expect(seen).toEqual([[0, 'curse']])
  expect(s.chaosBag.map(String).sort()).toEqual(['0', 'bless', 'curse'])
})
it('counts every selected and ignored blessing against the physical pool limit while resolving a held group', () => {
  const available: number[] = []
  registerPlayerCard({
    code: 'pool-watch-probe',
    reactions: (s, t) => {
      if (t.type === 'whenRevealChaosToken') available.push(poolTokensAvailable(s, 'bless'))
      return []
    },
  })
  registerPlayerCard({
    code: 'pool-capture-probe',
    effect: (_s, by, step, d) =>
      step === 'draw'
        ? [nextToken('pool-capture-probe', by, d)]
        : step === 'token'
          ? [
              {
                type: 'StoreHeldChaosTokens',
                group: String(d.group),
                tokens: [...resolvedPhysical(d), ...JSON.parse(String(d.ignored ?? '[]'))],
              },
              { type: 'ReturnHeldChaosTokens', group: String(d.group) },
            ]
          : [],
  })
  let s = owned('04197')
  s.assets.watcher = {
    id: 'watcher',
    code: 'pool-watch-probe',
    owner: 'a',
    uses: 0,
    exhausted: false,
    damage: 0,
    horror: 0,
  }
  s.heldChaosTokens = { reserve: Array.from({ length: 8 }, () => 'bless' as const) }
  s.chaosBag = ['bless', 'bless', 0]
  s = declare(s, '04197')
  s = run(s, {
    type: 'StartTokenGroup',
    then: { type: 'PlayerCardEffect', investigator: 'a', code: 'pool-capture-probe', step: 'draw' },
  })
  s = choose(s, 'choice.resolveToken', { token: 'bless' })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(available.length).toBeGreaterThan(0)
  expect(available.every((n) => n === 0)).toBe(true)
  expect(poolTokensAvailable(s, 'bless')).toBe(0)
})
it('Flute chooses X before offering an optional cost modifier and preserves the printed X', () => {
  registerPlayerCard({
    code: '08057',
    playModifiers: (_s, a) =>
      a.exhausted ? [] : [{ discount: 2, costs: [{ type: 'ExhaustAsset', asset: a.id }] }],
  })
  let s = owned('08057', 0)
  s.investigators[0]!.resources = 1
  s.investigators[0]!.hand = ['07268']
  s.chaosBag = ['curse', 'curse', 'curse', 0]
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '07268' })
  s = choose(s, 'choice.payX', { n: 3 })
  s = choose(s, 'choice.playEconomyModifier')
  s = choose(s, 'choice.sealCount', { n: 3 })
  expect(by(s).resources).toBe(0)
  expect(s.sealed).toHaveLength(3)
  expect(s.assets['08057']!.exhausted).toBe(true)
})
it.each([true, false])(
  'Olive composes with Grotesque Statue in either declaration order (%s)',
  (oliveFirst) => {
    let s = owned('04197')
    s.assets.statue = {
      id: 'statue',
      code: '01071',
      owner: 'a',
      uses: 3,
      exhausted: false,
      damage: 0,
      horror: 0,
    }
    s.chaosBag = [0, -1, -2, 'autoFail']
    const statue = (state: GameState) =>
      run(state, ...behavior('01071').wouldRevealOptions!(state, state.assets.statue!)[0]!.then)
    s = oliveFirst ? declare(s, '04197') : statue(s)
    s = oliveFirst ? statue(s) : declare(s, '04197')
    s = choose(s, 'choice.advancedReplaceReveal', { n: 1 })
    s = reveal(effectTest(s))
    if (oliveFirst) {
      for (let n = 0; n < 3 && has(s, 'choice.resolveToken'); n++)
        s = choose(s, 'choice.resolveToken', s.pending!.question.choices[0]!.params ?? {})
    } else {
      for (let n = 0; n < 2 && has(s, 'choice.resolveToken'); n++)
        s = choose(s, 'choice.resolveToken', s.pending!.question.choices[0]!.params ?? {})
      s = choose(s, 'choice.resolveTokens')
    }
    expect(s.skillTest!.tokens).toHaveLength(2)
    expect(s.skillTest!.ignoredTokens).toHaveLength(2)
    expect(s.assets.statue!.uses).toBe(2)
    s = finish(s)
    expect(s.chaosBag).toHaveLength(4)
  },
)
it('Absolution counts all selected faces but still makes three logical draws when Olive replaces one', () => {
  let s = owned('04197')
  s.chaosBag = [0, 0, 0, 0, 0]
  s.investigators[0]!.hand = ['10024']
  s = declare(s, '04197')
  s = run(s, { type: 'PlayCard', investigator: 'a', code: '10024', x: 0 })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(s.chaosBag.filter((t) => t === 0)).toHaveLength(5)
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(4)
  expect(s.pendingOutsideTokens ?? []).toHaveLength(0)
})
it('Carnamagos makes five logical draws, resolving six tokens and holding seven physical tokens with Olive', () => {
  let calls = 0
  const original = behavior('10085')
  registerPlayerCard({
    ...original,
    effect: (s, by, step, d) => {
      if (step === 'token') calls++
      return original.effect!(s, by, step, d)
    },
  })
  let s = run(owned('04197'), spawnAt('A', { ...ghoul, health: 8 }, 'a'))
  s.assets.rod = {
    id: 'rod',
    code: '10085',
    owner: 'a',
    uses: 0,
    exhausted: false,
    damage: 0,
    horror: 0,
  }
  s.chaosBag = [0, 0, 0, 0, 0, 0, 0]
  s = declare(s, '04197')
  const o = behavior('10085').abilities!(s, s.assets.rod!, 'a')[0]!
  s = run(s, { type: 'UseAbility', investigator: 'a', ...o })
  if (has(s, 'choice.enemy')) s = choose(s, 'choice.enemy')
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  expect(calls).toBe(5)
  expect(s.chaosBag).toHaveLength(7)
  expect(s.pendingOutsideTokens ?? []).toHaveLength(0)
})
it('returns ignored held tokens exactly once when every selected outside token is canceled without redraw', () => {
  registerPlayerCard({
    code: 'cancel-all-probe',
    reactions: (s, t, a) =>
      t.type === 'whenRevealChaosToken' && !!s.tokenReveal
        ? [
            {
              key: 'cancel-all',
              label: 'probe.cancelAll',
              investigator: a.owner,
              then: [{ type: 'CancelRevealedToken' }],
            },
          ]
        : [],
  })
  registerPlayerCard({
    code: 'cancel-capture-probe',
    effect: (_s, by, step, d) =>
      step === 'draw'
        ? [nextToken('cancel-capture-probe', by, d)]
        : [{ type: 'ReturnHeldChaosTokens', group: String(d.group) }],
  })
  let s = owned('04197')
  s.assets.cancel = {
    id: 'cancel',
    code: 'cancel-all-probe',
    owner: 'a',
    uses: 0,
    exhausted: false,
    damage: 0,
    horror: 0,
  }
  s.chaosBag = [0, -1, -2]
  s = declare(s, '04197')
  s = run(s, {
    type: 'StartTokenGroup',
    then: {
      type: 'PlayerCardEffect',
      investigator: 'a',
      code: 'cancel-capture-probe',
      step: 'draw',
    },
  })
  s = choose(s, 'choice.resolveToken', { token: '0' })
  s = choose(s, 'choice.resolveToken', { token: '-1' })
  s = choose(s, 'probe.cancelAll')
  s = choose(s, 'probe.cancelAll')
  expect(s.chaosBag.map(String).sort()).toEqual(['-1', '-2', '0'])
  expect(s.pendingOutsideTokens ?? []).toHaveLength(0)
})
