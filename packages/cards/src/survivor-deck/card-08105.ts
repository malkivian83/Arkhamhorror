import { registerPlayerCard } from '@lcg/engine'
// RR Fast, Skill Tests: exhaust as a cost; independent copies stack for this test.
registerPlayerCard({
  code: '08105',
  canPlay: (s, by) => s.activeTurn === by,
  testOptions: (_s, t, a) =>
    !a.exhausted && (t.kind.type === 'fight' || t.kind.type === 'investigate')
      ? [
          {
            key: a.id + ':ice-pick',
            investigator: a.owner,
            label: 'ability.survivorIcePick',
            then: [
              { type: 'ExhaustAsset', asset: a.id },
              { type: 'BoostSkillTest', amount: 1 },
            ],
          },
        ]
      : [],
})
