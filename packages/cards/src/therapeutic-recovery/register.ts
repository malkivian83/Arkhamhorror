// RR: Reveal, Draw, Revelation, Heal, Ownership and Control, Discard Pile.
import {
  registerPlayerCard,
  playerCardDef,
  getInvestigator,
  scenarioBehavior,
  type GameState,
  type Message,
  type Choice,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
const read = (x: string | number | boolean | undefined): string[] => JSON.parse(String(x ?? '[]'))
const local = (s: GameState, by: string) =>
  s.investigators.filter(
    (i) => !i.eliminated && i.location !== null && i.location === getInvestigator(s, by).location,
  )
const canDraw = (s: GameState, by: string) =>
  !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, by)
export function registerTherapy(code: string): void {
  if (code === '60577') {
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        !Object.values(s.enemies).some((e) => e.location === getInvestigator(s, by).location),
      play: (_s, by) => [continuation(code, by, 'recover', { selected: '[]' })],
      effect: (s, by, step, data) => {
        if (step !== 'recover') return []
        const selected = read(data.selected),
          available = [...getInvestigator(s, by).discard]
        for (const c of selected) {
          const n = available.indexOf(c)
          if (n >= 0) available.splice(n, 1)
        }
        const finish: Message[] = [
          { type: 'ShuffleCardsIntoDeck', investigator: by, cards: selected, fromDiscard: true },
          { type: 'DrawCards', investigator: by, amount: 1 },
        ]
        if (selected.length >= 3) return finish
        const choices: Choice[] = [
          ...[...new Set(available)]
            .filter((c) => {
              const def = playerCardDef(c)
              return def && (def.xp ?? 0) === 0 && ['event', 'skill'].includes(def.type)
            })
            .map((c) => ({
              label: 'choice.therapyRecover',
              params: { card: cardName(c) },
              then: [
                continuation(code, by, 'recover', { selected: JSON.stringify([...selected, c]) }),
              ],
            })),
          { label: 'choice.therapyFinish', then: finish },
        ]
        return ask(by, choices, true)
      },
    })
    return
  }
  if (!['60264', '60278'].includes(code)) throw Error('Unreviewed therapy ' + code)
  const group = code === '60278'
  registerPlayerCard({
    code,
    canPlay: (s, by) => local(s, by).some((i) => i.horror > 0 || i.deck.length > 0),
    play: (s, by) => [
      continuation(code, by, 'target', {
        remaining: JSON.stringify(local(s, by).map((i) => i.id)),
      }),
    ],
    effect: (s, by, step, data) => {
      const who = String(data.who ?? ''),
        cards = read(data.cards),
        remaining = read(data.remaining),
        top = read(data.top)
      const next = (step: string, changes: Record<string, string | number | boolean> = {}) =>
        continuation(code, by, step, { ...data, ...changes })
      const heal = (id: string): Message => ({
        type: 'Heal',
        investigator: id,
        damage: 0,
        horror: 2,
      })
      const returnCards = (cs: string[]): Message[] =>
        cs.length ? [{ type: 'ReturnInspectedCards', investigator: who, top: cs, bottom: [] }] : []
      const end: Message[] = group ? [next('target', { remaining: JSON.stringify(remaining) })] : []
      if (step === 'target') {
        const eligible = remaining.filter((id) => {
          const i = getInvestigator(s, id)
          return !i.eliminated && (group || i.horror > 0 || i.deck.length > 0)
        })
        if (!eligible.length) return []
        return ask(
          by,
          eligible.map((id) => ({
            label: 'choice.therapyTarget',
            params: { name: getInvestigator(s, id).name },
            then: [
              {
                type: 'InspectDeck',
                investigator: id,
                count: 3,
                then: next('revealed', {
                  remaining: JSON.stringify(group ? eligible.filter((x) => x !== id) : []),
                }) as Extract<Message, { type: 'PlayerCardEffect' }>,
              },
            ],
          })),
          true,
        )
      }
      if (step === 'revealed')
        return [
          {
            type: 'Log',
            key: 'choice.divinationSeen',
            params: { cards: cards.map(cardName).join(', ') },
          },
          next(group ? 'draw' : 'mode'),
        ]
      if (step === 'mode')
        return ask(
          who,
          [
            ...(cards.length && canDraw(s, who)
              ? [{ label: 'choice.therapyDraw', then: [next('draw')] }]
              : []),
            ...(cards.length > 0 || getInvestigator(s, who).horror > 0
              ? [{ label: 'choice.therapyHeal', then: [heal(who), next('order', { top: '[]' })] }]
              : []),
          ],
          true,
        )
      if (step === 'draw') {
        if (!cards.length || !canDraw(s, who))
          return [
            ...returnCards(cards),
            ...(cards.length ? [{ type: 'ShuffleDeck' as const, investigator: who }] : []),
            ...(group ? [heal(who)] : []),
            ...end,
          ]
        return ask(
          who,
          cards.map((card, index) => ({
            label: 'choice.therapyCard',
            params: { card: cardName(card) },
            then: [
              { type: 'MoveInspectedCard', investigator: who, card, to: 'hand', drawFound: true },
              next('drawn', { cards: JSON.stringify(cards.filter((_, n) => n !== index)) }),
            ],
          })),
          true,
        )
      }
      if (step === 'drawn')
        return [
          ...returnCards(cards),
          ...(cards.length ? [{ type: 'ShuffleDeck' as const, investigator: who }] : []),
          ...(group ? [heal(who)] : []),
          ...end,
        ]
      if (step === 'order') {
        if (!cards.length) return [...returnCards(top), ...end]
        return ask(
          who,
          cards.map((card, index) => ({
            label: 'choice.divinationNext',
            params: { card: cardName(card), n: top.length + 1 },
            then: [
              next('order', {
                cards: JSON.stringify(cards.filter((_, n) => n !== index)),
                top: JSON.stringify([...top, card]),
              }),
            ],
          })),
          true,
        )
      }
      return []
    },
  })
}
