import {
  engagedEnemies,
  getInvestigator,
  investigatorsAt,
  playerCardDef,
  registerPlayerCard,
  type AbilityOption,
  type Asset,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'

// RR: Researched, Uses, Activate Action, Base Value. Strange Solution (4) is only bought as an
// upgrade after "you have identified the solution"; each version spends 1 supply as a cost.
type Variant = 'heal' | 'fight' | 'evade' | 'supply'
const name = (a: Asset) => playerCardDef(a.code)!.name
const spend = (a: Asset): Message => ({ type: 'SpendUses', asset: a.id, amount: 1 })
const test = (
  a: Asset,
  by: InvestigatorId,
  skill: 'combat' | 'agility',
  difficulty: number,
  kind: Extract<Message, { type: 'BeginSkillTest' }>['kind'],
): Message => ({
  type: 'BeginSkillTest',
  investigator: by,
  source: a.id,
  skill,
  baseSkill: 6,
  difficulty,
  kind,
})

function options(s: GameState, a: Asset, by: InvestigatorId, variant: Variant): AbilityOption[] {
  const here = getInvestigator(s, by).location
  if (a.uses < 1 || here === null || (variant === 'supply' && a.exhausted)) return []
  if (variant === 'fight')
    return attackable(s, by).map((e) => ({
      key: a.id + ':fight',
      label: 'ability.fightWith',
      params: { card: name(a), enemy: e.name },
      target: { type: 'enemy', id: e.id },
      actions: 1,
      provokes: false,
      costs: [spend(a)],
      then: [test(a, by, 'combat', e.fight, { type: 'fight', enemy: e.id, extraDamage: 2 })],
    }))
  if (variant === 'evade')
    return engagedEnemies(s, by).map((e) => ({
      key: a.id + ':evade',
      label: 'ability.evadeWith',
      params: { card: name(a), enemy: e.name, skill: 'agility' },
      target: { type: 'enemy', id: e.id },
      actions: 1,
      provokes: false,
      costs: [spend(a)],
      then: [test(a, by, 'agility', e.evade, { type: 'evade', enemy: e.id })],
    }))
  return investigatorsAt(s, here)
    .filter((i) => variant === 'supply' || i.damage > 0)
    .map((i) => ({
      key: a.id + ':' + variant + ':' + i.id,
      label: variant === 'heal' ? 'ability.upgradedHealDamage' : 'ability.upgradedSolutionSupply',
      params: { card: name(a), name: i.name, n: 2 },
      target: { type: 'investigator', id: i.id },
      actions: 1,
      provokes: true,
      costs: variant === 'heal' ? [spend(a)] : [spend(a), { type: 'ExhaustAsset', asset: a.id }],
      then:
        variant === 'heal'
          ? [{ type: 'Heal', investigator: i.id, damage: 2, horror: 0 }]
          : [
              { type: 'GainResources', investigator: i.id, amount: 2 },
              { type: 'DrawCards', investigator: i.id, amount: 1 },
            ],
    }))
}

export function registerStrangeSolution(code: string, variant: Variant): void {
  registerPlayerCard({
    code,
    requiredResearch: 'identifiedSolution',
    abilities: (s, a, by) => options(s, a, by, variant),
  })
}
