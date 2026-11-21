// RR: Setup; FAQ 2.6; Copy, Costs, Fast, Attacks of Opportunity, Leaves Play, Victory.
import { expect, it } from 'vitest'
import {
  dispatch,
  availableActions,
  availableAbilities,
  investigatorBehavior,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCards,
  registerPlayerCard,
  registerEnemy,
  registerScenario,
  type GameState,
  type Message,
} from '@lcg/engine'
import { newTestGame, throughSetup, choose, spawnAt, ghoul } from '@lcg/engine/testing'
import '../index'
const clear = (s: GameState): GameState => ({ ...s, pending: null, queue: [] })
const base = (): GameState => {
  const s = clear(throughSetup(newTestGame({ players: ['03003', 'b'] })))
  return {
    ...s,
    phase: 'investigation',
    activeTurn: '03003',
    interactive: true,
    chaosBag: [0],
    investigators: s.investigators.map((i) => ({
      ...i,
      hand: [],
      deck: ['01088', '01089', '01090'],
      discard: [],
      beneath: [],
      resources: 10,
      actionsRemaining: 3,
      damage: 0,
      horror: 0,
      location: 'A',
    })),
  }
}
const me = (s: GameState) => s.investigators[0]!
const patch = (s: GameState, v: Partial<GameState['investigators'][number]>): GameState => ({
  ...s,
  investigators: s.investigators.map((i, n) => (n === 0 ? { ...i, ...v } : i)),
})
const run = (s: GameState, ...m: Message[]) => dispatch(clear(s), ...m)
const name = (c: string) => playerCardDef(c)!.name
const has = (s: GameState, label: string) =>
  !!s.pending?.question.choices.some((c) => c.label === label)
const painted = (s = base(), as = '01088', hand = ['03012']) => patch(s, { hand, beneath: [as] })
const play = (s: GameState, as = '01088') =>
  run(s, { type: 'TakeAction', investigator: '03003', action: { kind: 'play', card: '03012', as } })
