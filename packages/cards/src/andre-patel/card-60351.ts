import { registerInvestigator } from '@lcg/engine'
import { ANDRE } from './codes'

// RR: Triggered Abilities, Limits, Additional Actions, Elder Sign. André Patel:
// [reaction] after you succeed at a skill test by 2 or more during your turn, you may
// take an additional action this turn (limit once per round).
registerInvestigator({
  code: ANDRE,
  reactions: (state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.id &&
    trigger.succeeded &&
    trigger.margin >= 2 &&
    state.activeTurn === self.id
      ? [
          {
            key: 'andre',
            investigator: self.id,
            label: 'ability.andre.action',
            limit: { per: 'round' },
            then: [{ type: 'GainActions', investigator: self.id, amount: 1 }],
          },
        ]
      : [],
  // Signo arcano: +2; gana 1 recurso.
  elderSign: (_state, self) => ({
    modifier: 2,
    immediate: [{ type: 'GainResources', investigator: self.id, amount: 1 }],
  }),
})
