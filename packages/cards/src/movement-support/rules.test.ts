// RR: Move, Connections, Engage, Evade, Fight, As If, Uses, Immunity, Delayed Effects.
import { expect, it } from 'vitest'
import {
  actionKinds,
  applyInput,
  availableAbilities,
  availableActions,
  dispatch,
  engagedEnemies,
  getInvestigator,
  physicalLocation,
  playerCardBehavior,
  playerCardDef,
  registerEnemy,
  skillTestValue,
  type AbilityOption,
  type GameState,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { game, patch, me, withAsset } from '../dunwich-pilot/testing'
import { cardName, distance } from './common'
import data from '../data/movement-support.json'
import './index'

const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (): GameState => {
  const s = patch({ resources: 20, hand: [] })(clear(game(['a', 'b'])))
  return {
    ...s,
    interactive: true,
    locations: Object.fromEntries(
      Object.entries(s.locations).map(([id, l]) => [id, { ...l, revealed: true, clues: 3 }]),
    ),
  }
}
const own = (code: string) => withAsset(base(), code)
const b = (code: string) => playerCardBehavior(code)!
const play = (s: GameState, code: string) =>
  dispatch(clear(patch({ hand: [...me(s).hand, code] })(s)), {
    type: 'TakeAction',
    investigator: 'a',
    action: { kind: 'play', card: code },
  })
const use = (s: GameState, option: AbilityOption, by = 'a') =>
  dispatch(clear(s), {
    type: 'UseAbility',
    investigator: by,
    key: option.key,
    actions: option.actions,
    provokes: option.provokes,
    then: option.then,
    ...(option.actionKind ? { actionKind: option.actionKind } : {}),
    ...(option.costs ? { costs: option.costs } : {}),
  })
const move = (s: GameState, id: string) =>
  choose(s, 'choice.location', { location: s.locations[id]!.name })
const react = (s: GameState, code: string) =>
  choose(s, 'ability.advancedTest', { card: cardName(code) })
const enemy = (s: GameState, at = 'A', engaged?: string, changes = {}) =>
  dispatch(clear(s), spawnAt(at, { ...ghoul, health: 12, ...changes }, engaged))
const enemyId = (s: GameState, at?: string) =>
  Object.values(s.enemies).find((e) => !at || e.location === at)!.id
const reveal = (s: GameState) => choose({ ...s, chaosBag: [0] }, 'choice.revealToken')
const results = (s: GameState) => choose(s, 'choice.applyResults')
const target = (s: GameState, label: string, id: string) => {
  const n = s.pending!.question.choices.findIndex(
    (c) => c.label === label && c.target && 'id' in c.target && c.target.id === id,
  )
  expect(n).toBeGreaterThanOrEqual(0)
  return applyInput(s, { investigator: s.pending!.investigator, choice: n })
}

it.each(data)('$code registers its reviewed behavior and level', (c) => {
  expect(b(c.code)).toBeDefined()
  expect(playerCardDef(c.code)?.xp).toBe(c.xp)
})

it('Shortcut (2) attaches, can be used by another investigator and exhausts only that copy', () => {
  let s = play(base(), '03232')
  const a = Object.values(s.locationAttachments!)[0]!
  const option = availableAbilities(s, 'b').find(
    (o) => o.key.includes(':shortcut:') && o.target?.type === 'location' && o.target.id === 'B',
  )!
  s = use(s, option, 'b')
  expect(getInvestigator(s, 'b').location).toBe('B')
  expect(s.locationAttachments![a.id]!.exhausted).toBe(true)
  expect(me(s).location).toBe('A')
})

it('Open Gate adds investigator movement without shortening enemy routes, and has group limit three', () => {
  let s = play(base(), '06029')
  s = patch({ location: 'C' })(s)
  s = play(s, '06029')
  s = patch({ location: 'A' })(s)
  expect(availableActions(s, 'a')).toContainEqual({ kind: 'move', to: 'C' })
  expect(distance(s, 'A', 'C', false)).toBe(2)
  s = play(s, '06029')
  expect(b('06029').canPlay!(s, 'a')).toBe(false)
  const c = Object.values(s.locationAttachments!).find((a) => a.location === 'C')!
  s = dispatch(clear(s), { type: 'DiscardLocationAttachment', attachment: c.id })
  expect(availableActions(s, 'a')).not.toContainEqual({ kind: 'move', to: 'C' })
})

it('Righteous Hunt moves step by step, engages the chosen enemy and adds blessings equal to its horror', () => {
  let s = enemy(base(), 'C', undefined, { horror: 2 })
  const id = enemyId(s)
  s = play(s, '07109')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[id]!.name })
  s = move(s, 'B')
  expect(me(s).location).toBe('B')
  s = move(s, 'C')
  expect(me(s).location).toBe('C')
  expect(s.enemies[id]!.engagedWith).toBe('a')
  expect(s.chaosBag.filter((t) => t === 'bless')).toHaveLength(2)
  expect(actionKinds({ kind: 'play', card: '07109' })).toContain('engage')
})