it('replaces the opening draw with thirteen and keeps eight, without a mulligan', () => {
  let s = patch(base(), { deck: ['03013', ...Array(13).fill('01088'), '01089'] })
  s = run(s, { type: 'DrawOpeningHand', investigator: '03003', amount: 5 })
  expect(me(s).hand).toHaveLength(13)
  expect(me(s).setAsideOpening).toEqual(['03013'])
  expect(has(s, 'choice.mulliganCard')).toBe(false)
  s = choose(s, 'choice.openingBeneathDone')
  while (has(s, 'choice.openingDiscard')) s = choose(s, 'choice.openingDiscard')
  expect(me(s).hand).toHaveLength(8)
  expect(me(s).discard).toHaveLength(5)
  s = run(s, { type: 'Mulligan', investigator: '03003' })
  expect(me(s).deck).toContain('03013')
  expect(has(s, 'choice.mulliganCard')).toBe(false)
})
it('may bank up to five physical events but never The Painted World or assets', () => {
  let s = run(patch(base(), { deck: ['03012', '01087', ...Array(11).fill('01088')] }), {
    type: 'DrawOpeningHand',
    investigator: '03003',
    amount: 5,
  })
  const options = s.pending!.question.choices.filter((c) => c.label === 'choice.openingBeneath')
  expect(options.map((c) => c.params?.card)).toEqual([name('01088')])
  for (let n = 0; n < 5; n++) s = choose(s, 'choice.openingBeneath', { card: name('01088') })
  expect(me(s).beneath).toHaveLength(5)
  expect(me(s).hand).toHaveLength(8)
  expect(s.pending).toBeNull()
})
it('opening-hand modifiers change both the larger draw and the kept hand (FAQ 2.6)', () => {
  let s = run(patch(base(), { deck: Array(16).fill('01087') }), {
    type: 'DrawOpeningHand',
    investigator: '03003',
    amount: 7,
  })
  expect(me(s).hand).toHaveLength(15)
  while (has(s, 'choice.openingDiscard')) s = choose(s, 'choice.openingDiscard')
  expect(me(s).hand).toHaveLength(10)
  expect(me(s).deck).toHaveLength(1)
})
it('banked cards stay out of hand and ordinary discard effects cannot reach them', () => {
  const s = run(painted(base(), '01088', []), {
    type: 'DiscardCardsOfType',
    investigator: '03003',
    cardType: 'event',
    all: true,
  })
  expect(me(s).beneath).toEqual(['01088'])
  expect(me(s).discard).toEqual([])
})
it('her action draws one chosen banked event, costs one action and is not a play', () => {
  let s = painted(base(), '01088', [])
  const a = availableAbilities(s, '03003').find((a) => a.label === 'ability.sefinaDraw')!
  expect(a.provokes).toBe(false)
  s = run(s, {
    type: 'UseAbility',
    investigator: '03003',
    key: a.key,
    actions: a.actions,
    provokes: a.provokes,
    then: a.then,
  })
  expect(me(s).hand).toEqual(['01088'])
  expect(me(s).beneath).toEqual([])
  expect(me(s).resources).toBe(10)
  expect(me(s).actionsRemaining).toBe(2)
})
it('elder sign gives +3 and may draw an event without spending an action', () => {
  const s = painted(base(), '01088', []),
    e = investigatorBehavior('03003')!.elderSign!(s, me(s))
  expect(e.modifier).toBe(3)
  const next = choose(dispatch(clear(s), ...(e.immediate ?? [])), 'choice.sefinaDraw')
  expect(me(next).hand).toEqual(['01088'])
  expect(me(next).actionsRemaining).toBe(3)
})
it('copies an ordinary event at its printed cost, retaining the original banked event', () => {
  const s = play(painted())
  expect(me(s).resources).toBe(13)
  expect(me(s).actionsRemaining).toBe(2)
  expect(me(s).beneath).toEqual(['01088'])
  expect(me(s).hand).toEqual([])
  expect(me(s).discard).toEqual([])
  expect(s.eventCopies).toEqual([])
})
it('a real card with the same printed code is neither removed nor mistaken for the physical copy', () => {
  const s = play(patch(painted(base(), '01088', ['01088', '03012']), { discard: ['01088'] }))
  expect(me(s).hand).toEqual(['01088'])
  expect(me(s).discard).toEqual(['01088'])
})
it('unaffordable copies are not offered and a refused play restores the physical Painted World', () => {
  const s = patch(painted(base(), '01051'), { resources: 0 })
  expect(availableActions(s, '03003').some((a) => a.kind === 'play' && a.as === '01051')).toBe(
    false,
  )
  const next = play(s, '01051')
  expect(me(next).hand).toEqual(['03012'])
  expect(me(next).actionsRemaining).toBe(3)
})
it('a copy preserves fast timing and never offers a fast event as a normal action', () => {
  const s = painted(base(), '01050')
  expect(availableActions(s, '03003').some((a) => a.kind === 'play' && a.as === '01050')).toBe(
    false,
  )
  const next = run(s, {
    type: 'PlayCard',
    investigator: '03003',
    code: '03012',
    copyAs: '01050',
    fastWindow: true,
  })
  expect(me(next).actionsRemaining).toBe(3)
  expect(me(next).resources).toBe(8)
  expect(me(next).beneath).toEqual(['01050'])
})
registerPlayerCards([
  {
    code: 'copy-victory',
    name: 'Victory event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 2,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-location',
    name: 'Location event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 1,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-fast',
    name: 'Fast event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 2,
    fast: true,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-exceptional',
    name: 'Exceptional event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 0,
    exceptional: true,
    icons: {},
    xp: 1,
  },
])
registerPlayerCard({
  code: 'copy-victory',
  play: (_s, by) => [{ type: 'EventToVictory', investigator: by, code: 'copy-victory', points: 2 }],
})
registerPlayerCard({
  code: 'copy-location',
  play: (_s, by) => [
    { type: 'AttachEventToLocation', investigator: by, code: 'copy-location', location: 'A' },
  ],
})
registerPlayerCard({
  code: 'copy-fast',
  playInAnyFastWindow: true,
  play: (_s, by) => [{ type: 'GainResources', investigator: by, amount: 5 }],
})
registerPlayerCard({ code: 'copy-exceptional', play: () => [] })
it('exceptional events can be banked but never copied', () => {
  const s = painted(base(), 'copy-exceptional')
  expect(availableActions(s, '03003').some((a) => a.kind === 'play')).toBe(false)
  expect(investigatorBehavior('03003')!.openingReplacement!.canStore('copy-exceptional')).toBe(true)
})
it('a copy added to victory becomes Painted World and loses the copied victory points', () => {
  const s = play(painted(base(), 'copy-victory'), 'copy-victory')
  expect(s.victoryDisplay).toContain('03012')
  expect(s.victoryDisplay).not.toContain('copy-victory')
  expect(s.victoryPoints ?? 0).toBe(0)
  expect(me(s).resources).toBe(8)
})
it('an attached copy retains its identity in play, then is removed instead of discarded', () => {
  let s = play(painted(base(), 'copy-location'), 'copy-location')
  const a = Object.values(s.locationAttachments ?? {})[0]!
  expect(a.code).toBe('copy-location')
  expect(a.physicalCopy?.code).toBe('03012')
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = run(s, { type: 'DiscardLocationAttachment', attachment: a.id })
  expect(me(s).discard).toEqual([])
})
it('returning an attached copy to hand restores its physical Painted World identity', () => {
  let s = play(painted(base(), 'copy-location'), 'copy-location')
  const a = Object.values(s.locationAttachments ?? {})[0]!
  s = run(s, { type: 'ReturnLocationAttachment', attachment: a.id })
  expect(me(s).hand).toEqual(['03012'])
  expect(me(s).discard).toEqual([])
})
it('an explicit play effect can select the original Spell before copying a non-Spell event (Uncage the Soul FAQ)', () => {
  const s = run(painted(base(), 'copy-victory'), {
    type: 'PlayCard',
    investigator: '03003',
    code: '03012',
    copyAs: 'copy-victory',
    byEffect: true,
    discount: 3,
  })
  expect(me(s).resources).toBe(10)
  expect(s.victoryDisplay).toContain('03012')
})
it('drawing Stars removes one random banked event and shuffles back with at least five deck cards', () => {
  let s = patch(base(), { beneath: ['01088', '01050'], deck: ['03013', ...Array(5).fill('01089')] })
  s = run(s, { type: 'DrawCards', investigator: '03003', amount: 1 })
  expect(me(s).beneath).toHaveLength(1)
  expect(me(s).deck).toContain('03013')
  expect(me(s).discard).not.toContain('03013')
  expect(me(s).damage).toBe(0)
})
it('Stars deals one damage and horror when empty, and is discarded with only four deck cards', () => {
  const s = run(patch(base(), { deck: ['03013', ...Array(4).fill('01089')] }), {
    type: 'DrawCards',
    investigator: '03003',
    amount: 1,
  })
  expect(me(s).damage).toBe(1)
  expect(me(s).horror).toBe(1)
  expect(me(s).discard).toContain('03013')
  expect(me(s).deck).not.toContain('03013')
})
it('the random event removal and opening choices replay identically after JSON serialization', () => {
  const initial = patch(base(), {
    beneath: ['01088', '01050', '01051'],
    deck: ['03013', ...Array(5).fill('01089')],
  })
  expect(
    run(JSON.parse(JSON.stringify(initial)) as GameState, {
      type: 'DrawCards',
      investigator: '03003',
      amount: 1,
    }),
  ).toEqual(run(initial, { type: 'DrawCards', investigator: '03003', amount: 1 }))
})

