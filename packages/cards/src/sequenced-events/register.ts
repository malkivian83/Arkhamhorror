import { getInvestigator, playerCardBehavior, playerCardDef, registerPlayerCard } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { assetsHere } from '../dunwich-pilot/helpers'

// RR: Draw Encounter Cards, Then, Discover Clues, Uses. A queued continuation
// reads the current location after the encounter and any test from its revelation have resolved.
export function registerSequencedEvent(code: string): void {
  if (code === '60115') {
    registerPlayerCard({
      code,
      handReactions: (_s, t, by) =>
        t.type !== 'enemyDefeated' || t.by !== by
          ? []
          : [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: playerCardDef(code)!.name },
                target: { type: 'hand', code },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: [{ type: 'DrawCards', investigator: by, amount: 2 }],
                  },
                ],
              },
            ],
    })
    return
  }
  registerPlayerCard({
    code,
    canPlay: (s) => code !== '01064' || s.encounterDeck.length + s.encounterDiscard.length > 0,
    play: (s, by) =>
      code === '01064'
        ? s.encounterDeck.length + s.encounterDiscard.length > 0
          ? [{ type: 'DrawEncounterCard', investigator: by }, continuation(code, by, 'clues')]
          : []
        : [continuation(code, by, 'allocate', { remaining: 4 })],
    effect: (s, by, step, data) => {
      const i = getInvestigator(s, by)
      if (i.eliminated) return []
      if (code === '01064')
        return step === 'clues' && i.location !== null
          ? [{ type: 'DiscoverClues', investigator: by, location: i.location, amount: 2 }]
          : []
      if (step !== 'allocate') return []
      const remaining = Number(data?.remaining ?? 0)
      if (remaining <= 0) return []
      const assets = assetsHere(s, by).filter(
        (a) =>
          ['supply', 'supplies'].includes(playerCardDef(a.code)?.uses?.type ?? '') &&
          a.uses < (playerCardBehavior(a.code)?.maxUses ?? Infinity),
      )
      if (!assets.length) return [{ type: 'GainResources', investigator: by, amount: remaining }]
      return ask(
        by,
        [
          {
            label: 'choice.eventResources',
            params: { n: remaining },
            then: [{ type: 'GainResources', investigator: by, amount: remaining }],
          },
          ...assets.map((a) => ({
            label: 'choice.resultUses',
            params: { card: playerCardDef(a.code)!.name },
            target: { type: 'asset' as const, id: a.id },
            then: [
              { type: 'AddUses' as const, asset: a.id, amount: 1 },
              continuation(code, by, 'allocate', { remaining: remaining - 1 }),
            ],
          })),
        ],
        true,
      )
    },
  })
}
