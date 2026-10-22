import {
  distancesFrom,
  getInvestigator,
  registerTreachery,
  shroudOf,
  type Message,
} from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'

// RR: Revelation, Attachments, Investigate, Weakness. Ties for the farthest
// location are chosen by Jenny; anyone at that location may use the ability.
registerTreachery({
  code: '02011',
  revelation: (s, by, self) => {
    const here = getInvestigator(s, by).location
    const distances = here === null ? new Map<string, number>() : distancesFrom(s, here)
    const farthest = Math.max(...distances.values())
    const attach = (location: string): Message => ({
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'location', location },
    })
    const options = [...distances].filter(([, d]) => d === farthest).map(([id]) => id)
    if (options.length < 2) return options.map(attach)
    return ask(
      by,
      options.map((id) => ({
        label: 'choice.attachToLocation',
        params: { location: s.locations[id]!.name },
        target: { type: 'location' as const, id },
        then: [attach(id)],
      })),
      true,
    )
  },
  abilities: (s, t, investigator) =>
    t.placement.type !== 'location'
      ? []
      : [
          {
            key: t.id + ':izzie',
            label: 'ability.searchingForIzzie',
            actions: 2,
            provokes: true,
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'intellect',
                source: t.code,
                difficulty: shroudOf(s, t.placement.location),
                kind: {
                  type: 'investigate',
                  location: t.placement.location,
                  replaceClue: true,
                  onSuccess: [{ type: 'DiscardTreachery', treachery: t.id }],
                },
              },
            ],
          },
        ],
  whenGameEnds: (_s, self) =>
    self.owner ? [{ type: 'SufferTrauma', investigator: self.owner, mental: 1 }] : [],
})
