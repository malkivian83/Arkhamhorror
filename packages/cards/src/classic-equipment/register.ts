import {
  enemiesAt,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Message,
} from '@lcg/engine'
import { attackable, ask, fightOptions } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'
import approvals from './approvals.json'

export function registerEquipment(code: string): void {
  const entry = approvals.cards.find((c) => c.code === code)
  if (!entry) throw new Error('Unreviewed equipment: ' + code)
  const family = entry.family
  if (family === 'firearm' || family === 'threshold') {
    const modifier = 'modifier' in entry ? entry.modifier : 0
    const damage = 'damage' in entry ? entry.damage : 0
    registerPlayerCard({
      code,
      abilities: (s, a, i) =>
        'uses' in entry && a.uses < 1
          ? []
          : fightOptions(
              s,
              a,
              i,
              modifier,
              family === 'threshold'
                ? { damageIfSuccessBy: { atLeast: 2, amount: damage } }
                : { extraDamage: damage },
            ).map((option) => ({
              ...option,
              ...('uses' in entry
                ? { costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }] }
                : {}),
            })),
    })
  } else if (family === 'soak') registerPlayerCard({ code })
  else if (family === 'willpower' || family === 'trench')
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) =>
        family === 'willpower'
          ? t.skill === 'willpower'
            ? 1
            : 0
          : t.kind.type === 'evade' && t.skill === 'agility'
            ? 1
            : 0,
    })
  else if (family === 'resources')
    registerPlayerCard({
      code,
      play: (_s, investigator) => [{ type: 'GainResources', investigator, amount: 10 }],
    })
  else if (family === 'sneak') {
    const targets = (s: Parameters<typeof enemiesAt>[0], i: string) => {
      const here = getInvestigator(s, i).location
      return here === null
        ? []
        : enemiesAt(s, here).filter((e) =>
            'upgraded' in entry && entry.upgraded ? e.engagedWith !== i : e.exhausted,
          )
    }
    registerPlayerCard({
      code,
      canPlay: (s, i) => targets(s, i).length > 0,
      play: (s, i) =>
        ask(
          i,
          targets(s, i).map((e) => ({
            label: 'choice.equipmentDamage',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [{ type: 'DamageEnemy', enemy: e.id, amount: 2, by: i }],
          })),
        ),
    })
  } else if (family === 'backstab')
    registerPlayerCard({
      code,
      noAttacksOfOpportunity: true,
      canPlay: (s, i) => attackable(s, i).length > 0,
      play: (s, i) =>
        ask(
          i,
          attackable(s, i).map((e) => ({
            label: 'choice.equipmentAttack',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              {
                type: 'BeginSkillTest',
                investigator: i,
                skill: 'agility',
                source: code,
                difficulty: e.fight,
                kind: { type: 'fight', enemy: e.id, extraDamage: 2 },
              },
            ],
          })),
        ),
    })
  else if (family === 'draw' || family === 'search')
    registerPlayerCard({
      code,
      ...(family === 'draw'
        ? { canPlay: (s: Parameters<typeof getInvestigator>[0], i: string) => s.activeTurn === i }
        : {}),
      play: (s, i) =>
        ask(
          i,
          atLocation(s, i).map((other) => ({
            label: 'choice.equipmentInvestigator',
            params: { name: other.name },
            target: { type: 'investigator', id: other.id },
            then:
              family === 'draw'
                ? [{ type: 'DrawCards', investigator: other.id, amount: 3 }]
                : [
                    {
                      type: 'SearchDeck',
                      investigator: other.id,
                      top: 6,
                      traits: [],
                      anyCard: true,
                      to: 'hand',
                    },
                  ],
          })),
        ),
    })
  else if (family === 'weapon-search')
    registerPlayerCard({
      code,
      play: (_s, investigator) => [
        { type: 'SearchDeck', investigator, top: 9, traits: ['Weapon'], to: 'hand' },
      ],
    })
  else if (family === 'medical' || family === 'healing')
    registerPlayerCard({
      code,
      abilities: (s, a, i) =>
        family === 'healing' && a.uses < 1
          ? []
          : atLocation(s, i)
              .filter((o) => family === 'medical' || o.damage > 0)
              .map((o) => ({
                key: a.id + ':heal:' + o.id,
                label: family === 'medical' ? 'ability.equipmentMedical' : 'ability.equipmentHeal',
                params: { card: playerCardDef(code)!.name, name: o.name },
                target: { type: 'investigator' as const, id: o.id },
                actions: 1,
                provokes: true,
                ...(family === 'healing'
                  ? { costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }] }
                  : {}),
                then: (family === 'healing'
                  ? [{ type: 'Heal', investigator: o.id, damage: 1, horror: 0 }]
                  : [
                      {
                        type: 'BeginSkillTest',
                        investigator: i,
                        skill: 'intellect',
                        source: a.id,
                        difficulty: 2,
                        kind: {
                          type: 'effect',
                          source: playerCardDef(code)!.name,
                          onSuccess: [{ type: 'Heal', investigator: o.id, damage: 1, horror: 0 }],
                          onFail: [
                            { type: 'TakeDamage', investigator: o.id, damage: 1, horror: 0 },
                          ],
                          onFailEach: [],
                        },
                      },
                    ]) as Message[],
              })),
    })
  else throw new Error('Unsupported reviewed equipment family: ' + family)
}
