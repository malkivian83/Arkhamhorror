import { registerPlayerCard, type Message } from '@lcg/engine'
import { THE_RED_CLOCK } from './codes'

const effect = (investigator: string, step: string, data: Record<string, string | number>) =>
  ({ type: 'PlayerCardEffect', code: THE_RED_CLOCK, investigator, step, data }) satisfies Message

// RR: Exceptional, Uses (charges), Forced, Movement, Additional Actions. The Red Clock: after
// your turn begins, you may take all its charges as resources; place 1 charge on it. With exactly
// 1 charge, +4 skill value for your next skill test; 2, you may move up to 3 times; 3, you may
// take 2 additional actions this turn.
registerPlayerCard({
  code: THE_RED_CLOCK,
  forced: (_state, trigger, self) =>
    trigger.type === 'turnBegins' && trigger.investigator === self.owner
      ? [
          ...(self.uses > 0
            ? [
                {
                  type: 'Ask',
                  investigator: self.owner,
                  question: {
                    kind: 'chooseOne',
                    prompt: 'prompt.optional',
                    choices: [
                      {
                        label: 'choice.redClockTake',
                        params: { n: self.uses },
                        then: [
                          { type: 'SpendUses', asset: self.id, amount: self.uses },
                          { type: 'GainResources', investigator: self.owner, amount: self.uses },
                        ],
                      },
                      { label: 'choice.skip', then: [] },
                    ],
                  },
                } satisfies Message,
              ]
            : []),
          { type: 'AddUses', asset: self.id, amount: 1 },
          effect(self.owner, 'charges', { asset: self.id }),
        ]
      : [],
  effect: (state, investigator, step, data) => {
    if (step === 'move') {
      const left = Number(data.left)
      return [
        {
          type: 'ChooseMove',
          investigator,
          ...(left > 1 ? { then: [effect(investigator, 'move', { left: left - 1 })] } : {}),
        },
      ]
    }
    const clock = state.assets[String(data.asset)]
    if (step !== 'charges' || !clock) return []
    if (clock.uses === 1) return [{ type: 'NextTestBonus', investigator, amount: 4 }]
    if (clock.uses === 2) return [effect(investigator, 'move', { left: 3 })]
    if (clock.uses === 3) return [{ type: 'GainActions', investigator, amount: 2 }]
    return []
  },
})
