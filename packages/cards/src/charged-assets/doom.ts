// RR: Initiation Sequence, Costs, Fight, Investigate, Evade, Healing, Doom.
import {
  getInvestigator,
  getLocation,
  registerPlayerCard,
  fightEnemies,
  engagedEnemies,
  canEnter,
  investigationBlocked,
  shroudOf,
  type Message,
  type Asset,
  type SkillType,
  type GameState,
  type AbilityOption,
} from '@lcg/engine'
import { ask, cardName, continuation, moveChoices } from '../dunwich-pilot/effects'
const sickles = ['09082', '09096'],
  rods = ['09083', '09097'],
  pentacles = ['09085', '09098']
const high = (c: string) => ['09096', '09097', '09098'].includes(c)
const clearDoom = (a: Asset): Message[] => [
  {
    type: 'RemoveDoom',
    target: { type: 'asset', id: a.id },
    amount: high(a.code) ? (a.doom ?? 0) : 1,
  },
  ...(high(a.code) ? [{ type: 'ReadyAsset' as const, asset: a.id }] : []),
]
const doomCosts = (a: Asset, power: boolean): Message[] =>
  power
    ? [
        { type: 'ExhaustAsset', asset: a.id },
        { type: 'PlaceDoomOnAsset', asset: a.id, amount: 1, checkAgenda: false },
      ]
    : []
