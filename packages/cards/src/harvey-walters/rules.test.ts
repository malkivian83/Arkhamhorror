// RR: Drawing Cards, Reactions, Uses, Costs, Search, Moving Damage, Permanent, Research.
import {
  cardCost,
  dispatch,
  investigatorBehavior,
  playerCardBehavior,
  skillTestValue,
  slotCapacity,
  treacheryBehavior,
  type GameState,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { choose, ghoul, labels, spawnAt } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { cards, finish, game, H, me, patch, played, put, run } from './testing'
const options = (_s: GameState, code: string) => playerCardBehavior(code)!
const forced = (s: GameState, trigger: Extract<Message, { type: 'Forced' }>['trigger']) =>
  run(s, { type: 'Forced', trigger })
const begin = (s: GameState, skill: SkillTest['skill'] = 'intellect', difficulty = 1) =>
  run(s, {
    type: 'BeginSkillTest',
    investigator: H,
    skill,
    difficulty,
    kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
  })
const execute = (s: GameState, then: Message[]) => run(s, ...then)

describe('Harvey Walters', () => {
  it('draws once after a batch, then never recursively; only here in investigation', () => {
    let s = run(game(true), { type: 'DrawCards', investigator: 'b', amount: 3 })
    expect(s.pending?.question.prompt).toBe('prompt.reaction')
    expect(s.investigators[1]!.hand).toHaveLength(8)
    s = choose(s, 'ability.harveyDraw')
    expect(s.investigators[1]!.hand).toHaveLength(9)
    expect(labels(s)).not.toContain('ability.harveyDraw')
    const distant = patch(game(true), { location: 'B' }, 'b')
    expect(labels(run(distant, { type: 'DrawCards', investigator: 'b', amount: 1 }))).not.toContain(
      'ability.harveyDraw',
    )
    expect(
      labels(
        run({ ...game(), phase: 'upkeep' }, { type: 'DrawCards', investigator: H, amount: 1 }),
      ),
    ).not.toContain('ability.harveyDraw')
  })
  it('elder sign gives +1 and draws', () => {
    const s = game(),
      sign = investigatorBehavior(H)!.elderSign!(s, me(s))
    expect(sign.modifier).toBe(1)
    expect(me(finish(execute(s, sign.immediate!))).hand).toHaveLength(1)
  })
  it('Vault exhausts after successful investigation and draws for an investigator here', () => {
    let s = forced(put(game(true), '60202'), {
      type: 'afterSkillTest',
      investigator: H,
      kind: 'investigate',
      succeeded: true,
      margin: 0,
      location: 'A',
    })
    s = choose(s, 'ability.vaultKnowledge')
    s = choose(s, 'choice.investigator', { name: 'B' })
    expect(s.assets['60202']!.exhausted).toBe(true)
    expect(s.investigators[1]!.hand).toHaveLength(6)
    expect(
      labels(
        forced(s, {
          type: 'afterSkillTest',
          investigator: H,
          kind: 'investigate',
          succeeded: true,
          margin: 0,
        }),
      ),
    ).not.toContain('ability.vaultKnowledge')
  })
  it.each([2, 3, 5, 6, 9])('Thrice-Damned Curiosity counts cards in hand (%s)', (n) => {
    const s = patch(game(), { hand: cards(n) })
    const after = finish(
      execute(
        s,
        treacheryBehavior('60203')!.revelation!(s, H, {
          id: 't',
          kind: 'treachery',
          code: '60203',
          name: 'Curiosity',
          traits: [],
          keywords: [],
          placement: { type: 'limbo' },
        }),
      ),
    )
    expect(me(after).damage).toBe(Math.floor(n / 3))
  })
  it('Obsessive discards a non-weakness at random on its owner turn only; two actions remove it', () => {
    let s = run(patch(game(), { hand: ['60203', '01088'] }), {
      type: 'ResolveWeakness',
      investigator: H,
      code: '60204',
    })
    s = forced(s, { type: 'turnBegins', investigator: H })
    expect(me(s).hand).toEqual(['60203'])
    expect(me(s).discard).toContain('01088')
    const t = Object.values(s.treacheries)[0]!,
      ability = treacheryBehavior('60204')!.abilities!(s, t, H)[0]!
    expect(ability.actions).toBe(2)
    s = execute(s, ability.then)
    expect(s.treacheries[t.id]).toBeUndefined()
  })
  it.each([4, 5, 9, 10, 14, 15])(
    'Celaeno Fragments bonuses follow hand size %s dynamically',
    (n) => {
      const s = begin(put(patch(game(), { hand: cards(n) }), '60206'))
      expect(skillTestValue(s).total).toBe(5 + Number(n >= 5) + Number(n >= 15))
      const w = begin(put(patch(game(), { hand: cards(n) }), '60206'), 'willpower')
      expect(skillTestValue(w).total).toBe(4 + Number(n >= 10))
    },
  )
  it('Disc discards itself to evade a newly spawned non-Elite, even exhausted', () => {
    let s = run(put(game(), '60207', { exhausted: true }), spawnAt('A', ghoul, H))
    s = choose(s, 'ability.discItzamna')
    s = choose(s, 'action.evade')
    expect(s.assets['60207']).toBeUndefined()
    expect(Object.values(s.enemies)[0]).toMatchObject({ exhausted: true, engagedWith: null })
    expect(
      labels(run(put(game(), '60207'), spawnAt('A', { ...ghoul, traits: ['Elite'] }, H))),
    ).not.toContain('ability.discItzamna')
  })
  it('Disc can instead deal 2 damage', () => {
    let s = run(put(game(), '60207'), spawnAt('A', { ...ghoul, health: 4 }, H))
    s = choose(s, 'ability.discItzamna')
    s = choose(s, 'choice.harveyDamageEnemy')
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(2)
  })
  it('Forbidden Tome draws before checking translation and discards the empty tome to record it', () => {
    let s = put(patch(game(), { hand: cards(9) }), '60210', { uses: 1 })
    const ability = options(s, '60210').abilities!(s, s.assets['60210']!, H)[0]!
    s = finish(execute(s, ability.costs!))
    s = execute(s, ability.then)
    if (labels(s).includes('choice.skip') && !labels(s).includes('choice.harveyTranslate'))
      s = choose(s, 'choice.skip')
    s = choose(s, 'choice.harveyTranslate')
    expect(s.assets['60210']).toBeUndefined()
    expect(s.campaignLog?.notes).toContain('translatedTheTome')
  })
  it('Higher Education requires five cards and pumps only willpower/intellect', () => {
    let s = begin(put(patch(game(), { hand: cards(5), resources: 1 }), '60211'))
    const option = options(s, '60211').testOptions!(s, s.skillTest!, s.assets['60211']!)[0]!
    s = dispatch({ ...s, pending: null }, ...option.then)
    expect(me(s).resources).toBe(0)
    expect(skillTestValue(s).total).toBe(6)
    expect(options(s, '60211').testOptions!(s, s.skillTest!, s.assets['60211']!)).toEqual([])
  })
  it.each([
    ['60213', 6],
    ['60223', 9],
  ] as const)('Whitton %s searches only its top %s and draws the selected Tome', (code, top) => {
    let s = put(patch(game(), { deck: [...cards(top - 1), '60206', '01088'] }), code)
    s = forced(s, { type: 'afterRevealLocation', investigator: H, location: 'A' })
    s = choose(s, 'ability.whittonSearch')
    s = choose(s, 'choice.takeCard', { card: 'Celaeno Fragments' })
    expect(me(s).hand).toContain('60206')
    expect(s.assets[code]!.exhausted).toBe(true)
  })
  it.each([
    ['60215', 0, 2],
    ['60224', 9, 3],
    ['60224', 10, 4],
  ] as const)(
    'Cryptic Writings %s grants correct resources with %s other cards',
    (code, n, gain) => {
      let s = patch(game(), { hand: cards(n), resources: 0 })
      s = played(s, code)
      expect(me(s).resources).toBe(gain)
    },
  )
  it('Cryptic Writings may be played after drawing during own turn', () => {
    let s = run(patch(game(), { deck: ['60215', ...cards(4)], resources: 0 }), {
      type: 'DrawCards',
      investigator: H,
      amount: 1,
    })
    s = choose(s, 'ability.playCard', { card: 'Cryptic Writings' })
    expect(me(s).resources).toBe(2)
    expect(me(s).hand).not.toContain('60215')
  })
  it('Extensive Research discounts each OTHER card and discovers two clues', () => {
    let s = patch(game(), { hand: ['60216', ...cards(9)], resources: 3 })
    expect(cardCost(s, H, '60216')).toBe(3)
    s = run(s, { type: 'PlayCard', investigator: H, code: '60216' })
    expect(me(s).resources).toBe(0)
    expect(me(s).clues).toBe(2)
    expect(cardCost(patch(game(), { hand: ['60216', ...cards(20)] }), H, '60216')).toBe(0)
  })
  it('Occult Invocation pays two discards before fighting with intellect and +2 damage', () => {
    let s = finish(
      run(
        patch(game(), { hand: ['60217', '01091', '01092'], resources: 2 }),
        spawnAt('A', { ...ghoul, health: 6 }, H),
      ),
    )
    s = run(s, { type: 'PlayCard', investigator: H, code: '60217' })
    s = choose(s, 'choice.takeCard', { card: 'Overpower' })
    s = choose(s, 'choice.takeCard', { card: 'Manual Dexterity' })
    expect(me(s).discard).toEqual(expect.arrayContaining(['60217', '01091', '01092']))
    expect(s.skillTest).toMatchObject({
      skill: 'intellect',
      baseModifier: 2,
      kind: { extraDamage: 2 },
    })
    s = finish(s)
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(3)
  })
  it('Library Docent returns a Tome and plays a differently titled one with discount', () => {
    let s = put(patch(game(), { hand: ['60208'], resources: 0 }), '60206')
    s = run(s, { type: 'PutAssetIntoPlay', investigator: H, code: '60220' })
    s = choose(s, 'ability.libraryDocent')
    s = choose(s, 'choice.returnToHand', { card: 'Celaeno Fragments' })
    s = choose(s, 'ability.playCard', { card: 'Encyclopedia' })
    expect(me(s).hand).toContain('60206')
    expect(Object.values(s.assets).map((a) => a.code)).toContain('60208')
    expect(me(s).resources).toBe(0)
  })
  it('Glimpse draws first then chooses any number of non-weakness cards, retaining duplicates separately', () => {
    let s = played(
      patch(game(), { hand: ['60203', '01091', '01091'], deck: ['01092', ...cards(10)] }),
      '60221',
    )
    if (labels(s).includes('ability.harveyDraw')) s = choose(s, 'choice.skip')
    s = choose(s, 'choice.harveyShuffle', { card: 'Overpower' })
    expect(labels(s).filter((l) => l === 'choice.harveyShuffle')).toHaveLength(2)
    s = choose(s, 'choice.harveyShuffle', { card: 'Overpower' })
    expect(
      s.pending?.question.choices.filter((c) => c.params?.card === 'Thrice-Damned Curiosity'),
    ).toEqual([])
    s = choose(s, 'choice.harveyFinish')
    s = finish(s)
    expect(me(s).hand).toHaveLength(4)
    expect(me(s).hand).toContain('60203')
  })
  it('Mind over Matter 2 adds modified intellect without changing test type and expires with round', () => {
    let s = played(game(), '60226')
    s = finish(s)
    s = begin(s, 'combat')
    expect(s.skillTest!.skill).toBe('combat')
    expect(skillTestValue(s).total).toBe(6)
    s = begin({ ...finish(s), round: s.round + 1 }, 'combat')
    expect(skillTestValue(s).total).toBe(1)
  })
  it.each([
    [0, 4],
    [4, 3],
    [8, 2],
    [12, 1],
    [20, 1],
  ])('researched Tomes with %s cards cost %s actions', (n, actions) => {
    let s = put(put(patch(game(), { hand: cards(n), damage: 1 }), '60229'), '60230')
    s = finish(run(s, spawnAt('A', { ...ghoul, health: 5 }, H)))
    for (const code of ['60229', '60230'])
      expect(options(s, code).abilities!(s, s.assets[code]!, H)[0]!.actions).toBe(actions)
  })
  it('Dark Knowledge moves a damage token from another investigator to an enemy without dealing damage', () => {
    let s = put(patch(game(true), { damage: 2 }, 'b'), '60229')
    s = finish(run(s, spawnAt('A', { ...ghoul, health: 5 }, H)))
    const a = options(s, '60229').abilities!(s, s.assets['60229']!, H)[0]!
    s = execute(s, [...a.costs!, ...a.then])
    expect(s.investigators[1]!.damage).toBe(1)
    expect(Object.values(s.enemies)[0]!.damageTaken).toBe(1)
  })
  it('Secrets Revealed may move and discovers its clue after moving', () => {
    let s = put(game(), '60230')
    const a = options(s, '60230').abilities!(s, s.assets['60230']!, H)[0]!
    s = execute(s, [...a.costs!, ...a.then])
    s = choose(s, 'choice.location', { location: 'Room B' })
    expect(me(s)).toMatchObject({ location: 'B', clues: 1 })
    expect(s.assets['60230']!.exhausted).toBe(true)
  })
  it('Farsight requires eight cards and own turn, exhausts and plays an event without an action', () => {
    let s = put(patch(game(), { hand: ['60214', ...cards(7)] }), '60231')
    const action = options(s, '60231').fastOptions!(s, s.assets['60231']!)[0]!
    expect(action).toBeDefined()
    s = execute(s, action.then)
    s = finish(s)
    expect(me(s).actionsRemaining).toBe(4)
    expect(me(s).resources).toBe(22)
    expect(s.assets['60231']!.exhausted).toBe(true)
    const short = put(patch(game(), { hand: ['60214', ...cards(6)] }), '60231')
    expect(options(short, '60231').fastOptions!(short, short.assets['60231']!)).toEqual([])
  })
  it('Funding adds two Miskatonic ally slots', () => {
    const s = put(game(), '60232')
    expect(slotCapacity(s, H, 'ally')).toBe(1)
    expect(options(s, '60232').restrictedSlots).toEqual([
      { slot: 'ally', trait: 'Miskatonic', count: 2 },
    ])
  })
  it('Necronomicon spends 1/2/3/4 secrets for boost/draw/remote clue/engaged damage', () => {
    let s = begin(put(game(), '60233'))
    const boost = options(s, '60233').testOptions!(s, s.skillTest!, s.assets['60233']!)[0]!
    s = dispatch({ ...s, pending: null }, ...boost.then)
    expect(skillTestValue(s).total).toBe(7)
    expect(s.assets['60233']!.uses).toBe(5)
    let d = put(game(), '60233')
    d = execute(
      d,
      options(d, '60233').fastOptions!(d, d.assets['60233']!).find(
        (o) => o.label === 'ability.necronomiconDraw',
      )!.then,
    )
    d = finish(d)
    expect(me(d).hand).toHaveLength(2)
    expect(d.assets['60233']!.uses).toBe(4)
    let c = put(game(), '60233')
    c = { ...c, locations: { ...c.locations, B: { ...c.locations.B!, clues: 1 } } }
    c = execute(
      c,
      options(c, '60233').fastOptions!(c, c.assets['60233']!).find(
        (o) => o.params?.location === 'Room B',
      )!.then,
    )
    expect(me(c).clues).toBe(1)
    expect(c.locations.B!.clues).toBe(0)
    let e = finish(run(put(game(), '60233'), spawnAt('A', { ...ghoul, health: 5 }, H)))
    e = execute(
      e,
      options(e, '60233').fastOptions!(e, e.assets['60233']!).find(
        (o) => o.label === 'ability.necronomiconDamage',
      )!.then,
    )
    expect(Object.values(e.enemies)[0]!.damageTaken).toBe(3)
    expect(e.assets['60233']!.uses).toBe(2)
  })
})

// RR simultaneous drawing: reactions to a particular drawn card see the entire batch.
it('Cryptic Writings 2 sees every card of a simultaneous batch before determining its gain', () => {
  let s = patch(game(), {
    hand: cards(8),
    deck: ['60224', '01088', '01088', ...cards(8)],
    resources: 0,
  })
  s = run(s, { type: 'DrawCards', investigator: H, amount: 3 })
  s = choose(s, 'ability.playCard', { card: 'Cryptic Writings' })
  expect(me(s).resources).toBe(4)
  expect(me(s).hand).toHaveLength(10)
})
it('a drawn Curiosity is no longer in hand when its revelation counts the rest of the batch', () => {
  const s = finish(
    run(patch(game(), { hand: cards(1), deck: ['60203', '01088', '01088', ...cards(10)] }), {
      type: 'DrawCards',
      investigator: H,
      amount: 3,
    }),
  )
  expect(me(s).damage).toBe(1)
  expect(me(s).hand).not.toContain('60203')
  expect(me(s).discard).toContain('60203')
})
it('Funding limits damage and horror collectively across all Miskatonic allies, even after one is defeated', () => {
  let s = put(put(put(game(), '60232'), '60212'), '60213')
  s = run(s, { type: 'TakeDamage', investigator: H, damage: 3, horror: 2 })
  s = choose(s, 'choice.assignToAsset', { card: 'Laboratory Assistant' })
  expect(s.assets['60212']).toBeUndefined()
  expect(s.assets['60213']).toMatchObject({ damage: 0, horror: 0 })
  expect(me(s)).toMatchObject({ damage: 2, horror: 2 })
})
it('Funding supports three Miskatonic allies through actual slot allocation', () => {
  let s = put(game(), '60232')
  for (let n = 0; n < 3; n++)
    s = finish(run(s, { type: 'PutAssetIntoPlay', investigator: H, code: '01032' }))
  expect(Object.values(s.assets).filter((a) => a.code === '01032')).toHaveLength(3)
  s = run(s, { type: 'PutAssetIntoPlay', investigator: H, code: '01032' })
  expect(s.pending?.question.prompt).toBe('prompt.freeSlot')
})
it('Whitton remains silent for a location another investigator reveals or when exhausted', () => {
  const s = put(game(true), '60223')
  expect(
    labels(forced(s, { type: 'afterRevealLocation', investigator: 'b', location: 'B' })),
  ).not.toContain('ability.whittonSearch')
  const exhausted = put(game(), '60223', { exhausted: true })
  expect(
    labels(forced(exhausted, { type: 'afterPutLocation', investigator: H, location: 'B' })),
  ).not.toContain('ability.whittonSearch')
})
it('Farsight preserves resource cost and play restrictions and cannot play a reaction-only event at will', () => {
  const s = put(
    patch(game(), {
      resources: 0,
      hand: ['60216', '60113', ...Array.from({ length: 6 }, () => '01091')],
    }),
    '60231',
  )
  expect(options(s, '60231').fastOptions!(s, s.assets['60231']!)).toEqual([])
})

it('Library Docent cannot pay a return cost when no differently titled Tome can be played', () => {
  const s = put(put(patch(game(), { hand: ['60206'], resources: 1 }), '60206'), '60220')
  expect(
    options(s, '60220').reactions!(
      s,
      { type: 'afterAssetEntersPlay', investigator: H, asset: '60220' },
      s.assets['60220']!,
    ),
  ).toEqual([])
})
it('Mind over Matter 2 dynamically includes intellect bonuses and repeated plays stack while combat stays combat', () => {
  let s = put(patch(game(), { hand: cards(15) }), '60206')
  s = finish(played(s, '60226'))
  s = finish(played(s, '60226'))
  s = begin(s, 'combat')
  expect(s.skillTest!.skill).toBe('combat')
  expect(skillTestValue(s).total).toBe(15)
})

// RR: simultaneous damage/horror and "as evenly as possible" (Eyes in the Walls).
// Funding's cap is shared across all Miskatonic assets, so their unused capacity
// cannot force a second point onto a different ally during an even allocation.
it('Funding keeps even horror assignment within its shared Miskatonic limit', () => {
  let s = put(put(put(game(), '60232'), '60212'), '60213')
  s = run(s, { type: 'TakeDamage', investigator: H, damage: 0, horror: 3, evenly: true })
  expect(s.assets['60212']!.horror).toBe(0)
  expect(me(s).horror).toBe(0)
  s = choose(s, 'choice.assignToAsset', { card: 'Laboratory Assistant' })
  // The only remaining legal recipient is selected automatically for both points.
  expect(labels(s)).not.toContain('choice.assignToAsset')
  expect(s.assets['60212']!.horror).toBe(1)
  expect(s.assets['60213']!.horror).toBe(0)
  expect(me(s).horror).toBe(2)
})
