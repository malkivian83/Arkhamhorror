import { getInvestigator, type PlayerCardBehavior } from '@lcg/engine'

export function danforth(resolute: boolean): NonNullable<PlayerCardBehavior['reactions']> {
  return (state, trigger, self) => {
    if (trigger.type !== 'afterTekeliliResolved' || self.exhausted || self.uses < 1) return []
    const investigator = getInvestigator(state, trigger.investigator)
    const owner = getInvestigator(state, self.owner)
    if (!owner.location || investigator.eliminated || owner.location !== investigator.location)
      return []
    return [
      {
        key: `${self.id}:tekelili`,
        investigator: owner.id,
        label: 'ability.edgeOfTheEarth.danforth',
        target: { type: 'asset', id: self.id },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'SpendUses', asset: self.id, amount: 1 },
          {
            type: 'DrawCards',
            investigator: investigator.id,
            amount: resolute ? 3 : 2,
            discardTekelili: resolute,
          },
        ],
      },
    ]
  }
}
