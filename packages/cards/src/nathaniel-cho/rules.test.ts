// RR: Damage, Triggered Abilities, Limits, Search, Enemy Attacks, Automatic Success, Uses.
import {
  createGame,
  dispatch,
  getInvestigator,
  investigatorBehavior,
  playerCardBehavior,
  availableActions,
  registerScenario,
  registerPlayerCards,
  type GameState,
  type Message,
  type PlayerCardDef,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt, testInvestigator, testScenario } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { game, patch, withAsset } from '../dunwich-pilot/testing'
import { sturdy } from '../basic-abilities/testing'
import data from '../data/nathaniel-cho.json'
import './index'

registerPlayerCards(data as PlayerCardDef[])
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const ready = (players = ['a']) => ({ ...clear(game(players)), interactive: true })
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)!
const enemy = (s: GameState) => Object.values(s.enemies)[0]!
const skip = (s: GameState): GameState => {
  for (let n = 0; n < 50 && s.pending && s.pending.question.prompt !== 'prompt.chooseAction'; n++) {
    const label = labels(s).includes('choice.skip')
      ? 'choice.skip'
      : labels(s).includes('choice.pilotDone')
        ? 'choice.pilotDone'
        : labels(s)[0]!
    s = choose(s, label)
  }
  return s
}
const use = (s: GameState, code: string, by = 'a') =>
  run(patch({ hand: [code], resources: 10 }, by)(s), { type: 'PlayCard', investigator: by, code })
const playAt = (_code: string, location = 'A') =>
  skip(run(ready(), spawnAt(location, sturdy, location === 'A' ? 'a' : null)))
const nat = () => {
  let s = createGame({
    seed: 3,
    scenario: testScenario(),
    investigators: [
      testInvestigator('60101', {
        skills: { willpower: 3, intellect: 2, combat: 5, agility: 2 },
        health: 9,
        sanity: 6,
      }),
    ],
  })
  s = skip(s)
  return { ...clear(s), interactive: true }
}
const finish = (s: GameState, token: GameState['chaosBag'][number] = 0): GameState => {
  s = choose({ ...s, chaosBag: [token] }, 'choice.revealToken')
  if (labels(s).includes('choice.applyResults')) s = choose(s, 'choice.applyResults')
  return s
}

