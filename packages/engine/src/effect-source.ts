import { playerCardDef } from './content'
import type { GameState, Message } from './types'

/**
 * Preserve provenance through choices, skill-test results and scenario callbacks. The
 * optional `controller` is the investigator who controls the resolving effect ("you").
 */
export function withEffectSource<T>(value: T, source: string, controller?: string): T {
  if (Array.isArray(value)) return value.map((v) => withEffectSource(v, source, controller)) as T
  if (!value || typeof value !== 'object') return value
  const obj = value as Record<string, unknown>
  const own = typeof obj.effectSource === 'string' ? obj.effectSource : source
  const ownController = typeof obj.effectController === 'string' ? obj.effectController : controller
  // An activated ability establishes its own source when it is processed.
  if (obj.type === 'UseAbility') return { ...obj, effectSource: own } as T
  const result = Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, withEffectSource(v, own, ownController)]),
  )
  if (typeof obj.type === 'string' && /^[A-Z]/.test(obj.type)) {
    result.effectSource = own
    if (ownController !== undefined) result.effectController = ownController
  }
  return result as T
}

/**
 * Investigator controlling the effect that `m` resolves: who plays the card or uses the
 * ability. Forced abilities and reaction windows belong to their own cards, so they do not
 * inherit the controller of the event that triggered them.
 */
export function messageController(m: Message): string | undefined {
  switch (m.type) {
    case 'PlayCard':
    case 'ResolvePlayedCard':
    case 'PlayerCardEffect':
    case 'ResolvePlayerRevelation':
    case 'UseAbility':
      return m.investigator
    case 'Forced':
    case 'Reactions':
      return undefined
    default:
      return m.effectController
  }
}

export function messageSource(s: GameState, m: Message): string | undefined {
  if (m.type === 'TakeDamage' && m.source) return m.source
  if ('enemy' in m && typeof m.enemy === 'string' && m.type === 'EnemyAttack')
    return s.enemies[m.enemy]?.name ?? m.effectSource
  if (m.type === 'ResolveEncounterCard') return m.card.name
  if (
    m.type === 'PlayCard' ||
    m.type === 'ResolvePlayedCard' ||
    m.type === 'PlayerCardEffect' ||
    m.type === 'ResolvePlayerRevelation'
  )
    return playerCardDef(m.code)?.name ?? m.code
  if (m.type === 'UseAbility') {
    const card = [
      ...Object.values(s.assets),
      ...Object.values(s.treacheries),
      ...Object.values(s.enemies),
      ...Object.values(s.placedAssets ?? {}),
    ].find((c) => m.key.startsWith(`${c.id}:`))
    if (card) return playerCardDef(card.code)?.name ?? ('name' in card ? card.name : card.code)
    return (
      Object.values(s.locations).find((l) => m.key.startsWith(`${l.id}:`))?.name ?? m.effectSource
    )
  }
  if (m.type === 'BeginSkillTest' && m.kind.type === 'effect') return m.kind.source
  return m.effectSource
}
