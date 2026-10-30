import { getInvestigator, playerCardDef, registerPlayerCard, type Message } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

// RR: Activate Action; Uses; Healing. "Heal 2 from among investigators at your location":
// the charge and action are costs; each point is assigned in turn, possibly to one investigator.
export function registerHealAmong(code: string, kind: 'damage' | 'horror'): void {
  const injured = (state: Parameters<typeof atLocation>[0], by: string) =>
    atLocation(state, by).filter((other) => other[kind] > 0)
  registerPlayerCard({
    code,
    abilities: (state, self, investigator) =>
      self.uses < 1 || injured(state, investigator).length === 0
        ? []
        : [
            {
              key: `${self.id}:heal-among`,
              label: kind === 'damage' ? 'ability.healDamageAmong' : 'ability.healHorrorAmong',
              params: { card: playerCardDef(code)!.name, n: 2 },
              actions: 1,
              provokes: true,
              costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
              then: [continuation(code, investigator, 'heal', { left: 2 })],
            },
          ],
    effect: (state, by, step, data) => {
      const left = Number(data.left ?? 0)
      if (step !== 'heal' || left < 1 || getInvestigator(state, by).location === null) return []
      return ask(
        by,
        injured(state, by).map((other) => ({
          label: kind === 'damage' ? 'choice.healDamageOf' : 'choice.healHorrorOf',
          params: { name: other.name },
          target: { type: 'investigator' as const, id: other.id },
          then: [
            {
              type: 'Heal',
              investigator: other.id,
              damage: kind === 'damage' ? 1 : 0,
              horror: kind === 'horror' ? 1 : 0,
            },
            continuation(code, by, 'heal', { left: left - 1 }),
          ] as Message[],
        })),
      )
    },
  })
}