registerEnemy({
  code: 'copy-foe',
  forced: (_s, t, e) =>
    t.type === 'whenEnemyAttacks' && t.enemy === e.id
      ? [{ type: 'GainResources', investigator: 'b', amount: 1 }]
      : [],
})
const foe = (s: GameState) =>
  run(s, spawnAt('A', { ...ghoul, code: 'copy-foe', health: 20, damage: 0, horror: 0 }, '03003'))
it('an ordinary copied event provokes opportunity attacks, while a copied fight event does not', () => {
  const normal = play(foe(painted()))
  expect(normal.investigators[1]!.resources).toBe(11)
  const fight = play(foe(painted(base(), '01051')), '01051')
  expect(fight.investigators[1]!.resources).toBe(10)
})
it('copies Ward of Protection only in its printed revelation window and pays its cost and horror', () => {
  let s = painted(base(), '01065')
  const treachery = {
    kind: 'treachery' as const,
    id: 'copy-rot',
    code: '01163',
    name: 'Rotting Remains',
    traits: ['Terror'],
    keywords: [],
    placement: { type: 'limbo' as const },
  }
  s = { ...s, treacheries: { ...s.treacheries, [treachery.id]: treachery } }
  expect(availableActions(s, '03003').some((a) => a.kind === 'play')).toBe(false)
  s = run(s, {
    type: 'Forced',
    trigger: { type: 'whenTreacheryDrawn', investigator: '03003', treachery: treachery.id },
  })
  s = choose(s, 'ability.playEventCopy')
  expect(me(s).resources).toBe(9)
  expect(me(s).horror).toBe(1)
  expect(me(s).hand).toEqual([])
  expect(me(s).discard).toEqual([])
  expect(me(s).beneath).toEqual(['01065'])
})
it('Uncage the Soul can actually select Painted World as a Spell before copying a non-Spell', () => {
  let s = painted(base(), 'copy-victory', ['03033', '03012'])
  s = run(s, { type: 'PlayCard', investigator: '03003', code: '03033' })
  s = choose(s, 'choice.toolPlay', { card: name('03012') })
  s = choose(s, 'choice.eventCopy', { card: name('copy-victory') })
  expect(s.victoryDisplay).toContain('03012')
  expect(me(s).resources).toBe(10)
})
it('a copy choice can be saved and resumed without confusing real events or consuming the banked source', () => {
  let s = run(painted(base(), 'copy-victory'), {
    type: 'PlayCard',
    investigator: '03003',
    code: '03012',
  })
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.eventCopy', { card: name('copy-victory') })
  expect(s.victoryDisplay).toContain('03012')
  expect(me(s).beneath).toEqual(['copy-victory'])
})

