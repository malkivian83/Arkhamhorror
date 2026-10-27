import { registerTreachery, type Choice } from '@lcg/engine'
import { REMAINING_CODES as C } from './remaining-codes'
registerTreachery({
  code: C.lightOfAforgomon,
  allDamageDirect: true,
  revelation: (state, investigator, self) => {
    const choices: Choice[] = []
    const agenda = state.agendas[state.agendaIndex]
    const act = state.acts[state.actIndex]
    for (const [type, card] of [
      ['agenda', agenda],
      ['act', act],
    ] as const) {
      if (
        !card?.code ||
        Object.values(state.treacheries).some(
          (t) => t.id !== self.id && t.code === self.code && t.placement.type === type,
        )
      )
        continue
      choices.push({
        label: `choice.dunwich.attach${type === 'act' ? 'Act' : 'Agenda'}`,
        then: [
          { type: 'PlaceTreachery', treachery: self.id, placement: { type, code: card.code } },
        ],
      })
    }
    return choices.length
      ? [
          {
            type: 'Ask',
            investigator,
            question: { kind: 'chooseOne', prompt: 'prompt.chooseEffect', choices },
          },
        ]
      : []
  },
  persistsWhile: (state, self) =>
    self.placement.type === 'limbo' ||
    (self.placement.type === 'act'
      ? state.acts[state.actIndex]?.code === self.placement.code
      : self.placement.type === 'agenda' &&
        state.agendas[state.agendaIndex]?.code === self.placement.code),
})
