// RR: Put into Play, Ownership and Control, Signature Cards, Delayed Effects, X.
import {
  allPlayerCardDefs,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  uniqueAssetInPlay,
  type GameState,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
const targets = (s: GameState, by: string, x?: number) =>
  s.investigators
    .filter((i) => !i.eliminated)
    .flatMap((i) =>
      [...new Set(i.discard)]
        .filter((code) => {
          const d = playerCardDef(code)
          const signature = allPlayerCardDefs().some(
            (c) => c.type === 'investigator' && c.signatures?.includes(code),
          )
          const b = Object.values(s.assets).filter((a) => a.owner === by)
          return (
            d?.type === 'asset' &&
            d.traits.includes('Ally') &&
            !d.weakness &&
            (!signature || !!playerCardDef(by)?.signatures?.includes(code)) &&
            !uniqueAssetInPlay(s, code) &&
            !(playerCardDef(code)?.deckLimit === 0) &&
            (!playerCardDef(code)?.unique || !b.some((a) => a.code === code)) &&
            (x === undefined || (d.cost ?? 0) === x)
          )
        })
        .map((code) => ({ owner: i.id, code })),
    )
export function registerChanceEncounter(code: string): void {
  const high = code === '03238'
  registerPlayerCard({
    code,
    ...(high
      ? {
          costX: true,
          xOptions: (s: GameState, by: string) => [
            ...new Set(targets(s, by).map((t) => playerCardDef(t.code)?.cost ?? 0)),
          ],
        }
      : {}),
    canPlay: (s, by) => targets(s, by).length > 0,
    play: (s, by, x) =>
      ask(
        by,
        targets(s, by, high ? (x ?? 0) : undefined).map((t) => ({
          label: 'choice.chanceAlly',
          params: { card: playerCardDef(t.code)!.name, name: getInvestigator(s, t.owner).name },
          then: [
            {
              type: 'PutAssetIntoPlay',
              investigator: by,
              code: t.code,
              fromDiscard: t.owner,
              ...(!high
                ? {
                    onEntered: continuation(code, by, 'entered') as Extract<
                      import('@lcg/engine').Message,
                      { type: 'PlayerCardEffect' }
                    >,
                  }
                : {}),
            },
          ],
        })),
      ),
    effect: (_s, _by, step, data) =>
      step === 'entered' && !high
        ? [{ type: 'AtEndOfRound', then: [{ type: 'DiscardAsset', asset: String(data.asset) }] }]
        : [],
  })
}
