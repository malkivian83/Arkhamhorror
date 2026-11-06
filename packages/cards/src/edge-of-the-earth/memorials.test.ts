import { dispatch, playerCardDef, type GameState } from '@lcg/engine'
import { choose, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, hand, me, patch, withAsset } from '../dunwich-pilot/testing'

// RR: Play, Fast, Skill Tests (ST.3), Activate, Fight, Investigate, Move and Heal.
it('plays the Sketches fast and draws three cards', () => {
  const state = game()
  const deck = ['01020', '01021', '01022', '01023']
  const ready = during(state, patch({ deck }))
  const played = choose(hand(ready, '08733'), 'action.playFast', { card: "Dyer's Sketches" })
  expect(me(played).hand).toEqual(deck.slice(0, 3))
  expect(me(played).discard).toContain('08733')
  expect(me(played).actionsRemaining).toBe(me(ready).actionsRemaining)
  expect(playerCardDef('08733')?.story).toBe(true)
})

it('damages the Furs to cancel and replace a frost token in the owner’s test', () => {
  const state = withAsset(game(), '08730')
  const revealing = dispatch(
    { ...state, pending: null, queue: [], chaosBag: ['frost'] },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'willpower',
      difficulty: 1,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  const resolved = choose(revealing, 'ability.edgeOfTheEarth.memorialFurs')
  expect(resolved.assets['08730']?.damage).toBe(1)
  expect(resolved.log.some(({ key }) => key === 'log.tokenCanceled')).toBe(true)
  expect(resolved.skillTest?.revealing?.face).toBe('frost')
  expect(choose(resolved, 'choice.skip').chaosBag).toEqual(['frost'])
})

const zeroBag = (state: GameState) => ({ ...state, chaosBag: [0 as const] })

it.each(['memorialBase', 'memorialBoost'])(
  'spends one ammo and deals two damage with %s',
  (mode) => {
    const ready = during(
      withAsset(game(), '08732'),
      zeroBag,
      spawnAt('A', { ...ghoul, health: 8, fight: 1 }, 'a'),
    )
    const attack = choose(ready, 'ability.fightWith', { card: "Cookie's Custom .32" })
    const fought = choose(attack, `choice.edgeOfTheEarth.${mode}`)
    expect(Object.values(fought.enemies)[0]?.damageTaken).toBe(2)
    expect(fought.assets['08732']?.uses).toBe(1)
    expect(me(fought).actionsRemaining).toBe(me(ready).actionsRemaining - 1)
  },
)

it.each(['memorialBase', 'memorialBoost'])(
  'spends one secret and discovers two clues with %s',
  (mode) => {
    const ready = during(withAsset(game(), '08735'), (state) => ({
      ...zeroBag(state),
      locations: { ...state.locations, A: { ...state.locations.A!, clues: 3 } },
    }))
    const investigate = choose(ready, 'ability.investigateWith', { card: "Kensler's Log" })
    const found = choose(investigate, `choice.edgeOfTheEarth.${mode}`)
    expect(me(found).clues - me(ready).clues).toBe(2)
    expect(found.assets['08735']?.uses).toBe(1)
  },
)

it('exhausts the Boots after the last clue and may discard them to reach a nonconnecting location', () => {
  const state = withAsset(game(), '08734')
  const holdingAnother = hand(state, '08734')
  expect(
    holdingAnother.pending?.question.choices.some(({ label }) => label === 'action.play'),
  ).toBe(false)
  const ready = {
    ...state,
    pending: null,
    queue: [],
    locations: {
      ...state.locations,
      B: { ...state.locations.B!, revealed: true },
      C: { ...state.locations.B!, id: 'C', name: 'Remote', connections: [], revealed: true },
    },
  }
  const discover = dispatch(ready, {
    type: 'Forced',
    trigger: {
      type: 'afterDiscoverClues',
      investigator: 'a',
      location: 'A',
      amount: 1,
      last: true,
    },
  })
  const reaction = choose(discover, 'ability.edgeOfTheEarth.memorialBoots')
  expect(reaction.assets['08734']?.exhausted).toBe(true)
  const moved = choose(reaction, 'choice.edgeOfTheEarth.memorialBootsDiscard', {
    location: 'Remote',
  })
  expect(me(moved).location).toBe('C')
  expect(me(moved).discard).toContain('08734')
})

it.each(['damage', 'horror'] as const)(
  'heals one %s with a supply and exhaustion without an action',
  (kind) => {
    const ready = during(withAsset(game(), '08736'), patch({ damage: 2, horror: 2 }))
    const healed = choose(ready, `ability.edgeOfTheEarth.${kind}`)
    expect(me(healed)[kind]).toBe(1)
    expect(healed.assets['08736']).toMatchObject({ exhausted: true, uses: 2 })
    expect(me(healed).actionsRemaining).toBe(me(ready).actionsRemaining)
  },
)

// RR: Search, Uses, and Draw Cards.
it('uses one charge to return every Tekeli-li in the selected investigator’s top six', () => {
  const deck = ['08723', '01020', '08724', '08723', '01021', '01022', '08725', '01023']
  const ready = during(withAsset(game(['a', 'b']), '08731'), (state) => ({
    ...patch({ deck, hand: [], location: 'A' }, 'b')(state),
    tekeliliDeck: ['08726'],
  }))
  const read = choose(ready, 'ability.edgeOfTheEarth.memorialPoe')
  const search = choose(read, 'choice.investigator', { name: 'B' })
  expect(search.pending?.investigator).toBe('b')
  const ordered = choose(search, 'choice.card', { card: '08724' })
  expect(ordered.tekeliliDeck?.slice(0, 4)).toEqual(['08726', '08724', '08723', '08723'])
  expect(ordered.tekeliliDeck?.slice(0, 4)).not.toContain('08725')
  expect(ordered.assets['08731']?.uses).toBe(2)
  expect(me(ordered).actionsRemaining).toBe(me(ready).actionsRemaining - 1)
  expect(ordered.investigators[1]!.deck).toHaveLength(4)
})

it.each([false, true])(
  'plays the Cache fast and removes the played copy (amulet: %s)',
  (amulet) => {
    const state = amulet ? withAsset(game(), '01014') : game()
    const ready = hand(during(state, patch({ deck: ['01020'], discard: ['08737'] })), '08737')
    const picked = choose(ready, 'action.playFast', { card: "Takada's Cache" })
    const played = amulet ? choose(picked, 'choice.playFromHand') : picked
    expect(me(played).resources).toBe(me(ready).resources + 3)
    expect(me(played).hand).toEqual(['01020'])
    expect(me(played).discard).toEqual(['08737'])
    expect(me(played).deck).toEqual([])
    expect(me(played).actionsRemaining).toBe(me(ready).actionsRemaining)
  },
)

// RR: Fast, Evade, and Duration.
it('exhausts Anyu for one option and applies the bonus to only the next test this round', () => {
  const ready = during(withAsset(game(), '08738'), zeroBag)
  const options = choose(ready, 'ability.edgeOfTheEarth.memorialAnyu')
  const boosted = choose(options, 'choice.edgeOfTheEarth.memorialAnyuBoost')
  expect(boosted.assets['08738']?.exhausted).toBe(true)
  expect(me(boosted).actionsRemaining).toBe(me(ready).actionsRemaining)
  const begin = (state: GameState, round: number) =>
    during({ ...state, round }, (current) => current, {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'agility',
      difficulty: 5,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    })
  const test = begin(boosted, boosted.round)
  expect(test.lastSkillTest?.succeeded).toBe(true)
  expect(me(test).nextRoundTestBonus).toBeUndefined()
  expect(begin(test, test.round).lastSkillTest?.succeeded).toBe(false)
  expect(begin(boosted, boosted.round + 1).lastSkillTest?.succeeded).toBe(false)
})

it('discards Anyu to evade, move, and reserve a bonus in the chosen order', () => {
  const ready = during(
    withAsset(game(), '08738'),
    zeroBag,
    spawnAt('A', { ...ghoul, evade: 4 }, 'a'),
  )
  const options = choose(ready, 'ability.edgeOfTheEarth.memorialAnyu')
  const discarded = choose(options, 'choice.edgeOfTheEarth.memorialAnyuDiscard')
  expect(me(discarded).discard).toContain('08738')
  const evaded = choose(discarded, 'choice.edgeOfTheEarth.memorialAnyuEvade')
  expect(Object.values(evaded.enemies)[0]?.exhausted).toBe(true)
  expect(evaded.pending?.question.choices.map(({ label }) => label)).not.toContain(
    'choice.edgeOfTheEarth.memorialAnyuEvade',
  )
  const moved = choose(evaded, 'choice.edgeOfTheEarth.memorialAnyuMove')
  expect(me(moved).location).toBe('B')
  const boosted = choose(moved, 'choice.edgeOfTheEarth.memorialAnyuBoost')
  expect(me(boosted).nextRoundTestBonus?.amount).toBe(2)
})
