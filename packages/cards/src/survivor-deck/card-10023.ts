import { playerCardDef, registerPlayerCard } from '@lcg/engine'
// RR Uses, Replenish: never above the printed two offerings, including repeated engagement.
registerPlayerCard({
  code: '10023',
  maxUses: 2,
  limitTrait: 'Mask',
  canPlay: (s, by) =>
    !Object.values(s.assets).some(
      (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Mask'),
    ),
  forced: (_s, t, a) =>
    t.type === 'afterEngage' && t.investigator === a.owner
      ? [{ type: 'AddUses', asset: a.id, amount: 1 }]
      : [],
  testOptions: (_s, t, a) =>
    a.uses > 0 &&
    (t.skill === 'combat' || t.skill === 'agility') &&
    !t.abilityCounts?.[a.id + ':wolf-mask']
      ? [
          {
            key: a.id + ':wolf-mask',
            investigator: a.owner,
            label: 'ability.survivorMaskBoost',
            then: [
              { type: 'SpendUses', asset: a.id, amount: 1 },
              { type: 'ModifySkillTest', use: a.id + ':wolf-mask' },
              { type: 'BoostSkillTest', amount: 2 },
            ],
          },
        ]
      : [],
})
