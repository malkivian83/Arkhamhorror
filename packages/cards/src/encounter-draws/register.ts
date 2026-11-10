// RR: Drawing Encounter Cards (1.4), Cancel, Peril, Fast, Revelation.
import {
  activeInvestigators,
  getInvestigator,
  registerPlayerCard,
  scenarioBehavior,
  type GameState,
  type Message,
  type ReactionOption,
  type Trigger,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'

type PendingDraw = Extract<Message, { type: 'ResolveEncounterCard' }>

function pendingDraw(s: GameState, t: Trigger): PendingDraw | undefined {
  if (t.type !== 'whenEncounterDrawn' && t.type !== 'afterEncounterDrawn') return undefined
  return s.queue.find(
    (m): m is PendingDraw => m.type === 'ResolveEncounterCard' && m.draw?.id === t.draw,
  )
}

function event(code: string, by: string, effect: Message[]): ReactionOption[] {
  return [
    {
      key: 'hand:' + code,
      investigator: by,
      label: 'ability.playCard',
      params: { card: cardName(code) },
      target: { type: 'hand', code },
      then: [{ type: 'PlayCard', investigator: by, code, effect }],
    },
  ]
}

export function registerWardOfProtection(code: string): void {
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (s, t, by) => {
      const draw = pendingDraw(s, t)
      if (t.type !== 'whenEncounterDrawn' || draw?.investigator !== by) return []
      return event(code, by, [
        { type: 'CancelEncounterDraw', draw: t.draw, destination: 'discard' },
        { type: 'TakeDamage', investigator: by, damage: 0, horror: 1 },
      ])
    },
  })
}

export function registerHandleEncounter(code: string, takeOver: boolean): void {
  registerPlayerCard({
    code,
    canPlay: () => false,
    handReactions: (s, t, by) => {
      const draw = pendingDraw(s, t)
      if (
        t.type !== 'afterEncounterDrawn' ||
        !draw ||
        (draw.card.kind === 'treachery' && draw.card.keywords.includes('peril')) ||
        (draw.investigator !== by) !== takeOver
      )
        return []
      if (takeOver)
        return event(code, by, [
          { type: 'RedirectEncounterDraw', draw: t.draw, investigator: by, skillBonus: 2 },
        ])
      const recipients = activeInvestigators(s).filter((i) => i.id !== by && i.location !== null)
      if (!recipients.length) return []
      const id = t.draw
      return event(
        code,
        by,
        ask(
          by,
          recipients.map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            target: { type: 'investigator', id: i.id },
            then: [
              { type: 'RedirectEncounterDraw', draw: id, investigator: i.id },
              { type: 'GainResources', investigator: by, amount: 1 },
            ],
          })),
          true,
        ),
      )
    },
  })
}

export function registerMaleson(code: string): void {
  registerPlayerCard({
    code,
    reactions: (s, t, asset) => {
      const draw = pendingDraw(s, t)
      if (
        t.type !== 'whenEncounterDrawn' ||
        draw?.investigator !== asset.owner ||
        !draw.fromEncounterDeck ||
        asset.exhausted
      )
        return []
      const owner = getInvestigator(s, asset.owner)
      if (
        owner.clues < 1 ||
        owner.location === null ||
        scenarioBehavior(s.scenarioId)?.cannotPlaceClues?.(s, owner.location)
      )
        return []
      return [
        {
          key: asset.id,
          investigator: owner.id,
          label: 'ability.malesonRedraw',
          params: { card: cardName(code) },
          target: { type: 'asset', id: asset.id },
          then: [
            { type: 'ExhaustAsset', asset: asset.id },
            { type: 'PlaceCluesOnLocation', investigator: owner.id, amount: 1 },
            {
              type: 'CancelEncounterDraw',
              draw: t.draw,
              destination: 'shuffle',
              replacesDraw: true,
            },
            { type: 'DrawEncounterCard', investigator: owner.id },
          ],
        },
      ]
    },
  })
}

export function registerNineOfRods(code: string): void {
  registerPlayerCard({
    code,
    openingHandReactions: (_s, by, hand) =>
      hand.includes(code)
        ? [
            {
              key: 'opening:' + code + ':' + by,
              investigator: by,
              label: 'choice.windowPut',
              params: { card: cardName(code) },
              target: { type: 'hand', code },
              then: [{ type: 'PutAssetIntoPlay', investigator: by, code, fromHand: true }],
            },
          ]
        : [],
    reactions: (s, t, asset) => {
      const draw = pendingDraw(s, t)
      if (t.type !== 'whenEncounterDrawn' || draw?.investigator !== asset.owner || asset.exhausted)
        return []
      return [
        {
          key: asset.id,
          investigator: asset.owner,
          label: 'ability.nineOfRodsRedraw',
          params: { card: cardName(code) },
          target: { type: 'asset', id: asset.id },
          then: [
            { type: 'ExhaustAsset', asset: asset.id },
            { type: 'CancelEncounterDraw', draw: t.draw, destination: 'shuffle' },
            { type: 'DrawEncounterCard', investigator: asset.owner },
          ],
        },
      ]
    },
  })
}
