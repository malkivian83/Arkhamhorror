import {
  engagedEnemies,
  getInvestigator,
  registerPlayerCard,
  shroudOf,
  type Choice,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type Message,
  type PlayerCardBehavior,
  type SkillTestKind,
  type SkillType,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'
import { ask } from '../dunwich-pilot/effects'

type FightKind = Extract<SkillTestKind, { type: 'fight' }>
export type Ctx = { state: GameState; investigator: InvestigatorId; code: string }

/** An event whose effect is "Fight.", "Investigate." or "Evade.". */
export interface BasicEvent {
  action: 'fight' | 'investigate' | 'evade'
  skill?: SkillType
  modifier?: number | ((ctx: Ctx, enemy?: Enemy) => number)
  extraDamage?: number | ((ctx: Ctx, enemy: Enemy) => number)
  fight?: Partial<Omit<FightKind, 'type' | 'enemy'>>
  /** Spell, Trick…: damage sources and tests read these as traits. */
  tags?: string[]
  /** "When this action begins": resolved before the target is chosen and the test starts. */
  before?: (ctx: Ctx) => Message[]
  shroud?: number
  extraClues?: number
  replaceClue?: boolean
  difficulty?: (ctx: Ctx) => number
  onSuccess?: (ctx: Ctx, enemy?: Enemy) => Message[]
  onFail?: (ctx: Ctx, enemy?: Enemy) => Message[]
  /** Runs on success and on failure; use IfTestResult for conditions. */
  after?: (ctx: Ctx, enemy?: Enemy) => Message[]
}

const DEFAULT_SKILL = { fight: 'combat', investigate: 'intellect', evade: 'agility' } as const

/** The skill test of the event against an enemy (or at your location to investigate). */
export function basicTest(
  spec: BasicEvent,
  ctx: Ctx,
  enemy?: Enemy,
  extra: { modifier?: number; extraDamage?: number } = {},
): Message {
  const { state, investigator } = ctx
  const here = getInvestigator(state, investigator).location!
  const value =
    (typeof spec.modifier === 'function' ? spec.modifier(ctx, enemy) : (spec.modifier ?? 0)) +
    (extra.modifier ?? 0)
  const results = {
    onSuccess: [...(spec.onSuccess?.(ctx, enemy) ?? []), ...(spec.after?.(ctx, enemy) ?? [])],
    onFail: [...(spec.onFail?.(ctx, enemy) ?? []), ...(spec.after?.(ctx, enemy) ?? [])],
  }
  const skill = spec.skill ?? DEFAULT_SKILL[spec.action]
  const common = {
    type: 'BeginSkillTest' as const,
    investigator,
    skill,
    modifier: value,
    ...(spec.tags ? { tags: spec.tags } : {}),
  }
  if (spec.action === 'investigate')
    return {
      ...common,
      difficulty: spec.difficulty?.(ctx) ?? Math.max(0, shroudOf(state, here) + (spec.shroud ?? 0)),
      kind: {
        type: 'investigate',
        location: here,
        ...(spec.extraClues ? { extraClues: spec.extraClues } : {}),
        ...(spec.replaceClue ? { replaceClue: true } : {}),
        ...results,
      },
    }
  if (spec.action === 'evade')
    return {
      ...common,
      difficulty: enemy!.evade,
      kind: { type: 'evade', enemy: enemy!.id, ...results },
    }
  return {
    ...common,
    difficulty: enemy!.fight,
    kind: {
      type: 'fight',
      enemy: enemy!.id,
      extraDamage:
        (typeof spec.extraDamage === 'function'
          ? spec.extraDamage(ctx, enemy!)
          : (spec.extraDamage ?? 0)) + (extra.extraDamage ?? 0),
      ...spec.fight,
      ...results,
    },
  }
}

export const targets = (spec: BasicEvent, state: GameState, investigator: InvestigatorId) =>
  spec.action === 'evade' ? engagedEnemies(state, investigator) : attackable(state, investigator)

/** One choice per target enemy; investigations start the test directly. */
export function testChoices(
  spec: BasicEvent,
  ctx: Ctx,
  extra: { modifier?: number; extraDamage?: number } = {},
): Message[] {
  if (spec.action === 'investigate') return [basicTest(spec, ctx, undefined, extra)]
  return ask(
    ctx.investigator,
    targets(spec, ctx.state, ctx.investigator).map((enemy): Choice => ({
      label: 'choice.enemy',
      params: { enemy: enemy.name },
      target: { type: 'enemy', id: enemy.id },
      then: [basicTest(spec, ctx, enemy, extra)],
    })),
  )
}

/** Fight and evade events do not provoke attacks of opportunity; investigations do. */
export function actionFlags(spec: BasicEvent): Partial<PlayerCardBehavior> {
  return spec.action === 'investigate'
    ? { investigateAction: true }
    : spec.action === 'evade'
      ? { evadeAction: true, noAttacksOfOpportunity: true }
      : { noAttacksOfOpportunity: true }
}

export function registerBasicEvent(
  codes: string | string[],
  spec: BasicEvent,
  extra: Omit<PlayerCardBehavior, 'code'> = {},
): void {
  for (const code of [codes].flat())
    registerPlayerCard({
      code,
      ...actionFlags(spec),
      canPlay: (state, investigator) =>
        getInvestigator(state, investigator).location !== null &&
        (spec.action === 'investigate' || targets(spec, state, investigator).length > 0),
      play: (state, investigator) => {
        const ctx = { state, investigator, code }
        return [...(spec.before?.(ctx) ?? []), ...testChoices(spec, ctx)]
      },
      ...extra,
    })
}

/** "Return this card to your hand at the end of your turn." */
export const returnAtEndOfTurn = (investigator: InvestigatorId, code: string): Message => ({
  type: 'AtEndOfTurn',
  investigator,
  then: [{ type: 'DiscardToHand', investigator, code }],
})
export const skillValue = (state: GameState, investigator: InvestigatorId, skill: SkillType) =>
  getInvestigator(state, investigator).skills[skill]
export const elite = (enemy: Enemy) => (enemy.traits ?? []).includes('Elite')
