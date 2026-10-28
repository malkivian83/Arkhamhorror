import {
  canPlayByEffect,
  canAffordEntry,
  enemiesAt,
  getInvestigator,
  getLocation,
  investigationBlocked,
  leavingBlocked,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type AbilityOption,
  type Asset,
  type Choice,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { ask, attackable, cardName, continuation } from '../dunwich-pilot/effects'
import { alterFateTargets } from '../grouped-import/alter-fate'

const CODE = '09119'
const forms = [
  'railshooter',
  'telescanner',
  'translocator',
  'realitycollapser',
  'matterweaver',
] as const
const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
const unlocked = (a: Asset) => forms.filter((f) => (a.customization?.[f] ?? 0) >= 2)
const next = (by: string, step: string, data: Record<string, string | number | boolean> = {}) =>
  continuation(CODE, by, step, data)
const chooseSkill = (by: string, data: Record<string, string | number | boolean>) =>
  ask(
    by,
    skills.map((skill) => ({
      label: `skill.${skill}`,
      then: [next(by, 'test', { ...data, skill })],
    })),
    true,
  )

function moves(s: GameState, by: string): Choice[] {
  const here = getInvestigator(s, by).location
  if (!here) return []
  const adjacent = getLocation(s, here).connections.filter((to) => !!s.locations[to])
  const choices: Choice[] = []
  for (const [from, to] of adjacent.flatMap(
    (to) =>
      [
        [here, to],
        [to, here],
      ] as [string, string][],
  )) {
    if (leavingBlocked(s, from)) continue
    for (const i of s.investigators.filter((i) => !i.eliminated && i.location === from)) {
      if (!canAffordEntry(s, to)) continue
      choices.push({
        label: 'choice.pilotMove',
        params: { name: i.name, location: getLocation(s, to).name },
        then: [{ type: 'MoveTo', investigator: i.id, location: to }],
      })
    }
    for (const e of enemiesAt(s, from).filter((e) => !e.traits?.includes('Elite')))
      choices.push({
        label: 'choice.shotcasterMoveEnemy',
        params: { enemy: e.name, location: getLocation(s, to).name },
        then: [{ type: 'MoveEnemy', enemy: e.id, location: to }],
      })
  }
  return choices
}

// RR: Customizable, Uses, Action Designators. FAQ: Telescanner replaces only the basic clue;
// Deduction still discovers additional clues at the investigated location.
registerPlayerCard({
  code: CODE,
  discardWhenEmpty: true,
  initialUses: (s, by) =>
    (getInvestigator(s, by).customizations?.[CODE]?.aethericLink ?? 0) >= 4 ? 6 : 4,
  forced: (_s, t, self) =>
    t.type === 'afterAssetEntersPlay' && t.asset === self.id
      ? ask(
          self.owner,
          unlocked(self).map((form) => ({
            label: `customization.${form}`,
            then: [{ type: 'SetAssetForm', asset: self.id, form }],
          })),
          true,
        )
      : [],
  abilities: (s, self, by) => {
    if (self.owner !== by) return []
    const result: AbilityOption[] = []
    const other = unlocked(self).filter((f) => f !== self.form)
    if (!self.exhausted && other.length)
      result.push({
        key: self.id + ':form',
        label: 'ability.shotcasterForm',
        actions: 0,
        provokes: false,
        costs: [{ type: 'ExhaustAsset', asset: self.id }],
        then: ask(
          by,
          other.map((form) => ({
            label: `customization.${form}`,
            then: [{ type: 'SetAssetForm', asset: self.id, form }],
          })),
          true,
        ),
      })
    if (self.uses < 1 || !unlocked(self).includes(self.form as (typeof forms)[number]))
      return result
    const data = {
      asset: self.id,
      form: self.form!,
      bonus: (self.customization?.empoweredConfiguration ?? 0) >= 4 ? 2 : 0,
    }
    const here = getInvestigator(s, by).location
    if (!here) return result
    let choices: Choice[] = []
    if (self.form === 'railshooter' || self.form === 'translocator') {
      const enemies =
        self.form === 'railshooter'
          ? attackable(s, by)
          : enemiesAt(s, here).filter((e) => e.engagedWith === by)
      choices = enemies.map((e) => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: chooseSkill(by, { ...data, enemy: e.id }),
      }))
    } else if (self.form === 'matterweaver') {
      choices = [...new Set(getInvestigator(s, by).hand)]
        .filter(
          (code) =>
            playerCardDef(code)?.type === 'asset' && canPlayByEffect(s, by, code, 'hand', true),
        )
        .map((code) => ({
          label: 'choice.card',
          params: { card: cardName(code) },
          then: chooseSkill(by, { ...data, card: code }),
        }))
    } else if (
      (self.form === 'telescanner' && !investigationBlocked(s, by)) ||
      (self.form === 'realitycollapser' && alterFateTargets(s).length)
    ) {
      choices = skills.map((skill) => ({
        label: `skill.${skill}`,
        then: [next(by, 'test', { ...data, skill })],
      }))
    }
    if (choices.length)
      result.push({
        key: self.id + ':manifest',
        label: `customization.${self.form}`,
        actions: 1,
        ...(self.form === 'railshooter'
          ? { actionKind: 'fight' as const }
          : self.form === 'translocator'
            ? { actionKind: 'evade' as const }
            : self.form === 'telescanner'
              ? { actionKind: 'investigate' as const }
              : {}),
        provokes: !['railshooter', 'translocator'].includes(self.form!),
        costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
        then: ask(by, choices, true),
      })
    return result
  },
  effect: (s, by, step, data) => {
    if (step === 'clue')
      return ask(
        by,
        Object.values(s.locations)
          .filter((l) => l.revealed && l.clues > 0)
          .map((l) => ({
            label: 'choice.discoverAt',
            params: { location: l.name },
            target: { type: 'location', id: l.id },
            then: [{ type: 'DiscoverClues', investigator: by, location: l.id, amount: 1 }],
          })),
        true,
      )
    if (step === 'treachery')
      return ask(
        by,
        alterFateTargets(s).map((t) => ({
          label: 'choice.groupedTreachery',
          params: { card: t.name },
          target: { type: 'treachery', id: t.id },
          then: [{ type: 'DiscardTreachery', treachery: t.id }],
        })),
        true,
      )
    if (step === 'move') return ask(by, [...moves(s, by), { label: 'choice.skip', then: [] }], true)
    if (step !== 'test') return []
    const here = getInvestigator(s, by).location
    if (!here) return []
    const base = {
      type: 'BeginSkillTest' as const,
      investigator: by,
      skill: String(data.skill) as SkillType,
      source: String(data.asset),
      modifier: Number(data.bonus),
      effectSource: CODE,
    }
    if (data.form === 'railshooter' || data.form === 'translocator') {
      const e = s.enemies[String(data.enemy)]
      if (!e) return []
      const fight = data.form === 'railshooter'
      const test: Message = {
        ...base,
        difficulty: fight ? e.fight : e.evade,
        kind: fight
          ? { type: 'fight', enemy: e.id, extraDamage: 1 }
          : { type: 'evade', enemy: e.id },
      }
      if (fight) return [test]
      return ask(
        by,
        [
          { label: 'choice.shotcasterBefore', then: [next(by, 'move'), test] },
          { label: 'choice.shotcasterAfter', then: [test, next(by, 'move')] },
        ],
        true,
      )
    }
    if (data.form === 'telescanner')
      return [
        {
          ...base,
          difficulty: shroudOf(s, here),
          kind: {
            type: 'investigate',
            location: here,
            baseClues: 0,
            onSuccess: [next(by, 'clue')],
          },
        },
      ]
    const matter = data.form === 'matterweaver'
    return [
      {
        ...base,
        difficulty: matter ? Math.max(0, playerCardDef(String(data.card))?.cost ?? 0) : 3,
        kind: {
          type: 'effect',
          source: CODE,
          onFail: [],
          onFailEach: [],
          onSuccess: matter
            ? [
                {
                  type: 'PlayCard',
                  investigator: by,
                  code: String(data.card),
                  byEffect: true,
                  noCost: true,
                  from: 'hand',
                },
              ]
            : [next(by, 'treachery')],
        },
      },
    ]
  },
})
