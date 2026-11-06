import {
  canAffordEntry,
  canEnter,
  getInvestigator,
  leavingBlocked,
  playerCardDef,
  registerPlayerCard,
  type Choice,
} from '@lcg/engine'
import { ask, moveChoices } from '../dunwich-pilot/effects'

registerPlayerCard({
  code: '08734',
  limitTrait: 'Footwear',
  canPlay: (state, investigator) =>
    !Object.values(state.assets).some(
      (asset) =>
        asset.owner === investigator && playerCardDef(asset.code)?.traits.includes('Footwear'),
    ),
  reactions: (state, trigger, self) => {
    const here = getInvestigator(state, self.owner).location
    if (
      trigger.type !== 'afterDiscoverClues' ||
      !trigger.last ||
      trigger.location !== here ||
      self.exhausted ||
      leavingBlocked(state, here)
    )
      return []
    const connected = moveChoices(state, self.owner).filter(
      ({ target }) =>
        target?.type === 'location' &&
        canEnter(state, self.owner, target.id) &&
        canAffordEntry(state, target.id, self.owner),
    )
    const revealed = Object.values(state.locations)
      .filter(
        ({ id, revealed }) =>
          revealed &&
          id !== here &&
          canEnter(state, self.owner, id) &&
          canAffordEntry(state, id, self.owner),
      )
      .map(({ id, name }): Choice => ({
        label: 'choice.edgeOfTheEarth.memorialBootsDiscard',
        params: { location: name },
        target: { type: 'location', id },
        then: [
          { type: 'DiscardAsset', asset: self.id },
          { type: 'MoveTo', investigator: self.owner, location: id },
        ],
      }))
    const choices = [...connected, ...revealed]
    return choices.length
      ? [
          {
            key: `${self.id}:lastClue`,
            investigator: self.owner,
            label: 'ability.edgeOfTheEarth.memorialBoots',
            target: { type: 'asset', id: self.id },
            then: [{ type: 'ExhaustAsset', asset: self.id }, ...ask(self.owner, choices)],
          },
        ]
      : []
  },
})
