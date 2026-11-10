// RR: Attach To, Lasting Effects, Enemy Phase (Hunter), Upkeep (Ready), Skill Tests, Evade,
// Fight, Investigate, Shroud, Keywords, Limit X per location/enemy.
import { expect, it } from 'vitest'
import {
  attachedStat,
  dispatch,
  enemyHasKeyword,
  enemyMaxHealth,
  playerCardBehavior,
  shroudOf,
  type EnemyCard,
  type GameState,
  type Message,
} from '@lcg/engine'
import { choose, during, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { setup, name, enemy, fight, investigate, sturdy } from '../basic-abilities/testing'
import data from '../data/lasting-attachments.json'
import { attackable } from '../dunwich-pilot/effects'
import './index'

const me = (s: GameState) => s.investigators.find((i) => i.id === 'a')!
const reveal = (s: GameState) => choose(s, 'choice.revealToken')
const apply = (s: GameState) => choose(s, 'choice.applyResults')
const resolve = (s: GameState, tokens: (string | number)[] = [0]) =>
  apply(reveal({ ...s, chaosBag: tokens as GameState['chaosBag'] }))
const humanoid: EnemyCard = { ...sturdy, traits: ['Humanoid'] }
const eliteGhoul: EnemyCard = { ...sturdy, traits: ['Elite'] }
/** Investigator "a" at Room A with `code` in hand and plenty of resources. */
const withCard = (s: GameState, code: string, changes = {}) =>
  during(s, patch({ hand: [code], resources: 10, ...changes }))
const play = (s: GameState, code: string) => {
  const ready = withCard(s, code)
  const fast = labels(ready).includes('action.playFast')
  return choose(ready, fast ? 'action.playFast' : 'action.play', { card: name(code) })
}
const plain = (enemyCard: EnemyCard | null = sturdy, engaged: string | null = 'a') =>
  during(
    { ...game(), interactive: true },
    patch({ resources: 10, hand: [], deck: ['01088', '01088', '01088'] }),
    ...(enemyCard ? [spawnAt('A', enemyCard, engaged)] : []),
  )
const attachedCodes = (s: GameState, location: string) =>
  Object.values(s.locationAttachments ?? {})
    .filter((a) => a.location === location)
    .map((a) => a.code)
const onEnemy = (s: GameState) =>
  Object.values(s.treacheries)
    .filter((t) => t.placement.type === 'enemy')
    .map((t) => t.code)
/** Resolve messages, then return to investigator a's action menu (no phase advances). */
const run = (s: GameState, ...messages: Message[]) =>
  dispatch({ ...s, pending: null }, ...messages, { type: 'PlayerWindow', investigator: 'a' })
const location = (s: GameState, id: string, changes: object): GameState => ({
  ...s,
  locations: { ...s.locations, [id]: { ...s.locations[id]!, ...changes } },
})

it.each(data)('$code has a reviewed implementation', (c) =>
  expect(playerCardBehavior(c.code)).toBeDefined(),
)

it('Anatomical Diagrams: -2 fight and evade until the end of the turn; needs 5 sanity', () => {
  let s = play(plain(), '03108')
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(-2)
  expect(attachedStat(s, enemy(s).id, 'evade')).toBe(-2)
  s = run(s, { type: 'EndTurn', investigator: 'a' } as Message)
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(0)
  const low = withCard(plain(), '03108', { horror: me(plain()).sanity - 4 })
  expect(playerCardBehavior('03108')!.canPlay!(low, 'a')).toBe(false)
  expect(playerCardBehavior('03108')!.canPlay!(withCard(plain(eliteGhoul), '03108'), 'a')).toBe(
    false,
  )
})

it('Expose Weakness (1): -1 fight per point succeeded by, for the next attack only', () => {
  let s = play(plain(), '02228')
  expect(s.skillTest?.difficulty).toBe(2)
  s = resolve(s, [0])
  const margin = me(s).skills.intellect - 2
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(-margin)
  // The next attack (successful or not) consumes it.
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: enemy(s).fight,
    kind: { type: 'fight', enemy: enemy(s).id },
  })
  expect(s.skillTest?.difficulty).toBe(Math.max(0, 2 - margin))
  s = resolve(s, ['autoFail'])
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(0)
})

