import { playerCardBehavior, registerTreachery } from '@lcg/engine'
import { choose, during, ghoul } from '@lcg/engine/testing'
import { expect, it } from 'vitest'
import { game, patch } from '../dunwich-pilot/testing'
import './index'

registerTreachery({
  code: 'sequence-move',
  revelation: (_s, by, t) => [
    {
      type: 'BeginSkillTest',
      investigator: by,
      skill: 'willpower',
      difficulty: 1,
      kind: {
        type: 'effect',
        source: t.id,
        onSuccess: [{ type: 'MoveTo', investigator: by, location: 'B' }],
        onFail: [],
        onFailEach: [],
      },
    },
  ],
})
const encounter = {
  kind: 'treachery' as const,
  code: 'sequence-move',
  name: 'Moving encounter',
  keywords: [],
}
const open = () =>
  during({ ...game(), interactive: true, encounterDeck: [encounter] }, patch({ hand: ['01064'] }))
// RR: Then, Draw Encounter Cards, Skill Tests. The encounter completes before discovery.
it('resolves the encounter test and movement before discovering at the new location', () => {
  let s = choose(open(), 'action.play', { card: 'Drawn to the Flame' })
  expect(s.skillTest).not.toBeNull()
  expect(s.investigators[0]!.clues).toBe(0)
  s = choose(s, 'choice.revealToken')
  s = choose(s, 'choice.applyResults')
  expect(s.skillTest).toBeNull()
  expect(s.investigators[0]!.location).toBe('B')
  expect(s.investigators[0]!.clues).toBe(1)
  expect(s.locations.A!.clues).toBe(2)
})
it('reshuffles the encounter discard and still resolves the drawn enemy first', () => {
  const s = choose(
    during({ ...game(), encounterDeck: [], encounterDiscard: [ghoul] }, patch({ hand: ['01064'] })),
    'action.play',
    { card: 'Drawn to the Flame' },
  )
  expect(Object.values(s.enemies)).toHaveLength(1)
  expect(s.investigators[0]!.clues).toBe(2)
})
it('does not discover if no encounter card can be drawn or the investigator is eliminated', () => {
  const s = { ...game(), encounterDeck: [], encounterDiscard: [] }
  expect(playerCardBehavior('01064')!.canPlay!(s, 'a')).toBe(false)
  expect(playerCardBehavior('01064')!.play!(s, 'a')).toEqual([])
  expect(
    playerCardBehavior('01064')!.effect!(patch({ eliminated: true })(s), 'a', 'clues', {}),
  ).toEqual([])
})
