import { engagedEnemies, registerTreachery } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.wings,
  revelation: (s, i) => [
    effectTest(i, 'On Wings of Darkness', 'agility', 4, {
      onFail: [
        damage(i, 1, 1),
        ...engagedEnemies(s, i)
          .filter((e) => !e.traits?.includes('Nightgaunt'))
          .map((e) => ({ type: 'DisengageEnemy' as const, enemy: e.id })),
        { type: 'MoveTo', investigator: i, location: B.commons },
      ],
    }),
  ],
})
