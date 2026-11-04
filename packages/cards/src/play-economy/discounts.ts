// RR: Play, Costs, Fast, Deckbuilding Restrictions, Reaction Opportunities.
import {
  assetSlots,
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  playableHand,
  registerPlayerCard,
  type Asset,
  type GameState,
  type Message,
} from '@lcg/engine'
import { cardName } from '../dunwich-pilot/effects'
const ownTurn = (s: GameState, a: Asset) => s.activeTurn === a.owner
const spell = (c: string) => playerCardDef(c)?.traits.includes('Spell') ?? false
const trick = (c: string) =>
  playerCardDef(c)?.type === 'event' &&
  playerCardDef(c)!.traits.some((t) => ['Tactic', 'Trick'].includes(t))
const illicit = (c: string) => playerCardDef(c)?.traits.includes('Illicit') ?? false
const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const allyInPlay = (s: GameState, a: Asset) =>
  Object.values(s.assets).some(
    (other) => other.owner === a.owner && !other.noSlot && assetSlots(other).includes('ally'),
  )
export function registerDiscount(code: string): boolean {
  if (code === '60470') {
    registerPlayerCard({
      code,
      playedCardCostModifier: (s, a, c) => {
        const matches = (c: string) =>
          playerCardDef(c)?.traits.some((t) => ['Spell', 'Ritual'].includes(t))
        const prior = getInvestigator(s, a.owner).roundPlays
        return matches(c) && !(prior?.round === s.round && prior.codes.some(matches)) ? -1 : 0
      },
    })
    return true
  }
  const isFence = code === '04108',
    isChuck = ['09072', '60332'].includes(code),
    isOwn = ['04236', '53010'].includes(code),
    isRobes = ['60412', '60422'].includes(code),
    isRod = code === '08128'
  if (!(isFence || isChuck || isOwn || isRobes || isRod)) return false
  const eligible = (s: GameState, a: Asset, c: string) => {
    if (!isRod && a.exhausted) return false
    if (isFence) return ownTurn(s, a) && illicit(c)
    if (isChuck) return trick(c)
    if (isOwn)
      return (
        playerCardDef(c)?.type === 'event' &&
        (playerCardDef(c)?.classes ?? [playerCardDef(c)?.class]).includes('survivor') &&
        (code !== '04236' || !allyInPlay(s, a))
      )
    if (isRobes) return spell(c)
    return (
      ownTurn(s, a) &&
      playerCardDef(c)?.type === 'asset' &&
      playerCardDef(c)?.traits.includes('Creature')
    )
  }
  registerPlayerCard({
    code,
    ...(isRod ? { restrictedSlots: [{ slot: 'ally' as const, count: 2, trait: 'Creature' }] } : {}),
    ...(isOwn
      ? code === '53010'
        ? { permanent: {}, excludesDeckSlots: ['ally' as const] }
        : {
            limitTitle: true,
            forced: (s: GameState, _t: unknown, a: Asset) =>
              allyInPlay(s, a) ? [{ type: 'DiscardAsset' as const, asset: a.id }] : [],
          }
      : {}),
    playModifiers: (s, a, c, fast) => {
      if (!eligible(s, a, c) || (isFence && !fast)) return []
      const costs = isRod ? [] : [exhaust(a)]
      if (isChuck)
        return code === '09072'
          ? [
              { discount: 2, costs },
              { skillBonus: 2, costs },
            ]
          : [{ discount: 2, skillBonus: 2, costs }]
      return [
        { discount: isOwn ? 2 : 1, costs, ...(code === '60422' ? { noOpportunity: true } : {}) },
      ]
    },
    ...(isFence || isChuck
      ? {
          fastOptions: (s: GameState, a: Asset) => {
            // FAQ: gaining Fast does not authorize playing these events outside your turn.
            if (!ownTurn(s, a) || a.exhausted) return []
            const projected = { ...s, assets: { ...s.assets, [a.id]: { ...a, exhausted: true } } }
            return [...new Set(playableHand(s, a.owner))]
              .filter((c) => eligible(s, a, c))
              .flatMap((c) => {
                const nativeFast = !!playerCardDef(c)?.fast
                const modes = isFence
                  ? [{ discount: nativeFast ? 1 : 0, bonus: 0 }]
                  : code === '09072'
                    ? [{ discount: 0, bonus: 0 }]
                    : [
                        { discount: 2, bonus: 0 },
                        { discount: 0, bonus: 2 },
                      ]
                return modes
                  .filter((m) =>
                    canPlayByEffect(
                      projected,
                      a.owner,
                      c,
                      getInvestigator(s, a.owner).hand.includes(c) ? 'hand' : 'discard',
                      false,
                      m.discount,
                      false,
                      true,
                      true,
                    ),
                  )
                  .map((m) => ({
                    key: a.id + ':fast:' + c + ':' + m.discount,
                    investigator: a.owner,
                    label: 'choice.economyFastPlay',
                    params: {
                      card: cardName(c),
                      asset: cardName(code),
                      discount: m.discount,
                      bonus: m.bonus,
                    },
                    then: [
                      exhaust(a),
                      {
                        type: 'PlayCard' as const,
                        investigator: a.owner,
                        code: c,
                        from: getInvestigator(s, a.owner).hand.includes(c)
                          ? ('hand' as const)
                          : ('discard' as const),
                        byEffect: true,
                        asFast: true,
                        discount: m.discount,
                        skillBonus: m.bonus,
                        noOpportunity: true,
                      },
                    ],
                  }))
              })
          },
        }
      : {}),
  })
  return true
}
