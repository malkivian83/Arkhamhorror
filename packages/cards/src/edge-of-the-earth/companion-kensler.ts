import {
  activeInvestigators,
  getInvestigator,
  shroudOf,
  turnActionTiming,
  type Choice,
  type EncounterCard,
  type Message,
  type PlayerCardBehavior,
} from '@lcg/engine'
import { cardName, continuation } from '../dunwich-pilot/effects'

type Card = string | EncounterCard

export function kensler(code: string, resolute: boolean): PlayerCardBehavior {
  return {
    code,
    abilities: (state, self, investigator) => {
      const { location } = getInvestigator(state, investigator)
      if (
        !location ||
        self.exhausted ||
        self.uses < 1 ||
        (resolute && !turnActionTiming(state, investigator))
      )
        return []
      return [
        {
          key: `${self.id}:investigate`,
          label: 'ability.edgeOfTheEarth.kensler',
          actions: resolute ? 0 : 1,
          actionKind: 'investigate',
          // La versión de determinación es [rápida]: no provoca ataques de oportunidad.
          provokes: !resolute,
          costs: [
            { type: 'SpendUses', asset: self.id, amount: 1 },
            { type: 'ExhaustAsset', asset: self.id },
          ],
          then: [
            {
              type: 'BeginSkillTest',
              investigator,
              skill: 'intellect',
              difficulty: shroudOf(state, location),
              baseSkill: resolute ? 6 : 5,
              source: self.id,
              kind: {
                type: 'investigate',
                location,
                onSuccess: [continuation(code, investigator, 'chooseDeck')],
              },
            },
          ],
        },
      ]
    },
    effect: (state, investigator, step, data) => {
      if (step === 'chooseDeck') {
        const look = (owner?: string): Message => ({
          type: 'InspectDeck',
          count: 1,
          ...(owner ? { investigator: owner } : {}),
          then: { type: 'PlayerCardEffect', code, investigator, step: 'inspect' },
        })
        const choices = activeInvestigators(state)
          .filter((player) => player.deck.length)
          .map(({ id, name }): Choice => ({
            label: 'choice.edgeOfTheEarth.lookPlayer',
            params: { name },
            then: [look(id)],
          }))
        if (state.encounterDeck.length)
          choices.push({ label: 'choice.edgeOfTheEarth.lookEncounter', then: [look()] })
        return [
          {
            type: 'Ask',
            investigator,
            question: { kind: 'chooseOne', prompt: 'prompt.edgeOfTheEarth.kensler', choices },
          },
        ]
      }
      const [card] = JSON.parse(String(data.cards ?? '[]')) as Card[]
      if (!card) return []
      const owner = data.who ? { investigator: String(data.who) } : {}
      const name = typeof card === 'string' ? cardName(card) : card.name
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.edgeOfTheEarth.kenslerCard',
            choices: [
              {
                label: 'choice.scrollTop',
                params: { card: name },
                then: [{ type: 'ReturnInspectedCards', ...owner, top: [card], bottom: [] }],
              },
              {
                label: 'choice.scrollDiscard',
                params: { card: name },
                then: [{ type: 'MoveInspectedCard', ...owner, card, to: 'discard' }],
              },
            ],
          },
        },
      ]
    },
  }
}
