import {
  getInvestigator,
  registerPlayerCards,
  registerTreachery,
  scenarioBehavior,
  tekeliliCopies,
  type TreacheryBehavior,
  type Message,
} from '@lcg/engine'
import { horror } from './card-08723'
import { damage } from './card-08724'
import { discard } from './card-08725'
import { resources } from './card-08726'
import { action } from './card-08727'
import { clue } from './card-08728'
import { asset } from './card-08729'

const revelations: Record<keyof typeof tekeliliCopies, TreacheryBehavior['revelation']> = {
  '08723': horror,
  '08724': damage,
  '08725': discard,
  '08726': resources,
  '08727': action,
  '08728': clue,
  '08729': asset,
}

export function registerTekelili(): void {
  const codes = Object.keys(revelations) as (keyof typeof revelations)[]
  registerPlayerCards(
    codes.map((code) => ({
      code,
      name: 'Tekeli-li',
      type: 'treachery',
      class: 'neutral',
      traits: ['Madness'],
      weakness: 'weakness',
      story: true,
    })),
  )
  for (const code of codes)
    registerTreachery({
      code,
      revelation: (state, investigator, self) => {
        const location = getInvestigator(state, investigator).location
        const theatre = location === '08564'
        const resolved: Message[] = [
          ...Array.from(
            {
              length:
                1 +
                (theatre ? 1 : 0) +
                Object.values(state.treacheries).filter(
                  (card) =>
                    card.code === '08703' &&
                    card.placement.type === 'threatArea' &&
                    card.placement.investigator === investigator &&
                    !scenarioBehavior(state.scenarioId)?.blanksTreachery?.(state, card),
                ).length,
            },
            () => revelations[code](state, investigator, self),
          ).flat(),
          {
            type: 'ReturnTekelili',
            treachery: self.id,
            ...(location === '08568' ? { shuffleIntoDeck: true } : {}),
          },
          ...(theatre
            ? [{ type: 'DiscoverClues', investigator, location, amount: 1 } satisfies Message]
            : []),
        ]
        // Miasmic Crystal: an investigator at this location may cancel it (bottom of the deck).
        const crystal = Object.values(state.assets).find(
          (asset) =>
            asset.code === '08617' &&
            asset.uses > 0 &&
            location !== null &&
            getInvestigator(state, asset.owner).location === location,
        )
        if (!crystal) return resolved
        return [
          {
            type: 'Ask',
            investigator: crystal.owner,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.edgeOfTheEarth.peaksCrystal',
              choices: [
                {
                  label: 'choice.edgeOfTheEarth.peaksCrystalUse',
                  then: [
                    { type: 'SpendUses', asset: crystal.id, amount: 1 },
                    { type: 'ReturnTekelili', treachery: self.id },
                    { type: 'DrawCards', investigator, amount: 1 },
                  ],
                },
                { label: 'choice.edgeOfTheEarth.peaksCrystalKeep', then: resolved },
              ],
            },
          },
        ]
      },
    })
}
