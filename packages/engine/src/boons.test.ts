import type { GameState } from './types'
import { describe, expect, it } from 'vitest'
import { availableActions } from './actions'
import { applyInput, createGame } from './engine'
import { handle } from './handlers'
import { prepareGame } from './setup'
import { newTestGame, testInvestigator, testScenario, throughSetup } from './testing'

// FAQ: "Ultimatums and Boons" (v2.5), Boons.
describe('boons', () => {
  const base = (): GameState => ({ ...throughSetup(newTestGame()), pending: null, queue: [] })
  it('Hades and Thoth increase setup resources and opening hand', () => {
    const s = throughSetup(
      createGame({
        seed: 7,
        scenario: testScenario(),
        investigators: [testInvestigator('a')],
        boons: ['hades', 'thoth'],
      }),
    )
    expect(s.investigators[0]!.resources).toBe(7)
    expect(s.investigators[0]!.hand).toHaveLength(6)
  })
  it('Destiny selects one copy without increasing opening hand size', () => {
    let s = createGame({
      seed: 7,
      scenario: testScenario(),
      investigators: [testInvestigator('a')],
      boons: ['destiny'],
    })
    expect(s.pending?.question.prompt).toBe('boons.destinyPrompt')
    const card = s.pending!.question.choices[0]!.target!
    expect(card.type).toBe('hand')
    s = throughSetup(applyInput(s, { investigator: 'a', choice: 0 }))
    expect(s.investigators[0]!.hand).toHaveLength(5)
    if (card.type === 'hand') expect(s.investigators[0]!.hand).toContain(card.code)
  })
  it('Hermes permits movement after normal actions run out and spends its bonus first', () => {
    let s = handle({ ...base(), boons: ['hermes'] }, { type: 'BeginTurn', investigator: 'a' })
    s.investigators[0]!.actionsRemaining = 0
    expect(availableActions(s, 'a')).toEqual([{ kind: 'move', to: 'B' }])
    s = handle(s, { type: 'TakeAction', investigator: 'a', action: { kind: 'move', to: 'B' } })
    expect(s.investigators[0]!.extraMove).toBe(false)
    expect(s.investigators[0]!.actionsRemaining).toBe(0)
    expect(availableActions(s, 'a')).toEqual([])
  })
  it('Osiris heals once and protects only until the next turn', () => {
    let s: GameState = { ...base(), boons: ['osiris'] }
    s.investigators[0]!.damage = 8
    s = handle(s, { type: 'CheckDefeat', investigator: 'a' }) as typeof s
    expect(s.queue[0]?.type).toBe('SufferTrauma')
    s = handle(s, s.queue[0]!) as typeof s
    expect(s.campaignLog!.investigators.a!.physicalTrauma).toBe(1)
    s = handle(s, { type: 'DefeatInvestigator', investigator: 'a' }) as typeof s
    expect(s.queue[0]?.type).toBe('BoonOsiris')
    s = handle(s, { type: 'BoonOsiris', investigator: 'a' }) as typeof s
    expect(s.investigators[0]!.damage).toBe(0)
    s = handle(s, {
      type: 'TakeDamage',
      investigator: 'a',
      damage: 2,
      horror: 0,
      direct: true,
    }) as typeof s
    expect(s.investigators[0]!.damage).toBe(0)
    s = handle(s, { type: 'BeginTurn', investigator: 'a' }) as typeof s
    expect(s.investigators[0]!.osirisProtected).toBe(false)
    s = handle(s, { type: 'DefeatInvestigator', investigator: 'a' }) as typeof s
    expect(s.queue[0]?.type).toBe('EliminateInvestigator')
  })
  it('Persephone grants experience on defeat', () => {
    const s = handle(
      { ...base(), boons: ['persephone'] },
      { type: 'DefeatInvestigator', investigator: 'a' },
    )
    expect(s.campaignLog!.investigators.a!.xp).toBe(3)
  })
  it('Morrigan excludes a weakness and stores the random result for later scenarios', () => {
    let s = handle(base(), { type: 'BoonMorrigan', investigator: 'a', candidates: ['x', 'y', 'z'] })
    expect(s.queue[0]?.type).toBe('Ask')
    s = handle(s, { type: 'BoonWeakness', investigator: 'a', candidates: ['y', 'z'] })
    expect(['y', 'z']).toContain(s.campaignLog!.values['boonWeakness:a'])
    expect(s.investigators[0]!.deck).toContain(s.campaignLog!.values['boonWeakness:a'])
  })
  it('old games have no boons by default', () => {
    const s = prepareGame({
      seed: 1,
      scenario: testScenario(),
      investigators: [testInvestigator('a')],
    })
    expect(s.boons).toBeUndefined()
  })
})

// FAQ: "Ultimatums and Boons", Athena applies to each investigator's first autofail.
it('Athena returns the token and offers cancellation only once per investigator', () => {
  let s = handle(
    { ...throughSetup(newTestGame()), pending: null, queue: [], boons: ['athena'] },
    {
      type: 'BeginSkillTest',
      investigator: 'a',
      skill: 'intellect',
      difficulty: 2,
      kind: { type: 'effect', source: 'test', onSuccess: [], onFail: [], onFailEach: [] },
    },
  )
  s = handle({ ...s, queue: [], chaosBag: ['autoFail'] }, { type: 'RevealChaosToken' })
  expect(s.athenaUsed).toEqual(['a'])
  expect(s.chaosBag).toEqual(['autoFail'])
  expect(s.skillTest!.autoFail).toBe(false)
  s = handle({ ...s, queue: [] }, { type: 'RevealChaosToken' })
  expect(s.skillTest!.autoFail).toBe(true)
  expect(s.chaosBag).toEqual([])
})
