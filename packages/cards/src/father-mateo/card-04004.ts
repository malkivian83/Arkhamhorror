import { getInvestigator, registerInvestigator, type Message } from '@lcg/engine'
import { MATEO } from './codes'

// RR: Triggered Abilities ("when" timing), Limits, Automatic Success, Additional Actions.
// Father Mateo: [reaction] when any investigator reveals an [auto_fail] token, in a test or
// through another ability, cancel it and treat it as an [elder_sign] (in a test, that
// investigator's elder sign resolves; limit once per game).
registerInvestigator({
  code: MATEO,
  reactions: (state, trigger, self) =>
    trigger.type === 'whenRevealChaosToken' &&
    (state.skillTest?.revealing ?? state.tokenReveal)?.face === 'autoFail'
      ? [
          {
            key: 'mateo',
            investigator: self.id,
            label: 'ability.mateo.elderSign',
            params: { name: getInvestigator(state, trigger.investigator).name },
            limit: { per: 'game' },
            then: [{ type: 'TreatRevealedTokenAs', token: 'elderSign' }],
          },
        ]
      : [],
  // Signo arcano: éxito automático; al terminar la prueba, roba 1 carta y gana 1 recurso o,
  // si es tu turno, puedes realizar una acción adicional este turno.
  elderSign: (state, self) => {
    const draw: Message[] = [
      { type: 'DrawCards', investigator: self.id, amount: 1 },
      { type: 'GainResources', investigator: self.id, amount: 1 },
    ]
    return {
      modifier: 0,
      autoSucceed: true,
      after:
        state.activeTurn === self.id
          ? [
              {
                type: 'Ask',
                investigator: self.id,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.mateo.elderSign',
                  choices: [
                    { label: 'choice.mateo.drawAndGain', then: draw },
                    {
                      label: 'choice.mateo.action',
                      then: [{ type: 'GainActions', investigator: self.id, amount: 1 }],
                    },
                  ],
                },
              },
            ]
          : draw,
    }
  },
})
