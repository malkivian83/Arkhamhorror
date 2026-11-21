// RR: Evade, Replacement Effects, Triggered Abilities, Limits, Movement, Forced Attacks.
import {
  getInvestigator,
  getLocation,
  immuneToPlayerCards,
  moveBlocked,
  playerCardDef,
  registerEnemy,
  registerInvestigator,
  turnStartedAt,
} from '@lcg/engine'
import {
  ask,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { destinations } from '../dunwich-pilot/effects'

export function registerRitaCard(code: string): void {
  if (code === '05005') {
    registerInvestigator({
      code,
      elderSign: (s, i) => ({
        modifier: 2,
        immediate: [
          {
            type: 'SetInvestigatorAbilityState',
            investigator: i.id,
            values: { ritaUnlimitedRound: s.round },
          },
        ],
      }),
      reactions: (s, t, i) => {
        if (t.type !== 'afterEvade' || t.investigator !== i.id || !mayParticipate(s, i.id))
          return []
        const enemy = s.enemies[t.enemy]
        const choices = [
          ...(enemy && !immuneToPlayerCards(enemy)
            ? [
                {
                  label: 'choice.ritaDamage',
                  params: { enemy: enemy.name },
                  then: [
                    {
                      type: 'DamageEnemy' as const,
                      enemy: enemy.id,
                      by: i.id,
                      amount: 1,
                      source: { code },
                    },
                  ],
                },
              ]
            : []),
          ...(!moveBlocked(s, i.id) ? destinations(s, i.id) : []).map((location) => ({
            label: 'choice.ritaMove',
            params: { location: getLocation(s, location).name },
            then: [{ type: 'MoveTo' as const, investigator: i.id, location }],
          })),
        ]
        return choices.length
          ? [
              {
                key: code + ':evade',
                investigator: i.id,
                label: 'ability.ritaEvade',
                ...(i.abilityState?.ritaUnlimitedRound === s.round
                  ? {}
                  : { limit: { per: 'round' as const } }),
                then: ask(i.id, choices, true),
              },
            ]
          : []
      },
      replaceEvade: (s, i, enemy, message) => {
        if (
          s.activeTurn !== i.id ||
          s.phase !== 'investigation' ||
          i.abilityState?.ritaReplacementTurn !== turnStartedAt(s) ||
          immuneToPlayerCards(enemy)
        )
          return null
        return ask(
          i.id,
          [
            {
              label: 'choice.ritaDamage',
              params: { enemy: enemy.name },
              then: [
                {
                  ...message,
                  replacementResolved: true,
                  doNotExhaust: true,
                  doNotDisengage: true,
                  damageInstead: { amount: 1, code: '05016' },
                },
              ],
            },
            { label: 'choice.ritaNormalEvade', then: [{ ...message, replacementResolved: true }] },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === '05016') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => s.phase === 'investigation' && s.activeTurn === by,
      play: (s, by) => [
        {
          type: 'SetInvestigatorAbilityState',
          investigator: by,
          values: { ritaReplacementTurn: turnStartedAt(s) },
        },
        ...Object.values(s.enemies)
          .filter((e) => e.location === getInvestigator(s, by).location)
          .flatMap((e) => [
            { type: 'ReadyEnemy' as const, enemy: e.id },
            { type: 'EngageEnemy' as const, enemy: e.id, investigator: by },
          ]),
      ],
    })
    return
  }
  if (code === '05017') {
    registerPlayerCard({
      code,
      enemy: {
        kind: 'enemy',
        code,
        name: playerCardDef(code)!.name,
        traits: ['Humanoid', 'Cultist'],
        fight: 3,
        health: 3,
        evade: 3,
        damage: 1,
        horror: 1,
        keywords: ['alert', 'hunter'],
        prey: { type: 'only', investigator: '05005' },
      },
    })
    registerEnemy({
      code,
      forced: (_s, t, self) =>
        t.type === 'afterEvade' && t.enemy === self.id
          ? [
              {
                type: 'EnemyAttack',
                enemy: self.id,
                investigator: t.investigator,
                exhaustAfter: false,
                evenIfExhausted: true,
              },
            ]
          : [],
    })
    return
  }
  throw Error('Unreviewed Rita card ' + code)
}
