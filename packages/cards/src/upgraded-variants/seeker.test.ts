import { availableAbilities, playerCardBehavior, type GameState } from '@lcg/engine'
import { choose, during } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { enemy, evade, fight, name, resolve, setup } from '../basic-abilities/testing'
import { me, patch } from '../dunwich-pilot/testing'

// RR: Researched, Uses, Base Value, Healing, Search, Hand Size, Move, Out of Play.
const labels = (s: GameState) => availableAbilities(s, 'a').map((a) => a.label)
const choices = (s: GameState) => s.pending!.question.choices.map((c) => c.label)

describe('Strange Solution (4)', () => {
  it.each(['02262', '02263', '02264', '51004'])('%s requires the identified solution', (code) => {
    expect(playerCardBehavior(code)?.requiredResearch).toBe('identifiedSolution')
  })
  it('02262 spends a supply and an action to heal 2 damage from an investigator here', () => {
    let s = setup('02262', { enemy: null, players: ['a', 'b'] })
    expect(labels(s)).not.toContain('ability.upgradedHealDamage')
    s = during(s, patch({ damage: 3 }, 'b'))
    s = choose(s, 'ability.upgradedHealDamage', { name: 'B' })
    expect(s.investigators[1]!.damage).toBe(1)
    expect(s.assets['02262']!.uses).toBe(3)
    expect(me(s).actionsRemaining).toBe(2)
  })
  it('02263 attacks with a base combat of 6 and deals +2 damage', () => {
    const s = resolve(fight(setup('02263'), '02263'), -4)
    expect(enemy(s).damageTaken).toBe(3)
    expect(s.assets['02263']!.uses).toBe(2)
  })
  it('02264 evades with a base agility of 6', () => {
    const s = resolve(evade(setup('02264'), '02264'), -4)
    expect(enemy(s).engagedWith).toBeNull()
    expect(s.assets['02264']!.uses).toBe(3)
  })
  it('51004 exhausts and spends a supply: an investigator gains 2 resources and draws 1', () => {
    let s = setup('51004', { enemy: null, players: ['a', 'b'] })
    const before = s.investigators[1]!
    s = choose(s, 'ability.upgradedSolutionSupply', { name: 'B' })
    expect(s.investigators[1]!.resources).toBe(before.resources + 2)
    expect(s.investigators[1]!.hand.length).toBe(before.hand.length + 1)
    expect(s.assets['51004']).toMatchObject({ uses: 2, exhausted: true })
    expect(labels(s)).not.toContain('ability.upgradedSolutionSupply')
  })
})

describe('Medical Texts (2)', () => {
  const start = () => during(setup('08038', { enemy: null }), patch({ damage: 3 }))
  const use = (s: GameState) => choose(s, 'ability.equipmentMedical', { name: 'A' })
  it('heals 1 damage, or 2 when the test succeeds by 2 or more', () => {
    expect(me(resolve(use(start()), 0)).damage).toBe(2)
    expect(me(resolve(use(start()), 1)).damage).toBe(1)
  })
  it('on a failure you choose to exhaust it or deal 1 damage to that investigator', () => {
    let s = resolve(use(start()), -2)
    expect(choices(s)).toEqual(['choice.upgradedExhaustCard', 'choice.upgradedDamageInvestigator'])
    const exhausted = choose(s, 'choice.upgradedExhaustCard')
    expect(exhausted.assets['08038']!.exhausted).toBe(true)
    expect(me(exhausted).damage).toBe(3)
    s = choose(s, 'choice.upgradedDamageInvestigator')
    expect(me(s).damage).toBe(4)
  })
  it('deals the damage when it is already exhausted', () => {
    const s = resolve(
      use(
        during(setup('08038', { enemy: null, asset: { exhausted: true } }), patch({ damage: 3 })),
      ),
      -2,
    )
    expect(me(s).damage).toBe(4)
  })
})

