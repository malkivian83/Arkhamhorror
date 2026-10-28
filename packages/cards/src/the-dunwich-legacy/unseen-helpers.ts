import { playerCardDef, type GameState, type Message, type Enemy } from '@lcg/engine'
import { U } from './unseen-codes'
import { UNSEEN_WEAKNESS_POOL } from './unseen-weakness-pool'
export const unseenSpecific = (
  key: string,
  data: Record<string, string | number | boolean> = {},
): Message => ({ type: 'ScenarioSpecific', key, data })
export const broods = (s: GameState) => Object.values(s.enemies).filter((e) => e.code === U.brood)
export const unseenEnemyChoice = (s: GameState, e: Enemy) => ({
  label: 'choice.unseen.enemy',
  params: {
    enemy: e.name,
    location: s.locations[e.location]?.name ?? e.location,
    clues: e.clues ?? 0,
    damage: e.damageTaken,
  },
  target: { type: 'enemy' as const, id: e.id },
})
/** FAQ 2.5, p.16: use the remaining copies, including weaknesses already gained in campaign. */
export function unseenWeaknessPool(s: GameState): string[] {
  const reserved: Record<string, string> = { '04039': '04038', '53014': '53013', '53015': '53013' }
  const pool: string[] = []
  for (const entry of UNSEEN_WEAKNESS_POOL) {
    const code = entry.codes.find((c) => playerCardDef(c)?.weakness === 'basicweakness')
    if (!code) continue
    const matches = (c: string) => (entry.codes as readonly string[]).includes(reserved[c] ?? c)
    let used = 0
    for (const id of new Set([
      ...s.investigators.map((i) => i.id),
      ...Object.keys(s.campaignLog?.investigators ?? {}),
    ])) {
      const actor = s.investigators.find((i) => i.id === id)
      const physical = actor
        ? [
            ...actor.deck,
            ...actor.hand,
            ...actor.discard,
            ...Object.values(s.assets)
              .filter((a) => (a.originalOwner ?? a.owner) === id)
              .map((a) => a.code),
            ...Object.values(s.treacheries)
              .filter((t) => t.owner === id)
              .map((t) => t.code),
          ].filter(matches).length
        : 0
      const recorded = (s.campaignLog?.investigators[id]?.storyAssets ?? []).filter(matches).length
      used += Math.max(physical, recorded)
    }
    for (let n = used; n < entry.copies; n++) pool.push(code)
  }
  return pool
}
