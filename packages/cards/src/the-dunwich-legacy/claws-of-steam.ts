import { registerTreachery } from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { T } from './essex-codes'
registerTreachery({
  code: T.claws,
  revelation: (s, investigator) => [
    effectTest(investigator, 'Claws of Steam', 'willpower', 3, {
      onFail: [
        { type: 'TakeDamage', investigator, damage: 2, horror: 0, assignFirst: { damage: '*' } },
        { type: 'SetScenarioMeta', key: `trainStuck:${investigator}`, value: s.round },
      ],
    }),
  ],
})