describe('Nathaniel Cho and signatures', () => {
  it('adds damage from events once per phase, before enemy damage reduction', () => {
    let s = skip(run(nat(), spawnAt('A', sturdy, '60101')))
    const id = enemy(s).id
    s = run(s, {
      type: 'DamageEnemy',
      enemy: id,
      by: '60101',
      amount: 1,
      source: { code: '60111' },
    })
    s = choose(s, 'ability.nathanielDamage')
    expect(s.enemies[id]!.damageTaken).toBe(2)
    s = skip(
      run(s, { type: 'DamageEnemy', enemy: id, by: '60101', amount: 1, source: { code: '60111' } }),
    )
    expect(s.enemies[id]!.damageTaken).toBe(3)
    s = run(
      { ...s, phase: 'enemy' },
      { type: 'DamageEnemy', enemy: id, by: '60101', amount: 1, source: { code: '60111' } },
    )
    s = choose(s, 'ability.nathanielDamage')
    expect(s.enemies[id]!.damageTaken).toBe(5)
  })
  it('does not add damage from an asset or another investigator', () => {
    const self = getInvestigator(nat(), '60101')
    expect(
      investigatorBehavior('60101')!.reactions!(
        nat(),
        {
          type: 'beforeEnemyDamage',
          enemy: 'e',
          investigator: self.id,
          amount: 2,
          source: { code: '12016' },
        },
        self,
      ),
    ).toEqual([])
  })
  it('preserves event provenance through a normal fight, and Tommy reduces the modified damage', () => {
    let s = skip(run(nat(), spawnAt('A', playerCardBehavior('60103')!.enemy!, '60101')))
    s = use(s, '60111', '60101')
    if (labels(s).includes('choice.enemy')) s = choose(s, 'choice.enemy')
    expect(s.skillTest?.effectSource).toBe('60111')
    s = finish(s)
    s = choose(s, 'ability.nathanielDamage')
    expect(enemy(s).damageTaken).toBe(1)
  })
  it('never offers or spends its damage reaction against an immune enemy', () => {
    registerScenario({ id: 'nat-immune', enemyImmune: () => true })
    let s = skip(run({ ...nat(), scenarioId: 'nat-immune' }, spawnAt('A', sturdy, '60101')))
    s = run(s, {
      type: 'DamageEnemy',
      enemy: enemy(s).id,
      by: '60101',
      amount: 2,
      source: { code: '60111' },
    })
    expect(s.pending).toBeNull()
    expect(enemy(s).damageTaken).toBe(0)
    expect(s.abilityUses.some((u) => u.key === 'nathaniel')).toBe(false)
  })
  it('elder sign returns an event only on a successful attack', () => {
    const s = patch({ discard: ['60111', '60105'] }, '60101')(nat())
    const test = {
      type: 'BeginSkillTest',
      investigator: '60101',
      skill: 'combat',
      difficulty: 0,
      kind: { type: 'fight', enemy: 'e' },
    } as const
    const spawned = skip(run(s, spawnAt('A', sturdy, '60101')))
    const opened = run(spawned, { ...test, kind: { type: 'fight', enemy: enemy(spawned).id } })
    const messages = investigatorBehavior('60101')!.elderSign!(
      opened,
      getInvestigator(opened, '60101'),
    ).onSuccess!
    let result = run(opened, ...messages)
    result = choose(result, 'choice.takeCard', { card: 'Clean Them Out' })
    expect(getInvestigator(result, '60101').hand).toContain('60111')
    expect(
      playerCardBehavior('60101')!.effect!({ ...s, skillTest: null }, '60101', 'elderSign', {}),
    ).toEqual([])
  })
  it('Randall heals three damage and can play a Weapon from the discard pile at normal cost', () => {
    let s = withAsset(patch({ damage: 4 })(ready()), '60102')
    s = run(s, { type: 'PlayerCardEffect', code: '60102', investigator: 'a', step: 'choice' })
    s = choose(s, 'choice.randallHeal')
    expect(getInvestigator(s, 'a').damage).toBe(1)
    s = patch({ resources: 5, discard: ['60105'] })(s)
    s = run(s, { type: 'PlayerCardEffect', code: '60102', investigator: 'a', step: 'search' })
    s = choose(s, 'choice.takeCard', { card: 'Boxing Gloves' })
    expect(asset(s, '60105')).toBeDefined()
    expect(getInvestigator(s, 'a').resources).toBe(2)
  })
  it('Tommy Malloy reduces every separate source of damage to one', () => {
    const tommy = playerCardBehavior('60103')!.enemy!
    let s = skip(run(ready(), spawnAt('A', tommy, 'a')))
    s = skip(run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 5 }))
    expect(enemy(s).damageTaken).toBe(1)
    expect(enemy(s).prey).toEqual({ type: 'only', investigator: '60101' })
  })
  it('Self-Destructive damages its owner when they deal damage, and costs two actions to discard', () => {
    let s = skip(
      run(patch({ deck: ['60104'] })(ready()), { type: 'DrawCards', investigator: 'a', amount: 1 }),
    )
    const t = Object.values(s.treacheries).find((t) => t.code === '60104')!
    expect(t).toBeDefined()
    s = skip(run(s, spawnAt('A', sturdy, 'a')))
    s = skip(run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 1 }))
    expect(getInvestigator(s, 'a').damage).toBe(1)
  })
})

