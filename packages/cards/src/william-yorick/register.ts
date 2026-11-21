// RR: Defeat, Reaction Opportunities, Play, Costs, Victory Display, Cannot; ST.6.
import {
  canPlayByEffect,
  discardLocked,
  getInvestigator,
  playerCardDef,
  registerEnemy,
  registerInvestigator,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'

export function registerYorickCard(code: string): void {
  if (code === '03005') {
    registerInvestigator({
      code,
      reactions: (s, t, i) =>
        t.type === 'enemyDefeated' && t.by === i.id && mayParticipate(s, i.id)
          ? [...new Set(i.discard)]
              .filter(
                (c) => playerCardDef(c)?.type === 'asset' && canPlayByEffect(s, i.id, c, 'discard'),
              )
              .map((c) => ({
                key: code + ':recover',
                investigator: i.id,
                label: 'ability.playCard',
                params: { card: cardName(c) },
                limit: { per: 'round' as const },
                then: [
                  {
                    type: 'PlayCard' as const,
                    investigator: i.id,
                    code: c,
                    from: 'discard' as const,
                    byEffect: true,
                  },
                ],
              }))
          : [],
      elderSign: (_s, i) => ({
        modifier: 2,
        onSuccess: [continuation(code, i.id, 'elderSign')],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step) =>
        step === 'elderSign' && !discardLocked(s, by)
          ? ask(
              by,
              [
                ...[...new Set(getInvestigator(s, by).discard)].map((c) => ({
                  label: 'choice.recoveryReturn',
                  params: { card: cardName(c) },
                  then: [{ type: 'DiscardToHand' as const, investigator: by, code: c }],
                })),
              ],
              true,
            )
          : [],
    })
    return
  }
  if (code === '03016') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) =>
        t.type === 'enemyDefeated' &&
        getInvestigator(s, by).location !== null &&
        getInvestigator(s, by).location === t.enemy.location &&
        !t.enemy.traits?.includes('Elite') &&
        (!t.enemy.owner || !discardLocked(s, t.enemy.owner))
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                target: { type: 'hand' as const, code },
                then: [
                  {
                    type: 'PlayCard' as const,
                    investigator: by,
                    code,
                    effect: [
                      { type: 'EnemyToVictory' as const, enemy: t.enemy.id, defeated: t.enemy },
                      { type: 'EventToVictory' as const, investigator: by, code, points: 1 },
                    ],
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '03017') {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: cardName(code),
        traits: ['Humanoid', 'Monster', 'Ghoul'],
        fight: 3,
        health: 3,
        evade: 2,
        damage: 1,
        horror: 1,
        keywords: ['hunter'],
        prey: { type: 'only', investigator: '03005' },
      },
    })
    registerEnemy({ code, locksEngagedDiscard: true })
    return
  }
  throw Error('Unreviewed Yorick card ' + code)
}
