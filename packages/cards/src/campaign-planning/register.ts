// RR: Campaign Play, Permanent, Deckbuilding, Experience, Equipment Slots, Skill Icons.
import { getInvestigator, registerPlayerCard, type SlotType, type Message } from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
const permanents = new Set([
  '02110',
  '03308',
  '04109',
  '06167',
  '08031',
  '08046',
  '08059',
  '11095',
  '10132',
])
export function registerPlanning(code: string): void {
  registerPlayerCard({
    code,
    ...(permanents.has(code) ? { permanent: {} } : {}),
    ...(['08031', '08046', '08059', '11095'].includes(code) ? { purchaseAtCreation: true } : {}),
    ...(code === '11095' ? { cannotEarnExperience: true } : {}),
    ...(code === '08031' ? { upkeepDraw: { amount: 2, discard: 1 } } : {}),
    ...(code === '10109'
      ? {
          handSizeInHand: -3,
          cannotPlayFromHand: true,
          canPlay: () => false,
          whenGameEndsInHand: (s, by): Message[] => [
            {
              type: 'RecordNote',
              note: 'peltShipment:' + by,
              value: String(getInvestigator(s, by).hand.filter((c) => c === code).length),
            },
          ],
        }
      : {}),
    ...(code === '10132'
      ? {
          // FAQ 1.24 / Rules Form January 2024: declare now, reassess when an asset enters.
          forced: (s, t, a): Message[] =>
            t.type === 'afterAssetEntersPlay' && s.assets[t.asset]?.owner === a.owner
              ? [
                  {
                    type: 'Ask',
                    investigator: a.owner,
                    question: {
                      kind: 'chooseOne',
                      prompt: 'prompt.flexibleSlot',
                      alwaysAsk: true,
                      choices: (['hand', 'accessory', 'arcane'] as SlotType[]).map((slot) => ({
                        label: 'slot.' + slot,
                        then: [{ type: 'SetFlexibleSlot' as const, asset: a.id, slot }],
                      })),
                    },
                  },
                ]
              : [],
          flexibleSlots: [
            {
              slots: ['hand', 'accessory', 'arcane'] as ('hand' | 'accessory' | 'arcane')[],
              count: 1,
              traits: ['Blessed', 'Cursed'],
            },
          ],
        }
      : {}),
    ...(code === '54007'
      ? {
          extraSlots: { arcane: 1 },
          interchangeableSlots: ['arcane', 'accessory'] as ('arcane' | 'accessory')[],
        }
      : {}),
    ...(code === '54012' ? { extraSlots: { tarot: 1 }, tarotIcons: 2 } : {}),
    ...(['54007', '54012'].includes(code)
      ? {
          openingHandReactions: (_s, by, hand) =>
            hand
              .filter((c) => c === code)
              .map((_, n) => ({
                key: 'opening:' + code + ':' + by + ':' + n,
                investigator: by,
                label: 'choice.windowPut',
                params: { card: cardName(code) },
                target: { type: 'hand' as const, code },
                then: [
                  { type: 'PutAssetIntoPlay' as const, investigator: by, code, fromHand: true },
                ],
              })),
        }
      : {}),
  })
}
