// RR: Triggered Abilities, Limits, Fast, Costs, Uses (Replenish), Weakness, Threat Area,
// Healing, Equipment Slots, Chaos Tokens, Enemy Attacks, Investigation Phase, Defeat, Trauma.
import { availableAbilities, dispatch, type GameState, type Message } from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import {
  BEND_BLOOD,
  CALLED_TO_GUINEE,
  clear,
  GRAND_MERES_CHARM,
  HEMOPHOBIA,
  makeGame,
  MARIE,
  marie,
  RETRIBUTION,
  SACRIFICIAL_DOLL,
  ULTIMATE_SACRIFICE,
  withMarie,
} from './testing'

const ready = (bag: GameState['chaosBag'] = [0], others = false) =>
  withMarie(clear(makeGame(others, bag)), { hand: [], resources: 10 })
const put = (s: GameState, code: string, investigator = MARIE) =>
  dispatch(s, { type: 'PutAssetIntoPlay', investigator, code })
const asset = (s: GameState, code: string) => Object.values(s.assets).find((a) => a.code === code)
const threat = (s: GameState, code: string) =>
  Object.values(s.treacheries).find((t) => t.code === code)
const reveal = (s: GameState, code: string) =>
  dispatch(withMarie(s, { hand: [...marie(s).hand, code] }), {
    type: 'ResolvePlayerRevelation',
    investigator: MARIE,
    code,
  })
const damage = (amount: number, horror = 0, investigator = MARIE): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror,
  direct: true,
})
/** Effect test of Marie (willpower 4) against `difficulty`. */
const effectTest = (difficulty: number): Message => ({
  type: 'BeginSkillTest',
  investigator: MARIE,
  skill: 'willpower',
  difficulty,
  kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
})
const through = (s: GameState, label = 'choice.skip') => {
  for (let n = 0; n < 50 && s.pending; n++)
    s = choose(s, labels(s).includes(label) ? label : labels(s).at(-1)!)
  return s
}

describe('Marie Lambeau (60451)', () => {
  it('after damage is placed on her, draws 2 cards and discards 1 of them, once per phase', () => {
    let s = withMarie(ready(), { hand: ['01088'], deck: ['01089', '01093', '01088', '01089'] })
    s = dispatch(s, damage(1))
    expect(labels(s)).toContain('ability.marie2025Draw')
    s = choose(s, 'ability.marie2025Draw')
    // Only the two drawn cards can be discarded, not the one already in hand.
    expect(s.pending!.question.choices.map((c) => c.params?.card)).toEqual([
      'Guts',
      'Unexpected Courage',
    ])
    s = choose(s, 'choice.discard', { card: 'Guts' })
    expect(marie(s).hand).toEqual(['01088', '01093'])
    expect(marie(s).discard).toContain('01089')
    // Limit once per phase.
    s = dispatch(s, damage(1))
    expect(labels(s)).not.toContain('ability.marie2025Draw')
    s = dispatch({ ...clear(s), phase: 'enemy' }, damage(1))
    expect(labels(s)).toContain('ability.marie2025Draw')
  })

  it('does not react to horror alone', () => {
    const s = dispatch(ready(), damage(0, 2))
    expect(labels(s)).not.toContain('ability.marie2025Draw')
  })

  it('[elder_sign]: +0 and, on success, heals 1 damage', () => {
    let s = withMarie(ready(['elderSign']), { damage: 2 })
    s = through(dispatch(s, effectTest(4)), 'choice.revealToken')
    expect(marie(s).damage).toBe(1)
    let fail = withMarie(ready(['elderSign']), { damage: 2 })
    fail = through(dispatch(fail, effectTest(5)), 'choice.revealToken')
    expect(marie(fail).damage).toBe(2)
  })
})

describe("Grand-Mère's Charm", () => {
  it('fast: take 1 direct damage and exhaust it to replenish 1 charge on an asset here', () => {
    let s = put(put(ready(), GRAND_MERES_CHARM), '01060')
    const shrivelling = asset(s, '01060')!
    s = { ...s, assets: { ...s.assets, [shrivelling.id]: { ...shrivelling, uses: 2 } } }
    const charm = availableAbilities(s, MARIE).find((a) => a.label === 'ability.grandMeresCharm')!
    expect(charm).toMatchObject({ actions: 0 })
    s = dispatch(s, { type: 'PlayerWindow', investigator: MARIE })
    s = choose(s, 'ability.grandMeresCharm')
    // The direct damage cannot be assigned to the Charm and triggers Marie's reaction.
    expect(marie(s).damage).toBe(1)
    expect(asset(s, GRAND_MERES_CHARM)).toMatchObject({ exhausted: true, damage: 0 })
    s = through(s)
    expect(asset(s, '01060')!.uses).toBe(3)
  })

  it('needs an asset at your location below its printed charges', () => {
    const s = put(put(ready(), GRAND_MERES_CHARM), '01060')
    expect(asset(s, '01060')!.uses).toBe(4)
    expect(availableAbilities(s, MARIE).map((a) => a.label)).not.toContain(
      'ability.grandMeresCharm',
    )
  })
})

