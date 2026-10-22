// RR: Revelation, Attachments, Investigate, Weakness, "When the game ends".
import { availableAbilities, createGame, dispatch } from '@lcg/engine'
import { choose, testInvestigator, testScenario } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { starterInvestigator } from '../core-2026/player-cards'
import { clear, jenny, JENNY, makeGame } from './testing'

const izzie = (s: ReturnType<typeof makeGame>) =>
  Object.values(s.treacheries).find((t) => t.code === '02011')
const reveal = (s: ReturnType<typeof makeGame>) =>
  dispatch(clear(s), { type: 'ResolveWeakness', investigator: JENNY, code: '02011' })
const at = (s: ReturnType<typeof makeGame>, location: string, extra: object = {}) => ({
  ...s,
  investigators: s.investigators.map((i) => ({ ...i, location, hand: [], ...extra })),
})

it('attaches to the single farthest location from Jenny', () => {
  const s = reveal(makeGame())
  expect(izzie(s)!.placement).toEqual({ type: 'location', location: 'C' })
  expect(izzie(s)!.owner).toBe(JENNY)
})

it('lets Jenny choose between locations tied for farthest', () => {
  const base = testScenario()
  let s = createGame({
    seed: 4,
    scenario: {
      ...base,
      locations: [
        { ...base.locations[0]!, connections: ['B', 'C'] },
        { ...base.locations[1]!, connections: ['A'] },
        { ...base.locations[2]!, connections: ['A'] },
      ],
    },
    investigators: [starterInvestigator('jenny')],
  })
  s = reveal(s)
  expect(s.pending!.question.choices.map((c) => c.params?.location)).toEqual(['Room B', 'Room C'])
  s = choose(s, 'choice.attachToLocation', { location: 'Room C' })
  expect(izzie(s)!.placement).toEqual({ type: 'location', location: 'C' })
})

it('offers its two-action investigation only at its location, to any investigator there', () => {
  const s = reveal(makeGame(true))
  expect(availableAbilities(s, JENNY).some((a) => a.label === 'ability.searchingForIzzie')).toBe(
    false,
  )
  const there = at(s, 'C', { actionsRemaining: 3 })
  for (const id of [JENNY, 'b'])
    expect(
      availableAbilities(there, id).find((a) => a.label === 'ability.searchingForIzzie')?.actions,
    ).toBe(2)
})

it('a success discards it instead of discovering clues; a failure keeps it', () => {
  const resolve = (intellect: number) => {
    const revealed = reveal(makeGame())
    const s = at(
      {
        ...revealed,
        locations: {
          ...revealed.locations,
          C: { ...revealed.locations.C!, revealed: true, clues: 2 },
        },
      },
      'C',
      { skills: { willpower: 3, intellect, combat: 3, agility: 3 } },
    )
    const ability = availableAbilities(s, JENNY).find(
      (a) => a.label === 'ability.searchingForIzzie',
    )!
    return dispatch(clear(s), { type: 'UseAbility', investigator: JENNY, ...ability })
  }
  const success = resolve(3)
  expect(izzie(success)).toBeUndefined()
  expect(jenny(success).discard).toContain('02011')
  expect(jenny(success).clues).toBe(0)
  expect(success.locations.C!.clues).toBe(2)
  expect(jenny(success).actionsRemaining).toBe(1)
  expect(izzie(resolve(0))).toBeDefined()
})

it('causes one mental trauma if it is still in play when the game ends', () => {
  const end = { type: 'EndScenario', outcome: { type: 'noResolution' } } as const
  const kept = dispatch(clear(reveal(makeGame())), end)
  expect(kept.campaignLog!.investigators[JENNY]!.mentalTrauma).toBe(1)
  const other = createGame({
    seed: 4,
    scenario: testScenario(),
    investigators: [testInvestigator('a'), starterInvestigator('jenny')],
  })
  const revealed = reveal(other)
  const discarded = dispatch(
    clear(revealed),
    { type: 'DiscardTreachery', treachery: izzie(revealed)!.id },
    end,
  )
  expect(discarded.campaignLog!.investigators[JENNY]?.mentalTrauma ?? 0).toBe(0)
})