describe('Old Book of Lore (3)', () => {
  const start = (resources = 0) =>
    during(
      setup('06279', { enemy: null }),
      patch({ deck: ['01030', 'a-x', 'a-y'], resources, hand: [] }),
    )
  const search = (s: GameState) => {
    s = choose(s, 'ability.oldBookLore')
    s = choose(s, 'choice.investigator', { name: 'A' })
    return choose(s, 'choice.takeCard', { card: 'Magnifying Glass' })
  }
  it('may spend a secret to play the drawn card immediately for 2 less', () => {
    const s = choose(search(start()), 'choice.upgradedPlayFound', {
      card: 'Magnifying Glass',
      name: 'A',
    })
    expect(Object.values(s.assets).some((a) => a.code === '01030')).toBe(true)
    expect(s.assets['06279']).toMatchObject({ uses: 1, exhausted: true })
    expect(me(s)).toMatchObject({ resources: 0, actionsRemaining: 2 })
  })
  it('may keep the drawn card and the secret', () => {
    const s = choose(search(start()), 'choice.skip')
    expect(me(s).hand).toContain('01030')
    expect(s.assets['06279']!.uses).toBe(2)
  })
  it('offers no play without secrets', () => {
    const s = search(
      during(start(), (x) => ({
        ...x,
        assets: { ...x.assets, '06279': { ...x.assets['06279']!, uses: 0 } },
      })),
    )
    expect(me(s).hand).toContain('01030')
    expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  })
})

describe('Feed the Mind (3)', () => {
  const use = (hand: string[], token: Parameters<typeof resolve>[1]) =>
    resolve(
      choose(
        during(setup('04267', { enemy: null }), patch({ hand })),
        'ability.upgradedFeedTheMind',
        {
          card: name('04267'),
        },
      ),
      token,
    )
  it('draws 1 card per point succeeded by, without a maximum', () => {
    const s = use([], 1)
    expect(me(s).hand).toHaveLength(4)
    expect(me(s).horror).toBe(0)
    expect(s.assets['04267']).toMatchObject({ uses: 2, exhausted: true })
  })
  it('then takes 1 horror per card above the maximum hand size, even on a failure', () => {
    const seven = Array.from({ length: 7 }, (_, n) => 'h-' + n)
    expect(me(use(seven, 0)).horror).toBe(2)
    expect(me(use([...seven, 'h-7', 'h-8'], 'autoFail')).horror).toBe(1)
  })
})

describe('Glimpse the Unthinkable (5)', () => {
  const start = () =>
    during(
      setup('01030', { enemy: null }),
      patch({ hand: ['05318', 'h-1', 'h-2', '60355'], resources: 1 }),
    )
  it('shuffles chosen non-weakness cards, draws up to hand size and leaves the game', () => {
    let s = choose(start(), 'action.play', { card: name('05318') })
    expect(choices(s)).not.toContain(undefined)
    expect(s.pending!.question.choices.some((c) => c.params?.card === name('60355'))).toBe(false)
    s = choose(s, 'choice.harveyShuffle', { card: 'h-1' })
    const deck = me(s).deck.length
    s = choose(s, 'choice.upgradedGlimpseFinish')
    expect(me(s).hand).toHaveLength(8)
    expect(me(s).deck.length).toBe(deck + 1 - 6)
    expect(me(s).discard).not.toContain('05318')
    expect(me(s).deck).not.toContain('05318')
  })
})

describe('Extensive Research (1)', () => {
  const start = (clues = true) =>
    during(setup('01030', { enemy: null }), (x) => {
      const s = patch({ hand: ['06198', 'h-1', 'h-2', 'h-3', 'h-4', 'h-5'], resources: 5 })(x)
      return clues ? s : { ...s, locations: { ...s.locations, A: { ...s.locations.A!, clues: 0 } } }
    })
  it('costs 1 less per other card in hand and discovers 2 clues', () => {
    const s = choose(start(), 'action.play', { card: name('06198') })
    expect(me(s)).toMatchObject({ clues: 2, resources: 0 })
  })
  it('is not played without clues at your location', () => {
    const plays = (s: GameState) =>
      s
        .pending!.question.choices.filter((c) => c.label === 'action.play')
        .map((c) => c.params?.card)
    expect(plays(start())).toContain(name('06198'))
    expect(plays(start(false))).not.toContain(name('06198'))
  })
})

describe('Esoteric Atlas (1)', () => {
  const reveal = (s: GameState, id: string) => ({
    ...s,
    locations: { ...s.locations, [id]: { ...s.locations[id]!, revealed: true } },
  })
  it('moves only to a revealed location exactly 2 connections away', () => {
    let s = during(setup('05232', { enemy: null }), (x) => reveal(reveal(x, 'B'), 'C'))
    s = choose(s, 'ability.moveWithCard', { card: name('05232') })
    expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room C'])
    s = choose(s, 'action.move', { location: 'Room C' })
    expect(me(s).location).toBe('C')
    expect(s.assets['05232']).toMatchObject({ uses: 3, exhausted: true })
  })
  it('is not offered without such a revealed location', () => {
    const s = during(setup('05232', { enemy: null }), (x) => reveal(x, 'B'))
    expect(labels(s)).not.toContain('ability.moveWithCard')
  })
})
