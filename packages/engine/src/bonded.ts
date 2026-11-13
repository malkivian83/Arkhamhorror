// RR "Bonded" and "Set Aside": player cards kept out of play for each investigator.
import { playerCardBehavior, playerCardDef } from './content'
import { shuffle } from './rng'
import { getInvestigator, push, updateInvestigator } from './state'
import type { CardCode, GameState, Investigator, InvestigatorId, Message } from './types'

type SetAsideMessage = Extract<
  Message,
  { type: 'TakeSetAside' | 'SetAsidePlayerCards' | 'SwapSetAsideAsset' }
>

/**
 * RR Bonded (FAQ v1.7): the product copies of each bonded card are set aside at the start of
 * each game when the deck includes a card bonded to them. Duplicate or upgraded summoners do
 * not increase that number.
 */
export function bondedCardsFor(deck: CardCode[]): CardCode[] {
  const counts = new Map<CardCode, number>()
  for (const code of new Set(deck))
    for (const b of playerCardDef(code)?.bonded ?? [])
      counts.set(b.code, Math.max(counts.get(b.code) ?? 0, b.count))
  return [...counts].flatMap(([code, count]) => Array<CardCode>(count).fill(code))
}

/** Set-aside player cards of an investigator; bonded ones only with `bonded`. */
export function setAsideCards(
  state: GameState,
  investigator: InvestigatorId,
  code?: CardCode,
  bonded = false,
): CardCode[] {
  return (getInvestigator(state, investigator).outOfPlay ?? []).filter(
    (c) => (code === undefined || c === code) && (!bonded || !!playerCardDef(c)?.bondedCard),
  )
}

const without = (cards: CardCode[], code: CardCode, count: number): CardCode[] => {
  const out = [...cards]
  for (let n = 0; n < count; n++) {
    const at = out.indexOf(code)
    if (at < 0) break
    out.splice(at, 1)
  }
  return out
}

export function handleSetAside(state: GameState, message: SetAsideMessage): GameState {
  switch (message.type) {
    case 'TakeSetAside': {
      const owner = getInvestigator(state, message.investigator)
      if (owner.eliminated) return state
      const found = setAsideCards(state, owner.id, message.code, message.bonded).slice(
        0,
        message.count,
      )
      if (!found.length) return state
      const taken = updateInvestigator(state, owner.id, (i) => ({
        ...i,
        outOfPlay: without(i.outOfPlay ?? [], message.code, found.length),
      }))
      if (message.to === 'hand')
        return updateInvestigator(taken, owner.id, (i) => ({ ...i, hand: [...i.hand, ...found] }))
      if (message.to === 'deck') {
        const [deck, rng] = shuffle([...getInvestigator(taken, owner.id).deck, ...found], taken.rng)
        return updateInvestigator({ ...taken, rng }, owner.id, (i) => ({ ...i, deck }))
      }
      return push(
        taken,
        ...found.map((code): Message => ({
          type: 'PutAssetIntoPlay',
          investigator: owner.id,
          code,
        })),
      )
    }
    case 'SetAsidePlayerCards': {
      const owner = getInvestigator(state, message.investigator)
      const codes = new Set(message.codes)
      const assets = (message.assets ?? []).flatMap((id) => {
        const a = state.assets[id]
        return a ? [a] : []
      })
      const kept = Object.fromEntries(
        Object.entries(state.assets).filter(([id]) => !assets.some((a) => a.id === id)),
      )
      const moved = (cards: CardCode[]) => cards.filter((c) => codes.has(c))
      const keep = (cards: CardCode[]) => cards.filter((c) => !codes.has(c))
      const aside = [
        ...moved(owner.hand),
        ...moved(owner.deck),
        ...moved(owner.discard),
        ...assets.map((a) => a.code),
      ]
      const next = updateInvestigator(
        assets.length ? { ...state, assets: kept } : state,
        owner.id,
        (i): Investigator => ({
          ...i,
          hand: keep(i.hand),
          deck: keep(i.deck),
          discard: keep(i.discard),
          outOfPlay: [...(i.outOfPlay ?? []), ...aside],
        }),
      )
      return assets.length ? push(next, { type: 'CheckSlots', investigator: owner.id }) : next
    }
    case 'SwapSetAsideAsset': {
      const asset = state.assets[message.asset]
      if (!asset) return state
      const owner = asset.originalOwner ?? asset.owner
      // The replacement was set aside with the bonded cards (Wish Eater ↔ Empty Vessel).
      if (!setAsideCards(state, owner, message.code).length) return state
      const { [asset.id]: _swapped, ...assets } = state.assets
      const swapped = updateInvestigator({ ...state, assets }, owner, (i) => ({
        ...i,
        outOfPlay: [...without(i.outOfPlay ?? [], message.code, 1), asset.code],
      }))
      return push(swapped, {
        type: 'PutAssetIntoPlay',
        investigator: asset.owner,
        code: message.code,
        ...(asset.originalOwner ? { originalOwner: asset.originalOwner } : {}),
        tokens: { uses: message.moveUses ? asset.uses : 0 },
      })
    }
  }
}

/**
 * Continuous set-aside rules checked after each message: cards that are set aside instead of
 * entering a discard pile or deck (Essence of the Dream) and bonded cards of an asset that left
 * play (Hallowed Mirror, Occult Lexicon).
 */
export function settleSetAside(before: GameState, after: GameState): GameState {
  let state = after
  if (before.investigators !== after.investigators)
    for (const i of state.investigators) {
      const aside = [...i.discard, ...i.deck].filter(
        (c) => playerCardBehavior(c)?.setAsideInsteadOfDiscard,
      )
      if (!aside.length) continue
      const gone = (c: CardCode) => !playerCardBehavior(c)?.setAsideInsteadOfDiscard
      state = updateInvestigator(state, i.id, (x) => ({
        ...x,
        discard: x.discard.filter(gone),
        deck: x.deck.filter(gone),
        outOfPlay: [...(x.outOfPlay ?? []), ...aside],
      }))
    }
  if (before.assets !== after.assets)
    for (const a of Object.values(before.assets)) {
      if (after.assets[a.id] || !playerCardBehavior(a.code)?.setsAsideBondedOnLeave) continue
      const codes = (playerCardDef(a.code)?.bonded ?? []).map((b) => b.code)
      if (codes.length)
        state = push(state, {
          type: 'SetAsidePlayerCards',
          investigator: a.originalOwner ?? a.owner,
          codes,
        })
    }
  return state
}
