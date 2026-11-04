import { assetVitals, type ChoiceTarget, type GameState } from '@lcg/engine'
import { targetKey } from '../stores/game'

/**
 * Damage and horror split in one step (doc 100, D4). The engine still asks point by point;
 * the table plans the whole split and then answers those questions in a row, so every rule
 * of the engine (trait limits, cards that must be chosen first…) keeps applying.
 */
export type DamageKind = 'damage' | 'horror'

export interface Recipient {
  key: string
  target: ChoiceTarget
  /** Card code or name, for assets; the investigator row has none. */
  card?: string
  /** How many points of each kind it can still take. */
  room: Record<DamageKind, number>
}

export interface Assignment {
  investigator: string
  damage: number
  horror: number
  recipients: Recipient[]
}

export type DamagePlan = Record<DamageKind, Record<string, number>>

const PROMPTS: Record<string, DamageKind> = {
  'prompt.assignDamage': 'damage',
  'prompt.assignHorror': 'horror',
}

/** The assignment being asked, with everything still to assign and who can take it. */
export function assignmentOf(state: GameState | null): Assignment | null {
  const pending = state?.pending
  const kind = pending && PROMPTS[pending.question.prompt]
  if (!state || !pending || !kind) return null
  const { damage, horror } = pending.question.promptParams ?? {}
  if (typeof damage !== 'number' || typeof horror !== 'number') return null
  const investigator = pending.investigator
  const total = damage + horror
  const recipients: Recipient[] = [
    {
      key: targetKey({ type: 'investigator', id: investigator }),
      target: { type: 'investigator', id: investigator },
      room: { damage: total, horror: total },
    },
  ]
  const add = (target: ChoiceTarget, card: string | undefined, room: Recipient['room']) => {
    const key = targetKey(target)
    if (!recipients.some((r) => r.key === key))
      recipients.push({ key, target, ...(card ? { card } : {}), room })
  }
  const roomOf = (id: string): Recipient['room'] => {
    const asset = state.assets[id]
    if (!asset) return { damage: 0, horror: 0 }
    const vitals = assetVitals(asset, state)
    return {
      damage: vitals.health === undefined ? 0 : Math.max(0, vitals.health - asset.damage),
      horror: vitals.sanity === undefined ? 0 : Math.max(0, vitals.sanity - asset.horror),
    }
  }
  for (const choice of pending.question.choices) {
    const target = choice.target
    if (target?.type === 'asset') add(target, state.assets[target.id]?.code, roomOf(target.id))
    // Assets placed elsewhere (story allies): only the engine knows their room.
    else if (target?.type === 'placed')
      add(target, String(choice.params?.card ?? ''), {
        damage: kind === 'damage' ? total : 0,
        horror: kind === 'horror' ? total : 0,
      })
  }
  // The kind asked later: the investigator's own assets that can still take it.
  const later: DamageKind | null = kind === 'damage' && horror > 0 ? 'horror' : null
  if (later)
    for (const asset of Object.values(state.assets))
      if (asset.owner === investigator && roomOf(asset.id)[later] > 0)
        add({ type: 'asset', id: asset.id }, asset.code, roomOf(asset.id))
  return { investigator, damage, horror, recipients }
}

/** Everything on the investigator: the starting point the player moves onto assets. */
export function emptyPlan(assignment: Assignment): DamagePlan {
  const key = assignment.recipients[0]!.key
  return { damage: { [key]: assignment.damage }, horror: { [key]: assignment.horror } }
}

/**
 * Moves one point of `kind` between the investigator and an asset (`delta` +1 onto the
 * asset, −1 back). Returns the same plan when the move is not possible.
 */
export function movePoint(
  assignment: Assignment,
  plan: DamagePlan,
  key: string,
  kind: DamageKind,
  delta: 1 | -1,
): DamagePlan {
  const self = assignment.recipients[0]!.key
  const recipient = assignment.recipients.find((r) => r.key === key)
  if (!recipient || key === self) return plan
  const on = plan[kind][key] ?? 0
  const left = plan[kind][self] ?? 0
  if (delta > 0 ? left === 0 || on >= roomFor(recipient, plan, kind) : on === 0) return plan
  return { ...plan, [kind]: { ...plan[kind], [key]: on + delta, [self]: left - delta } }
}

/**
 * The engine assigns all the damage first, point by point, and an asset that reaches its
 * health is defeated at once (doc 100, E12): it can no longer take the horror. So an asset
 * planned to be defeated by damage takes no horror, and one with horror planned keeps a
 * point of health.
 */
function roomFor(recipient: Recipient, plan: DamagePlan, kind: DamageKind): number {
  const { damage, horror } = recipient.room
  if (kind === 'horror')
    return damage > 0 && (plan.damage[recipient.key] ?? 0) >= damage ? 0 : horror
  return horror > 0 && (plan.horror[recipient.key] ?? 0) > 0 ? damage - 1 : damage
}

/**
 * Choice picker for the controller's `answerSequence`: answers each assignment question
 * of the same investigator from the plan, assets first so the investigator is hurt last,
 * and stops (null) on any other question or when the plan no longer fits the choices.
 */
export function planPicker(investigator: string, plan: DamagePlan) {
  const left: DamagePlan = { damage: { ...plan.damage }, horror: { ...plan.horror } }
  return (state: GameState): number | null => {
    const pending = state.pending
    const kind = pending && PROMPTS[pending.question.prompt]
    if (!pending || !kind || pending.investigator !== investigator) return null
    const choices = pending.question.choices.flatMap((choice, index) =>
      choice.target
        ? [{ index, key: targetKey(choice.target), self: choice.target.type === 'investigator' }]
        : [],
    )
    const next =
      choices.find((c) => !c.self && (left[kind][c.key] ?? 0) > 0) ??
      choices.find((c) => c.self && (left[kind][c.key] ?? 0) > 0)
    if (!next) return null
    left[kind][next.key]! -= 1
    return next.index
  }
}
