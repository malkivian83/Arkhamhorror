// RR: Look, Limbo, Draw, Revelation, Ownership and Control, Costs.
import {
  registerPlayerCard,
  getInvestigator,
  type Message,
  type Choice,
  type EncounterCard,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
type Card = string | EncounterCard
const read = (value: string | number | boolean | undefined): Card[] =>
  JSON.parse(String(value ?? '[]'))
const title = (c: Card) => (typeof c === 'string' ? cardName(c) : c.name)
export function registerScroll(code: string): void {
  if (!['05116', '05188', '05189'].includes(code)) throw Error('Unreviewed scroll ' + code)
  registerPlayerCard({
    code,
    abilities: (s, a) =>
      a.exhausted || a.uses < 1
        ? []
        : [
            ...s.investigators
              .filter((i) => !i.eliminated && i.deck.length)
              .flatMap((i) =>
                (code === '05189' ? [false, true] : [true]).map((bottom) => ({
                  key: `${a.id}:${i.id}:${bottom}`,
                  label: bottom ? 'choice.scrollLookBottom' : 'choice.scrollLookTop',
                  params: { name: i.name },
                  actions: 1,
                  provokes: true,
                  costs: [
                    { type: 'ExhaustAsset' as const, asset: a.id },
                    { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                  ],
                  then: [
                    {
                      type: 'InspectDeck' as const,
                      investigator: i.id,
                      count: code === '05188' ? 3 : 1,
                      fromBottom: bottom,
                      then: continuation(code, a.owner, 'look') as Extract<
                        Message,
                        { type: 'PlayerCardEffect' }
                      >,
                    },
                  ],
                })),
              ),
            ...(s.encounterDeck.length
              ? (code === '05189' ? [false, true] : [true]).map((bottom) => ({
                  key: `${a.id}:encounter:${bottom}`,
                  label: bottom ? 'choice.scrollEncounterBottom' : 'choice.scrollEncounterTop',
                  actions: 1,
                  provokes: true,
                  costs: [
                    { type: 'ExhaustAsset' as const, asset: a.id },
                    { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                  ],
                  then: [
                    {
                      type: 'InspectDeck' as const,
                      count: code === '05188' ? 3 : 1,
                      fromBottom: bottom,
                      then: continuation(code, a.owner, 'look') as Extract<
                        Message,
                        { type: 'PlayerCardEffect' }
                      >,
                    },
                  ],
                }))
              : []),
          ],
    effect: (s, by, step, data) => {
      const who = String(data.who ?? ''),
        cards = read(data.cards),
        top = read(data.top),
        bottom = read(data.bottom)
      const next = (step: string, remaining: Card[], t = top, b = bottom) =>
        continuation(code, by, step, {
          who,
          cards: JSON.stringify(remaining),
          top: JSON.stringify(t),
          bottom: JSON.stringify(b),
        })
      const finish = (t: Card[], b: Card[]): Message => ({
        type: 'ReturnInspectedCards',
        ...(who ? { investigator: who } : {}),
        top: t,
        bottom: b,
      })
      const move = (card: Card, to: 'discard' | 'hand'): Message => ({
        type: 'MoveInspectedCard',
        ...(who ? { investigator: who } : {}),
        card,
        to,
      })
      if (step === 'look')
        return [
          {
            type: 'Log',
            key: 'choice.divinationSeen',
            params: { cards: cards.map(title).join(', ') },
          },
          next(code === '05188' ? 'discard' : 'single', cards),
        ]
      if (step === 'single') {
        const card = cards[0]
        if (!card) return [finish([], [])]
        const choices: Choice[] = [
          { label: 'choice.scrollTop', params: { card: title(card) }, then: [finish([card], [])] },
          {
            label: 'choice.scrollBottom',
            params: { card: title(card) },
            then: [finish([], [card])],
          },
          {
            label: 'choice.scrollDiscard',
            params: { card: title(card) },
            then: [move(card, 'discard'), finish([], [])],
          },
          ...(who
            ? [
                {
                  label: 'choice.scrollHand',
                  params: { card: title(card), name: getInvestigator(s, who).name },
                  then: [move(card, 'hand'), finish([], [])],
                },
              ]
            : []),
        ]
        return ask(by, choices, true)
      }
      if (step === 'discard' || step === 'hand') {
        const stage = step === 'discard' ? 'hand' : 'arrange'
        return ask(
          by,
          [
            ...(step === 'discard' || who
              ? cards.map((card, index) => ({
                  label: step === 'discard' ? 'choice.scrollDiscard' : 'choice.scrollHand',
                  params: {
                    card: title(card),
                    ...(who ? { name: getInvestigator(s, who).name } : {}),
                  },
                  then: [
                    move(card, step === 'discard' ? 'discard' : 'hand'),
                    next(
                      stage,
                      cards.filter((_, n) => n !== index),
                    ),
                  ],
                }))
              : []),
            { label: 'choice.skip', then: [next(stage, cards)] },
          ],
          true,
        )
      }
      if (step !== 'arrange') return []
      if (!cards.length) return [finish(top, bottom)]
      return ask(
        by,
        cards.flatMap((card, index) => [
          {
            label: 'choice.scrollTop',
            params: { card: title(card) },
            then: [
              next(
                'arrange',
                cards.filter((_, n) => n !== index),
                [...top, card],
                bottom,
              ),
            ],
          },
          {
            label: 'choice.scrollBottom',
            params: { card: title(card) },
            then: [
              next(
                'arrange',
                cards.filter((_, n) => n !== index),
                top,
                [...bottom, card],
              ),
            ],
          },
        ]),
        true,
      )
    },
  })
}