it('The Truth Beckons stops at the first unrevealed location along the selected route', () => {
  let s = base()
  s = {
    ...s,
    locations: {
      ...s.locations,
      B: { ...s.locations.B!, revealed: false },
      C: { ...s.locations.C!, revealed: false },
    },
  }
  s = play(s, '07154')
  s = move(s, 'C')
  s = move(s, 'B')
  expect(me(s).location).toBe('B')
  expect(s.locations.B!.revealed).toBe(true)
  expect(s.locations.C!.revealed).toBe(false)
  expect(labels(s)).not.toContain('choice.location')
})

it('Scout Ahead bypasses intermediate enemies but restores normal engagement at its destination', () => {
  let s = enemy(base(), 'B')
  s = enemy(s, 'C')
  const middle = enemyId(s, 'B'),
    end = enemyId(s, 'C')
  s = play(s, '08047')
  s = move(s, 'B')
  expect(s.enemies[middle]!.engagedWith).toBeNull()
  s = move(s, 'C')
  s = choose(s, 'choice.skip')
  expect(s.enemies[end]!.engagedWith).toBe('a')
  expect(s.enemies[middle]!.location).toBe('B')
  expect(me(s).engagementSuppression).toBe(0)
})

it('On the Trail (1) may discover a clue at an empty location strictly between investigator and enemy', () => {
  let s = enemy(base(), 'C')
  s = play(s, '08084')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  s = choose(s, 'choice.movementClue', { location: s.locations.B!.name })
  expect(me(s).location).toBe('A')
  expect(me(s).clues).toBe(1)
  expect(s.locations.B!.clues).toBe(2)
})

it('On the Trail (3) finishes moving before discovering a clue at each entered location', () => {
  let s = enemy(base(), 'C')
  s = play(s, '08085')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  s = move(s, 'B')
  expect(me(s).clues).toBe(0)
  s = move(s, 'C')
  expect(me(s).clues).toBe(2)
  expect(me(s).location).toBe('C')
})

it('Fang of Tyr’thrha can attack at a revealed remote location without moving and adds agility plus three damage', () => {
  let s = enemy(base(), 'C')
  s = play(s, '08029')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  s = choose(s, 'choice.movementStay')
  expect(me(s).location).toBe('A')
  expect(s.skillTest!.baseModifier).toBe(me(s).skills.agility)
  s = results(reveal(s))
  expect(s.enemies[enemyId(s)]!.damageTaken).toBe(4)
})

it.each(['06164', '10100'])(
  '%s makes its controller ethereal, disengages enemies and prevents their attacks and damage to enemies',
  (code) => {
    let s = enemy(base(), 'A', 'a')
    const id = enemyId(s)
    s = play(s, code)
    s = choose(s, 'choice.enemy', { enemy: s.enemies[id]!.name })
    expect(s.skillTest!.baseModifier).toBe(me(s).skills.willpower)
    s = results(reveal(s))
    expect(me(s).etherealRound).toBe(s.round)
    expect(engagedEnemies(s, 'a')).toHaveLength(0)
    expect(availableActions(s, 'a').some((a) => a.kind === 'fight' || a.kind === 'engage')).toBe(
      false,
    )
    s = dispatch(
      clear(s),
      { type: 'EngageEnemy', enemy: id, investigator: 'a' },
      { type: 'DamageEnemy', enemy: id, by: 'a', amount: 2 },
    )
    expect(s.enemies[id]!.engagedWith).toBeNull()
    expect(s.enemies[id]!.damageTaken).toBe(0)
    s = dispatch(clear({ ...s, round: s.round + 1 }), {
      type: 'EngageEnemy',
      enemy: id,
      investigator: 'a',
    })
    expect(s.enemies[id]!.engagedWith).toBe('a')
  },
)

