import { registerPlayerCard } from '@lcg/engine'
import { boost } from '../asset-utilities/register'
// RR: Fast, Limits, Doom. Blood Pact (0): two separate [fast] abilities, each limited once per
// test; adding doom to this asset is the cost of +2 [willpower] or +2 [combat].
registerPlayerCard({
  code: '07158',
  testOptions: (_s, t, a) => {
    if (t.investigator !== a.owner || (t.skill !== 'willpower' && t.skill !== 'combat')) return []
    const key = a.id + ':' + t.skill
    if ((t.abilityCounts?.[key] ?? 0) > 0) return []
    return [
      boost(
        a,
        t.skill,
        'ability.bloodPact',
        { skill: t.skill },
        [
          { type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 },
          { type: 'ModifySkillTest', use: key },
        ],
        2,
      ),
    ]
  },
})