it('Expose Weakness (3): fight treated as 0 for the next attack; draws 1 card', () => {
  let s = play(plain(), '04195')
  s = resolve(s, [0])
  expect(enemy(s).fight + attachedStat(s, enemy(s).id, 'fight')).toBe(0)
  expect(me(s).hand).toHaveLength(1)
})

it('Expose Weakness (3) draws even on a failed test', () => {
  const s = resolve(play(plain(), '04195'), ['autoFail'])
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(0)
  expect(me(s).hand).toHaveLength(1)
})

it.each([
  ['05157', false],
  ['05321', true],
] as const)(
  'Wither %s: willpower attack; a symbol gives -1 fight/evade for the turn',
  (code, up) => {
    let s = setup(code)
    s = fight(s, code, 'willpower')
    expect(s.skillTest?.skill).toBe('willpower')
    expect(s.skillTest?.baseModifier).toBe(up ? 2 : 0)
    s = reveal({ ...s, chaosBag: ['skull'] })
    // Applied on reveal: this attack's difficulty drops too.
    expect(s.skillTest?.difficulty).toBe(1)
    s = apply(s)
    expect(attachedStat(s, enemy(s).id, 'fight')).toBe(-1)
    expect(attachedStat(s, enemy(s).id, 'evade')).toBe(-1)
    expect(enemyMaxHealth(s, enemy(s))).toBe(up ? 9 : 10)
  },
)

it('Wither: to a minimum of 1', () => {
  let s = setup('05157', { enemy: { ...sturdy, fight: 1, evade: 1 } })
  s = resolve(fight(s, '05157', 'willpower'), ['skull'])
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(0)
  expect(attachedStat(s, enemy(s).id, 'evade')).toBe(0)
})

it('Wither cannot raise an enemy stat already below its minimum', () => {
  let s = play(setup('05157'), '03108')
  s = reveal({ ...fight(s, '05157', 'willpower'), chaosBag: ['skull'] })
  expect(s.skillTest?.difficulty).toBe(0)
  expect(attachedStat(s, enemy(s).id, 'fight')).toBe(-2)
})

it('Wither (4) defeats an enemy whose damage reaches its reduced health', () => {
  const s = setup('05321', { enemy: { ...sturdy, health: 3, fight: 9 } })
  const id = enemy(s).id
  const wounded = { ...s, enemies: { ...s.enemies, [id]: { ...enemy(s), damageTaken: 2 } } }
  const result = resolve(fight(wounded, '05321', 'willpower'), ['skull'])
  expect(result.lastSkillTest?.succeeded).toBe(false)
  expect(result.enemies[id]).toBeUndefined()
})

it('Sixth Sense: a symbol lets you investigate a revealed connecting location', () => {
  let s = setup('05158', { enemy: null })
  s = location(s, 'B', { revealed: true, clues: 2 })
  s = investigate(s, '05158', 'willpower')
  s = reveal({ ...s, chaosBag: ['skull'] })
  expect(labels(s)).toContain('choice.sixthSense')
  s = choose(s, 'choice.sixthSense', { location: 'Room B', shroud: 2 })
  const kind = s.skillTest?.kind
  expect(kind?.type === 'investigate' && kind.location).toBe('B')
})

it('Ofuda: the enemy loses its keywords this round; first bless at your location recharges', () => {
  const bless: Message = {
    type: 'Forced',
    trigger: { type: 'afterRevealChaosToken', investigator: 'a', token: 'bless' },
  }
  let s = setup('10022', { enemy: { ...sturdy, keywords: ['retaliate', 'alert'] } })
  s = choose(s, 'ability.ofuda', { card: name('10022'), enemy: enemy(s).name })
  expect(s.assets['10022']!.uses).toBe(0)
  expect(enemyHasKeyword(s, enemy(s), 'retaliate')).toBe(false)
  expect(enemyHasKeyword(s, enemy(s), 'alert')).toBe(false)
  s = run(s, bless)
  expect(s.assets['10022']!.uses).toBe(1)
  s = run({ ...s, assets: { ...s.assets, '10022': { ...s.assets['10022']!, uses: 0 } } }, bless)
  expect(s.assets['10022']!.uses).toBe(0)
  expect(enemyHasKeyword({ ...s, round: s.round + 1 }, enemy(s), 'retaliate')).toBe(true)
})