it('Ethereal Form (2) returns at the end of the investigator’s turn if a symbol was revealed', () => {
  let s = play(enemy(base(), 'A', 'a'), '10100')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  s = results(choose({ ...s, chaosBag: ['elderSign'] }, 'choice.revealToken'))
  expect(me(s).discard).toContain('10100')
  s = dispatch(clear(s), { type: 'EndTurn', investigator: 'a' })
  expect(me(s).hand).toContain('10100')
})

it('Ethereal Form (2) also returns after a failed evasion with a symbol', () => {
  let s = play(enemy(base(), 'A', 'a'), '10100')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  s = results(choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken'))
  expect(me(s).etherealRound).toBeUndefined()
  s = dispatch(clear(s), { type: 'EndTurn', investigator: 'a' })
  expect(me(s).hand).toContain('10100')
})

it('fast effects resolving as if elsewhere still modify an ongoing test immediately', () => {
  let s = own('08097')
  s = use(
    s,
    b('08097').abilities!(s, s.assets['08097']!, 'a').find((o) => o.actions === 1)!,
  )
  s = dispatch(
    { ...s, pending: null },
    {
      type: 'AsIfAt',
      investigator: 'a',
      location: 'C',
      then: [{ type: 'BoostSkillTest', amount: 2 }],
    },
    { type: 'CommitWindow' },
  )
  expect(s.skillTest!.baseModifier).toBe(2)
  expect(me(s).location).toBe('B')
  expect(physicalLocation(s, 'a')).toBe('A')
})

it('Cowl also prevents implicit Massive engagement and enemy-phase attacks', () => {
  let s = enemy(own('11109'), 'B', undefined, { keywords: ['massive'] })
  s = dispatch(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  s = react(s, '11109')
  expect(engagedEnemies(s, 'a')).toHaveLength(0)
  s = dispatch(clear(s), { type: 'EnemiesAttack' })
  expect(me(s).damage).toBe(0)
})

it('Gené moves a clue between connected locations without discovering it', () => {
  let s = dispatch(own('08099'), { type: 'MoveTo', investigator: 'a', location: 'B' })
  s = react(s, '08099')
  s = choose(s, 'choice.movementTransferClue', {
    from: s.locations.C!.name,
    to: s.locations.B!.name,
  })
  expect(s.locations.C!.clues).toBe(2)
  expect(s.locations.B!.clues).toBe(4)
  expect(me(s).clues).toBe(0)
  expect(s.assets['08099']!.exhausted).toBe(true)
})

it('Gené may instead move a non-Elite enemy and its arrival causes engagement', () => {
  let s = enemy(own('08099'), 'C')
  const id = enemyId(s)
  s = dispatch(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  s = react(s, '08099')
  s = choose(s, 'choice.movementTransferEnemy', {
    enemy: s.enemies[id]!.name,
    location: s.locations.B!.name,
  })
  expect(s.enemies[id]).toMatchObject({ location: 'B', engagedWith: 'a' })
})

it('Prophesiae grants bonuses without a chosen locus, and loses them only at its chosen locus', () => {
  let s = own('08045')
  const test = {
    type: 'BeginSkillTest' as const,
    investigator: 'a',
    skill: 'intellect' as const,
    difficulty: 2,
    kind: { type: 'investigate' as const, location: 'A' },
  }
  expect(skillTestValue(dispatch(s, test)).passive).toBe(1)
  s = { ...s, assets: { ...s.assets, '08045': { ...s.assets['08045']!, form: 'A' } } }
  expect(skillTestValue(dispatch(s, test)).passive).toBe(0)
  const option = b('08045').abilities!(s, s.assets['08045']!, 'a').find((o) =>
    o.key.endsWith(':b'),
  )!
  expect(option).toBeUndefined() // b is already at the locus.
  s = dispatch(s, { type: 'SetAssetForm', asset: '08045', form: 'C' })
  const moveB = b('08045').abilities!(s, s.assets['08045']!, 'a').find((o) => o.key.endsWith(':b'))!
  s = use(s, moveB)
  expect(getInvestigator(s, 'b').location).toBe('C')
})

it('Pocket Telescope looks without revealing, and may investigate while exhausted', () => {
  let s = own('08097')
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: false, clues: 0 } } }
  s = use(s, b('08097').abilities!(s, s.assets['08097']!, 'a')[0]!)
  expect(s.pending!.question.choices[0]!.previewCard).toBe('B')
  s = choose(s, 'choice.continue')
  expect(s.locations.B!.revealed).toBe(false)
  expect(s.assets['08097']!.exhausted).toBe(true)
  s = { ...s, locations: { ...s.locations, B: { ...s.locations.B!, revealed: true, clues: 3 } } }
  expect(b('08097').abilities!(s, s.assets['08097']!, 'a').some((o) => o.actions === 1)).toBe(true)
})

