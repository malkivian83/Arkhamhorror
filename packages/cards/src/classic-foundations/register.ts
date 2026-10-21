import {
  effectiveVitals,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type SkillType,
  type AbilityOption,
} from '@lcg/engine'
import { attackable, fightOptions } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'
import { mayChoose } from '../core-2026/player-cards'
export type FoundationFamily =
  | 'pump'
  | 'soak'
  | 'rosary'
  | 'fearless'
  | 'knife'
  | 'flashlight'
  | 'first-aid'
  | 'draw-skill'
  | 'cleaver'
export function registerClassicCard(
  code: string,
  family: FoundationFamily,
  skills: readonly SkillType[] = [],
): void {
  if (family === 'pump') {
    if (skills.length !== 2) throw new Error('A classic talent needs two reviewed skills')
    registerPlayerCard({
      code,
      testOptions: (state, test, self) =>
        test.investigator === self.owner &&
        skills.includes(test.skill) &&
        getInvestigator(state, self.owner).resources >= 1
          ? [
              {
                key: self.id + ':classic-pump',
                investigator: self.owner,
                label: 'ability.pump',
                params: { card: playerCardDef(code)!.name, skill: test.skill, amount: 1 },
                then: [
                  { type: 'SpendResources', investigator: self.owner, amount: 1 },
                  { type: 'BoostSkillTest', amount: 1 },
                ],
              },
            ]
          : [],
    })
  } else if (family === 'soak') registerPlayerCard({ code })
  else if (family === 'rosary')
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, test) => (test.skill === 'willpower' ? 1 : 0),
    })
  else if (family === 'fearless')
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, _t, success, by) =>
        success ? [{ type: 'Heal', investigator: by, damage: 0, horror: 1 }] : [],
    })
  else if (family === 'draw-skill')
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, test, success, by) =>
        success
          ? [
              {
                type: 'DrawCards',
                investigator: by,
                amount: (test.modifiedSkill ?? 0) - test.difficulty >= 2 ? 2 : 1,
              },
            ]
          : [],
    })
  else if (family === 'knife')
    registerPlayerCard({
      code,
      abilities: (s, a, i) => [
        ...fightOptions(s, a, i, 1),
        ...fightOptions(s, a, i, 2, { extraDamage: 1 }).map((option) => ({
          ...option,
          key: a.id + ':discard-fight',
          label: 'ability.classicKnifeDiscard',
          costs: [{ type: 'DiscardAsset' as const, asset: a.id }],
        })),
      ],
    })
  else if (family === 'flashlight')
    registerPlayerCard({
      code,
      abilities: (state, self, investigator) => {
        const here = getInvestigator(state, investigator).location
        return here === null || self.uses < 1
          ? []
          : [
              {
                key: self.id + ':flashlight',
                label: 'ability.investigateWith',
                params: { card: playerCardDef(code)!.name, skill: 'intellect' },
                actions: 1 + (getLocation(state, here).investigateExtraActions ?? 0),
                provokes: true,
                costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator,
                    skill: 'intellect',
                    source: self.id,
                    difficulty: Math.max(0, shroudOf(state, here) - 2),
                    kind: { type: 'investigate', location: here },
                  },
                ],
              },
            ]
      },
    })
  else if (family === 'first-aid')
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      abilities: (state, self) =>
        self.uses < 1
          ? []
          : atLocation(state, self.owner).flatMap((other) => {
              const options: AbilityOption[] = []
              for (const kind of ['damage', 'horror'] as const)
                if (other[kind] > 0)
                  options.push({
                    key: self.id + ':heal:' + other.id + ':' + kind,
                    label:
                      kind === 'damage'
                        ? 'ability.classicFirstAidDamage'
                        : 'ability.classicFirstAidHorror',
                    params: { card: playerCardDef(code)!.name, name: other.name },
                    target: { type: 'investigator', id: other.id },
                    actions: 1,
                    provokes: true,
                    costs: [{ type: 'SpendUses', asset: self.id, amount: 1 }],
                    then: [
                      {
                        type: 'Heal',
                        investigator: other.id,
                        damage: kind === 'damage' ? 1 : 0,
                        horror: kind === 'horror' ? 1 : 0,
                      },
                    ],
                  })
              return options
            }),
    })
  else if (family === 'cleaver')
    registerPlayerCard({
      code,
      abilities: (state, self, investigator) =>
        attackable(state, investigator).flatMap((enemy) =>
          [false, true].map((paid) => ({
            key: self.id + ':cleaver:' + String(paid),
            label: paid ? 'ability.classicCleaverPaid' : 'ability.fightWith',
            params: { card: playerCardDef(code)!.name, enemy: enemy.name },
            target: { type: 'enemy' as const, id: enemy.id },
            actions: 1,
            provokes: false,
            ...(paid
              ? { costs: [{ type: 'TakeDamage' as const, investigator, damage: 0, horror: 1 }] }
              : {}),
            then: [
              {
                type: 'PlayerCardEffect' as const,
                code,
                investigator,
                step: 'cleaver-fight',
                data: { asset: self.id, enemy: enemy.id, extraDamage: paid ? 1 : 0 },
              },
            ],
          })),
        ),
      effect: (state, investigator, step, data) => {
        const i = getInvestigator(state, investigator)
        if (i.eliminated) return []
        if (step === 'cleaver-heal')
          return i.horror > 0
            ? [
                mayChoose(investigator, 'choice.classicCleaverHeal', {}, [
                  { type: 'Heal', investigator, damage: 0, horror: 1 },
                ]),
              ]
            : []
        const self = state.assets[String(data.asset)],
          enemy = state.enemies[String(data.enemy)]
        if (step !== 'cleaver-fight' || !self || !enemy || enemy.location !== i.location) return []
        return [
          {
            type: 'BeginSkillTest',
            investigator,
            source: self.id,
            skill: 'combat',
            difficulty: enemy.fight,
            modifier: effectiveVitals(state, i).sanity - i.horror <= 3 ? 2 : 1,
            kind: {
              type: 'fight',
              enemy: enemy.id,
              extraDamage: Number(data.extraDamage),
              onDefeat: [{ type: 'PlayerCardEffect', code, investigator, step: 'cleaver-heal' }],
            },
          },
        ]
      },
    })
  else throw new Error('Unknown reviewed family: ' + family)
}
