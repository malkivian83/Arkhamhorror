import { playerCardBehavior, playerCardDef } from './content'
import type { Asset, GameState, SkillTest } from './types'

// RR: Attach To, Modifiers. A dash cannot gain a health/sanity value.
export function assetVitals(asset: Asset): { health?: number; sanity?: number } {
  const def = playerCardDef(asset.code)
  const bonus = (stat: 'health' | 'sanity') =>
    (asset.upgrades ?? []).reduce(
      (n, u) => n + (playerCardBehavior(u.code)?.attachedVitals?.[stat] ?? 0),
      0,
    )
  return {
    ...(def?.health !== undefined ? { health: Math.max(0, def.health + bonus('health')) } : {}),
    ...(def?.sanity !== undefined ? { sanity: Math.max(0, def.sanity + bonus('sanity')) } : {}),
  }
}

export function resolvingSkillBonus(state: GameState, investigator: string): number {
  // Multiple active abilities on the same asset do not multiply a constant effect.
  return [...new Set(state.resolvingAssets ?? [])].reduce((sum, id) => {
    const asset = state.assets[id]
    if (!asset || asset.owner !== investigator) return sum
    return (
      sum +
      (asset.upgrades ?? []).reduce(
        (n, u) => n + (playerCardBehavior(u.code)?.attachedResolvingSkills ?? 0),
        0,
      )
    )
  }, 0)
}

function attacking(state: GameState, test: SkillTest): Asset | undefined {
  const asset = test.kind.type === 'fight' && test.source ? state.assets[test.source] : undefined
  return asset?.owner === test.investigator ? asset : undefined
}

const upgradeSum = (asset: Asset | undefined, value: (code: string) => number | undefined) =>
  (asset?.upgrades ?? []).reduce((n, u) => n + (value(u.code) ?? 0), 0)

// RR: Fight. Applies while attacking with the host asset, not to other attacks.
export function attachedAttackSkillBonus(state: GameState, test: SkillTest): number {
  return upgradeSum(attacking(state, test), (c) => playerCardBehavior(c)?.attachedAttackSkill)
}

// The bonus needs a successful attack on a Monster; redirected fail damage gets none.
export function attachedAttackDamageBonus(state: GameState, test: SkillTest): number {
  if (test.kind.type !== 'fight' || !test.succeeded) return 0
  const enemy = state.enemies[test.kind.enemy]
  if (!enemy?.traits?.includes('Monster')) return 0
  return upgradeSum(attacking(state, test), (c) => playerCardBehavior(c)?.attachedMonsterDamage)
}

// RR: Leaves Play. Covers discard, return to hand, elimination and scenario effects.
export function discardOrphanedUpgrades(before: GameState, after: GameState): GameState {
  let next = after
  for (const asset of Object.values(before.assets)) {
    if (after.assets[asset.id]) continue
    for (const upgrade of asset.upgrades ?? []) {
      next = {
        ...next,
        investigators: next.investigators.map((i) =>
          i.id === upgrade.owner && !i.eliminated
            ? { ...i, discard: [...i.discard, upgrade.code] }
            : i,
        ),
      }
    }
  }
  return next
}