it('Pocket Telescope pays attacks of opportunity physically, investigates remotely and restores its position', () => {
  let s = enemy(own('08097'), 'A', 'a')
  const id = enemyId(s)
  s = use(
    s,
    b('08097').abilities!(s, s.assets['08097']!, 'a').find((o) => o.actions === 1)!,
  )
  expect(me(s)).toMatchObject({ damage: 1, horror: 1, location: 'B' })
  expect(physicalLocation(s, 'a')).toBe('A')
  expect(s.skillTest!.kind).toMatchObject({ type: 'investigate', location: 'B' })
  s = results(reveal(s))
  expect(me(s).location).toBe('A')
  expect(s.enemies[id]!.location).toBe('A')
  expect(me(s).clues).toBe(1)
  expect(s.asIfLocations).toBeUndefined()
})

it('movement during an as-if investigation starts at the physical location and persists afterwards', () => {
  let s = own('08097')
  s = use(
    s,
    b('08097').abilities!(s, s.assets['08097']!, 'a').find((o) => o.actions === 1)!,
  )
  expect(me(s).location).toBe('B')
  const moves = availableActions(s, 'a').filter((a) => a.kind === 'move')
  expect(moves).toContainEqual({ kind: 'move', to: 'B' })
  expect(moves).not.toContainEqual({ kind: 'move', to: 'C' })
  s = dispatch(
    { ...s, pending: null },
    { type: 'MoveTo', investigator: 'a', location: 'B' },
    { type: 'CommitWindow' },
  )
  expect(physicalLocation(s, 'a')).toBe('B')
  s = results(reveal(s))
  expect(me(s).location).toBe('B')
})

it('Cowl of Sekhmet prevents engagement and its controller’s damage only for the affected non-Elite enemies', () => {
  let s = enemy(own('11109'), 'B')
  const id = enemyId(s)
  s = dispatch(s, { type: 'MoveTo', investigator: 'a', location: 'B' })
  s = react(s, '11109')
  expect(s.enemies[id]!.engagedWith).toBeNull()
  s = dispatch(clear(s), { type: 'DamageEnemy', enemy: id, amount: 2, by: 'a' })
  expect(s.enemies[id]!.damageTaken).toBe(0)
  s = dispatch(clear(s), { type: 'DamageEnemy', enemy: id, amount: 1, by: 'b' })
  expect(s.enemies[id]!.damageTaken).toBe(1)
})

it('Enchanted Bow works locally without charges; remote shots pay a charge and ignore aloof and retaliate', () => {
  let s = enemy(withAsset(base(), '08118', { uses: 0 }), 'A', 'a')
  expect(b('08118').abilities!(s, s.assets['08118']!, 'a')).toHaveLength(2)
  s = use(s, b('08118').abilities!(s, s.assets['08118']!, 'a')[0]!)
  expect(s.assets['08118']!.uses).toBe(0)
  s = enemy(own('08118'), 'B', undefined, { keywords: ['aloof', 'retaliate'] })
  s = use(s, b('08118').abilities!(s, s.assets['08118']!, 'a')[0]!)
  expect(s.assets['08118']!.uses).toBe(2)
  expect(s.skillTest!.ignoredEnemyKeywords).toEqual(['aloof', 'retaliate'])
  s = results(choose({ ...s, chaosBag: ['autoFail'] }, 'choice.revealToken'))
  expect(me(s).damage).toBe(0)
})

it('Sled Dogs share slots and exhaust exactly the selected dogs for an attack dealing X damage', () => {
  let s = enemy(
    withAsset(withAsset(own('08127'), '08127', { id: 'dog2' }), '08127', { id: 'dog3' }),
    'A',
    'a',
  )
  const ability = b('08127').abilities!(s, s.assets['08127']!, 'a').find(
    (o) => o.actionKind === 'fight',
  )!
  s = use(s, ability)
  s = target(s, 'choice.movementDog', '08127')
  s = target(s, 'choice.movementDog', 'dog2')
  s = choose(s, 'choice.continue')
  s = choose(s, 'choice.enemy', { enemy: s.enemies[enemyId(s)]!.name })
  expect(s.skillTest!.baseModifier).toBe(2)
  s = results(reveal(s))
  expect(s.enemies[enemyId(s)]!.damageTaken).toBe(2)
  expect(s.assets.dog3!.exhausted).toBe(false)
  expect(b('08127').sharedSlot).toEqual({ key: '08127', size: 2 })
  expect(playerCardDef('08127')!.deckLimit).toBe(4)
})

