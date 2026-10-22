import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// "If it bleeds...": after you defeat a Monster enemy, each investigator at your location
// heals horror equal to that enemy's horror value.
registerPlayerCard({
  code: '02225',
  handReactions: (s, t, by) => {
    if (t.type !== 'enemyDefeated' || t.by !== by) return []
    if (!(t.enemy.traits ?? []).includes('Monster') || !t.enemy.horror) return []
    const location = getInvestigator(s, by).location
    return [
      {
        key: 'hand:02225',
        investigator: by,
        label: 'ability.playCard',
        params: { card: playerCardDef('02225')!.name },
        target: { type: 'hand', code: '02225' },
        then: [
          {
            type: 'PlayCard',
            investigator: by,
            code: '02225',
            effect: s.investigators
              .filter((i) => !i.eliminated && i.location === location)
              .map((i) => ({
                type: 'Heal' as const,
                investigator: i.id,
                damage: 0,
                horror: t.enemy.horror,
              })),
          },
        ],
      },
    ]
  },
})