registerPlayerCards([
  {
    code: 'copy-upgrade',
    name: 'Upgrade event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 0,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-enemy',
    name: 'Enemy event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 0,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-choice',
    name: 'Choice event',
    type: 'event',
    class: 'rogue',
    traits: [],
    cost: 0,
    icons: {},
    xp: 0,
  },
  {
    code: 'copy-observer',
    name: 'Event observer',
    type: 'asset',
    class: 'neutral',
    traits: [],
    cost: 0,
    icons: {},
    xp: 0,
    slots: [],
  },
])
registerPlayerCard({
  code: 'copy-upgrade',
  play: (_s, by) => [
    {
      type: 'AttachEventToAsset',
      investigator: by,
      code: 'copy-upgrade',
      asset: 'copy-host',
      trait: 'Item',
    },
  ],
})
registerPlayerCard({
  code: 'copy-enemy',
  play: (s, by) => [
    {
      type: 'AttachPlayerCardToEnemy',
      investigator: by,
      code: 'copy-enemy',
      enemy: Object.keys(s.enemies)[0]!,
    },
  ],
})
registerPlayerCard({
  code: 'copy-choice',
  play: (_s, by) => [
    {
      type: 'Ask',
      investigator: by,
      question: {
        kind: 'chooseOne',
        alwaysAsk: true,
        prompt: 'prompt.chooseEffect',
        choices: [
          {
            label: 'choice.location',
            params: { location: 'Room A' },
            then: [
              {
                type: 'AttachEventToLocation',
                investigator: by,
                code: 'copy-choice',
                location: 'A',
              },
            ],
          },
        ],
      },
    },
  ],
})
registerPlayerCard({
  code: 'copy-observer',
  observesEventPlay: true,
  forced: (_s, t, a) =>
    t.type === 'afterEventPlayed' && t.code === '03012'
      ? [{ type: 'GainResources', investigator: a.owner, amount: 1 }]
      : [],
})
const host = (s: GameState) => ({
  ...s,
  assets: {
    ...s.assets,
    'copy-host': {
      id: 'copy-host',
      code: '01087',
      owner: '03003',
      uses: 3,
      damage: 0,
      horror: 0,
      exhausted: false,
    },
  },
})
it('a copied upgrade is removed when its host leaves, without discarding or deleting another real event', () => {
  let s = play(
    host(patch(painted(base(), 'copy-upgrade'), { discard: ['copy-upgrade'] })),
    'copy-upgrade',
  )
  expect(s.assets['copy-host']!.upgrades![0]!.physicalCopy?.code).toBe('03012')
  s = run(s, { type: 'DiscardAsset', asset: 'copy-host' })
  expect(me(s).discard.filter((c) => c === 'copy-upgrade')).toHaveLength(1)
  expect(me(s).discard).not.toContain('03012')
})
it('a copied enemy attachment stays in play and is removed instead of discarded when discarded', () => {
  let s = play(foe(painted(base(), 'copy-enemy')), 'copy-enemy')
  const a = Object.values(s.treacheries).find((t) => t.code === 'copy-enemy')!
  expect(a.physicalCopy?.code).toBe('03012')
  s = run(s, { type: 'DiscardTreachery', treachery: a.id })
  expect(me(s).discard).toEqual([])
})
it('a copy retains physical provenance through a saved choice inside its resolving effect', () => {
  let s = play(painted(base(), 'copy-choice'), 'copy-choice')
  expect(s.eventCopies![0]!.paid).toBe(true)
  s = JSON.parse(JSON.stringify(s)) as GameState
  s = choose(s, 'choice.location')
  expect(Object.values(s.locationAttachments!)[0]!.physicalCopy?.code).toBe('03012')
  expect(s.eventCopies).toEqual([])
})
it('post-resolution observers receive the removed physical card, preventing replay of an older real event', () => {
  let s = painted()
  s = {
    ...s,
    assets: {
      'copy-observer': {
        id: 'copy-observer',
        code: 'copy-observer',
        owner: '03003',
        uses: 0,
        damage: 0,
        horror: 0,
        exhausted: false,
      },
    },
  }
  s = play(s)
  expect(me(s).resources).toBe(14)
})

