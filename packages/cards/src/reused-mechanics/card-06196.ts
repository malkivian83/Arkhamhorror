import { getInvestigator, getLocation, registerPlayerCard, type Message } from '@lcg/engine'
// RR: Reactions; Movement. Safeguard (2): during another investigator's turn, exhaust it so that,
// for the rest of that turn, each time they move from your location to a connecting location you
// may move there too. It exhausts at the first follow; the asset form records that turn
// (investigator and round), so later moves during the same turn do not exhaust it again.
const code = '06196'
registerPlayerCard({
  code,
  reactions: (s, t, a) => {
    if (t.type !== 'afterMove' || t.investigator === a.owner || s.activeTurn !== t.investigator)
      return []
    const mark = `follow:${t.investigator}:${s.round}`
    const active = a.form === mark
    if (a.exhausted && !active) return []
    const me = getInvestigator(s, a.owner),
      other = getInvestigator(s, t.investigator)
    if (
      me.location === null ||
      me.location !== t.from ||
      other.location === null ||
      !getLocation(s, me.location).connections.includes(other.location)
    )
      return []
    const start: Message[] = active
      ? []
      : [
          { type: 'ExhaustAsset', asset: a.id },
          { type: 'SetAssetForm', asset: a.id, form: mark },
        ]
    return [
      {
        key: a.id + ':follow',
        investigator: a.owner,
        label: 'ability.safeguard',
        then: [...start, { type: 'MoveTo', investigator: a.owner, location: other.location }],
      },
    ]
  },
})
