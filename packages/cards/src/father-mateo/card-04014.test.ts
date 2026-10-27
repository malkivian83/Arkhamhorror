// RR: Weakness, Enemy, Prey, Hunter, Seal, Leaves Play.
import { dispatch } from '@lcg/engine'
import { expect, it } from 'vitest'
import { clear, makeGame, MATEO, SERPENTS_OF_YIG, withMateo } from './testing'

it('spawns engaged with Father Mateo and seals the [elder_sign] until it is defeated', () => {
  let s = withMateo(clear(makeGame(true, ['elderSign', 0, -1])), {
    hand: [],
    deck: [SERPENTS_OF_YIG, '01088'],
  })
  s = dispatch(s, { type: 'DrawCards', investigator: MATEO, amount: 1 })
  const serpents = Object.values(s.enemies).find((e) => e.code === SERPENTS_OF_YIG)!
  expect(serpents).toMatchObject({
    engagedWith: MATEO,
    keywords: ['hunter'],
    prey: { type: 'only', investigator: MATEO },
  })
  expect(s.chaosBag).not.toContain('elderSign')
  expect(s.sealed).toEqual([
    expect.objectContaining({ token: 'elderSign', holder: { type: 'enemy', id: serpents.id } }),
  ])
  s = dispatch(s, { type: 'DefeatEnemy', enemy: serpents.id, by: MATEO })
  expect(s.chaosBag).toContain('elderSign')
  expect(s.sealed ?? []).toEqual([])
})
