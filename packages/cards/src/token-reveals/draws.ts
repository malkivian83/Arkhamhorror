// RR: Chaos Bag (revealing tokens outside a skill test), Exhaust, Actions.
import {
  registerPlayerCard,
  type ChaosToken,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { SYMBOLS } from './reveals'

type Data = Record<string, string | number | boolean> | undefined
const list = (value: unknown) => JSON.parse(String(value ?? '[]')) as ChaosToken[]
/** Reveal one more token; it stays out of the bag with the group until the effect ends. */
const reveal = (code: string, by: string, held: ChaosToken[], faces: ChaosToken[]): Message => ({
  type: 'RevealTokenOutsideTest',
  investigator: by,
  hold: true,
  then: continuation(code, by, 'token', {
    held: JSON.stringify(held),
    faces: JSON.stringify(faces),
  }) as Extract<Message, { type: 'PlayerCardEffect' }>,
})
const returnAll = (held: ChaosToken[]): Message[] =>
  held.length ? [{ type: 'AddChaosTokens', tokens: held, scenarioOnly: true }] : []
/** After each revealed token: its group (including tokens ignored by a replacement). */
function collect(data: Data): { held: ChaosToken[]; faces: ChaosToken[]; face: ChaosToken } {
  const face = data!.token as ChaosToken
  return {
    held: [...list(data!.held), data!.physical as ChaosToken, ...list(data!.ignored)],
    faces: [...list(data!.faces), face],
    face,
  }
}

/** 21 or Bust: skull/cultist/tablet/elder thing 5, auto-fail 10, elder sign 1 or 11. */
export function bustTotals(faces: ChaosToken[]): number[] {
  const value = (t: ChaosToken): number =>
    typeof t === 'number'
      ? Math.abs(t)
      : SYMBOLS.includes(t)
        ? t === 'autoFail'
          ? 10
          : 5
        : t === 'elderSign'
          ? 1
          : 0 // FAQ (EotE): frost, bless and curse have no value outside a skill test.
  const low = faces.reduce((n: number, t) => n + value(t), 0)
  return faces.includes('elderSign')
    ? [low, low + 10 * faces.filter((t) => t === 'elderSign').length]
    : [low]
}
export const bustReward = (total: number) =>
  total <= 18 ? 4 : total === 19 ? 5 : total === 20 ? 6 : total === 21 ? 9 : 0

export function registerRevealDraws(code: string): boolean {
  // Henry Wan: exhaust, reveal one token at a time until you stop or a symbol appears;
  // stopping gives a card or a resource per revealed token, a symbol gives nothing.
  if (code === '05155') {
    registerPlayerCard({
      code,
      abilities: (_s, self, by) =>
        self.exhausted
          ? []
          : [
              {
                key: `${self.id}:wan`,
                label: 'ability.henryWan',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                costs: [{ type: 'ExhaustAsset', asset: self.id }],
                then: [reveal(code, by, [], [])],
              },
            ],
      effect: (s: GameState, by, step, data) => {
        if (step === 'stop') {
          const held = list(data!.held),
            n = list(data!.faces).length
          return [
            ...returnAll(held),
            ...ask(
              by,
              Array.from({ length: n + 1 }, (_, draw) => ({
                label: 'choice.henryWanSplit',
                params: { draw, gain: n - draw },
                then: [
                  ...(draw ? [{ type: 'DrawCards' as const, investigator: by, amount: draw }] : []),
                  ...(n - draw
                    ? [{ type: 'GainResources' as const, investigator: by, amount: n - draw }]
                    : []),
                ],
              })),
              true,
            ),
          ]
        }
        const { held, faces, face } = collect(data)
        if (SYMBOLS.includes(face)) return returnAll(held)
        const group = { held: JSON.stringify(held), faces: JSON.stringify(faces) }
        const choices: Choice[] = [
          {
            label: 'choice.henryWanStop',
            params: { n: faces.length },
            then: [continuation(code, by, 'stop', group)],
          },
          ...(s.chaosBag.length
            ? [{ label: 'choice.revealAnother', then: [reveal(code, by, held, faces)] }]
            : []),
        ]
        return ask(by, choices, true)
      },
    })
    return true
  }
  // 21 or Bust: reveal tokens one at a time until you stop; the total (ignoring +/-)
  // decides the resources: 18 or less 4, 19 5, 20 6, 21 9, more than 21 nothing.
  if (code === '08048') {
    registerPlayerCard({
      code,
      play: (_s, by) => [reveal(code, by, [], [])],
      effect: (s: GameState, by, step, data) => {
        if (step === 'stop') {
          const faces = list(data!.faces)
          return [
            ...returnAll(list(data!.held)),
            ...ask(
              by,
              bustTotals(faces).map((total) => ({
                label: 'choice.bustTotal',
                params: { total, n: bustReward(total) },
                then: bustReward(total)
                  ? [
                      {
                        type: 'GainResources' as const,
                        investigator: by,
                        amount: bustReward(total),
                      },
                    ]
                  : [],
              })),
            ),
          ]
        }
        const { held, faces } = collect(data)
        const group = { held: JSON.stringify(held), faces: JSON.stringify(faces) }
        return ask(
          by,
          [
            {
              label: 'choice.bustStop',
              params: { total: bustTotals(faces).join('/') },
              then: [continuation(code, by, 'stop', group)],
            },
            ...(s.chaosBag.length
              ? [{ label: 'choice.revealAnother', then: [reveal(code, by, held, faces)] }]
              : []),
          ],
          true,
        )
      },
    })
    return true
  }
  return false
}
