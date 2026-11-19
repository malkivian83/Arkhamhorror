// RR: Face Down, Out of Play, Attach To, Ownership and Control, Leaves Play.
import { assetBehavior, playerCardDef, scenarioBehavior } from './content'
import { canPlayByEffect } from './actions'
import { getInvestigator, push, updateInvestigator } from './state'
import type { Asset, GameState, Message } from './types'

export function storedSources(s: GameState, by: string, code?: string) {
  return Object.values(s.assets).flatMap((a) =>
    a.owner === by && assetBehavior(s, a)?.playsStoredCards
      ? (a.storedCards ?? []).flatMap((c, index) =>
          code === undefined || c.code === code ? [{ asset: a, index, card: c }] : [],
        )
      : [],
  )
}
const remove = (s: GameState, a: Asset, index: number): GameState => ({
  ...s,
  assets: {
    ...s.assets,
    [a.id]: { ...a, storedCards: a.storedCards!.filter((_, n) => n !== index) },
  },
})

export function prepareStoredPlay(
  s: GameState,
  m: Extract<Message, { type: 'PlayCard' }>,
): GameState | undefined {
  if (m.from || m.fromDeck) return undefined
  const by = getInvestigator(s, m.investigator),
    sources = storedSources(s, by.id, m.code)
  if (!m.fromStored && !sources.length) return undefined
  if (!m.fromStored && (sources.length > 1 || by.hand.includes(m.code)))
    return push(s, {
      type: 'Ask',
      investigator: by.id,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.storedSource',
        alwaysAsk: true,
        choices: [
          ...(by.hand.includes(m.code)
            ? [{ label: 'choice.playFromHand', then: [{ ...m, from: 'hand' as const }] }]
            : []),
          ...sources.map(({ asset, index }) => ({
            label: 'choice.playStoredCard',
            params: { card: playerCardDef(asset.code)?.name ?? asset.code },
            target: { type: 'asset' as const, id: asset.id },
            then: [{ ...m, fromStored: { asset: asset.id, index } }],
          })),
        ],
      },
    })
  const source = m.fromStored
    ? sources.find((p) => p.asset.id === m.fromStored!.asset && p.index === m.fromStored!.index)
    : sources[0]
  if (!source) return s
  const projected = updateInvestigator(s, by.id, (i) => ({ ...i, hand: [...i.hand, m.code] }))
  if (
    !canPlayByEffect(
      projected,
      by.id,
      m.code,
      'hand',
      m.noCost,
      m.discount,
      m.additionalActionsPaid,
      !m.modifiersResolved,
      m.asFast,
    )
  )
    return s
  const { fromStored: _from, ...play } = m
  return push(
    remove(projected, source.asset, source.index),
    { type: 'CheckStoredAsset', asset: source.asset.id },
    { ...play, from: 'hand', byEffect: true, originalOwner: source.card.owner },
  )
}