describe('Called to Guinée', () => {
  it('in the threat area, Marie cannot heal damage (horror still heals)', () => {
    let s = reveal(withMarie(ready(), { damage: 3, horror: 2 }), CALLED_TO_GUINEE)
    expect(threat(s, CALLED_TO_GUINEE)!.placement).toEqual({
      type: 'threatArea',
      investigator: MARIE,
    })
    s = dispatch(s, { type: 'Heal', investigator: MARIE, damage: 2, horror: 1 })
    expect(marie(s)).toMatchObject({ damage: 3, horror: 1 })
  })

  it('[action] choose and discard 3 cards from your hand: discard it', () => {
    let s = reveal(ready(), CALLED_TO_GUINEE)
    s = withMarie(s, { hand: ['01088', '01089'] })
    const offered = (state: GameState) =>
      availableAbilities(state, MARIE).some((a) => a.label === 'ability.calledToGuinee')
    expect(offered(s)).toBe(false)
    s = withMarie(s, { hand: ['01088', '01089', '01093', '01067'] })
    expect(offered(s)).toBe(true)
    s = dispatch(s, { type: 'PlayerWindow', investigator: MARIE })
    s = choose(s, 'ability.calledToGuinee', { card: 'Called to Guinée' })
    for (const card of ['01088', '01089', '01093']) s = choose(s, 'choice.discard', { card })
    expect(marie(s).hand).toEqual(['01067'])
    expect(threat(s, CALLED_TO_GUINEE)).toBeUndefined()
    expect(marie(s).discard).toContain(CALLED_TO_GUINEE)
  })
})

describe('Hemophobia', () => {
  it('the first time each round an investigator at your location takes damage: 1 horror', () => {
    let s = reveal(ready([0], true), HEMOPHOBIA)
    s = dispatch(s, damage(1, 0, 'b'))
    expect(marie(s).horror).toBe(1)
    s = dispatch(s, damage(1, 0, 'b'))
    expect(marie(s).horror).toBe(1)
    s = dispatch({ ...s, round: s.round + 1 }, damage(1, 0, 'b'))
    expect(marie(s).horror).toBe(2)
  })

  it('ignores horror and investigators elsewhere; [action][action] discards it', () => {
    let s = reveal(ready([0], true), HEMOPHOBIA)
    s = dispatch(s, damage(0, 1, 'b'))
    s = dispatch(s, { type: 'MoveTo', investigator: 'b', location: 'B' })
    s = dispatch(clear(s), damage(1, 0, 'b'))
    expect(marie(s).horror).toBe(0)
    const discard = availableAbilities(s, MARIE).find((a) => a.label === 'ability.discardTreachery')
    expect(discard).toMatchObject({ actions: 2 })
  })
})

describe('Sacrificial Doll', () => {
  it('does not take up a hand slot while Marie has 3 or fewer remaining health', () => {
    let s = put(put(ready(), '01086'), '01087')
    s = put(withMarie(s, { damage: 5 }), SACRIFICIAL_DOLL)
    expect(s.pending).toBeNull()
    expect(asset(s, SACRIFICIAL_DOLL)).toBeDefined()
    // Healing above 3 remaining health makes it take up a slot again.
    s = dispatch(s, { type: 'Heal', investigator: MARIE, damage: 1, horror: 0 })
    expect(s.pending?.question.prompt).toBe('prompt.freeSlot')
  })

  it('takes up its hand slot with more remaining health', () => {
    const s = put(put(put(ready(), '01086'), '01087'), SACRIFICIAL_DOLL)
    expect(s.pending?.question.prompt).toBe('prompt.freeSlot')
  })

  it('cancels a revealed token and reveals until a symbol token, ignoring the rest', () => {
    let s = put(ready([1]), SACRIFICIAL_DOLL)
    s = dispatch(s, effectTest(4))
    for (let n = 0; n < 10 && s.pending && !labels(s).includes('ability.sacrificialDoll'); n++)
      s = choose(s, labels(s).includes('choice.revealToken') ? 'choice.revealToken' : 'choice.skip')
    expect(s.skillTest!.revealing!.token).toBe(1)
    // The +1 is held; the rest of the bag: numbered tokens are ignored until the skull.
    s = { ...s, chaosBag: [-3, 2, 'skull'] }
    s = choose(s, 'ability.sacrificialDoll', { token: '1' })
    s = choose(s, 'choice.assignToInvestigator', { name: 'Marie Lambeau' })
    s = through(s)
    expect(marie(s).damage).toBe(1)
    expect(asset(s, SACRIFICIAL_DOLL)!.exhausted).toBe(true)
    // Skull is -1 in the test scenario: 4 - 1 = 3 against 4 fails, whatever was ignored.
    expect(s.log.findLast((e) => e.key.startsWith('log.test'))?.key).toBe('log.testFailure')
    expect(s.log.some((e) => e.key === 'log.tokenCanceledKept')).toBe(true)
    expect([...s.chaosBag].sort()).toEqual([-3, 1, 2, 'skull'].sort())
  })

  it('cannot cancel an [auto_fail] token', () => {
    let s = put(ready(['autoFail']), SACRIFICIAL_DOLL)
    s = dispatch(s, effectTest(1))
    for (let n = 0; n < 10 && s.pending; n++) {
      expect(labels(s)).not.toContain('ability.sacrificialDoll')
      s = choose(s, labels(s).includes('choice.revealToken') ? 'choice.revealToken' : 'choice.skip')
    }
  })
})