it('Ofuda prevents an Elusive enemy from moving or exhausting after an attack', () => {
  let s = setup('10022', { enemy: { ...sturdy, keywords: ['elusive'] } })
  s = choose(s, 'ability.ofuda', { card: name('10022'), enemy: enemy(s).name })
  s = resolve(
    run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 0,
      kind: { type: 'fight', enemy: enemy(s).id },
    }),
  )
  expect(enemy(s).location).toBe('A')
  expect(enemy(s).exhausted).toBe(false)
})

it('Bolas: combat evasion attaches it to a non-Elite enemy (-1 evade, exhausted after moving)', () => {
  let s = play(plain(), '09025')
  expect(s.skillTest?.skill).toBe('combat')
  s = resolve(s)
  expect(onEnemy(s)).toEqual(['09025'])
  expect(attachedStat(s, enemy(s).id, 'evade')).toBe(-1)
  const id = enemy(s).id
  s = run(
    { ...s, enemies: { ...s.enemies, [id]: { ...enemy(s), exhausted: false } } },
    {
      type: 'MoveEnemy',
      enemy: id,
      location: 'B',
    },
  )
  expect(enemy(s).exhausted).toBe(true)
  expect(onEnemy(resolve(play(plain(eliteGhoul), '09025')))).toEqual([])
})

it('Bolas exhausts an enemy that follows an investigator into a location', () => {
  let s = resolve(play(plain(), '09025'))
  const id = enemy(s).id
  s = run(
    s,
    { type: 'ReadyEnemy', enemy: id },
    { type: 'EngageEnemy', enemy: id, investigator: 'a' },
  )
  s = run(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  expect(enemy(s).location).toBe('B')
  expect(enemy(s).exhausted).toBe(true)
})

it('Fend Off: the spawning enemy attacks, is evaded and cannot ready', () => {
  let s = withCard(plain(null), '08082')
  s = run(s, spawnAt('A', ghoul, null))
  s = choose(s, 'ability.playCard', { card: name('08082') })
  expect(me(s).damage + me(s).horror).toBe(2)
  expect(enemy(s).exhausted).toBe(true)
  expect(onEnemy(s)).toEqual(['08082'])
  s = run(s, { type: 'ReadyAll' } as Message)
  expect(enemy(s).exhausted).toBe(true)
})

it("Hunter's Mark: +1 combat against the enemy; discard for 1 additional damage", () => {
  let s = play(plain(), '11026')
  expect(onEnemy(s)).toEqual(['11026'])
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'combat',
    difficulty: 2,
    kind: { type: 'fight', enemy: enemy(s).id },
  })
  expect(s.skillTest?.baseModifier).toBe(1)
  s = resolve(s)
  s = choose(s, 'ability.huntersMark', { card: name('11026'), enemy: enemy(s).name })
  expect(enemy(s).damageTaken).toBe(2)
  expect(onEnemy(s)).toEqual([])
  expect(me(s).discard).toContain('11026')
})

it("Hunter's Mark does not add combat to an attack using willpower", () => {
  const s = play(plain(), '11026')
  const fighting = run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 2,
    kind: { type: 'fight', enemy: enemy(s).id },
  })
  expect(fighting.skillTest?.baseModifier).toBe(0)
})

it("Hunter's Mark can increase damage without a source investigator", () => {
  let s = play(plain(), '11026')
  s = run(s, { type: 'DamageEnemy', enemy: enemy(s).id, amount: 1 })
  s = choose(s, 'ability.huntersMark', { card: name('11026'), enemy: enemy(s).name })
  expect(enemy(s).damageTaken).toBe(2)
})

