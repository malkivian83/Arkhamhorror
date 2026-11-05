// RR: Forced Abilities, Damage/Horror; provenance must survive intervening decisions.
import { expect, it } from 'vitest'
import { applyInput, createGame, dispatch, registerLocation, registerScenario } from './index'
import { testInvestigator, testScenario } from './testing'
import { withEffectSource } from './effect-source'

registerLocation({
  code: 'cause-room',
  forced: (_s, t) =>
    t.type === 'turnBegins'
      ? [
          {
            type: 'Ask',
            investigator: 'a',
            question: {
              kind: 'chooseOne',
              alwaysAsk: true,
              prompt: 'test',
              choices: [
                {
                  label: 'test',
                  then: [
                    { type: 'TakeDamage', investigator: 'a', damage: 1, horror: 1, direct: true },
                  ],
                },
              ],
            },
          },
        ]
      : [],
})
registerScenario({ id: 'cause-test' })
it('keeps the card cause after a forced choice and does not contaminate the remaining queue', () => {
  let s = createGame({
    seed: 1,
    interactive: true,
    scenario: testScenario({
      id: 'cause-test',
      locations: [
        {
          id: 'cause-room',
          name: 'Dangerous Room',
          shroud: 1,
          clueValue: 0,
          cluesPerInvestigator: false,
          connections: [],
        },
      ],
      startingLocation: 'cause-room',
    }),
    investigators: [testInvestigator('a')],
  })
  s = dispatch(
    { ...s, pending: null, queue: [] },
    { type: 'Forced', trigger: { type: 'turnBegins', investigator: 'a' } },
    { type: 'TakeDamage', investigator: 'a', damage: 0, horror: 1, direct: true },
  )
  s = JSON.parse(JSON.stringify(s))
  s = applyInput(s, { investigator: 'a', choice: 0 })
  expect(s.log.filter((e) => e.key === 'log.damage').at(-2)?.params).toMatchObject({
    source: 'Dangerous Room',
    damage: 1,
    horror: 1,
  })
  expect(s.log.findLast((e) => e.key === 'log.damage')?.params?.source).toBeUndefined()
})
it('keeps distinct sources on nested effects', () => {
  const messages = withEffectSource([{ type: 'TakeDamage', effectSource: 'Other card' }], 'Room')
  expect(messages[0]?.effectSource).toBe('Other card')
})
