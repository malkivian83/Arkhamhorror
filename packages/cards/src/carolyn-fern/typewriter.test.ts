// RR: Uses (spending uses from another card "as if"), Costs, Discard when empty.
import { assetBehavior, usesLenders, type GameState, type Message } from '@lcg/engine'
import { choose, labels } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import { C, game, me, patch, put, run } from './testing'

/** Occult Records (Tome, secrets) fast heal on investigator B, as offered with lent uses. */
function occult(s: GameState): GameState {
  const option = assetBehavior(s, s.assets['60256']!)!.fastOptions!(s, s.assets['60256']!).find(
    (o) => o.params?.name === 'B',
  )
  if (!option) throw new Error('Occult Records is not available')
  const use: Message = {
    type: 'UseAbility',
    investigator: C,
    key: option.key,
    actions: 0,
    provokes: false,
    then: option.then,
  }
  return run(s, use)
}
const base = () => patch(game(true), { horror: 3 }, 'b')

describe('Typewriter', () => {
  it('lends its secrets to Tome assets you control', () => {
    const s = put(put(base(), '60256', { uses: 0 }), '60272')
    expect(usesLenders(s, s.assets['60256']!).map((a) => a.id)).toEqual(['60272'])
    const after = occult(s)
    expect(after.assets['60272']!.uses).toBe(2)
    expect(after.assets['60256']!.uses).toBe(0)
    expect(me(after, 'b').horror).toBe(1)
    // Without the Typewriter the empty Tome has no ability.
    const alone = put(base(), '60256', { uses: 0 })
    expect(
      assetBehavior(alone, alone.assets['60256']!)!.fastOptions!(alone, alone.assets['60256']!),
    ).toEqual([])
  })

  it('lets you choose which card provides each secret when both have them', () => {
    let s = put(put(base(), '60256', { uses: 1 }), '60272')
    s = occult(s)
    expect(s.pending?.question.prompt).toBe('prompt.spendUsesFrom')
    expect(labels(s)).toEqual(['choice.spendUsesFrom', 'choice.spendUsesFrom'])
    s = choose(s, 'choice.spendUsesFrom', { card: 'Typewriter' })
    expect(s.assets['60272']!.uses).toBe(2)
    expect(s.assets['60256']!.uses).toBe(1)
  })

  it('is discarded when no secrets remain on it', () => {
    let s = put(put(base(), '60256', { uses: 0 }), '60272', { uses: 1 })
    s = occult(s)
    expect(s.assets['60272']).toBeUndefined()
    expect(me(s).discard).toContain('60272')
  })

  it('does not lend to other traits, other use types or other investigators', () => {
    // Magnifying Glass is not a Tome; Typewriter of investigator B does not help Carolyn.
    const s = put(put(base(), '60256', { uses: 0 }), '60272', { owner: 'b' })
    expect(usesLenders(s, s.assets['60256']!)).toEqual([])
    const glass = put(put(base(), '60270'), '60272')
    expect(usesLenders(glass, glass.assets['60270']!)).toEqual([])
  })
})
