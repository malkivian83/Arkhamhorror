// RR: Play by effect, Additional Actions, Slots, Forced Abilities, Choice, Discard, Then.
import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerInvestigator,
  registerTreachery,
  stuckInPlay,
  turnStartedAt,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  option,
  continuation,
  mayParticipate,
} from '../advanced-tests/common'
import { canGrant } from '../extra-actions/register'
const allies = (s: GameState, by: string) =>
  Object.values(s.assets).filter(
    (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Ally') && !stuckInPlay(s, a),
  )
const inHand = (s: GameState, by: string) =>
  getInvestigator(s, by).hand.filter(
    (c) => playerCardDef(c)?.type === 'asset' && playerCardDef(c)?.traits.includes('Ally'),
  )
const mark = (treachery: string, values: Record<string, string | number | boolean>): Message => ({
  type: 'SetTreacheryAbilityState',
  treachery,
  values,
})
export function registerForgottenInvestigator(code: string): void {
  if (code === '04001') {
    registerInvestigator({
      code,
      elderSign: (_s, i) => ({
        modifier: 2,
        immediate: [
          {
            type: 'SearchDeck',
            investigator: i.id,
            top: 3,
            traits: ['Ally'],
            cardType: 'asset',
            to: 'hand',
            drawFound: true,
            includeWeaknesses: true,
          },
        ],
      }),
      reactions: (s, t, i) =>
        t.type === 'turnBegins' && t.investigator === i.id && mayParticipate(s, i.id)
          ? [...new Set(inHand(s, i.id))]
              .filter((c) => canPlayByEffect(s, i.id, c, 'hand', false, 1, false, true, true))
              .map((c) => ({
                key: code + ':ally',
                investigator: i.id,
                label: 'ability.leoPlay',
                params: { card: cardName(c) },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: i.id,
                    code: c,
                    byEffect: true,
                    asFast: true,
                    noOpportunity: true,
                    discount: 1,
                  },
                ],
              }))
          : [],
    })
    return
  }
  if (code === '04002') {
    registerInvestigator({
      code,
      elderSign: (_s, i) => ({
        modifier: 1,
        after: ask(
          i.id,
          [
            { label: 'choice.ursulaMove', then: [{ type: 'ChooseMove', investigator: i.id }] },
            { label: 'choice.skip', then: [] },
          ],
          true,
        ),
      }),
      reactions: (s, t, i) =>
        t.type === 'afterMove' &&
        t.investigator === i.id &&
        canGrant(s, i.id, { types: ['investigate'] })
          ? [
              {
                key: code + ':investigate',
                investigator: i.id,
                label: 'ability.ursulaInvestigate',
                limit: { per: 'round' },
                then: [
                  {
                    type: 'TakeImmediateAction',
                    investigator: i.id,
                    rule: { types: ['investigate'] },
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '04006') {
    registerPlayerCard({ code, restrictedSlots: [{ slot: 'ally', count: 2, nonUnique: true }] })
    return
  }
  if (code === '04008') {
    registerPlayerCard({
      code,
      firstActionTypesSafe: ['move', 'investigate'],
      reactions: (_s, t, a) =>
        !a.exhausted &&
        (t.type === 'afterRevealLocation' || t.type === 'afterPutLocation') &&
        t.investigator === a.owner
          ? [
              option(a, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'DrawCards', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '04007') {
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        const t = s.treacheries[String(d.treachery)]
        return step === 'finish' && t && !t.abilityState?.discarded
          ? [{ type: 'ShuffleTreacheryIntoDeck', treachery: t.id, investigator: by }]
          : []
      },
    })
    registerTreachery({
      code,
      revelation: (s, by, t) => {
        const success = [mark(t.id, { discarded: true })],
          hand = inHand(s, by)
        return [
          mark(t.id, { discarded: false }),
          ...ask(
            by,
            [
              ...allies(s, by).map((a) => ({
                label: 'choice.discard',
                params: { card: cardName(a.code) },
                target: { type: 'asset' as const, id: a.id },
                then: [{ type: 'DiscardAsset' as const, asset: a.id, onDiscard: success }],
              })),
              ...(hand.length
                ? [
                    {
                      label: 'choice.bloodHand',
                      params: { n: hand.length },
                      then: [
                        {
                          type: 'DiscardCardsOfType' as const,
                          investigator: by,
                          cardType: 'asset',
                          trait: 'Ally',
                          all: true,
                          includeWeaknesses: true,
                          onDiscard: success,
                        },
                      ],
                    },
                  ]
                : []),
            ],
            true,
          ),
          continuation(code, by, 'finish', { treachery: t.id }),
        ]
      },
    })
    return
  }
  if (code === '04009') {
    registerPlayerCard({ code })
    registerTreachery({
      code,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      forced: (s, t, a) => {
        if (a.placement.type !== 'threatArea') return []
        const by = a.placement.investigator,
          turn = turnStartedAt(s)
        if (t.type === 'turnBegins' && t.investigator === by)
          return [
            mark(a.id, { location: '', turn, success: false }),
            ...ask(
              by,
              Object.values(s.locations)
                .filter((l) => l.id !== getInvestigator(s, by).location)
                .map((l) => ({
                  label: 'choice.location',
                  params: { location: l.name },
                  target: { type: 'location' as const, id: l.id },
                  then: [mark(a.id, { location: l.id, turn, success: false })],
                })),
              true,
            ),
          ]
        if (
          t.type === 'afterSkillTest' &&
          t.investigator === by &&
          t.kind === 'investigate' &&
          t.succeeded &&
          t.location === a.abilityState?.location &&
          a.abilityState?.turn === turn
        )
          return [mark(a.id, { success: true })]
        if (
          t.type === 'turnEnds' &&
          t.investigator === by &&
          a.abilityState?.turn === turn &&
          a.abilityState.location &&
          !a.abilityState.success
        )
          return [
            { type: 'TakeDamage', investigator: by, damage: 0, horror: 2 },
            { type: 'ShuffleTreacheryIntoDeck', treachery: a.id, investigator: by },
          ]
        return []
      },
    })
    return
  }
  throw Error('Unreviewed Forgotten Age investigator ' + code)
}
