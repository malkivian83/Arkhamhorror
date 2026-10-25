import {
  cardOfRole,
  getInvestigator,
  isPermanent,
  playerCardDef,
  registerTreachery,
  type Message,
} from '@lcg/engine'

// RR: Revelation, Discard. Discards the assets of her current role she controls (not
// permanent ones), then the top card of her deck; her role becomes that card's class
// (neutral if it is a weakness).
registerTreachery({
  code: '03019',
  revelation: (s, by) => {
    const me = getInvestigator(s, by)
    const role = me.role ?? 'neutral'
    const discard = Object.values(s.assets)
      .filter((a) => a.owner === by && cardOfRole(a.code, role) && !isPermanent(a.code))
      .map((a): Message => ({ type: 'DiscardAsset', asset: a.id }))
    const top = me.deck[0]
    const def = top ? playerCardDef(top) : undefined
    const next = def ? (def.weakness ? 'neutral' : (def.classes ?? [def.class])[0]!) : null
    return [
      ...discard,
      ...(top ? [{ type: 'MillDeck', investigator: by, amount: 1 } as Message] : []),
      ...(next ? [{ type: 'SetRole', investigator: by, role: next } as Message] : []),
    ]
  },
})
