import { getInvestigator, type PlayerCardBehavior, type Message } from '@lcg/engine'

export function claypool(resolute: boolean): NonNullable<PlayerCardBehavior['reactions']> {
  return (state, trigger, self) => {
    if (
      trigger.type !== 'whenRevealChaosToken' ||
      trigger.token !== 'frost' ||
      state.skillTest?.investigator !== trigger.investigator ||
      state.skillTest.revealing?.face !== 'frost' ||
      state.tokenReveal ||
      self.exhausted ||
      (!resolute && self.uses < 1)
    )
      return []
    const location = getInvestigator(state, self.owner).location
    if (location === null || getInvestigator(state, trigger.investigator).location !== location)
      return []
    const exhaust: Message = { type: 'ExhaustAsset', asset: self.id }
    const spend: Message = { type: 'SpendUses', asset: self.id, amount: 1 }
    const redraw: Message = { type: 'CancelRevealedToken', redraw: true }
    const then: Message[] = !resolute
      ? [exhaust, spend, redraw]
      : self.uses < 1
        ? [exhaust, redraw]
        : [
            exhaust,
            {
              type: 'Ask',
              investigator: self.owner,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.edgeOfTheEarth.claypool',
                choices: [
                  { label: 'choice.edgeOfTheEarth.redraw', then: [redraw] },
                  {
                    label: 'choice.edgeOfTheEarth.spendSupply',
                    then: [spend, { type: 'CancelRevealedToken' }],
                  },
                ],
              },
            },
          ]
    return [
      {
        key: `${self.id}:frost`,
        investigator: self.owner,
        label: 'ability.edgeOfTheEarth.claypool',
        target: { type: 'asset', id: self.id },
        then,
      },
    ]
  }
}
