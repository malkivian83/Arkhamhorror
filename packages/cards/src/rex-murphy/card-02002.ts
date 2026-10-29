// RR: Skill Tests ST.6, Discover, Elder Sign. Original Rex, without optional taboo.
import { registerInvestigator } from '@lcg/engine'
import { ask } from '../dunwich-pilot/effects'
registerInvestigator({
  code: '02002',
  elderSign: (_s, i) => ({
    modifier: 2,
    immediate: ask(
      i.id,
      [
        { label: 'choice.skip', then: [] },
        {
          label: 'choice.rexFail',
          then: [
            { type: 'ForceSkillTestFailure' },
            { type: 'DrawCards', investigator: i.id, amount: 3 },
          ],
        },
      ],
      true,
    ),
  }),
  reactions: (s, t, i) =>
    t.type === 'afterSkillTest' &&
    t.investigator === i.id &&
    t.kind === 'investigate' &&
    t.succeeded &&
    t.margin >= 2 &&
    i.location !== null &&
    (s.locations[i.location]?.clues ?? 0) > 0
      ? [
          {
            key: 'rexClue',
            investigator: i.id,
            label: 'ability.rexClue',
            then: [{ type: 'DiscoverClues', investigator: i.id, location: i.location, amount: 1 }],
          },
        ]
      : [],
})