it('Grievous Wound: after a successful Melee attack; 1 damage at the end of each round', () => {
  let s = withCard(setup('01020'), '09027')
  s = resolve(fight(s, '01020'))
  // After the attack resolves (ST.8), with the enemy still in play.
  s = choose(s, 'ability.playCard', { card: name('09027') })
  expect(onEnemy(s)).toEqual(['09027'])
  const before = enemy(s).damageTaken
  s = run(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
  expect(enemy(s).damageTaken).toBe(before + 1)
})

it.each([
  ['04265', false],
  ['09035', true],
] as const)(
  'Handcuffs %s: combat evasion of a Humanoid attaches it; no ready, no doom',
  (code, up) => {
    let s = setup(code, { enemy: humanoid })
    s = during(s, (x) => x, { type: 'PlaceDoomOnEnemy', enemy: enemy(s).id, amount: 1 })
    s = choose(s, 'ability.evadeWith', { card: name(code), enemy: enemy(s).name, skill: 'combat' })
    s = resolve(s)
    expect(s.assets[code]).toBeUndefined()
    expect(onEnemy(s)).toEqual([code])
    expect(enemy(s).doom ?? 0).toBe(up ? 0 : 1)
    s = run(s, { type: 'PlaceDoomOnEnemy', enemy: enemy(s).id, amount: 1 })
    expect(enemy(s).doom ?? 0).toBe(up ? 0 : 1)
    s = run(s, { type: 'ReadyAll' } as Message)
    expect(enemy(s).exhausted).toBe(true)
    expect(labels(setup(code))).not.toContain('ability.evadeWith')
  },
)

it('Barricade: non-Elite enemies cannot move in; discarded when an investigator leaves', () => {
  let s = play(plain(null), '01038')
  s = run(s, spawnAt('B', sturdy, null))
  expect(attachedCodes(s, 'A')).toEqual(['01038'])
  s = run(s, { type: 'MoveEnemy', enemy: enemy(s).id, location: 'A' })
  expect(enemy(s).location).toBe('B')
  s = run(s, { type: 'MoveTo', investigator: 'a', location: 'B' } as Message)
  expect(attachedCodes(s, 'A')).toEqual([])
  expect(me(s).discard).toContain('01038')
})

it('Ambush: 2 damage to an enemy that spawns there, then discarded', () => {
  let s = play(plain(null), '03148')
  s = run(s, spawnAt('A', sturdy, null))
  expect(enemy(s).damageTaken).toBe(2)
  expect(attachedCodes(s, 'A')).toEqual([])
})

it('Snare Trap: catches an entering enemy; discarded instead of it readying', () => {
  let s = play(plain(null), '03199')
  s = run(s, spawnAt('B', sturdy, null))
  s = run(s, { type: 'MoveEnemy', enemy: enemy(s).id, location: 'A' })
  expect(enemy(s).exhausted).toBe(true)
  expect(enemy(s).engagedWith).toBeNull()
  expect(onEnemy(s)).toEqual(['03199'])
  expect(attachedCodes(s, 'A')).toEqual([])
  s = run(s, { type: 'ReadyAll' } as Message)
  expect(enemy(s).exhausted).toBe(true)
  expect(onEnemy(s)).toEqual([])
  expect(me(s).discard).toContain('03199')
})

it('Under Surveillance: evades an entering enemy, discovers a clue; it stays exhausted', () => {
  let s = play(plain(null), '07157')
  s = run(s, spawnAt('B', sturdy, null))
  s = run(s, { type: 'MoveEnemy', enemy: enemy(s).id, location: 'A' })
  expect(enemy(s).exhausted).toBe(true)
  expect(me(s).clues).toBe(1)
  expect(attachedCodes(s, 'A')).toEqual([])
  s = run(s, { type: 'ReadyAll' } as Message)
  expect(enemy(s).exhausted).toBe(true)
})

it.each(['03199', '07157'])('%s triggers when an engaged enemy follows an investigator', (code) => {
  let s = during(plain(), patch({ discard: [code] }))
  s = run(s, { type: 'AttachEventToLocation', investigator: 'a', code, location: 'B' })
  s = run(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  expect(enemy(s).location).toBe('B')
  expect(enemy(s).exhausted).toBe(true)
  expect(enemy(s).engagedWith).toBeNull()
  expect(attachedCodes(s, 'B')).toEqual([])
})

it.each(['ReadyEnemy', 'ReadyAll'] as const)(
  'Snare Trap stays attached if %s cannot ready the enemy',
  (type) => {
    let s = during(plain(), patch({ discard: ['03199', '08082'] }))
    const id = enemy(s).id
    s = run(
      s,
      { type: 'ExhaustEnemy', enemy: id },
      ...['03199', '08082'].map((code): Message => ({
        type: 'AttachPlayerCardToEnemy',
        investigator: 'a',
        code,
        enemy: id,
      })),
    )
    s = run(s, type === 'ReadyEnemy' ? { type, enemy: id } : { type })
    expect(enemy(s).exhausted).toBe(true)
    expect(onEnemy(s)).toEqual(['03199', '08082'])
  },
)

it('Hiding Spot: non-Elite enemies there are aloof; discarded with a ready enemy there', () => {
  let s = play(plain(null), '03038')
  s = choose(s, 'choice.attachTo', { location: 'Room B' })
  s = run(s, spawnAt('B', sturdy, null))
  expect(enemyHasKeyword(s, enemy(s), 'aloof')).toBe(true)
  s = run(s, { type: 'Forced', trigger: { type: 'enemyPhaseEnds' } })
  expect(attachedCodes(s, 'B')).toEqual([])
})

it('Shared attack targets account for Aloof gained from Hiding Spot and lost to Ofuda', () => {
  let s = play(withAsset(plain(null), '10022'), '03038')
  s = choose(s, 'choice.attachTo', { location: 'Room A' })
  s = run(s, spawnAt('A', sturdy, null))
  expect(enemy(s).engagedWith).toBeNull()
  expect(attackable(s, 'a')).toEqual([])
  s = choose(s, 'ability.ofuda', { card: name('10022'), enemy: enemy(s).name })
  expect(attackable(s, 'a')).toEqual([enemy(s)])
})

it.each(['02156', '05323'])('Lure %s: enemies move toward it; discarded at round end', (code) => {
  let s = play(plain(null), code)
  if (code === '05323') s = choose(s, 'choice.attachTo', { location: 'Room A' })
  s = run(s, spawnAt('C', { ...sturdy, keywords: ['hunter'] }, null))
  s = run({ ...s, phase: 'enemy' }, { type: 'MoveHuntingEnemy', enemy: enemy(s).id } as Message)
  expect(enemy(s).location).toBe('B')
  s = run(s, { type: 'Forced', trigger: { type: 'roundEnds' } })
  expect(attachedCodes(s, 'A')).toEqual([])
})

it('Map the Area: attached instead of discovering clues; tests there get -1 difficulty', () => {
  let s = play(withAsset(plain(null), '01059'), '09048')
  s = choose(s, 'choice.mapTheArea', { skill: 'willpower' })
  expect(s.skillTest?.baseModifier).toBe(me(s).skills.willpower + 1)
  s = resolve(s)
  expect(me(s).clues).toBe(0)
  expect(attachedCodes(s, 'A')).toEqual(['09048'])
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'a',
    skill: 'willpower',
    difficulty: 3,
    kind: { type: 'effect', source: 'x', onSuccess: [], onFail: [], onFailEach: [] },
  })
  expect(s.skillTest?.difficulty).toBe(2)
})

