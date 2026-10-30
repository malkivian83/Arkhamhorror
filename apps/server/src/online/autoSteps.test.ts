import { expect, it } from 'vitest'
import { applyInput, type GameState } from '@lcg/engine'
import { throughSetup, newTestGame, during, ghoul, spawnAt } from '@lcg/engine/testing'
import { createOnlineSteps } from './autoSteps'
import { newCampaign, startScenario } from '@lcg/cards'

it.each(['82017b', '82021b'])(
  'presents the public face when Carnevale %s turns over, before its destination is shown',
  (code) => {
    const initial = throughSetup(
      startScenario(newCampaign('carnevale-of-horrors', ['joe'], 'standard'), 42),
    )
    const masked = Object.values(initial.placedAssets!).find((p) => p.code === code)!
    const investigator = initial.investigators[0]!.id
    initial.pending = {
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'test',
        choices: [
          {
            label: 'test',
            then: [{ type: 'ScenarioSpecific', key: 'carnevaleFlip', data: { placed: masked.id } }],
          },
        ],
      },
    }
    const collector = createOnlineSteps(initial, { host: investigator, friend: undefined })
    applyInput(initial, { investigator, choice: 0 }, collector.observe)
    for (const cards of Object.values(collector.finishCards()))
      expect(cards).toEqual([
        expect.objectContaining({
          code: code.slice(0, -1),
          reason: 'reveal',
          from: 'masked',
          target: expect.stringMatching(code === '82021b' ? /^placed:/ : /^enemy:/),
        }),
      ])
  },
)

// RR Round Sequence: the authoritative observer must preserve automatic phase order.
it('collects the actual round sequence for every player, including intermediate moves', () => {
  const initial = during(
    throughSetup(newTestGame()),
    (s) => s,
    spawnAt('C', { ...ghoul, keywords: ['hunter'] }),
  )
  const steps = createOnlineSteps(initial, { host: 'a', friend: undefined })
  const choice = initial.pending!.question.choices.findIndex((c) => c.label === 'action.endTurn')
  applyInput(initial, { investigator: 'a', choice }, steps.observe)
  for (const review of Object.values(steps.finish())) {
    const keys = review.steps.map((s) => s.key)
    expect(keys).toEqual(
      expect.arrayContaining([
        'log.step.huntersMove',
        'log.step.drawAndGainResource',
        'log.step.placeDoom',
      ]),
    )
    expect(keys.indexOf('log.step.huntersMove')).toBeLessThan(keys.indexOf('log.step.placeDoom'))
    expect(review.steps.find((s) => s.key === 'log.step.huntersMove')?.effects).toContainEqual({
      key: 'table.autoSteps.enemyMoved',
      params: { enemy: 'Ghoul', location: 'Room B' },
    })
    expect(
      review.steps.find((s) => s.key === 'log.step.drawAndGainResource')?.effects,
    ).toContainEqual({ key: 'table.autoSteps.drew', params: { name: 'A', n: 1 } })
  }
})

// RR Hidden Information: private prompts/cards may be shown only to their owner.
it('redacts private logs, decisions, hidden treacheries and masked identities before collecting effects', () => {
  const initial = {
    ...throughSetup(newTestGame({ players: ['a', 'b'] })),
    phaseStep: 'drawEncounter' as const,
  }
  const steps = createOnlineSteps(initial, { host: 'a', friend: 'b' })
  const after: GameState = {
    ...initial,
    investigators: initial.investigators.map((i) =>
      i.id === 'b' ? { ...i, deck: i.deck.slice(1), hand: [...i.hand, 'secret-hand'] } : i,
    ),
    log: [
      ...initial.log,
      {
        key: 'log.encounter',
        round: 1,
        params: { hidden: 1, name: 'B', card: 'Secret encounter', code: 'secret-code' },
      },
      { key: 'secret-log', round: 1, params: { card: 'secret-log-value' } },
    ],
    pending: {
      investigator: 'b',
      question: {
        kind: 'chooseOne',
        prompt: 'secret-prompt',
        promptParams: { card: 'secret-prompt-value' },
        choices: [],
      },
    },
    treacheries: {
      secret: {
        kind: 'treachery',
        id: 'secret',
        code: 'secret-treachery',
        name: 'Secret treachery',
        hidden: true,
        keywords: [],
        placement: { type: 'threatArea', investigator: 'b' },
      },
    },
    placedAssets: {
      masked: {
        id: 'masked',
        code: 'secret-identity',
        name: 'Secret identity',
        faceDown: true,
        exhausted: false,
        damage: 0,
        horror: 0,
        placement: { type: 'location', location: 'A' },
      },
    },
  }
  steps.observe(initial, { type: 'Log', key: 'log.encounter' }, after)
  const reviews = steps.finish(),
    publicText = JSON.stringify(reviews.host)
  for (const secret of [
    'secret-hand',
    'Secret encounter',
    'secret-code',
    'secret-log-value',
    'secret-prompt',
    'secret-treachery',
    'Secret treachery',
    'secret-identity',
    'Secret identity',
  ])
    expect(publicText).not.toContain(secret)
  expect(reviews.host?.next?.prompt).toBe('game.waitingFor')
  const cards = JSON.stringify(steps.finishCards().host ?? [])
  for (const secret of ['secret-code', 'secret-identity', 'secret-treachery', 'secret-prompt'])
    expect(cards).not.toContain(secret)
  expect(reviews.friend?.next?.prompt).toBe('secret-prompt')
  expect(JSON.stringify(reviews.friend)).toContain('Secret encounter')
  expect(reviews.host?.steps.flatMap((s) => s.effects)).toContainEqual({
    key: 'table.autoSteps.drew',
    params: { name: 'B', n: 1 },
  })
})
