// RR: Reaction Opportunities, Enters Play, Play, Search, Equipment Slots, Opening Hand.
import { registerPlayerCard, uniqueAssetInPlay } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
export function registerSlotSearch(code: string): void {
  if (!['05283', '60260', '60181'].includes(code)) throw Error('Unreviewed search support ' + code)
  const anna = code === '05283',
    vest = code === '60181'
  registerPlayerCard({
    code,
    ...(anna
      ? {
          extraSlots: { tarot: 2 },
          openingHandReactions: (s, by, hand) =>
            uniqueAssetInPlay(s, code)
              ? []
              : hand
                  .filter((c) => c === code)
                  .map((_, n) => ({
                    key: `opening:${code}:${by}:${n}`,
                    investigator: by,
                    label: 'choice.windowPut',
                    params: { card: cardName(code) },
                    target: { type: 'hand' as const, code },
                    then: [
                      { type: 'PutAssetIntoPlay' as const, investigator: by, code, fromHand: true },
                    ],
                  })),
        }
      : {
          restrictedSlots: [{ slot: 'hand' as const, count: 1, trait: vest ? 'Firearm' : 'Tome' }],
        }),
    reactions: (_s, t, a) =>
      (
        vest
          ? t.type === 'afterPlayAsset' && t.asset === a.id && t.investigator === a.owner
          : t.type === 'afterAssetEntersPlay' && t.asset === a.id && t.investigator === a.owner
      )
        ? [
            {
              key: `${a.id}:search`,
              investigator: a.owner,
              label: 'choice.slotSearch',
              params: { card: cardName(code) },
              then: [
                {
                  type: 'SearchDeck',
                  investigator: a.owner,
                  ...(!anna ? { top: vest ? 9 : 6 } : {}),
                  traits: anna ? ['Tarot'] : vest ? ['Firearm', 'Upgrade'] : ['Tome'],
                  to: anna ? 'put' : 'hand',
                  ...(vest ? { anyType: true } : {}),
                  optional: true,
                },
              ],
            },
          ]
        : [],
  })
}
