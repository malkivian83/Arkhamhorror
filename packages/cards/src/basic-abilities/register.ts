import {
  enemiesAt,
  engagedEnemies,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type AbilityOption,
  type Asset,
  type ChaosToken,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type Message,
  type PlayerCardBehavior,
  type SkillTestKind,
  type SkillType,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'

type FightKind = Extract<SkillTestKind, { type: 'fight' }>
type Ctx = { state: GameState; self: Asset; investigator: InvestigatorId }

/** "[action] <cost>: Fight/Investigate/Evade." printed on an asset. */
export interface BasicAbility {
  action: 'fight' | 'investigate' | 'evade'
  /** Skills that may be used; the first one is the default for the action. */
  skills?: SkillType[]
  modifier?: number | ((ctx: Ctx, enemy?: Enemy) => number)
  /** Costs paid before the test: spend 1 use, exhaust the asset or discard it. */
  cost?: ('use' | 'exhaust' | 'discard')[]
  /** Additional costs (e.g. resources) built for this activation. */
  extraCosts?: (ctx: Ctx) => Message[]
  /** 0 for a [fast] ability. */
  actions?: number
  key?: string
  available?: (ctx: Ctx) => boolean
  // Fight
  extraDamage?: number | ((ctx: Ctx, enemy: Enemy) => number)
  fight?: Partial<Omit<FightKind, 'type' | 'enemy'>>
  ignoreAloof?: boolean
  // Investigate
  shroud?: number | ((ctx: Ctx) => number)
  extraClues?: number
  replaceClue?: boolean
  // Results; `after` runs on success and on failure (use IfTestResult for conditions).
  onSuccess?: (ctx: Ctx, enemy?: Enemy) => Message[]
  onFail?: (ctx: Ctx, enemy?: Enemy) => Message[]
  after?: (ctx: Ctx, enemy?: Enemy) => Message[]
}

const DEFAULT_SKILL = { fight: 'combat', investigate: 'intellect', evade: 'agility' } as const

const costs = (ability: BasicAbility, ctx: Ctx): Message[] => [
  ...(ability.cost ?? []).map((c): Message =>
    c === 'use'
      ? { type: 'SpendUses', asset: ctx.self.id, amount: 1 }
      : c === 'exhaust'
        ? { type: 'ExhaustAsset', asset: ctx.self.id }
        : { type: 'DiscardAsset', asset: ctx.self.id },
  ),
  ...(ability.extraCosts?.(ctx) ?? []),
]

function usable(ability: BasicAbility, ctx: Ctx): boolean {
  if ((ability.cost ?? []).includes('use') && ctx.self.uses < 1) return false
  if ((ability.cost ?? []).includes('exhaust') && ctx.self.exhausted) return false
  return ability.available?.(ctx) ?? true
}

function options(code: string, ability: BasicAbility, ctx: Ctx): AbilityOption[] {
  if (!usable(ability, ctx)) return []
  const { state, self, investigator } = ctx
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const card = playerCardDef(code)!.name
  const skills = ability.skills ?? [DEFAULT_SKILL[ability.action]]
  const value = (enemy?: Enemy) =>
    typeof ability.modifier === 'function' ? ability.modifier(ctx, enemy) : (ability.modifier ?? 0)
  const results = (enemy?: Enemy) => ({
    onSuccess: [...(ability.onSuccess?.(ctx, enemy) ?? []), ...(ability.after?.(ctx, enemy) ?? [])],
    onFail: [...(ability.onFail?.(ctx, enemy) ?? []), ...(ability.after?.(ctx, enemy) ?? [])],
  })
  const base = {
    actions: ability.actions ?? 1,
    costs: costs(ability, ctx),
  }
  if (ability.action === 'investigate') {
    const shroud =
      typeof ability.shroud === 'function' ? ability.shroud(ctx) : (ability.shroud ?? 0)
    return skills.map((skill) => ({
      ...base,
      key: `${self.id}:investigate:${skill}${ability.key ?? ''}`,
      label: 'ability.investigateWith',
      params: { card, skill },
      target: { type: 'location', id: here },
      provokes: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: Math.max(0, shroudOf(state, here) + shroud),
          modifier: value(),
          source: self.id,
          kind: {
            type: 'investigate',
            location: here,
            ...(ability.extraClues ? { extraClues: ability.extraClues } : {}),
            ...(ability.replaceClue ? { replaceClue: true } : {}),
            ...results(),
          },
        },
      ],
    }))
  }
  const enemies =
    ability.action === 'evade'
      ? engagedEnemies(state, investigator)
      : ability.ignoreAloof
        ? enemiesAt(state, here)
        : attackable(state, investigator)
  return enemies.flatMap((enemy) =>
    skills.map((skill): AbilityOption => ({
      ...base,
      key: `${self.id}:${ability.action}:${skill}${ability.key ?? ''}`,
      label:
        ability.action === 'evade'
          ? 'ability.evadeWith'
          : skills.length > 1 || skill !== 'combat'
            ? 'ability.fightWithSkill'
            : 'ability.fightWith',
      params: { card, enemy: enemy.name, skill },
      target: { type: 'enemy', id: enemy.id },
      provokes: false,
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: ability.action === 'evade' ? enemy.evade : enemy.fight,
          modifier: value(enemy),
          source: self.id,
          kind:
            ability.action === 'evade'
              ? { type: 'evade', enemy: enemy.id, ...results(enemy) }
              : {
                  type: 'fight',
                  enemy: enemy.id,
                  extraDamage:
                    typeof ability.extraDamage === 'function'
                      ? ability.extraDamage(ctx, enemy)
                      : (ability.extraDamage ?? 0),
                  ...ability.fight,
                  ...results(enemy),
                },
        },
      ],
    })),
  )
}

/** Registers an asset whose abilities are basic actions, plus any other behavior. */
export function registerBasicAsset(
  codes: string | string[],
  abilities: BasicAbility[],
  extra: (code: string) => Omit<PlayerCardBehavior, 'code'> = () => ({}),
  more: (code: string, ctx: Ctx) => AbilityOption[] = () => [],
): void {
  for (const code of [codes].flat()) {
    registerPlayerCard({
      code,
      ...extra(code),
      abilities: (state, self, investigator) => {
        const ctx = { state, self, investigator }
        return [...abilities.flatMap((a) => options(code, a, ctx)), ...more(code, ctx)]
      },
    })
  }
}

export const horror = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: 0,
  horror: amount,
})
export const damage = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror: 0,
})
/** "If a <token> is revealed during this test": checked while the test resolves. */
export const ifTokens = (tokens: ChaosToken[], then: Message[]): Message => ({
  type: 'IfTestResult',
  tokens,
  then,
})
export const SYMBOLS: ChaosToken[] = ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail']
export const GOOD_TOKENS: ChaosToken[] = ['elderSign', 1, 0]
