// RR: Fight, Parley, Additional Costs, Remaining Health, Damage, Defeat.
import {
  enemiesAt,
  getInvestigator,
  registerPlayerCard,
  playerCardDef,
  type Message,
} from '@lcg/engine'
import { registerBasicEvent, testChoices, basicTest, elite } from '../basic-events/register'
import { ask, continuation, cardName, local, gain, investigatorTraits } from './common'
export function registerFieldParley(code: string): boolean {
  if (code === '60266') {
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      additionalPlayDiscard: { max: 2 },
      canPlay: (s, by) =>
        testChoices({ action: 'fight' }, { state: s, investigator: by, code }).length > 0,
      play: (s, by, _x, _f, discarded = 0) =>
        testChoices(
          { action: 'fight', modifier: 2 * discarded, extraDamage: discarded },
          { state: s, investigator: by, code },
        ),
    })
    return true
  }
  if (code === '11105') {
    registerPlayerCard({
      code,
      requiredInvestigatorTraits: investigatorTraits[code]!,
      parley: true,
      canPlay: (s, by) => enemiesAt(s, getInvestigator(s, by).location!).length > 0,
      play: (s, by) =>
        ask(
          by,
          enemiesAt(s, getInvestigator(s, by).location!).map((e) => ({
            label: 'choice.enemy',
            params: { enemy: e.name },
            then: [
              {
                type: 'DamageEnemy' as const,
                enemy: e.id,
                amount: elite(e) ? 5 : 10,
                by,
              },
              { type: 'RemoveFromDiscard' as const, investigator: by, code, playedEvent: true },
            ],
          })),
        ),
    })
    return true
  }
  if (['60160', '60274'].includes(code)) {
    registerPlayerCard({
      code,
      parley: true,
      canPlay: (s, by) =>
        enemiesAt(s, getInvestigator(s, by).location!).some((e) => code === '60160' || !elite(e)),
      play: (s, by) =>
        ask(
          by,
          enemiesAt(s, getInvestigator(s, by).location!)
            .filter((e) => code === '60160' || !elite(e))
            .map((e) => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              then: [
                {
                  type: 'BeginSkillTest' as const,
                  investigator: by,
                  skill: code === '60160' ? ('combat' as const) : ('intellect' as const),
                  difficulty: Math.max(0, e.maxHealth - e.damageTaken),
                  modifier: code === '60160' ? 0 : 2,
                  tags: ['parley'],
                  kind: {
                    type: 'effect' as const,
                    source: code,
                    onSuccess:
                      code === '60160'
                        ? [
                            { type: 'EvadeEnemy' as const, enemy: e.id, by },
                            { type: 'DiscoverClues' as const, investigator: by, amount: 1 },
                          ]
                        : [
                            {
                              type: 'PutEnemyOnEncounterDeck' as const,
                              enemy: e.id,
                              shuffle: true,
                            },
                          ],
                    onFail: [],
                    onFailEach: [],
                  },
                },
              ],
            })),
        ),
    })
    return true
  }
  if (code === '60161') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) =>
        t.type === 'enemyDefeated' && t.enemy.location === getInvestigator(s, by).location
          ? [
              {
                key: code + ':' + by,
                investigator: by,
                label: 'choice.eventBounty',
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: [
                      continuation(code, by, 'bounty', {
                        remaining: Math.min(6, t.enemy.health),
                        assigned: '{}',
                      }),
                    ],
                  },
                ],
              },
            ]
          : [],
      play: (_s, by, x = 0) => [continuation(code, by, 'bounty', { remaining: x, assigned: '{}' })],
      effect: (s, by, _step, data) => {
        const left = Number(data.remaining),
          assigned = JSON.parse(String(data.assigned)) as Record<string, number>
        if (left <= 0) return Object.entries(assigned).map(([id, n]) => gain(id, n))
        return ask(
          by,
          local(s, by).map((i) => ({
            label: 'choice.eventAllocate',
            params: { name: i.name, n: left },
            then: [
              continuation(code, by, 'bounty', {
                remaining: left - 1,
                assigned: JSON.stringify({ ...assigned, [i.id]: (assigned[i.id] ?? 0) + 1 }),
              }),
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  if (code === '11040') {
    registerBasicEvent(
      code,
      { action: 'investigate', onSuccess: (ctx) => [continuation(code, ctx.investigator, 'uses')] },
      {
        play: (s, by) => [
          {
            ...(basicTest(
              { action: 'investigate', onSuccess: () => [continuation(code, by, 'uses')] },
              { state: s, investigator: by, code },
            ) as Extract<Message, { type: 'BeginSkillTest' }>),
            trackReveals: true,
          },
        ],
        effectReactions: (s, t, by) =>
          t.type === 'whenRevealChaosToken' &&
          t.investigator === by &&
          s.skillTest?.revealCount === 1 + (s.skillTest?.ignoredTokens?.length ?? 0) &&
          !s.skillTest.abilityCounts?.[code]
            ? [
                {
                  key: code + ':cancel',
                  investigator: by,
                  label: 'choice.eventCancelToken',
                  then: [{ type: 'CancelRevealedToken', redraw: true, use: code }],
                },
              ]
            : [],
        effect: (s, by) => {
          const margin = (s.skillTest?.modifiedSkill ?? 0) - (s.skillTest?.difficulty ?? 0),
            amount = [1, 3].includes(margin) ? 2 : 1
          return ask(
            by,
            Object.values(s.assets)
              .filter(
                (a) =>
                  local(s, by).some((i) => i.id === a.owner) &&
                  ['charge', 'secret'].includes(playerCardDef(a.code)?.uses?.type ?? ''),
              )
              .map((a) => ({
                label: 'choice.eventAddUses',
                params: { card: cardName(a.code), n: amount },
                then: [{ type: 'AddUses' as const, asset: a.id, amount }],
              })),
            true,
          )
        },
      },
    )
    return true
  }
  return false
}
