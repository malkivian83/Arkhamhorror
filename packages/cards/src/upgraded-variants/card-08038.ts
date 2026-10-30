// RR: Activate Action, Skill Tests, Healing. Medical Texts (2): heal 1 damage (2 if the test
// succeeds by 2 or more); on a failure you must exhaust it or deal 1 damage to that investigator.
import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { atLocation } from '../dunwich-pilot/helpers'

const code = '08038'
const card = () => playerCardDef(code)!.name
registerPlayerCard({
  code,
  abilities: (s, a, by) =>
    atLocation(s, by).map((o) => ({
      key: a.id + ':heal:' + o.id,
      label: 'ability.equipmentMedical',
      params: { card: card(), name: o.name },
      target: { type: 'investigator' as const, id: o.id },
      actions: 1,
      provokes: true,
      then: [
        {
          type: 'BeginSkillTest',
          investigator: by,
          skill: 'intellect',
          source: a.id,
          difficulty: 2,
          kind: {
            type: 'effect',
            source: card(),
            onSuccess: [
              {
                type: 'IfTestResult',
                below: 2,
                then: [{ type: 'Heal', investigator: o.id, damage: 1, horror: 0 }],
              },
              {
                type: 'IfTestResult',
                atLeast: 2,
                then: [{ type: 'Heal', investigator: o.id, damage: 2, horror: 0 }],
              },
            ],
            onFail: [continuation(code, by, 'fail', { asset: a.id, target: o.id })],
            onFailEach: [],
          },
        },
      ],
    })),
  effect: (s, by, step, data) => {
    if (step !== 'fail') return []
    const target = String(data.target)
    const self = s.assets[String(data.asset)]
    const damage = { type: 'TakeDamage' as const, investigator: target, damage: 1, horror: 0 }
    if (!self || self.exhausted) return [damage]
    return ask(
      by,
      [
        {
          label: 'choice.upgradedExhaustCard',
          params: { card: card() },
          then: [{ type: 'ExhaustAsset', asset: self.id }],
        },
        {
          label: 'choice.upgradedDamageInvestigator',
          params: { name: getInvestigator(s, target).name },
          then: [damage],
        },
      ],
      true,
    )
  },
})
