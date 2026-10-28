import { getInvestigator, registerPlayerCard } from '@lcg/engine'
import { GRIMMS_FAIRY_TALES } from './codes'

// RR: Uses (secrets), Triggered Abilities, Healing. Grimm's Fairy Tales: [reaction] after an
// investigator at your location fails a skill test by 2 or more, exhaust it and spend 1 secret:
// heal 1 horror from that investigator (only if they have horror to heal).
registerPlayerCard({
  code: GRIMMS_FAIRY_TALES,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterSkillTest' || trigger.succeeded || trigger.margin > -2) return []
    if (self.exhausted || self.uses < 1) return []
    const tester = getInvestigator(state, trigger.investigator)
    const here = getInvestigator(state, self.owner).location
    if (here === null || tester.location !== here || tester.horror < 1) return []
    return [
      {
        key: self.id + ':heal',
        investigator: self.owner,
        label: 'ability.grimmsFairyTales',
        params: { name: tester.name },
        then: [
          { type: 'ExhaustAsset', asset: self.id },
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'Heal', investigator: tester.id, damage: 0, horror: 1 },
        ],
      },
    ]
  },
})
