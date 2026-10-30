import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// RR: Fast; Enemy Attacks; Evade; Cancel. Quick Getaway: when an enemy attacks you, attempt to
// evade that enemy; a success evades it and cancels its attack, a failure lets it resolve.
const code = '09069'
registerPlayerCard({
  code,
  canPlay: () => false,
  handReactions: (state, trigger, investigator) => {
    if (
      trigger.type !== 'whenEnemyAttacks' ||
      trigger.investigator !== investigator ||
      state.canceledAttack === trigger.enemy ||
      state.skillTest
    )
      return []
    const enemy = state.enemies[trigger.enemy]
    if (!enemy || getInvestigator(state, investigator).location === null) return []
    return [
      {
        key: 'hand:' + code,
        investigator,
        label: 'ability.playCard',
        params: { card: playerCardDef(code)!.name },
        target: { type: 'hand', code },
        then: [
          {
            type: 'PlayCard',
            investigator,
            code,
            effect: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'agility',
                difficulty: enemy.evade,
                tags: ['trick'],
                kind: {
                  type: 'evade',
                  enemy: enemy.id,
                  onSuccess: [{ type: 'CancelEnemyAttack', enemy: enemy.id }],
                },
              },
            ],
          },
        ],
      },
    ]
  },
})