it('Breach the Door: 1 lead per point succeeded by, each -1 shroud', () => {
  let s = play(plain(null), '09026')
  s = resolve(s)
  const leads = me(s).skills.combat - 1
  expect(Object.values(s.locationAttachments ?? {})[0]?.resources ?? 0).toBe(leads)
  expect(shroudOf(s, 'A')).toBe(Math.max(0, 2 - leads))
})

it('Vantage Point: -1 shroud this turn and moves 1 clue to the revealed location', () => {
  let s = withCard(plain(null), '04306')
  s = location(s, 'C', { clues: 1 })
  s = run(s, {
    type: 'Forced',
    trigger: { type: 'afterRevealLocation', investigator: 'a', location: 'B' },
  })
  s = choose(s, 'ability.playCard', { card: name('04306') })
  s = choose(s, 'choice.vantageClue', { from: 'Room C', location: 'Room B' })
  expect(s.locations.B!.clues).toBe(1)
  expect(shroudOf(s, 'B')).toBe(2)
})

it('Barricade (FAQ): an engaged enemy disengages and stays when you move into it', () => {
  let s = during(plain(), patch({ discard: ['01038'] }))
  s = run(s, { type: 'AttachEventToLocation', investigator: 'a', code: '01038', location: 'B' })
  s = run(s, { type: 'MoveTo', investigator: 'a', location: 'B' } as Message)
  expect(me(s).location).toBe('B')
  expect(enemy(s).location).toBe('A')
  expect(enemy(s).engagedWith).toBeNull()
})