it('Heroic Rescue (2) moves to a connecting investigator, redirects the same attack and deals one damage afterwards', () => {
  let s = patch({ location: 'B' }, 'b')(base())
  s = enemy(s, 'B', 'b')
  const id = enemyId(s)
  s = patch({ hand: ['06234'] })(s)
  s = dispatch(s, { type: 'EnemyAttack', enemy: id, investigator: 'b', exhaustAfter: false })
  s = choose(s, 'ability.playCard', { card: cardName('06234') })
  expect(me(s).location).toBe('B')
  expect(me(s)).toMatchObject({ damage: 1, horror: 1 })
  expect(getInvestigator(s, 'b').damage).toBe(0)
  expect(s.enemies[id]!.damageTaken).toBe(1)
})

it('redirected attacks use the rescuer’s modifiers and record the investigator actually attacked', () => {
  registerEnemy({
    code: 'movement-attack-modifier',
    attackModifier: (_s, _e, by) => ({ damage: by === 'a' ? 2 : 0, horror: 0 }),
  })
  let s = enemy(patch({ location: 'B' }, 'b')(base()), 'B', 'b', {
    code: 'movement-attack-modifier',
  })
  s = patch({ hand: ['06234'] })(s)
  s = dispatch(s, {
    type: 'EnemyAttack',
    enemy: enemyId(s),
    investigator: 'b',
    exhaustAfter: false,
  })
  s = choose(s, 'ability.playCard', { card: cardName('06234') })
  expect(me(s).damage).toBe(3)
  expect(s.enemyAttacks!.at(-1)!.investigator).toBe('a')
})

it('The Truth Beckons stops when an intermediate enemy engages the investigator', () => {
  let s = enemy(base(), 'B')
  s = { ...s, locations: { ...s.locations, C: { ...s.locations.C!, revealed: false } } }
  s = play(s, '07154')
  s = move(s, 'C')
  s = move(s, 'B')
  expect(me(s).location).toBe('B')
  expect(engagedEnemies(s, 'a')).toHaveLength(1)
  expect(s.locations.C!.revealed).toBe(false)
  expect(labels(s)).not.toContain('choice.location')
})

it('Scout Ahead provokes once and an already engaged enemy follows its movement', () => {
  let s = enemy(base(), 'A', 'a')
  const id = enemyId(s)
  s = play(s, '08047')
  expect(me(s).damage).toBe(1)
  s = move(s, 'B')
  s = choose(s, 'choice.skip')
  expect(s.enemies[id]!).toMatchObject({ location: 'B', engagedWith: 'a' })
  expect(me(s).damage).toBe(1)
})

it('two selected Sled Dogs move twice for one action and leave the third ready', () => {
  let s = withAsset(withAsset(own('08127'), '08127', { id: 'dog2' }), '08127', { id: 'dog3' })
  s = use(
    s,
    b('08127').abilities!(s, s.assets['08127']!, 'a').find((o) => o.actionKind === 'move')!,
  )
  s = target(s, 'choice.movementDog', '08127')
  s = target(s, 'choice.movementDog', 'dog2')
  s = choose(s, 'choice.continue')
  s = move(s, 'B')
  s = move(s, 'C')
  expect(me(s)).toMatchObject({ location: 'C', actionsRemaining: 2 })
  expect(s.assets['08127']!.exhausted).toBe(true)
  expect(s.assets.dog2!.exhausted).toBe(true)
  expect(s.assets.dog3!.exhausted).toBe(false)
  expect(labels(s)).not.toContain('choice.location')
})

it('Followed chooses its enemy before opportunity attacks and only that enemy is exempt', () => {
  let s = enemy(base(), 'A', 'a', { name: 'Chosen enemy' })
  const chosen = enemyId(s)
  s = enemy(s, 'A', 'a', { name: 'Other enemy' })
  s = { ...s, enemies: { ...s.enemies, [chosen]: { ...s.enemies[chosen]!, damageTaken: 3 } } }
  s = play(s, '06114')
  expect(me(s).damage).toBe(0)
  s = choose(s, 'choice.enemy', { enemy: 'Chosen enemy' })
  expect(me(s).damage).toBe(1)
  expect(s.skillTest!.baseModifier).toBe(3)
  s = results(reveal(s))
  expect(me(s).clues).toBe(2)
})
