import {
  getInvestigator,
  getLocation,
  registerPlayerCard,
  shroudOf,
  type Choice,
  type Message,
} from '@lcg/engine'
import { cardName, continuation } from '../dunwich-pilot/effects'

// RR: Investigate; Uses; Skill Tests ST.4. Second Sight (5): +2 [willpower]; on success,
// optionally spend 1 charge for 1 additional clue here or 1 clue at a connecting location.
// A revealed [cultist] removes a charge or, without charges, deals 1 horror and discards it.
const code = '60481'
registerPlayerCard({
  code,
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here === null
      ? []
      : [
          {
            key: `${self.id}:investigate`,
            label: 'ability.investigateWith',
            params: { card: cardName(code), skill: 'willpower' },
            target: { type: 'location', id: here },
            actions: 1 + (getLocation(state, here).investigateExtraActions ?? 0),
            provokes: true,
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'willpower',
                difficulty: shroudOf(state, here),
                modifier: 2,
                source: self.id,
                tags: ['spell'],
                kind: {
                  type: 'investigate',
                  location: here,
                  onSuccess: [continuation(code, investigator, 'clue', { asset: self.id })],
                },
              },
            ],
          },
        ]
  },
  effect: (state, by, step, data) => {
    const self = state.assets[String(data.asset)]
    const here = getInvestigator(state, by).location
    if (step !== 'clue' || !self || self.uses < 1 || here === null) return []
    const spend: Message = { type: 'SpendUses', asset: self.id, amount: 1 }
    const choices: Choice[] = [
      {
        label: 'choice.spendChargeForClue',
        target: { type: 'location', id: here },
        then: [spend, { type: 'DiscoverClues', investigator: by, amount: 1, location: here }],
      },
      ...getLocation(state, here)
        .connections.map((id) => state.locations[id])
        .filter((l) => !!l && l.revealed && l.clues > 0)
        .map((l): Choice => ({
          label: 'choice.spendChargeForClueAt',
          params: { location: l!.name },
          target: { type: 'location', id: l!.id },
          then: [spend, { type: 'DiscoverClues', investigator: by, amount: 1, location: l!.id }],
        })),
      { label: 'choice.skip', then: [] },
    ]
    return [
      {
        type: 'Ask',
        investigator: by,
        question: { kind: 'chooseOne', prompt: 'prompt.optional', choices },
      },
    ]
  },
  onTokenRevealed: (_state, token, self) =>
    token !== 'cultist'
      ? []
      : self.uses > 0
        ? [{ type: 'SpendUses', asset: self.id, amount: 1 }]
        : [
            { type: 'TakeDamage', investigator: self.owner, damage: 0, horror: 1 },
            { type: 'DiscardAsset', asset: self.id },
          ],
})
