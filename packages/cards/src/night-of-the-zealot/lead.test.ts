import { createGame, type Message } from '@lcg/engine'
import {
  choose,
  during,
  keep,
  testInvestigator,
  testScenario,
  throughSetup,
} from '@lcg/engine/testing'
import { expect, it } from 'vitest'

// Grimorio: "Eliminación", "Investigador jefe"; RR: "Elimination".
const game = (players: number) => {
  const s = throughSetup(
    createGame({
      seed: 1,
      interactive: true,
      scenario: testScenario({ encounterDeck: [] }),
      investigators: ['a', 'b', 'c'].slice(0, players).map((id) => testInvestigator(id)),
    }),
  )
  return players > 1 ? choose(s, 'choice.investigator') : s
}
it.each(['DefeatInvestigator', 'Resign'] as const)(
  '%s lets the remaining players choose a new lead',
  (type) => {
    let s = during(game(3), keep, { type, investigator: 'a' } as Message)
    expect(s.pending?.question.prompt).toBe('prompt.chooseLead')
    expect(s.pending!.question.choices.map((c) => c.params?.name)).toEqual(['B', 'C'])
    s = choose(s, 'choice.investigator', { name: 'C' })
    expect(s.leadInvestigatorId).toBe('c')
    expect(s.investigators.map((i) => i.id)).toEqual(['a', 'b', 'c'])
    expect(s.investigators.find((i) => i.id === 'a')!.eliminated).toBe(true)
  },
)
it('appoints the sole survivor automatically and retains the last lead after everyone leaves', () => {
  let s = during(game(2), keep, { type: 'Resign', investigator: 'a' })
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  expect(s.leadInvestigatorId).toBe('b')
  s = during(s, keep, { type: 'Resign', investigator: 'b' })
  expect(s.outcome).toEqual({ type: 'noResolution' })
  expect(s.leadInvestigatorId).toBe('b')
})
it('does not ask for a new lead when someone else is eliminated', () => {
  const s = during(game(3), keep, { type: 'DefeatInvestigator', investigator: 'b' })
  expect(s.pending?.question.prompt).toBe('prompt.chooseAction')
  expect(s.investigators[0]!.id).toBe('a')
})
