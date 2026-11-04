// RR: Play, Costs, Forced Abilities, Player Order, One at a Time.
import {
  canPlayByEffect,
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type GameState,
  type Trigger,
  type Asset,
} from '@lcg/engine'
import { ask, continuation, cardName, local, draw } from './common'
const hand = (s: GameState, by: string) => [...new Set(getInvestigator(s, by).hand)]
export function registerMultiPlay(code: string): boolean {
  if (!['09039', '10103', '11041', '08019'].includes(code)) return false
  const weave = code === '10103',
    geared = code === '08019'
  registerPlayerCard({
    code,
    ...(weave ? { additionalPlayActions: 1 } : {}),
    ...(geared
      ? {
          permanent: {},
          forced: (_s: GameState, t: Trigger, a: Asset) =>
            t.type === 'turnBegins' && t.investigator === a.owner && a.form !== 'used'
              ? [
                  { type: 'SetAssetForm' as const, asset: a.id, form: 'used' },
                  { type: 'LoseActions' as const, investigator: a.owner, amount: 3 },
                  continuation(code, a.owner, 'assets', { remaining: -1 }),
                ]
              : [],
        }
      : {}),
    ...(!geared
      ? {
          play: (_s: GameState, by: string) => [
            continuation(code, by, weave ? 'reveal' : code === '11041' ? 'parity' : 'assets', {
              remaining: 4,
              cards: '[]',
            }),
          ],
        }
      : {}),
    effect: (s, by, step, data) => {
      if (step === 'assets') {
        const remaining = Number(data.remaining)
        if (remaining === 0) return []
        return ask(
          by,
          [
            ...(geared ? [getInvestigator(s, by)] : local(s, by)).flatMap((i) =>
              hand(s, i.id)
                .filter(
                  (c) =>
                    playerCardDef(c)?.type === 'asset' &&
                    (!geared || playerCardDef(c)?.traits.includes('Item')) &&
                    canPlayByEffect(s, i.id, c, 'hand', false, 1),
                )
                .map((c) => ({
                  label: 'choice.eventPlay',
                  params: { name: i.name, card: cardName(c) },
                  then: [
                    {
                      type: 'PlayCard' as const,
                      investigator: i.id,
                      code: c,
                      byEffect: true,
                      discount: 1,
                    },
                    continuation(code, by, 'assets', {
                      remaining: remaining < 0 ? -1 : remaining - 1,
                    }),
                  ],
                })),
            ),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      }
      if (step === 'reveal') {
        const cards = JSON.parse(String(data.cards ?? '[]')) as string[]
        return ask(
          by,
          [
            ...(cards.length < 3
              ? hand(s, by)
                  .filter(
                    (c) =>
                      !playerCardDef(c)?.weakness &&
                      playerCardDef(c)?.type === 'event' &&
                      playerCardDef(c)?.traits.includes('Spell') &&
                      !cards.some((k) => cardName(k) === cardName(c)),
                  )
                  .map((c) => ({
                    label: 'choice.eventReveal',
                    params: { card: cardName(c) },
                    then: [
                      continuation(code, by, 'reveal', { cards: JSON.stringify([...cards, c]) }),
                    ],
                  }))
              : []),
            {
              label: 'choice.eventFinishReveal',
              then: [continuation(code, by, 'weave', { cards: JSON.stringify(cards) })],
            },
          ],
          true,
        )
      }
      if (step === 'weave') {
        const cards = JSON.parse(String(data.cards)) as string[]
        // Recompute after the full preceding event: resources and legal targets may change.
        return ask(
          by,
          cards
            .filter((c) => canPlayByEffect(s, by, c, 'hand', false, 1))
            .map((c) => ({
              label: 'choice.eventPlay',
              params: { name: getInvestigator(s, by).name, card: cardName(c) },
              then: [
                {
                  type: 'PlayCard' as const,
                  investigator: by,
                  code: c,
                  byEffect: true,
                  discount: 1,
                  skillBonus: 2,
                },
                continuation(code, by, 'weave', {
                  cards: JSON.stringify(cards.filter((x) => x !== c)),
                }),
              ],
            })),
          true,
        )
      }
      if (step === 'parity')
        return ask(
          by,
          [0, 1].map((parity) => ({
            label: parity ? 'choice.eventOdd' : 'choice.eventEven',
            then: [continuation(code, by, 'cosmicReveal', { parity })],
          })),
          true,
        )
      if (step === 'cosmicReveal') {
        const lead = leadInvestigator(s)?.id,
          at = s.investigators.findIndex((i) => i.id === lead)
        const ordered = [
          ...s.investigators.slice(Math.max(0, at)),
          ...s.investigators.slice(0, Math.max(0, at)),
        ].filter((i) => !i.eliminated)
        const reveals = ordered.map((i) => ({
          id: i.id,
          cards: hand(s, i.id).filter((c) => {
            const def = playerCardDef(c)
            return (
              !def?.weakness &&
              def?.cost !== undefined &&
              !def.printedCostX &&
              def.cost % 2 === Number(data.parity)
            )
          }),
        }))
        return [
          {
            type: 'Ask',
            investigator: by,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.eventCosmicReveal',
              alwaysAsk: true,
              choices: [
                ...reveals.flatMap((i) =>
                  i.cards.map((c) => ({
                    label: 'choice.eventRevealedCard',
                    params: {
                      name: getInvestigator(s, i.id).name,
                      card: cardName(c),
                      n: getInvestigator(s, i.id).hand.filter((x) => x === c).length,
                    },
                    target: { type: 'hand' as const, code: c },
                    then: [
                      continuation(code, by, 'cosmic', {
                        reveals: JSON.stringify(reveals),
                        index: 0,
                      }),
                    ],
                  })),
                ),
                {
                  label: 'choice.continue',
                  then: [
                    continuation(code, by, 'cosmic', {
                      reveals: JSON.stringify(reveals),
                      index: 0,
                    }),
                  ],
                },
              ],
            },
          },
        ]
      }
      if (step === 'cosmic') {
        const reveals = JSON.parse(String(data.reveals)) as { id: string; cards: string[] }[],
          index = Number(data.index),
          next = reveals[index]
        if (!next) return []
        const again = continuation(code, by, 'cosmic', {
          reveals: String(data.reveals),
          index: index + 1,
        })
        if (getInvestigator(s, next.id).eliminated) return [again]
        const choices: Choice[] = [
          { label: 'choice.eventDraw', then: [draw(next.id), again] },
          ...next.cards
            .filter((c) => canPlayByEffect(s, next.id, c, 'hand'))
            .map((c) => ({
              label: 'choice.eventPlay',
              params: { name: getInvestigator(s, next.id).name, card: cardName(c) },
              then: [
                { type: 'PlayCard' as const, investigator: next.id, code: c, byEffect: true },
                again,
              ],
            })),
          { label: 'choice.skip', then: [again] },
        ]
        return ask(next.id, choices, true)
      }
      return []
    },
  })
  return true
}
