import { playerCardBehavior, playerCardDef } from './content'
import type {
  Asset,
  Choice,
  GameState,
  InvestigatorId,
  Message,
  SkillTest,
  SlotType,
} from './types'

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
  const host = attacking(state, test)
  return (
    upgradeSum(host, (c) => playerCardBehavior(c)?.attachedAttackSkill) +
    (host?.nextFightBonus ?? 0)
  )
}

// The bonus needs a successful attack on a Monster; redirected fail damage gets none.
export function attachedAttackDamageBonus(state: GameState, test: SkillTest): number {
  if (test.kind.type !== 'fight' || !test.succeeded) return 0
  const enemy = state.enemies[test.kind.enemy]
  if (!enemy?.traits?.includes('Monster')) return 0
  return upgradeSum(attacking(state, test), (c) => playerCardBehavior(c)?.attachedMonsterDamage)
}

/** Tinker: hand slots are reduced first, then accessory slots. */
export function assetSlots(asset: Asset): SlotType[] {
  const slots = [...(playerCardDef(asset.code)?.slots ?? [])]
  let reduce = upgradeSum(asset, (c) => playerCardBehavior(c)?.attachedSlotReduction)
  for (const type of ['hand', 'accessory'] as const) {
    while (reduce > 0 && slots.includes(type)) {
      slots.splice(slots.lastIndexOf(type), 1)
      reduce--
    }
  }
  return slots
}

const discarded = (before: GameState, after: GameState, asset: Asset) => {
  const owner = asset.originalOwner ?? asset.owner
  const pile = (s: GameState) =>
    s.investigators.find((i) => i.id === owner)?.discard.filter((c) => c === asset.code).length ?? 0
  return pile(after) > pile(before)
}

// Optional reactions of attachments, asked right after the message that caused them.
function reaction(investigator: InvestigatorId, choice: Choice): Message {
  return {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.reaction',
      alwaysAsk: true,
      choices: [choice, { label: 'choice.skip', then: [] }],
    },
  }
}

const active = (state: GameState, id: InvestigatorId) =>
  state.investigators.some((i) => i.id === id && !i.eliminated)

// RR: Leaves Play. Covers discard, return to hand, elimination and scenario effects.
export function discardOrphanedUpgrades(before: GameState, after: GameState): GameState {
  let next = after
  const asks: Message[] = []
  for (const asset of Object.values(before.assets)) {
    const current = after.assets[asset.id]
    if (current) {
      // RR: Reactions. "After attached asset exhausts" (Fine Tuning).
      if (asset.exhausted || !current.exhausted) continue
      ;(current.upgrades ?? []).forEach((upgrade, index) => {
        const choice = playerCardBehavior(upgrade.code)?.afterHostExhausted?.(after, current, index)
        if (choice && !upgrade.exhausted && active(after, upgrade.owner))
          asks.push(reaction(upgrade.owner, choice))
      })
      continue
    }
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
    // Leaves-play reactions see the attachments as they were (Well-Maintained).
    if (!discarded(before, after, asset)) continue
    for (const upgrade of asset.upgrades ?? []) {
      const choice = playerCardBehavior(upgrade.code)?.afterHostDiscarded?.(after, asset, upgrade)
      if (choice && active(after, upgrade.owner)) asks.push(reaction(upgrade.owner, choice))
    }
  }
  return asks.length ? { ...next, queue: [...asks, ...next.queue] } : next
}
