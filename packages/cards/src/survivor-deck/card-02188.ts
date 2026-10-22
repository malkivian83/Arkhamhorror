import { getInvestigator, playerCardDef, registerPlayerCard } from '@lcg/engine'
// RR Triggered Abilities: check the condition when the turn begins, not when played.
registerPlayerCard({
  code: '02188',
  limitTitle: true,
  canPlay: (s, by) =>
    !Object.values(s.assets).some(
      (a) => a.owner === by && playerCardDef(a.code)?.name === 'Lone Wolf',
    ),
  reactions: (s, trigger, self) => {
    if (trigger.type !== 'turnBegins' || trigger.investigator !== self.owner) return []
    const here = getInvestigator(s, self.owner).location
    if (
      here === null ||
      s.investigators.some((i) => i.id !== self.owner && !i.eliminated && i.location === here)
    )
      return []
    return [
      {
        key: self.id + ':lone-wolf',
        investigator: self.owner,
        label: 'ability.survivorWolfResource',
        then: [{ type: 'GainResources', investigator: self.owner, amount: 1 }],
      },
    ]
  },
})