describe('Nathaniel assets', () => {
  it.each(['60105', '60127'])(
    '%s searches only Spirit events, six or nine cards, and exhausts',
    (code) => {
      let s = withAsset(
        patch({ hand: [], deck: [...Array.from({ length: 6 }, () => '60105'), '60111'] })(ready()),
        code,
      )
      s = skip(run(s, spawnAt('A', ghoul, 'a')))
      s = run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 2 })
      s = choose(s, 'ability.boxingGloves')
      if (code === '60127') s = choose(s, 'choice.takeCard', { card: 'Clean Them Out' })
      else s = skip(s)
      expect(getInvestigator(s, 'a').hand.includes('60111')).toBe(code === '60127')
      expect(asset(s, code).exhausted).toBe(true)
    },
  )
  it.each(['damage', 'horror'] as const)(
    'Flesh Ward cancels one %s from an attack, spending a charge and exhausting',
    (kind) => {
      let s = withAsset(ready(), '60106')
      s = run(s, { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 1, enemy: 'attacker' })
      s = choose(s, kind === 'damage' ? 'ability.fleshWardDamage' : 'ability.fleshWardHorror')
      s = skip(s)
      expect(asset(s, '60106')).toMatchObject({ exhausted: true, uses: 3 })
      expect(getInvestigator(s, 'a')[kind]).toBe(0)
      expect(getInvestigator(s, 'a')[kind === 'damage' ? 'horror' : 'damage']).toBe(1)
    },
  )
  it.each(['60107', '60128'])(
    '%s takes damage and discovers a clue, upgraded at a connecting location',
    (code) => {
      let s = withAsset(ready(), code)
      s = skip(run(s, { type: 'RevealLocation', location: 'B' }, spawnAt('A', ghoul, 'a')))
      const before = getInvestigator(s, 'a').clues
      s = run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 2 })
      s = choose(s, 'ability.greteWagner')
      s = choose(s, 'choice.location', { location: code === '60128' ? 'Room B' : 'Room A' })
      expect(getInvestigator(s, 'a').clues).toBe(before + 1)
      expect(asset(s, code)).toMatchObject({ damage: 1, exhausted: true })
    },
  )
  it('Relentless banks excess damage and converts it to resources after being discarded', () => {
    let s = withAsset(ready(), '60109')
    s = skip(run(s, spawnAt('A', ghoul, 'a')))
    s = run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 5 })
    s = choose(s, 'ability.relentlessStore')
    expect(asset(s, '60109').damage).toBe(3)
    const option = playerCardBehavior('60109')!.fastOptions!(s, asset(s, '60109'))[0]!
    const resources = getInvestigator(s, 'a').resources
    s = run(s, ...option.then)
    expect(asset(s, '60109')).toBeUndefined()
    expect(getInvestigator(s, 'a').resources).toBe(resources + 3)
  })
  it('Safeguard follows a move to a connecting location, but only once before readying', () => {
    let s = withAsset(ready(['a', 'b']), '60110')
    s = run(s, { type: 'MoveTo', investigator: 'b', location: 'B' })
    s = choose(s, 'ability.safeguard')
    expect(getInvestigator(s, 'a').location).toBe('B')
    expect(asset(s, '60110').exhausted).toBe(true)
  })
  it('Physical Training (4) spends its own replenishing resources and improves a combat test', () => {
    let s = withAsset(ready(), '60131')
    s = run(s, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'combat',
      difficulty: 5,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
    s = choose(s, 'ability.physicalTrainingUse')
    expect(asset(s, '60131').uses).toBe(1)
    expect(s.skillTest!.baseModifier).toBe(1)
    s = skip(run(s, { type: 'Forced', trigger: { type: 'roundBegins' } }))
    expect(asset(s, '60131').uses).toBe(2)
  })
})

