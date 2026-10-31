// RR: Play, Costs, Move, Search, Copy, Lasting Effects, Reactions.
import {
  getInvestigator,
  getLocation,
  registerPlayerCard,
  playerCardDef,
  canEnter,
  canAffordEntry,
  moveBlocked,
  leavingBlocked,
  canPlayByEffect,
  stuckInPlay,
  shroudOf,
  type GameState,
  type Choice,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { fast } from '../asset-utilities/register'
import { controlledClasses } from '../synergy/classes'
const ownTurn = (s: GameState, by: string) =>
  s.phase === 'investigation' &&
  (s.immediateActions?.[0]
    ? s.immediateActions[0].endedTurn
      ? null
      : s.immediateActions[0].activeTurn
    : s.activeTurn) === by
export function registerEvents(code: string): boolean {
  if (code === '08036') {
    const destinations = (s: GameState, by: string) => {
      const i = getInvestigator(s, by)
      return i.location === null || moveBlocked(s, by) || leavingBlocked(s, i.location)
        ? []
        : Object.values(s.locations).filter(
            (l) =>
              l.revealed && l.id !== i.location && canEnter(s, by, l.id) && canAffordEntry(s, l.id),
          )
    }
    registerPlayerCard({
      code,
      selfCostModifier: (s, by) => -controlledClasses(s, by),
      canPlay: (s, by) => ownTurn(s, by) && destinations(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          destinations(s, by).map((l) => ({
            label: 'choice.pilotMove',
            params: { name: getInvestigator(s, by).name, location: l.name },
            target: { type: 'location', id: l.id },
            then: [{ type: 'MoveTo', investigator: by, location: l.id }],
          })),
          true,
        ),
    })
    return true
  }
  if (code === '05025') {
    const choices = (s: GameState, by: string, from: string): Choice[] =>
      Object.values(s.locations)
        .filter(
          (l) =>
            l.revealed && l.id !== from && l.shroud < getLocation(s, from).shroud && l.clues > 0,
        )
        .map((l) => ({
          label: 'choice.resourceClue',
          params: { location: l.name },
          target: { type: 'location', id: l.id },
          then: [{ type: 'DiscoverClues', investigator: by, location: l.id, amount: 2 }],
        }))
    registerPlayerCard({
      code,
      handReactions: (s, t, by) =>
        t.type === 'afterDiscoverClues' &&
        t.investigator === by &&
        t.last &&
        t.location === getInvestigator(s, by).location &&
        choices(s, by, t.location).length > 0
          ? [
              {
                key: code + ':clues',
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: ask(by, choices(s, by, t.location), true),
                  },
                ],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '05110') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) =>
        t.type === 'afterDiscoverClues' &&
        t.last &&
        t.location === getInvestigator(s, by).location &&
        shroudOf(s, t.location) > 0
          ? [
              {
                key: code + ':case',
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    effect: [
                      continuation(code, by, 'share', {
                        location: t.location,
                        left: shroudOf(s, t.location),
                      }),
                    ],
                  },
                ],
              },
            ]
          : [],
      effect: (s, by, step, data) =>
        step !== 'share'
          ? []
          : Number(data.left) > 0
            ? ask(
                by,
                s.investigators
                  .filter((i) => !i.eliminated && i.location === String(data.location))
                  .map((i) => ({
                    label: 'choice.resourceShare',
                    params: { name: i.name, n: Number(data.left) },
                    target: { type: 'investigator', id: i.id },
                    then: [
                      continuation(code, by, 'share', {
                        ...data,
                        left: Number(data.left) - 1,
                        ['to:' + i.id]: Number(data['to:' + i.id] ?? 0) + 1,
                      }),
                    ],
                  })),
                true,
              )
            : Object.entries(data)
                .filter(([key, n]) => key.startsWith('to:') && Number(n) > 0)
                .map(([key, n]) => ({
                  type: 'GainResources',
                  investigator: key.slice(3),
                  amount: Number(n),
                })),
    })
    return true
  }
  if (code === '06205') {
    const targets = (s: GameState, by: string) => [
      ...new Set([
        ...getInvestigator(s, by).hand,
        ...Object.values(s.assets)
          .filter((a) => a.owner === by)
          .map((a) => a.code),
        ...Object.values(s.assets).flatMap((a) =>
          (a.upgrades ?? []).filter((u) => u.owner === by).map((u) => u.code),
        ),
      ]),
    ]
    registerPlayerCard({
      code,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          targets(s, by).map((c) => ({
            label: 'choice.resourceDream',
            params: { card: cardName(c) },
            then: [
              ...(getInvestigator(s, by).hand.includes(c)
                ? [
                    {
                      type: 'Story' as const,
                      entry: {
                        title: 'choice.resourceRevealTitle',
                        body: 'choice.resourceRevealBody',
                        effects: [{ key: 'choice.toolRevealed', params: { card: cardName(c) } }],
                      },
                    },
                  ]
                : []),
              continuation(code, by, 'find', { name: cardName(c) }),
            ],
          })),
          true,
        ),
      effect: (s, by, step, data) => {
        if (step !== 'find') return []
        return [
          {
            type: 'SearchDeck',
            investigator: by,
            title: String(data.name),
            traits: [],
            to: 'hand',
            anyCard: true,
            anyType: true,
            includeWeaknesses: true,
            drawFound: true,
            optional: true,
          },
        ]
      },
    })
    return true
  }
  if (code === '06326') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) => {
        const i = getInvestigator(s, by),
          projected = {
            ...s,
            investigators: s.investigators.map((j) =>
              j.id === by ? { ...j, resources: j.resources - 1 } : j,
            ),
          }
        return [
          ...(i.resources < 1
            ? []
            : [...new Set(i.hand)]
                .filter(
                  (c) =>
                    playerCardDef(c)?.type === 'asset' &&
                    playerCardDef(c)?.traits.includes('Item') &&
                    canPlayByEffect(projected, by, c, 'hand'),
                )
                .map((c) =>
                  fast(
                    a,
                    'play:' + c,
                    'choice.toolPlay',
                    { card: cardName(c), n: 0 },
                    [{ type: 'SpendResources', investigator: by, amount: 1 }],
                    [{ type: 'PlayCard', investigator: by, code: c, from: 'hand', byEffect: true }],
                    { type: 'hand', code: c },
                  ),
                )),
          ...Object.values(s.assets)
            .filter(
              (item) =>
                item.owner === by &&
                playerCardDef(item.code)?.traits.includes('Item') &&
                !stuckInPlay(s, item),
            )
            .map((item) =>
              fast(
                a,
                'discard:' + item.id,
                'choice.resourceDiscard',
                { card: cardName(item.code) },
                [{ type: 'DiscardAsset', asset: item.id }],
                [{ type: 'GainResources', investigator: by, amount: 2 }],
                { type: 'asset', id: item.id },
              ),
            ),
        ]
      },
    })
    return true
  }
  return false
}
