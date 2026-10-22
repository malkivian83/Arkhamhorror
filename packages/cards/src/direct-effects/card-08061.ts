import { assetSlots, getInvestigator, registerPlayerCard, type GameState } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
// Meditative Trance: for each of your filled arcane slots, heal 1 damage or 1 horror.
const filled = (s: GameState, by: string) =>
  Object.values(s.assets)
    .filter((a) => a.owner === by && !a.noSlot)
    .flatMap(assetSlots)
    .filter((slot) => slot === 'arcane').length
registerPlayerCard({
  code: '08061',
  canPlay: (s, by) => {
    const me = getInvestigator(s, by)
    return filled(s, by) > 0 && me.damage + me.horror > 0
  },
  play: (s, by) => [continuation('08061', by, 'heal', { remaining: filled(s, by) })],
  effect: (s, by, _step, data) => {
    const remaining = Number(data.remaining)
    const me = getInvestigator(s, by)
    if (remaining <= 0) return []
    const next = continuation('08061', by, 'heal', { remaining: remaining - 1 })
    return ask(by, [
      ...(me.damage > 0
        ? [
            {
              label: 'choice.healDamage',
              then: [{ type: 'Heal' as const, investigator: by, damage: 1, horror: 0 }, next],
            },
          ]
        : []),
      ...(me.horror > 0
        ? [
            {
              label: 'choice.healHorror',
              then: [{ type: 'Heal' as const, investigator: by, damage: 0, horror: 1 }, next],
            },
          ]
        : []),
    ])
  },
})
