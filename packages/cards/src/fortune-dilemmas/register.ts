// RR: Revelation, Dilemma, As If, Next Turn, Then, Direct Damage/Horror, Doom.
import { leadInvestigator, registerPlayerCard, type Message } from '@lcg/engine'
import { ask, continuation } from '../dunwich-pilot/effects'
export function registerFortuneDilemma(code: string): void {
  registerPlayerCard({
    code,
    dilemma: true,
    canPlay: () => false,
    revelation: (_s, by) => [continuation(code, by, 'choose')],
    effect: (s, by, step) => {
      const active = s.investigators.filter((i) => !i.eliminated)
      if (code !== '09118') throw Error('Unreviewed fortune dilemma')
      const remove: Message[] = [
        { type: 'RemoveResolvingRevelation', investigator: by, code },
        ...active.map((i) => ({
          type: 'TakeDamage' as const,
          investigator: i.id,
          damage: 1,
          horror: 1,
          direct: true,
        })),
      ]
      if (step === 'choose')
        return ask(
          by,
          [
            {
              label: 'choice.fortuneHeal',
              then: [
                { type: 'PlaceDoom', amount: 1 },
                ...active.map((i) => ({
                  type: 'Heal' as const,
                  investigator: i.id,
                  damage: 3,
                  horror: 3,
                })),
              ],
            },
            { label: 'choice.fortuneDoom', then: [continuation(code, by, 'remove')] },
          ],
          true,
        )
      if (step !== 'remove') return []
      if (s.secondAgenda)
        return ask(
          leadInvestigator(s)?.id ?? by,
          (['first', 'second'] as const).map((deck) => ({
            label: 'choice.doomOnAgenda',
            params: {
              name:
                (deck === 'first'
                  ? s.agendas[s.agendaIndex]
                  : s.secondAgenda!.agendas[s.secondAgenda!.index]
                )?.name ?? '',
              amount: -1,
            },
            then: [{ type: 'RemoveDoom', target: { type: 'agenda', deck }, amount: 1 }, ...remove],
          })),
          true,
        )
      return [{ type: 'RemoveDoom', target: { type: 'agenda' }, amount: 1 }, ...remove]
    },
  })
}
