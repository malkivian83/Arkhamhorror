// RR: Search, Spawn, Draw, Instead, Revelation, Dilemma, Then, Chaos Tokens.
import {
  enemyMaxHealth,
  scenarioBehavior,
  poolTokensAvailable,
  registerTreachery,
  type EncounterCard,
  type GameState,
  type Message,
  type Choice,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  continuation,
  mayParticipate,
} from '../advanced-tests/common'
type Data = Record<string, string | number | boolean>
const cards = (d: Data, key = 'cards') => JSON.parse(String(d[key] ?? '[]')) as EncounterCard[]
const hunt = (code: string, by: string): Message => ({
  type: 'SearchEncounterForSpawn',
  investigator: by,
  top: code === '03263' || code === '09068' ? 9 : 1000000,
  ...(code === '11053' ? { includeDiscard: true, exhausted: true } : {}),
  ...(['09068', '11053'].includes(code) ? { nonElite: true } : {}),
  then: continuation(code, by, 'spawned') as Extract<Message, { type: 'PlayerCardEffect' }>,
  ...(code === '03263'
    ? { ifNone: [{ type: 'DrawEncounterCard' as const, investigator: by }] }
    : {}),
})
const active = (s: GameState) => s.investigators.filter((i) => !i.eliminated && i.location !== null)
export function registerEncounterSearch(code: string): void {
  if (['03263', '08028', '09068', '11053'].includes(code)) {
    registerPlayerCard({
      code,
      ...(['03263', '08028'].includes(code)
        ? {
            observesEncounterDraw: true,
            canPlay: () => false,
            handReactions: (s, t, by) =>
              t.type === 'wouldDrawTopEncounter' &&
              t.investigator === by &&
              s.phase === 'mythos' &&
              mayParticipate(s, by)
                ? [
                    {
                      key: 'hand:' + code,
                      investigator: by,
                      label: 'ability.playCard',
                      params: { card: cardName(code) },
                      then: [
                        {
                          type: 'PlayCard',
                          investigator: by,
                          code,
                          effect: [
                            {
                              type: 'ReplaceTopEncounterDraw',
                              investigator: by,
                              then: [hunt(code, by)],
                            },
                          ],
                        },
                      ],
                    },
                  ]
                : [],
          }
        : {
            ...(code === '11053' ? { parley: true } : {}),
            canPlay: (s: GameState) =>
              s.encounterDeck.length > 0 ||
              (code === '11053' &&
                s.encounterDiscard.some((c) => c.kind === 'enemy' && !c.traits?.includes('Elite'))),
            play: (_s: GameState, by: string) => [hunt(code, by)],
          }),
      effect: (s, by, step, d) => {
        const e = s.enemies[String(d.enemy)]
        if (step !== 'spawned' || !e) return []
        if (code === '08028')
          return [{ type: 'AttachPlayerCardToEnemy', investigator: by, code, enemy: e.id }]
        if (code === '09068')
          return [
            { type: 'DiscoverClues', investigator: by, amount: 1 },
            { type: 'GainResources', investigator: by, amount: enemyMaxHealth(s, e) },
          ]
        if (code === '11053')
          return [
            {
              type: 'DrawCards',
              investigator: by,
              amount:
                Math.max(
                  0,
                  e.damage + (scenarioBehavior(s.scenarioId)?.enemyDamageModifier?.(s, e) ?? 0),
                ) +
                Math.max(
                  0,
                  e.horror + (scenarioBehavior(s.scenarioId)?.enemyHorrorModifier?.(s, e) ?? 0),
                ),
            },
          ]
        return []
      },
    })
    if (code === '08028')
      registerTreachery({
        code,
        revelation: () => [],
        reactions: (s, t, a) =>
          t.type === 'enemyDefeated' &&
          t.by === a.owner &&
          a.owner &&
          a.placement.type === 'enemy' &&
          a.placement.enemy === t.enemy.id &&
          mayParticipate(s, a.owner)
            ? [
                {
                  key: a.id + ':hunt',
                  investigator: a.owner,
                  label: 'ability.advancedTest',
                  params: { card: cardName(code) },
                  then: [{ type: 'GainResources', investigator: a.owner, amount: 3 }],
                },
              ]
            : [],
      })
    return
  }
  if (code === '10093') {
    registerPlayerCard({
      code,
      additionalPlayActions: 1,
      canPlay: (s) => s.encounterDeck.length > 0,
      play: (_s, by) => [
        {
          type: 'InspectDeck',
          count: 5,
          then: continuation(code, by, 'bottom') as Extract<Message, { type: 'PlayerCardEffect' }>,
        },
      ],
      effect: (s, by, step, d) => {
        const rest = cards(d),
          bottom = cards(d, 'bottom'),
          top = cards(d, 'top')
        if (step === 'bottom')
          return ask(
            by,
            [
              ...(poolTokensAvailable(s, 'curse') > 0
                ? rest.map((c, n): Choice => ({
                    label: 'choice.encounterPlaceBottom',
                    params: { card: c.name, n: n + 1 },
                    then: [
                      { type: 'AddChaosTokens', tokens: ['curse'] },
                      continuation(code, by, 'bottom', {
                        cards: JSON.stringify(rest.filter((_, i) => i !== n)),
                        bottom: JSON.stringify([...bottom, c]),
                      }),
                    ],
                  }))
                : []),
              {
                label: 'choice.encounterFinishBottom',
                then: [
                  continuation(code, by, 'order', {
                    cards: JSON.stringify(rest),
                    bottom: JSON.stringify(bottom),
                    top: '[]',
                  }),
                ],
              },
            ],
            true,
          )
        if (step !== 'order') return []
        if (!rest.length) return [{ type: 'ReturnInspectedCards', top, bottom }]
        return ask(
          by,
          rest.map((c, n) => ({
            label: 'choice.encounterTopOrder',
            params: { card: c.name, n: n + 1 },
            then: [
              continuation(code, by, 'order', {
                cards: JSON.stringify(rest.filter((_, i) => i !== n)),
                bottom: JSON.stringify(bottom),
                top: JSON.stringify([...top, c]),
              }),
            ],
          })),
          true,
        )
      },
    })
    return
  }
  if (code === '09111') {
    registerPlayerCard({
      code,
      dilemma: true,
      canPlay: () => false,
      revelation: (_s, by) => [
        {
          type: 'InspectDeck',
          count: 3,
          then: continuation(code, by, 'draw') as Extract<Message, { type: 'PlayerCardEffect' }>,
        },
      ],
      effect: (s, by, step, d) => {
        if (step === 'draw') {
          const found = cards(d)
          return ask(
            by,
            found.flatMap((c, n) =>
              active(s).map((i) => ({
                label: 'choice.encounterBeastDraw',
                params: { card: c.name, name: i.name, n: n + 1 },
                then: [
                  ...found
                    .filter((_, index) => index !== n)
                    .map((card): Message => ({ type: 'MoveInspectedCard', card, to: 'discard' })),
                  {
                    type: 'ResolveEncounterCard' as const,
                    investigator: i.id,
                    card: c,
                    fromEncounterDeck: true,
                  },
                  continuation(code, by, 'clue'),
                ],
              })),
            ),
            true,
          )
        }
        if (step === 'clue')
          return ask(
            by,
            active(s).flatMap((i) =>
              Object.values(s.locations)
                .filter((l) => l.revealed && l.clues > 0)
                .map((l) => ({
                  label: 'choice.encounterBeastClue',
                  params: { name: i.name, location: l.name },
                  target: { type: 'location' as const, id: l.id },
                  then: [
                    {
                      type: 'DiscoverClues' as const,
                      investigator: i.id,
                      location: l.id,
                      amount: 1,
                    },
                  ],
                })),
            ),
            true,
          )
        return []
      },
    })
    return
  }
  throw Error('Unreviewed encounter search ' + code)
}
