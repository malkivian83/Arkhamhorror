// RR: Look, Decks, Costs, Abilities, Horror, Doom. Looking is not drawing or searching.
import {
  registerPlayerCard,
  playerCardDef,
  getInvestigator,
  type GameState,
  type Message,
  type Choice,
  type Asset,
  type AbilityOption,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const deck = (s: GameState, who: string) => (who ? getInvestigator(s, who).deck : s.encounterDeck)
const nameAt = (s: GameState, who: string, index: number) => {
  const card = deck(s, who)[index]
  return typeof card === 'string' ? cardName(card) : (card?.name ?? '')
}
const targets = (s: GameState) => [
  ...(s.encounterDeck.length ? [''] : []),
  ...s.investigators.filter((i) => !i.eliminated && i.deck.length).map((i) => i.id),
]
const reorder = (
  who: string,
  count: number,
  order: number[],
  to: 'top' | 'bottom' | 'shuffle' = 'top',
): Message => ({
  type: 'ReorderDeck',
  ...(who ? { investigator: who } : {}),
  count,
  order,
  to,
})
const view = (s: GameState, by: string, who: string, count: number): Message => ({
  type: 'Log',
  key: 'choice.divinationSeen',
  params: { cards: Array.from({ length: count }, (_, i) => nameAt(s, who, i)).join(', ') },
})
// Scrying (0) and its identical reprint (01561, lot 133) use an [action] ability.
const ACTION_SCRYING = ['01061', '01561']
function ability(s: GameState, a: Asset): AbilityOption[] {
  if (a.exhausted || (a.code !== '02232' && a.uses < 1) || !targets(s).length) return []
  return [
    {
      key: a.id + ':inspect',
      label: 'choice.divinationUse',
      params: { card: cardName(a.code) },
      actions: ACTION_SCRYING.includes(a.code) ? 1 : 0,
      provokes: ACTION_SCRYING.includes(a.code),
      costs: [
        { type: 'ExhaustAsset', asset: a.id },
        ...(a.code === '02232' ? [] : [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }]),
      ],
      then: [continuation(a.code, a.owner, 'target', { asset: a.id })],
    },
  ]
}
export function registerDivination(code: string): void {
  const asset = ['01061', '03236', '02232'].includes(code)
  registerPlayerCard({
    code,
    ...(asset
      ? {
          ...(code === '01061'
            ? { abilities: (s: GameState, a: Asset) => ability(s, a) }
            : {
                fastOptions: (s: GameState, a: Asset) =>
                  ability(s, a).map((o) => ({
                    key: o.key,
                    investigator: a.owner,
                    label: o.label,
                    ...(o.params ? { params: o.params } : {}),
                    then: [...(o.costs ?? []), ...o.then],
                  })),
              }),
          ...(code === '02232'
            ? {
                skillModifier: (_s: GameState, _a: Asset, t: { skill: string }) =>
                  t.skill === 'intellect' ? 1 : 0,
              }
            : {}),
        }
      : {
          canPlay: (s: GameState) =>
            code === '60415' ? s.encounterDeck.length > 0 : targets(s).length > 0,
          play: (_s: GameState, by: string) => [
            continuation(code, by, code === '60415' ? 'peek' : 'target', { who: '' }),
          ],
        }),
    effect: (s, by, step, data) => {
      const who = String(data.who ?? ''),
        id = String(data.asset ?? ''),
        count = Math.min(
          Number(
            data.count ?? (code === '08066' ? 6 : code === '60415' ? 4 : code === '02232' ? 1 : 3),
          ),
          deck(s, who).length,
        )
      if (step === 'target')
        return ask(
          by,
          targets(s).map((w) => ({
            label: w ? 'choice.divinationDeck' : 'choice.divinationEncounter',
            ...(w ? { params: { name: getInvestigator(s, w).name } } : {}),
            then: [continuation(code, by, 'peek', { asset: id, who: w })],
          })),
          true,
        )
      if (step === 'peek') {
        if (!count) return []
        const seen = view(s, by, who, count)
        if (code === '60415')
          return [
            seen,
            {
              type: 'RevealTokenOutsideTest',
              investigator: by,
              then: continuation(code, by, 'token', { count }) as Extract<
                Message,
                { type: 'PlayerCardEffect' }
              >,
            },
          ]
        if (code === '02232')
          return [
            seen,
            ...ask(
              by,
              [
                ...(s.assets[id]?.owner === by
                  ? [
                      {
                        label: 'choice.divinationBury',
                        params: { card: cardName(code), seen: nameAt(s, who, 0) },
                        then: [
                          { type: 'PlaceDoomOnAsset' as const, asset: id, amount: 1 },
                          reorder(who, 1, [0], 'bottom'),
                        ],
                      },
                    ]
                  : []),
                { label: 'choice.skip', then: [] },
              ],
              true,
            ),
          ]
        return [
          seen,
          continuation(code, by, code === '08066' ? 'mode' : 'order', { who, count, order: '' }),
        ]
      }
      if (step === 'token') {
        const token = data.token
        return ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail'].includes(String(token))
          ? [
              reorder(
                '',
                count,
                Array.from({ length: count }, (_, i) => i),
                'shuffle',
              ),
            ]
          : [continuation(code, by, 'order', { who: '', count, order: '' })]
      }
      const finish: Message[] = []
      if (
        code === '03236' &&
        Array.from({ length: count }, (_, i) => deck(s, who)[i]).some((c) => {
          const traits = typeof c === 'string' ? playerCardDef(c)?.traits : c?.traits
          return traits?.some((t) => t === 'Terror' || t === 'Omen')
        })
      )
        finish.push({ type: 'AssignDamage', investigator: by, damage: 0, horror: 1, source: code })
      if (code === '08066' && who) finish.push(continuation(code, by, 'draw', { who }))
      if (step === 'mode')
        return ask(
          by,
          [
            {
              label: 'choice.divinationOrder',
              then: [continuation(code, by, 'order', { who, count, order: '' })],
            },
            {
              label: 'choice.divinationShuffle',
              then: [
                reorder(
                  who,
                  count,
                  Array.from({ length: count }, (_, i) => i),
                  'shuffle',
                ),
                ...finish,
              ],
            },
          ],
          true,
        )
      if (step === 'draw')
        return ask(
          who,
          [
            {
              label: 'choice.divinationDraw',
              then: [{ type: 'DrawCards', investigator: who, amount: 1 }],
            },
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      if (step !== 'order') return []
      const selected = String(data.order ?? '')
        .split(',')
        .filter(Boolean)
        .map(Number)
      if (selected.length === count) return [reorder(who, count, selected), ...finish]
      const choices: Choice[] = Array.from({ length: count }, (_, i) => i)
        .filter((i) => !selected.includes(i))
        .map((i) => ({
          label: 'choice.divinationNext',
          params: { card: nameAt(s, who, i), n: selected.length + 1 },
          then: [
            continuation(code, by, 'order', { who, count, order: [...selected, i].join(',') }),
          ],
        }))
      return ask(by, choices, true)
    },
  })
}
