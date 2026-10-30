import {
  allPlayerCardDefs,
  availableAbilities,
  playerCardBehavior,
  type Asset,
  type GameState,
  type Trigger,
} from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import '../index'
import { boss, emit, game } from './testing'
import { specific } from './helpers'

function attacks(value: unknown, enemy: string): boolean {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>,
    kind = v.kind as { type?: string; enemy?: string } | undefined
  if (v.type === 'BeginSkillTest' && kind?.type === 'fight' && kind.enemy === enemy) return true
  return Object.values(v).some((x) =>
    Array.isArray(x) ? x.some((y) => attacks(y, enemy)) : attacks(x, enemy),
  )
}

// Cnidathqua, RR "As If": its fight permission also applies to card fight abilities.
describe('Permiso remoto en los registros de cartas', () => {
  it('conserva los ataques explícitos de apoyos y eventos que ya podían elegir al mismo jefe situado físicamente aquí', () => {
    const base = emit(game(), specific('carnevaleBoss')),
      e = boss(base)
    const missed: string[] = []
    let checked = 0
    for (const def of allPlayerCardDefs().filter((d) => d.type === 'asset' || d.type === 'event')) {
      const behavior = playerCardBehavior(def.code)
      if (!behavior) continue
      const asset: Asset = {
        id: 'remote-audit',
        code: def.code,
        owner: 'a',
        uses: 20,
        exhausted: false,
        damage: 0,
        horror: 0,
        noSlot: true,
      }
      const remote: GameState = {
        ...base,
        assets: def.type === 'asset' ? { [asset.id]: asset } : {},
        investigators: base.investigators.map((i) => ({
          ...i,
          resources: 50,
          clues: 10,
          hand: [def.code],
        })),
      }
      const local: GameState = {
        ...remote,
        enemies: {
          ...remote.enemies,
          [e.id]: { ...e, global: false, location: remote.investigators[0]!.location! },
        },
      }
      const options = (s: GameState) =>
        def.type === 'asset'
          ? availableAbilities(s, 'a')
          : behavior.canPlay?.(s, 'a') === false
            ? []
            : behavior.play?.(s, 'a')
      if (attacks(options(local), e.id)) {
        checked++
        if (!attacks(options(remote), e.id)) missed.push(`${def.code}: ${def.name}`)
      }
      for (const type of ['whenEnemyAttacks', 'afterEnemyAttack'] as const) {
        const trigger: Trigger = { type, enemy: e.id, investigator: 'a' }
        const reactions = (s: GameState) =>
          def.type === 'asset'
            ? behavior.reactions?.(s, trigger, asset)
            : behavior.handReactions?.(s, trigger, 'a')
        if (attacks(reactions(local), e.id) && !attacks(reactions(remote), e.id))
          missed.push(`${def.code}: ${def.name} (${type})`)
      }
    }
    expect(checked).toBeGreaterThan(10)
    expect(missed).toEqual([])
  })
  it('permite elegir al jefe como segundo objetivo de One-Two Punch aunque el primer enemigo fuera otro', () => {
    const s = emit(game(), specific('carnevaleBoss')),
      e = boss(s)
    expect(
      attacks(
        playerCardBehavior('60132')!.effect!(s, 'a', 'again', { first: 'another-enemy' }),
        e.id,
      ),
    ).toBe(true)
  })
})
