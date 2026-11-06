import {
  activeInvestigators,
  getInvestigator,
  placedLocation,
  playerCardDef,
  push,
  registerPlayerCard,
  registerPlayerCards,
  type Message,
  type ReactionOption,
  type ScenarioBehavior,
  type SkillType,
} from '@lcg/engine'
import { N, NPCS, TOWN } from './night-data'
import { on, specific } from './helpers'
import { isDefend } from './night-helpers'

registerPlayerCards([
  ...NPCS.map((n) => ({
    code: n.code,
    name: n.name,
    type: 'asset' as const,
    class: 'neutral' as const,
    cost: 0,
    story: true,
    unique: true,
    traits: ['Arkham', 'Human'],
    slots: [],
    icons: {},
  })),
  {
    code: N.hibbs,
    name: 'Hibbs',
    type: 'asset',
    class: 'neutral',
    cost: 3,
    story: true,
    unique: true,
    traits: ['Ally', 'Agency'],
    slots: ['ally'],
    health: 2,
    sanity: 2,
    icons: { willpower: 1, intellect: 1, agility: 1 },
  },
])
for (const npc of NPCS)
  registerPlayerCard({
    code: npc.code,
    placedAbilities: (s, self, by) => {
      if (self.faceDown || placedLocation(s, self) !== getInvestigator(s, by).location) return []
      return (
        npc.metric === 'skill'
          ? (['willpower', 'intellect', 'combat', 'agility'] as SkillType[])
          : (['intellect'] as SkillType[])
      ).map((skill) => ({
        key: `${self.id}:defend:${skill}`,
        label:
          npc.metric === 'skill'
            ? `ability.plaguebearer.night.defendSkill.${skill}`
            : 'ability.plaguebearer.night.defend',
        params: { name: npc.name, skill },
        actions: 1,
        provokes: true,
        then: [
          {
            type: 'BeginSkillTest' as const,
            investigator: by,
            skill,
            skillSelected: npc.metric !== 'skill',
            difficulty: npc.base + npc.per * s.startingInvestigatorCount,
            tags: ['plaguebearer:defend'],
            kind: {
              type: 'effect' as const,
              source: npc.code,
              onSuccess: [specific('night.defended', { npc: npc.code })],
              onFail: [],
              onFailEach: [],
            },
          },
        ],
      }))
    },
  })
registerPlayerCard({
  code: N.hibbs,
  skillModifier: (_s, a, t) =>
    t.investigator === a.owner && (t.skill === 'willpower' || t.skill === 'agility') ? 1 : 0,
  reactions: (s, t, a) =>
    t.type === 'whenEnemyAttacks' &&
    !a.exhausted &&
    t.opportunity &&
    getInvestigator(s, t.investigator).location === getInvestigator(s, a.owner).location
      ? [
          {
            key: `${a.id}:cancel`,
            investigator: a.owner,
            label: 'ability.plaguebearer.night.hibbs',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'CancelEnemyAttack', enemy: t.enemy },
            ],
          },
        ]
      : [],
})
export const defendReactions: NonNullable<ScenarioBehavior['reactions']> = (s, t) => {
  if (t.type !== 'afterSkillTestInitiated' || !isDefend(s.skillTest)) return []
  const here = getInvestigator(s, t.investigator).location
  return activeInvestigators(s)
    .filter((i) => i.location === here)
    .flatMap((i) =>
      Array.from({ length: i.clues }, (_, n): ReactionOption => ({
        key: `night:help:${i.id}`,
        investigator: i.id,
        label: 'ability.plaguebearer.night.help',
        params: { amount: n + 1 },
        then: [
          { type: 'PlaceCluesOnLocation', investigator: i.id, amount: n + 1 },
          specific('night.help', { amount: n + 1 }),
        ],
      })),
    )
}
// Effects of the eight original Arkham locations.
const search = (by: string, traits: string[], to: 'hand' | 'put', top?: number): Message => ({
  type: 'SearchDeck',
  investigator: by,
  traits,
  to,
  ...(top === undefined ? {} : { top }),
  ...(traits.length === 0 ? { anyCard: true, cardType: 'asset' as const } : {}),
  optional: true,
})
on('night.storeSearch', (s, d) =>
  push(s, search(String(d.investigator), [], 'put', 2 * Number(d.amount))),
)
on('night.library', (s, d) => {
  const i = getInvestigator(s, String(d.investigator))
  return i.hand.length >= 5 ? push(s, { type: 'DrawCards', investigator: i.id, amount: 1 }) : s
})
export const townReactions: NonNullable<ScenarioBehavior['reactions']> = (s, t) => {
  if (t.type !== 'afterSkillTest' && t.type !== 'afterPlayCard' && t.type !== 'skillTestEnded')
    return []
  if (t.type === 'skillTestEnded')
    return activeInvestigators(s)
      .filter((i) => s.skillTest?.tags?.includes(`night:docks:${i.id}`))
      .map((i) => ({
        key: '78029:benefit',
        investigator: i.id,
        label: 'ability.plaguebearer.night.benefit',
        limit: { per: 'round' },
        then: [{ type: 'DrawCards', investigator: i.id, amount: 1 }],
      }))
  const by = t.investigator,
    here = getInvestigator(s, by).location
  if (!here || !s.locations[here]?.revealed) return []
  const row = TOWN.find((r) => r.id === here)
  if (!row) return []
  const out: ReactionOption[] = []
  const reaction = (then: Message[]) =>
    out.push({
      key: `${here}:benefit`,
      investigator: by,
      label: 'ability.plaguebearer.night.benefit',
      limit: { per: 'round' },
      then,
    })
  if (here === '78023' && t.type === 'afterPlayCard' && playerCardDef(t.code)?.type === 'event')
    reaction([
      { type: 'DrawCards', investigator: by, amount: 1 },
      { type: 'GainResources', investigator: by, amount: 1 },
    ])
  if (here === '78024' && t.type === 'afterSkillTest' && t.kind === 'investigate' && t.succeeded)
    reaction([{ type: 'GainResources', investigator: by, amount: 2 }])
  if (here === '78026' && t.type === 'afterSkillTest' && t.succeeded && t.margin >= 2)
    for (const i of activeInvestigators(s).filter((i) => i.location === here)) {
      if (i.damage > 0)
        out.push({
          key: `${here}:benefit`,
          investigator: by,
          label: 'ability.plaguebearer.night.healDamage',
          params: { name: i.name },
          limit: { per: 'round' },
          then: [{ type: 'Heal', investigator: i.id, damage: 1, horror: 0 }],
        })
      if (i.horror > 0)
        out.push({
          key: `${here}:benefit`,
          investigator: by,
          label: 'ability.plaguebearer.night.healHorror',
          params: { name: i.name },
          limit: { per: 'round' },
          then: [{ type: 'Heal', investigator: i.id, damage: 0, horror: 1 }],
        })
    }
  return out
}
export { search }
