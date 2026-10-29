// RR: Activate, Exhaust, Search, Draw.
import { expect, it } from 'vitest'
import { playerCardBehavior } from '@lcg/engine'
import { makeGame } from './testing'
it('exhausts to let a nearby investigator search and draw from the top three', () => {
  const s = makeGame(),
    i = s.investigators[0]!,
    b = playerCardBehavior('01031')!
  const a = {
    id: 'book',
    code: '01031',
    owner: i.id,
    exhausted: false,
    uses: 0,
    damage: 0,
    horror: 0,
  }
  const option = b.abilities!(s, a, i.id)[0]!
  expect(option).toMatchObject({
    actions: 1,
    provokes: true,
    costs: [{ type: 'ExhaustAsset', asset: 'book' }],
  })
  expect(option.then[0]).toMatchObject({
    type: 'Ask',
    question: {
      choices: [
        {
          then: [
            {
              type: 'SearchDeck',
              investigator: i.id,
              top: 3,
              drawFound: true,
              includeWeaknesses: true,
            },
          ],
        },
      ],
    },
  })
  expect(b.abilities!(s, { ...a, exhausted: true }, i.id)).toEqual([])
})