registerScenario({ id: 'sefina-no-draw', cannotDrawCards: () => true })
it('her action and elder-sign draw respect a prohibition on drawing cards', () => {
  const s = { ...painted(base(), '01088', []), scenarioId: 'sefina-no-draw' }
  expect(availableAbilities(s, '03003').some((a) => a.label === 'ability.sefinaDraw')).toBe(false)
  const e = investigatorBehavior('03003')!.elderSign!(s, me(s))
  expect(e.modifier).toBe(3)
  const next = run(s, { type: 'DrawInvestigatorBeneath', investigator: '03003', index: 0 })
  expect(me(next).beneath).toEqual(['01088'])
  expect(me(next).hand).toEqual([])
})
it('copying cannot ignore Peril when another investigator owns the test', () => {
  let s = painted(base(), 'copy-victory')
  s = run(s, {
    type: 'BeginSkillTest',
    investigator: 'b',
    skill: 'willpower',
    difficulty: 0,
    kind: { type: 'investigate', location: 'A' },
    tags: ['peril'],
  })
  const next = run(s, {
    type: 'PlayCard',
    investigator: '03003',
    code: '03012',
    copyAs: 'copy-victory',
  })
  expect(me(next).hand).toEqual(['03012'])
  expect(me(next).resources).toBe(10)
})
it.each([
  { bank: ['01088'], remaining: 4 },
  { bank: [], remaining: 5 },
])(
  'Stars applies its removal and reshuffle clauses independently: $remaining',
  ({ bank, remaining }) => {
    const s = run(
      patch(base(), { beneath: bank, deck: ['03013', ...Array(remaining).fill('01089')] }),
      { type: 'DrawCards', investigator: '03003', amount: 1 },
    )
    expect(me(s).beneath).toEqual([])
    expect(me(s).damage).toBe(bank.length ? 0 : 1)
    expect(me(s).deck.includes('03013')).toBe(remaining >= 5)
  },
)
it('the physical source is rebound to the copied event for inline skill-test effects', () => {
  const s = run(painted(base(), 'copy-choice'), {
    type: 'PlayCard',
    investigator: '03003',
    code: '03012',
    copyAs: 'copy-choice',
    effectSource: '03012',
    effect: [
      {
        type: 'BeginSkillTest',
        investigator: '03003',
        skill: 'intellect',
        difficulty: 0,
        kind: { type: 'investigate', location: 'A' },
      },
    ],
  })
  expect(s.skillTest!.effectSource).toBe('copy-choice')
})

it('Uncage the Soul cannot select Painted World when its only source needs a different printed reaction window', () => {
  const s = painted(base(), '01065', ['03033', '03012'])
  expect(playerCardBehavior('03033')!.canPlay!(s, '03003')).toBe(false)
})

it('another investigator playing Painted World still copies the events beneath the named Sefina', () => {
  let s = painted(base(), '01088', [])
  s = {
    ...s,
    investigators: s.investigators.map((i) => (i.id === 'b' ? { ...i, hand: ['03012'] } : i)),
  }
  s = run(s, {
    type: 'PlayCard',
    investigator: 'b',
    code: '03012',
    copyAs: '01088',
    byEffect: true,
  })
  expect(s.investigators[1]!.resources).toBe(13)
  expect(s.investigators[1]!.hand).toEqual([])
  expect(me(s).beneath).toEqual(['01088'])
})
