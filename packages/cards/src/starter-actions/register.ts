import {
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type Trigger,
} from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
import { assetsHere } from '../dunwich-pilot/helpers'

export const clues = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).clues

type Wound = 'damage' | 'horror'
/** "From among cards you control" or "investigators and/or Ally assets at your location". */
export type HealScope = 'controlled' | 'location'

/** Step `heal`: heal 1 point to a chosen card, then continue with the remaining points. */
export function healStep(
  state: GameState,
  code: string,
  by: InvestigatorId,
  data: Record<string, string | number | boolean>,
): Message[] {
  const kind = data.kind as Wound
  const remaining = Number(data.remaining)
  const me = getInvestigator(state, by)
  if (remaining <= 0 || me.eliminated) return []
  const next = continuation(code, by, 'heal', { ...data, remaining: remaining - 1 })
  const investigators =
    data.scope === 'controlled'
      ? [me]
      : state.investigators.filter((i) => !i.eliminated && i.location === me.location)
  const assets = (
    data.scope === 'controlled'
      ? Object.values(state.assets).filter((a) => a.owner === by)
      : assetsHere(state, by).filter((a) => playerCardDef(a.code)?.traits.includes('Ally'))
  ).filter((a) => a[kind] > 0)
  const label = kind === 'damage' ? 'choice.healDamageOf' : 'choice.healHorrorOf'
  const amounts = { damage: kind === 'damage' ? 1 : 0, horror: kind === 'horror' ? 1 : 0 }
  return ask(by, [
    ...investigators
      .filter((i) => i[kind] > 0)
      .map((i): Choice => ({
        label,
        params: { name: i.name },
        then: [{ type: 'Heal', investigator: i.id, ...amounts }, next],
      })),
    ...assets.map((a): Choice => ({
      label,
      params: { name: playerCardDef(a.code)!.name },
      target: { type: 'asset', id: a.id },
      then: [{ type: 'HealAsset', asset: a.id, ...amounts }, next],
    })),
  ])
}

export const heal = (
  code: string,
  by: InvestigatorId,
  kind: Wound,
  amount: number,
  scope: HealScope,
): Message => continuation(code, by, 'heal', { kind, remaining: amount, scope })

/** Fast events played from hand after a trigger of their own investigator. */
export function registerReactionEvent(
  code: string,
  applies: (trigger: Trigger, by: InvestigatorId) => boolean,
  effect: (state: GameState, by: InvestigatorId) => Message[],
): void {
  registerPlayerCard({
    code,
    handReactions: (s, t, by) =>
      !applies(t, by)
        ? []
        : [
            {
              key: 'hand:' + code,
              investigator: by,
              label: 'ability.playCard',
              params: { card: playerCardDef(code)!.name },
              target: { type: 'hand', code },
              then: [{ type: 'PlayCard', investigator: by, code, effect: effect(s, by) }],
            },
          ],
  })
}

/** Discover clues at your current location (nothing if you are not at one). */
export const discoverHere = (state: GameState, by: InvestigatorId, amount: number): Message[] => {
  const here = getInvestigator(state, by).location
  return here === null ? [] : [{ type: 'DiscoverClues', investigator: by, location: here, amount }]
}
