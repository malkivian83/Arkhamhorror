import { getInvestigator, registerPlayerCard, type ReactionOption } from '@lcg/engine'
import { cardName } from './register'
// Madame Labranche: fast, exhaust: draw 1 card if your hand is empty; or gain 1 resource
// if you have no resources.
registerPlayerCard({
  code: '03198',
  fastOptions: (s, self) => {
    if (self.exhausted) return []
    const me = getInvestigator(s, self.owner)
    const options: ReactionOption[] = []
    if (!me.hand.length)
      options.push({
        key: self.id + ':draw',
        investigator: self.owner,
        label: 'ability.supportLabrancheDraw',
        params: { card: cardName('03198') },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'DrawCards', investigator: self.owner, amount: 1 },
        ],
      })
    if (!me.resources)
      options.push({
        key: self.id + ':resource',
        investigator: self.owner,
        label: 'ability.supportLabrancheResource',
        params: { card: cardName('03198') },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'GainResources', investigator: self.owner, amount: 1 },
        ],
      })
    return options
  },
})
