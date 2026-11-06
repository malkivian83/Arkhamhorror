import { playerCardDef, type AbilitiesFn, type Asset, type Message } from '@lcg/engine'

export function takada(resolute: boolean): AbilitiesFn<Asset> {
  return (_state, self, investigator) => {
    // La versión de determinación siempre obtiene 1 recurso aunque no le queden.
    if (self.exhausted || (!resolute && self.uses < 1)) return []
    return [
      {
        key: `${self.id}:resources`,
        label: 'ability.edgeOfTheEarth.resources',
        params: { card: playerCardDef(self.code)?.name ?? self.code },
        actions: 1,
        provokes: true,
        costs: [{ type: 'ExhaustAsset', asset: self.id }],
        then: [
          ...(resolute ? [{ type: 'GainResources', investigator, amount: 1 } as const] : []),
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.chooseAmount',
              choices: Array.from({ length: Math.min(3, self.uses) + 1 }, (_, amount) => ({
                label: 'choice.edgeOfTheEarth.takeResources',
                params: { amount },
                then: amount
                  ? [
                      {
                        type: 'MoveResourcesFromAsset',
                        asset: self.id,
                        investigator,
                        amount,
                      } as Message,
                    ]
                  : [],
              })),
            },
          },
        ],
      },
    ]
  }
}