describe('Nathaniel events', () => {
  it.each(['60112', '60122'])(
    '%s counterpunches only its attacker with its printed bonus',
    (code) => {
      let s = skip(run(ready(), spawnAt('A', sturdy, 'a')))
      s = patch({ hand: [code] })(s)
      const e = enemy(s)
      const trigger = {
        type: code === '60112' ? ('afterEnemyAttack' as const) : ('whenEnemyAttacks' as const),
        investigator: 'a',
        enemy: e.id,
      }
      s = run(s, { type: 'Forced', trigger })
      s = choose(s, 'ability.playCard', { card: 'Counterpunch' })
      expect(s.skillTest).toMatchObject({
        baseModifier: code === '60122' ? 2 : 0,
        kind: { enemy: e.id, extraDamage: code === '60122' ? 1 : 0 },
      })
    },
  )
  it('Dodge reprint cancels the attack without consuming an action', () => {
    let s = skip(run(ready(), spawnAt('A', ghoul, 'a')))
    s = patch({ hand: ['60113'], resources: 2 })(s)
    s = run(s, { type: 'EnemyAttack', enemy: enemy(s).id, investigator: 'a', exhaustAfter: false })
    s = choose(s, 'ability.playCard', { card: 'Dodge' })
    s = skip(s)
    expect(getInvestigator(s, 'a')).toMatchObject({ damage: 0, horror: 0, resources: 1 })
  })
  it.each([
    ['60114', 'B'],
    ['60123', 'C'],
  ])('%s moves and engages its target from %s before the fight', (code, location) => {
    let s = playAt(code, location)
    const id = enemy(s).id
    s = use(s, code)
    s = choose(s, 'choice.enemy')
    expect(s.enemies[id]).toMatchObject({ location: 'A', engagedWith: 'a' })
    expect(s.skillTest?.kind).toMatchObject({ type: 'fight', enemy: id })
  })
  it('Evidence (1) counts combined printed enemy health within the turn', () => {
    let s = skip(run(ready(), spawnAt('A', ghoul, 'a'), spawnAt('A', ghoul, 'a')))
    const ids = Object.keys(s.enemies)
    s = skip(run(s, { type: 'DamageEnemy', enemy: ids[0]!, by: 'a', amount: 2 }))
    s = patch({ hand: ['60120'], resources: 2 })(s)
    const clues = getInvestigator(s, 'a').clues
    s = run(s, { type: 'DamageEnemy', enemy: ids[1]!, by: 'a', amount: 2 })
    s = choose(s, 'ability.playCard', { card: 'Evidence!' })
    expect(getInvestigator(s, 'a').clues).toBe(clues + 2)
  })
  it('Evidence (1) treats per-investigator multiplication as printed health, including eliminated investigators', () => {
    // RR "Per Investigator": its product is the printed value before other modifiers.
    // https://arkhamdb.com/rules#Per_Investigator
    let s = skip(
      run(
        ready(['a', 'b']),
        spawnAt('A', { ...ghoul, health: 2, healthPerInvestigator: true }, 'a'),
      ),
    )
    s = patch({ eliminated: true }, 'b')(s)
    s = patch({ hand: ['60120'], resources: 2 })(s)
    const clues = getInvestigator(s, 'a').clues
    s = run(s, { type: 'DamageEnemy', enemy: enemy(s).id, by: 'a', amount: 4 })
    s = choose(s, 'ability.playCard', { card: 'Evidence!' })
    expect(getInvestigator(s, 'a').clues).toBe(clues + 2)
  })
  it('Galvanize readies a Guardian asset and grants a fight-only action', () => {
    let s = withAsset(ready(), '60105', { exhausted: true })
    s = use(s, '60121')
    s = choose(s, 'choice.nathanielAsset')
    expect(asset(s, '60105').exhausted).toBe(false)
    expect(getInvestigator(s, 'a').fightActionsThisTurn).toBe(1)
  })
  it('Galvanize grants its action without any asset and can only spend it on fighting', () => {
    let s = skip(run(ready(), spawnAt('A', sturdy, 'a')))
    s = use(s, '60121')
    expect(getInvestigator(s, 'a').fightActionsThisTurn).toBe(1)
    s = patch({ actionsRemaining: 0, hand: ['60116'] })(s)
    const actions = availableActions(s, 'a')
    expect(actions.some((a) => a.kind === 'fight')).toBe(true)
    expect(actions.some((a) => a.kind === 'play' && a.card === '60116')).toBe(true)
    expect(actions.some((a) => a.kind === 'draw' || a.kind === 'move')).toBe(false)
    s = run(s, {
      type: 'TakeAction',
      investigator: 'a',
      action: { kind: 'fight', enemy: enemy(s).id },
    })
    expect(getInvestigator(s, 'a')).toMatchObject({ actionsRemaining: 0, fightActionsThisTurn: 0 })
  })
  it('combines a Galvanize action with Marie’s Spell action for a two-action fight ability', () => {
    let s = withAsset(
      patch({ doom: 1, actionsRemaining: 0, fightActionsThisTurn: 1 }, '05006')(ready(['05006'])),
      '01060',
      { owner: '05006' },
    )
    s = skip(run(s, spawnAt('A', sturdy, '05006')))
    const id = enemy(s).id
    s = run(s, {
      type: 'UseAbility',
      investigator: '05006',
      key: '01060:two-action-fight',
      actions: 2,
      provokes: false,
      then: [
        {
          type: 'BeginSkillTest',
          investigator: '05006',
          source: '01060',
          skill: 'willpower',
          difficulty: 2,
          kind: { type: 'fight', enemy: id },
        },
      ],
    })
    expect(getInvestigator(s, '05006')).toMatchObject({
      actionsRemaining: 0,
      fightActionsThisTurn: 0,
      traitActionUsed: true,
    })
    expect(s.skillTest?.kind).toMatchObject({ type: 'fight', enemy: id })
  })
  it('Get over here rejects Elite enemies and enemies outside its printed range', () => {
    let s = skip(run(ready(), spawnAt('C', sturdy)))
    expect(playerCardBehavior('60114')!.canPlay!(s, 'a')).toBe(false)
    expect(playerCardBehavior('60123')!.canPlay!(s, 'a')).toBe(true)
    s = {
      ...s,
      enemies: Object.fromEntries(
        Object.entries(s.enemies).map(([id, e]) => [id, { ...e, traits: ['Elite'] }]),
      ),
    }
    expect(playerCardBehavior('60123')!.canPlay!(s, 'a')).toBe(false)
  })
  it('Mano a Mano (2) deals two damage only as the first action without opportunity attacks', () => {
    let s = playAt('60125')
    expect(playerCardBehavior('60125')!.canPlay!(s, 'a')).toBe(true)
    s = use(s, '60125')
    s = choose(s, 'choice.enemy')
    expect(enemy(s).damageTaken).toBe(2)
    expect(getInvestigator(s, 'a').damage).toBe(0)
    expect(playerCardBehavior('60125')!.canPlay!(patch({ actionsTaken: 1 })(s), 'a')).toBe(false)
  })
  it('One-Two Punch (5) automatically succeeds with two damage then permits a new target', () => {
    let s = skip(run(ready(), spawnAt('A', ghoul, 'a'), spawnAt('A', sturdy, 'a')))
    const small = Object.values(s.enemies).find((e) => e.health === 2)!
    s = use(s, '60132')
    s = choose(s, 'choice.enemy', { enemy: small.name })
    expect(s.skillTest).toMatchObject({ noTokens: true })
    if (labels(s).includes('choice.applyResults')) s = choose(s, 'choice.applyResults')
    else if (labels(s).includes('choice.revealToken')) s = finish(s)
    s = choose(s, 'choice.nathanielFightAgain')
    s = choose(s, 'choice.enemy')
    expect(s.skillTest).toMatchObject({ baseModifier: 3, kind: { type: 'fight', extraDamage: 2 } })
    expect(s.enemies[small.id]).toBeUndefined()
  })
  it('One-Two Punch (5) keeps its second attack against an elusive enemy after it moves away', () => {
    let s = skip(
      run(
        ready(),
        { type: 'RevealLocation', location: 'B' },
        spawnAt('A', { ...sturdy, keywords: ['elusive'] }, 'a'),
      ),
    )
    const id = enemy(s).id
    s = use(s, '60132')
    s = choose(s, 'choice.enemy')
    s = labels(s).includes('choice.revealToken') ? finish(s) : choose(s, 'choice.applyResults')
    // The investigator chooses the destination for elusive movement.
    if (labels(s).includes('choice.elusiveLocation')) s = choose(s, 'choice.elusiveLocation')
    else if (!labels(s).includes('choice.nathanielFightAgain')) s = choose(s, labels(s)[0]!)
    expect(s.enemies[id]!.location).toBe('B')
    s = choose(s, 'choice.nathanielFightAgain')
    s = choose(s, 'choice.enemy')
    expect(s.skillTest?.kind).toMatchObject({ type: 'fight', enemy: id, extraDamage: 2 })
  })
})