function investigate(
  s: GameState,
  by: string,
  a: Asset,
  skill: SkillType,
  power: boolean,
): Message[] {
  const i = getInvestigator(s, by)
  if (i.location === null || investigationBlocked(s, i.location)) return []
  const extra = getLocation(s, i.location).investigateExtraActions ?? 0
  if (extra > i.actionsRemaining) return []
  return Array.from({ length: extra }).reduce<Message[]>(
    (then) => [{ type: 'SpendAdditionalAction', investigator: by, then }],
    [
      {
        type: 'BeginSkillTest',
        investigator: by,
        skill,
        source: a.id,
        difficulty: shroudOf(s, i.location),
        tags: [power ? 'charged:power' : 'charged:clear'],
        modifier: (skill === 'intellect' ? 1 : 0) + (power && high(a.code) ? 2 : 0),
        kind: { type: 'investigate', location: i.location },
      },
    ],
  )
}
export function registerDoom(code: string): boolean {
  if (![...sickles, ...rods, ...pentacles, '09084'].includes(code)) return false
  registerPlayerCard({
    code,
    abilities: (s, a, by) => {
      const i = getInvestigator(s, by)
      if (i.location === null) return []
      if (code === '09084')
        return [false, true].flatMap((power) =>
          power && a.exhausted
            ? []
            : s.investigators.flatMap((other) =>
                other.location !== i.location || other.eliminated
                  ? []
                  : (['damage', 'horror'] as const).flatMap((kind) =>
                      other[kind] < 1
                        ? []
                        : [
                            {
                              key: a.id + ':heal:' + other.id + ':' + kind + ':' + power,
                              actions: 1,
                              provokes: true,
                              label: 'choice.chargedHeal',
                              params: { n: power ? 2 : 1, kind, name: other.name },
                              costs: doomCosts(a, power),
                              then: [
                                {
                                  type: 'Heal' as const,
                                  investigator: other.id,
                                  damage: kind === 'damage' ? (power ? 2 : 1) : 0,
                                  horror: kind === 'horror' ? (power ? 2 : 1) : 0,
                                },
                                ...(!power
                                  ? [
                                      continuation(code, by, 'healed', {
                                        asset: a.id,
                                        target: other.id,
                                        kind,
                                        before: other[kind],
                                      }),
                                    ]
                                  : []),
                              ],
                            },
                          ],
                    ),
              ),
        )
      const skills: SkillType[] = [
        sickles.includes(code) ? 'combat' : rods.includes(code) ? 'intellect' : 'agility',
        'willpower',
      ]
      return [false, true].flatMap((power): AbilityOption[] => {
        if (power && a.exhausted) return []
        if (rods.includes(code)) {
          const extra = getLocation(s, i.location!).investigateExtraActions ?? 0
          return skills
            .filter(
              () =>
                power || (!investigationBlocked(s, i.location!) && i.actionsRemaining >= 1 + extra),
            )
            .map((skill) => ({
              key: a.id + ':investigate:' + skill + ':' + power,
              label: power ? 'choice.chargedDoom' : 'choice.chargedClear',
              params: { card: cardName(code), skill },
              actions: power ? 1 : 1 + extra,
              provokes: true,
              costs: doomCosts(a, power),
              then: power
                ? [continuation(code, by, 'move', { asset: a.id, skill })]
                : [
                    {
                      type: 'BeginSkillTest',
                      investigator: by,
                      source: a.id,
                      skill,
                      tags: ['charged:clear'],
                      difficulty: shroudOf(s, i.location!),
                      modifier: skill === 'intellect' ? 1 : 0,
                      kind: { type: 'investigate', location: i.location! },
                    },
                  ],
            }))
        }
        const enemies = sickles.includes(code)
          ? fightEnemies(s, by).filter(
              (e) => e.engagedWith !== null || !e.keywords.includes('aloof'),
            )
          : power
            ? Object.values(s.enemies).filter(
                (e) =>
                  e.location !== null &&
                  [i.location, ...getLocation(s, i.location!).connections].includes(e.location),
              )
            : engagedEnemies(s, by)
        return enemies.flatMap((e) =>
          skills.map((skill): AbilityOption => ({
            key: a.id + ':' + e.id + ':' + skill + ':' + power,
            actions: 1,
            provokes: false,
            costs: doomCosts(a, power),
            label: power ? 'choice.chargedDoom' : 'choice.chargedClear',
            params: { card: cardName(code), enemy: e.name, skill },
            target: { type: 'enemy', id: e.id },
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                source: a.id,
                skill,
                tags: [power ? 'charged:power' : 'charged:clear'],
                difficulty: sickles.includes(code) ? e.fight : e.evade,
                modifier: (skill === 'willpower' ? 0 : 1) + (power ? (high(code) ? 3 : 1) : 0),
                kind: sickles.includes(code)
                  ? {
                      type: 'fight',
                      enemy: e.id,
                      extraDamage: power ? 1 : 0,
                      ...(!power
                        ? { onDefeat: [continuation(code, by, 'clear', { asset: a.id })] }
                        : {}),
                    }
                  : {
                      type: 'evade',
                      enemy: e.id,
                      ...(!power
                        ? {
                            onSuccess: [
                              {
                                type: 'IfTestResult',
                                atLeast: 2,
                                then: [continuation(code, by, 'clear', { asset: a.id })],
                              },
                            ],
                          }
                        : {}),
                    },
              },
            ],
          })),
        )
      })
    },
    forced: (s, t, a) =>
      rods.includes(code) &&
      t.type === 'afterDiscoverClues' &&
      t.last &&
      t.investigator === a.owner &&
      s.skillTest?.source === a.id &&
      s.skillTest.tags?.includes('charged:clear')
        ? clearDoom(a)
        : [],
    effect: (s, by, step, data) => {
      const a = s.assets[String(data.asset)]
      if (!a) return []
      if (step === 'clear') return clearDoom(a)
      if (step === 'healed') {
        const i = getInvestigator(s, String(data.target))
        return Number(data.before) > 0 && (data.kind === 'damage' ? i.damage : i.horror) === 0
          ? clearDoom(a)
          : []
      }
      const skill = data.skill as SkillType
      if (step === 'investigate') return investigate(s, by, a, skill, true)
      if (step === 'move') {
        const choices = moveChoices(s, by)
          .filter((c) => {
            const to = c.target?.type === 'location' ? c.target.id : ''
            return (
              canEnter(s, by, to) &&
              !investigationBlocked(s, to) &&
              (s.locations[to]?.investigateExtraActions ?? 0) <=
                getInvestigator(s, by).actionsRemaining
            )
          })
          .map((c) => ({
            ...c,
            then: [...c.then, continuation(code, by, 'investigate', { asset: a.id, skill })],
          }))
        return choices.length ? ask(by, choices, true) : investigate(s, by, a, skill, true)
      }
      return []
    },
  })
  return true
}
