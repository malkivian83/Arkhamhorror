import {
  getInvestigator,
  canEnter,
  getLocation,
  registerPlayerCard,
  shroudOf,
  type AbilityOption,
} from '@lcg/engine'
import { attackable } from '../core-2026/player-cards'
import { ask, continuation, destinations } from '../dunwich-pilot/effects'

// RR: Activate, Base Value, Investigate, Move. Duke occupies no ally slot.
registerPlayerCard({
  code: '02014',
  abilities: (s, a, by) => {
    if (a.exhausted) return []
    const costs = [{ type: 'ExhaustAsset' as const, asset: a.id }]
    const options: AbilityOption[] = attackable(s, by).map((e) => ({
      key: a.id + ':fight',
      label: 'ability.fightWith',
      params: { card: 'Duke', enemy: e.name },
      actions: 1,
      provokes: false,
      costs,
      target: { type: 'enemy', id: e.id },
      then: [
        {
          type: 'BeginSkillTest',
          investigator: by,
          source: a.id,
          skill: 'combat',
          baseSkill: 4,
          difficulty: e.fight,
          kind: { type: 'fight', enemy: e.id, extraDamage: 1 },
        },
      ],
    }))
    options.push({
      key: a.id + ':investigate',
      label: 'ability.investigateWith',
      params: { card: 'Duke' },
      actions: 1,
      provokes: true,
      costs,
      then: [continuation('02014', by, 'choose-location', { asset: a.id })],
    })
    return options
  },
  effect: (s, by, step, data) => {
    const here = getInvestigator(s, by).location
    if (here === null) return []
    if (step === 'choose-location')
      return ask(
        by,
        [here, ...destinations(s, by).filter((to) => canEnter(s, by, to))].map((location) => ({
          label: 'choice.peteInvestigate',
          params: { location: getLocation(s, location).name },
          target: { type: 'location' as const, id: location },
          then: [
            ...(location === here ? [] : [{ type: 'MoveTo' as const, investigator: by, location }]),
            continuation('02014', by, 'investigate', { asset: String(data?.asset ?? '') }),
          ],
        })),
        true,
      )
    if (step !== 'investigate') return []
    return [
      {
        type: 'BeginSkillTest',
        investigator: by,
        source: String(data?.asset ?? ''),
        skill: 'intellect',
        baseSkill: 4,
        difficulty: shroudOf(s, here),
        kind: { type: 'investigate', location: here },
      },
    ]
  },
})