describe('Retribution', () => {
  it('Marie takes the attack on another investigator here and deals 1 damage per point', () => {
    let s = withMarie(ready([0], true), { hand: [RETRIBUTION] })
    s = dispatch(s, spawnAt('A', { ...ghoul, health: 5, damage: 1, horror: 1 }, 'b'))
    const enemy = Object.keys(s.enemies)[0]!
    s = dispatch(clear(s), {
      type: 'EnemyAttack',
      enemy,
      investigator: 'b',
      exhaustAfter: false,
    })
    s = choose(s, 'ability.playCard', { card: 'Retribution' })
    s = through(s, 'choice.enemy')
    expect(marie(s)).toMatchObject({ damage: 1, horror: 1, resources: 8 })
    expect(s.investigators.find((i) => i.id === 'b')).toMatchObject({ damage: 0, horror: 0 })
    expect(s.enemies[enemy]!.damageTaken).toBe(2)
  })
})

describe('Ultimate Sacrifice', () => {
  it('repeats the investigation phase; at its end Marie is defeated with 1 physical trauma', () => {
    let s = withMarie(ready([0], true), { hand: [ULTIMATE_SACRIFICE, ULTIMATE_SACRIFICE] })
    s = dispatch(s, { type: 'Forced', trigger: { type: 'investigationPhaseEnds' } })
    s = choose(s, 'ability.playCard', { card: 'Ultimate Sacrifice' })
    // The repeated phase: Marie's turn begins again.
    expect(s.phase).toBe('investigation')
    expect(s.log.filter((e) => e.key === 'log.phase').at(-1)?.params).toMatchObject({
      phase: 'investigation',
    })
    expect(s.pending).not.toBeNull()
    // End every turn; the second copy cannot be played at the end of the repeated phase.
    for (let n = 0; n < 40 && s.pending && !marie(s).eliminated; n++) {
      expect(labels(s)).not.toContain('ability.playCard')
      s = choose(s, labels(s).includes('action.endTurn') ? 'action.endTurn' : labels(s).at(-1)!)
    }
    expect(marie(s).eliminated).toBe(true)
    expect(s.campaignLog?.investigators[MARIE]?.physicalTrauma).toBe(1)
  })
})

describe('Bend Blood', () => {
  it('fights with willpower +3 and +1 damage; damages the other enemies, which spare Marie', () => {
    let s = withMarie(ready([0]), { hand: [BEND_BLOOD] })
    s = dispatch(s, spawnAt('A', { ...ghoul, name: 'Brute', fight: 6, health: 5 }, MARIE))
    s = dispatch(clear(s), spawnAt('A', { ...ghoul, name: 'Lurker', health: 3 }))
    const [brute, lurker] = Object.keys(clear(s).enemies)
    s = dispatch(clear(s), { type: 'PlayerWindow', investigator: MARIE })
    s = choose(s, 'action.play', { card: 'Bend Blood' })
    s = choose(s, 'choice.enemy', { enemy: 'Brute' })
    s = through(s, 'choice.revealToken')
    // Willpower 4 + 3 = 7 against 6: 2 damage to Brute, 1 to Lurker.
    expect(s.enemies[brute!]!.damageTaken).toBe(2)
    expect(s.enemies[lurker!]!.damageTaken).toBe(1)
    for (const id of [brute!, lurker!]) {
      const attacked = dispatch(clear(s), {
        type: 'EnemyAttack',
        enemy: id,
        investigator: MARIE,
        exhaustAfter: false,
      })
      expect(marie(attacked).damage).toBe(marie(s).damage)
    }
  })

  it('on a failure, no other enemy is damaged and nobody is spared', () => {
    let s = withMarie(ready([0]), { hand: [BEND_BLOOD] })
    s = dispatch(s, spawnAt('A', { ...ghoul, name: 'Brute', fight: 9, health: 5 }, MARIE))
    s = dispatch(clear(s), spawnAt('A', { ...ghoul, name: 'Lurker', health: 3 }))
    const lurker = Object.keys(clear(s).enemies)[1]!
    s = dispatch(clear(s), { type: 'PlayerWindow', investigator: MARIE })
    s = choose(s, 'action.play', { card: 'Bend Blood' })
    s = choose(s, 'choice.enemy', { enemy: 'Brute' })
    s = through(s, 'choice.revealToken')
    expect(s.enemies[lurker]!.damageTaken).toBe(0)
    expect(s.enemies[lurker]!.spares ?? []).toEqual([])
  })
})