export function handleStored(s: GameState, m: Message): GameState | undefined {
  switch (m.type) {
    case 'StorePlayerCard': {
      const a = s.assets[m.asset],
        owner = getInvestigator(s, m.investigator)
      const limit = a && assetBehavior(s, a)?.storedLimit
      const at =
        m.from === 'discard' ? owner.discard.lastIndexOf(m.code) : owner[m.from].indexOf(m.code)
      if (
        !a ||
        (a.owner !== owner.id && m.from !== 'discard') ||
        at < 0 ||
        (limit !== undefined && (a.storedCards?.length ?? 0) >= limit)
      )
        return s
      return updateInvestigator(
        {
          ...s,
          assets: {
            ...s.assets,
            [a.id]: {
              ...a,
              storedCards: [...(a.storedCards ?? []), { code: m.code, owner: owner.id }],
            },
          },
        },
        owner.id,
        (i) => ({ ...i, [m.from]: i[m.from].filter((_, n) => n !== at) }),
      )
    }
    case 'TakeStoredCard': {
      const a = s.assets[m.asset],
        c = a?.storedCards?.[m.index]
      if (!a || a.owner !== m.investigator || !c) return s
      if (m.draw && scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, m.investigator)) return s
      return push(
        remove(s, a, m.index),
        {
          type: 'MoveInspectedCard',
          investigator: c.owner,
          card: c.code,
          to: 'hand',
          ...(m.draw ? { drawFound: true } : {}),
          ...(m.draw ? { drawer: m.investigator } : {}),
        },
        { type: 'CheckStoredAsset', asset: a.id },
      )
    }
    case 'CheckStoredAsset': {
      const a = s.assets[m.asset]
      return a && !a.storedCards?.length && assetBehavior(s, a)?.discardWhenStoredEmpty
        ? push(s, { type: 'DiscardAsset', asset: a.id })
        : s
    }
    case 'DrawStoredCards': {
      const a = s.assets[m.asset]
      if (!a) return s
      if (scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, a.owner)) return s
      return push(
        { ...s, assets: { ...s.assets, [a.id]: { ...a, storedCards: [] } } },
        ...(a.storedCards ?? []).map((c): Message => ({
          type: 'MoveInspectedCard',
          investigator: c.owner,
          card: c.code,
          to: 'hand',
          drawFound: true,
          drawer: a.owner,
        })),
      )
    }
    case 'AttachControlledAsset': {
      const a = s.assets[m.asset],
        host = s.assets[m.host],
        swap = m.swap ? s.assets[m.swap] : undefined
      if (
        !a ||
        !host ||
        a.owner !== host.owner ||
        a.id === host.id ||
        a.attachedTo === host.id ||
        (m.swap && swap?.attachedTo !== host.id)
      )
        return s
      // One parent per asset, and no cycles even when an attachment is itself a host.
      let p: Asset | undefined = host
      while (p) {
        if (p.id === a.id) return s
        p = p.attachedTo ? s.assets[p.attachedTo] : undefined
      }
      const children = Object.values(s.assets).filter((x) => x.attachedTo === host.id)
      const limit = assetBehavior(s, host)?.attachmentLimit
      if (limit !== undefined && children.length - (swap ? 1 : 0) >= limit) return s
      const assets = { ...s.assets, [a.id]: { ...a, attachedTo: host.id } }
      if (swap) {
        const { attachedTo: _parent, ...free } = swap
        assets[swap.id] = a.attachedTo ? { ...free, attachedTo: a.attachedTo } : free
      }
      return push({ ...s, assets }, { type: 'CheckSlots', investigator: a.owner })
    }
    case 'DetachControlledAsset': {
      const a = s.assets[m.asset]
      if (!a?.attachedTo) return s
      const { attachedTo: _parent, ...free } = a
      return push(
        { ...s, assets: { ...s.assets, [a.id]: free } },
        { type: 'CheckSlots', investigator: a.owner },
      )
    }
    case 'SpendUpgradeUses': {
      const a = s.assets[m.asset],
        u = a?.upgrades?.[m.index]
      if (!a || !u || m.amount <= 0 || (u.uses ?? 0) < m.amount) return s
      return {
        ...s,
        assets: {
          ...s.assets,
          [a.id]: {
            ...a,
            upgrades: a.upgrades!.map((u, n) =>
              n === m.index ? { ...u, uses: u.uses! - m.amount } : u,
            ),
          },
        },
      }
    }
    default:
      return undefined
  }
}

/** Attached face-up assets leave only when their host leaves play, never on detachment. */
export function settleStoredCards(before: GameState, after: GameState): GameState {
  if (before.assets === after.assets) return after
  let next = after
  const messages: Message[] = []
  for (const a of Object.values(before.assets)) {
    if (after.assets[a.id]) continue
    for (const c of a.storedCards ?? [])
      next = updateInvestigator(next, c.owner, (i) => ({ ...i, discard: [...i.discard, c.code] }))
    for (const child of Object.values(after.assets))
      if (child.attachedTo === a.id) messages.push({ type: 'DiscardAsset', asset: child.id })
    const owner = a.originalOwner ?? a.owner
    const count = (s: GameState) =>
      s.investigators.find((i) => i.id === owner)?.discard.filter((c) => c === a.code).length ?? 0
    if (
      count(after) > count(before) &&
      Object.values(after.assets).some((x) => assetBehavior(after, x)?.observesAssetDiscards)
    )
      messages.push({ type: 'Forced', trigger: { type: 'afterAssetDiscarded', asset: a } })
  }
  return messages.length ? push(next, ...messages) : next
}
