import {
  distancesFrom,
  getInvestigator,
  playerCardDef,
  push,
  registerEnemy,
  registerTreachery,
  type Message,
  type GameState,
} from '@lcg/engine'
import { copies, damage, enemy, treachery } from '../scenario-helpers'
import { H } from './house-codes'
export const avianThrall = enemy({
  code: H.avian,
  name: 'Avian Thrall',
  traits: ['Creature', 'Monster', 'Abomination'],
  fight: 5,
  health: 4,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter'],
  prey: { type: 'lowestSkill', skill: 'intellect' },
})
export const lupineThrall = enemy({
  code: H.lupine,
  name: 'Lupine Thrall',
  traits: ['Creature', 'Monster', 'Abomination'],
  fight: 4,
  health: 3,
  evade: 4,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'retaliate'],
  prey: { type: 'lowestSkill', skill: 'agility' },
})
export const thug = enemy({
  code: H.thug,
  name: "O'Bannion's Thug",
  traits: ['Humanoid', 'Criminal', 'Syndicate'],
  fight: 4,
  health: 2,
  evade: 2,
  damage: 2,
  horror: 0,
  keywords: [],
})
export const mobster = enemy({
  code: H.mobster,
  name: 'Mobster',
  traits: ['Humanoid', 'Criminal', 'Syndicate'],
  fight: 2,
  health: 2,
  evade: 2,
  damage: 1,
  horror: 0,
  keywords: ['retaliate'],
})
const t = (code: string, name: string) => treachery({ code, name, traits: [], keywords: [] })
export const HOUSE_SETS = {
  badLuck: [...copies(t(H.cursed, 'Cursed Luck'), 3), ...copies(t(H.twist, 'Twist of Fate'), 3)],
  abominations: [
    ...copies(avianThrall, 2),
    ...copies(lupineThrall, 2),
    ...copies(t(H.altered, 'Altered Beast'), 2),
  ],
  naomi: [...copies(thug, 2), ...copies(mobster, 2), ...copies(t(H.hunted, 'Hunted Down'), 2)],
}
registerTreachery({
  code: H.cursed,
  revelation: (_s, investigator, self) => [
    { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'threatArea', investigator } },
  ],
  skillModifier: (_s, self, test) =>
    self.placement?.type === 'threatArea' && self.placement.investigator === test.investigator
      ? -1
      : 0,
  forced: (_s, t, self) =>
    t.type === 'afterSkillTest' &&
    t.succeeded &&
    t.margin >= 1 &&
    self.placement?.type === 'threatArea' &&
    self.placement.investigator === t.investigator
      ? [{ type: 'DiscardTreachery', treachery: self.id }]
      : [],
})
registerTreachery({
  code: H.twist,
  revelation: (_s, investigator) => [
    {
      type: 'RevealTokenOutsideTest',
      investigator,
      then: { type: 'ScenarioSpecific', key: 'hawTwist', data: { investigator } },
    },
  ],
})
registerEnemy({ code: H.avian })
registerEnemy({
  code: H.lupine,
  spawn: (s, i) => {
    const location = getInvestigator(s, i).location
    if (!location) return []
    const d = distancesFrom(s, location)
    const max = Math.max(...d.values())
    return [...d].filter(([, n]) => n === max).map(([id]) => id)
  },
})
registerEnemy({
  code: H.mobster,
  forced: (_s, t, self) =>
    t.type === 'afterEnemyAttack' && t.enemy === self.id
      ? [{ type: 'LoseResources', investigator: t.investigator, amount: 1 }]
      : [],
})
registerTreachery({
  code: H.hunted,
  revelation: (s, investigator) => {
    const enemies = Object.values(s.enemies).filter(
      (e) => e.traits?.includes('Criminal') && !e.engagedWith,
    )
    return enemies.length
      ? enemies.map((e): Message => ({
          type: 'ScenarioSpecific',
          key: 'hawHunted',
          data: { enemy: e.id, investigator },
        }))
      : [{ type: 'DrawEncounterCard', investigator }]
  },
})
registerTreachery({
  code: H.altered,
  revelation: (s, investigator, self) => {
    const enemies = Object.values(s.enemies).filter((e) => e.traits?.includes('Abomination'))
    return enemies.length
      ? [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseEnemy',
              choices: enemies.map((e) => ({
                label: 'choice.enemy',
                params: { enemy: e.name },
                then: [
                  { type: 'HealEnemy', enemy: e.id, amount: e.damageTaken },
                  {
                    type: 'PlaceTreachery',
                    treachery: self.id,
                    placement: { type: 'enemy', enemy: e.id },
                  },
                ],
              })),
            },
          },
        ]
      : [{ type: 'DrawEncounterCard', investigator }]
  },
  forced: (s, t, self) => {
    if (self.placement?.type !== 'enemy') return []
    const e = s.enemies[self.placement.enemy]
    if (!e) return []
    return t.type === 'afterMove' && getInvestigator(s, t.investigator).location === e.location
      ? [damage(t.investigator, 0, 1)]
      : t.type === 'enemyEntersLocation' && t.enemy === e.id
        ? s.investigators
            .filter((i) => !i.eliminated && i.location === e.location)
            .map((i) => damage(i.id, 0, 1))
        : []
  },
})
// Used by the scenario's enemy stat hook, including event attacks with an asset source.
export const avianFight = (s: import('@lcg/engine').GameState, source?: string) => {
  const card = source ? playerCardDef(s.assets[source]?.code ?? source) : undefined
  return card?.type === 'asset' &&
    card.traits.some((t) => ['Ranged', 'Firearm', 'Spell'].includes(t))
    ? -3
    : 0
}

/** Naomi's Crew is shared by the Clover Club and Blood on the Altar. */
export const thugBlocksResources = (s: GameState, investigator: string) =>
  Object.values(s.enemies).some((e) => e.code === H.thug && e.engagedWith === investigator)

export function huntedDownSpecific(
  s: GameState,
  key: string,
  data: Record<string, unknown>,
  investigator: string,
): GameState | null {
  const e = s.enemies[String(data.enemy)]
  if (key === 'hawHunted') {
    const location = getInvestigator(s, investigator).location
    return e && location
      ? push(
          s,
          { type: 'HuntOnce', enemy: e.id, toward: location, attack: false },
          { type: 'ScenarioSpecific', key: 'hawHuntedAttack', data: { enemy: e.id, investigator } },
        )
      : s
  }
  if (key === 'hawHuntedAttack')
    return e?.engagedWith === investigator
      ? push(s, {
          type: 'EnemyAttack',
          enemy: e.id,
          investigator,
          evenIfExhausted: true,
          exhaustAfter: false,
        })
      : s
  return null
}
