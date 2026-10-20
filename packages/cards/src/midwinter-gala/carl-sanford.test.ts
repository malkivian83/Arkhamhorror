import { applyInput, createGame, type GameState } from '@lcg/engine'
import { choose, during, testInvestigator, testScenario, throughSetup } from '@lcg/engine/testing'
import { describe, expect, it } from 'vitest'
import '../index'
import { CODES, MIDWINTER_GALA, RIVAL_TREACHERIES } from './cards'

function table(): GameState {
  let s = throughSetup(
    createGame({
      seed: 8,
      interactive: true,
      scenario: testScenario({ id: MIDWINTER_GALA }),
      investigators: [testInvestigator('a', { deck: Array(30).fill('12089') })],
    }),
  )
  if (s.pending?.question.prompt === 'prompt.chooseNextInvestigator')
    s = applyInput(s, { investigator: s.pending.investigator, choice: 0 })
  return during(
    s,
    (g) => ({
      ...g,
      investigators: g.investigators.map((i) => ({
        ...i,
        resources: 10,
        hand: ['12065'],
        horror: 0,
      })),
    }),
    { type: 'PutAssetIntoPlay', code: '71034', investigator: 'a' },
    { type: 'PutAssetIntoPlay', code: '71037', investigator: 'a' },
  )
}
function until(s: GameState, label: string): GameState {
  for (let n = 0; s.pending && n < 30; n++) {
    if (s.pending.question.choices.some((c) => c.label === label)) return s
    if (s.pending.question.prompt === 'prompt.chooseAction') break
    const skip = s.pending.question.choices.findIndex((c) => c.label === 'choice.skip')
    s = applyInput(s, { investigator: s.pending.investigator, choice: Math.max(0, skip) })
  }
  throw new Error(`Missing reaction ${label}`)
}

describe('71034: Carl Sanford, RR "Cancel", "Revelation", "Surge", "Victory Display"', () => {
  it('Miranda, Prudence y Raymond entran con sus usos impresos', () => {
    const s = during(
      table(),
      (g) => g,
      { type: 'PutAssetIntoPlay', code: '71029', investigator: 'a' },
      { type: 'PutAssetIntoPlay', code: '71035', investigator: 'a' },
    )
    for (const [code, uses] of [
      ['71029', 3],
      ['71035', 3],
      ['71037', 4],
    ] as const)
      expect(Object.values(s.assets).find((a) => a.code === code)!.uses).toBe(uses)
  })
  it.each([0, 1, 3])(
    'hechizar, volver boca arriba y negociar conserva %i usos y las demás fichas',
    (uses) => {
      let s = during(table(), (g) => g, {
        type: 'PutAssetIntoPlay',
        code: '71035',
        investigator: 'a',
        tokens: { uses, damage: 1, horror: 1, doom: 1 },
      })
      const prudence = Object.values(s.assets).find((a) => a.code === '71035')!
      s = during(s, (g) => g, { type: 'DiscardAsset', asset: prudence.id })
      let placed = Object.values(s.placedAssets!).find((p) => p.code === '71035')!
      expect(placed).toMatchObject({ uses, damage: 0, horror: 0, doom: 1, faceDown: true })
      s = during(s, (g) => g, { type: 'FlipPlacedAsset', placed: placed.id })
      placed = Object.values(s.placedAssets!).find((p) => p.code === '71035')!
      expect(placed).toMatchObject({ uses, exhausted: false })
      expect(placed.faceDown).not.toBe(true)
      s = during(s, (g) => g, { type: 'TakeControlOfPlaced', placed: placed.id, investigator: 'a' })
      expect(Object.values(s.assets).find((a) => a.code === '71035')).toMatchObject({
        uses,
        doom: 1,
      })
    },
  )
  it.each(['Raymond', 'Ward'])(
    'la cancelación mediante %s permite reclamar una sola copia y conserva Oleada',
    (source) => {
      let s = during(
        table(),
        (g) => ({
          ...g,
          encounterDeck: [
            RIVAL_TREACHERIES[CODES.coldStreak]!,
            {
              kind: 'enemy',
              code: '71053',
              name: 'Lantern Club Member',
              fight: 3,
              health: 2,
              evade: 2,
              damage: 0,
              horror: 1,
              keywords: [],
            },
          ],
        }),
        { type: 'DrawEncounterCard', investigator: 'a' },
      )
      const before = s.investigators[0]!
      if (source === 'Raymond') s = choose(until(s, 'ability.gala.raymond'), 'ability.gala.raymond')
      else s = choose(s, 'ability.playCard', { card: 'Ward of Protection' })
      s = until(s, 'ability.gala.carl')
      expect(s.encounterDiscard.filter((c) => c.code === '71032')).toHaveLength(1)
      expect(s.victoryDisplay).not.toContain('71032')
      s = choose(s, 'ability.gala.carl')
      s = until(s, 'action.endTurn')
      expect(s.victoryDisplay.filter((code) => code === '71032')).toHaveLength(1)
      expect(s.encounterDiscard.some((c) => c.code === '71032')).toBe(false)
      expect(Object.values(s.treacheries).some((t) => t.code === '71032')).toBe(false)
      expect(Object.values(s.enemies).some((e) => e.code === '71053')).toBe(true)
      expect(Object.values(s.assets).find((a) => a.code === '71034')!.exhausted).toBe(true)
      expect(s.investigators[0]!.hand.length).toBe(before.hand.length + (source === 'Ward' ? 0 : 1))
      expect(s.investigators[0]!.resources).toBe(before.resources - (source === 'Ward' ? 1 : 0))
    },
  )
  it('rechazar a Carl conserva la Traición en descartes y no roba carta', () => {
    let s = during(table(), (g) => g, {
      type: 'ResolveEncounterCard',
      investigator: 'a',
      card: { kind: 'treachery', code: '71054', name: 'Bleeding Walls', keywords: [] },
    })
    s = until(choose(until(s, 'ability.gala.raymond'), 'ability.gala.raymond'), 'ability.gala.carl')
    const hand = s.investigators[0]!.hand
    s = until(choose(s, 'choice.skip'), 'action.endTurn')
    expect(s.encounterDiscard.map((c) => c.code)).toContain('71054')
    expect(s.victoryDisplay).not.toContain('71054')
    expect(s.investigators[0]!.hand).toEqual(hand)
  })
})
