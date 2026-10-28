import { activeInvestigators, registerEnemy, scenarioBehavior, type GameState } from '@lcg/engine'
import { enemy } from '../scenario-helpers'
import { B } from './altar-codes'
export const servantOfManyMouths = enemy({
  code: B.servant,
  name: 'Servant of Many Mouths',
  traits: ['Humanoid'],
  fight: 3,
  health: 2,
  evade: 1,
  damage: 2,
  horror: 0,
  keywords: ['retaliate'],
})
registerEnemy({
  code: B.servant,
  spawn: (s) =>
    Object.keys(s.locations).filter(
      (l) =>
        !activeInvestigators(s).some((i) => i.location === l) &&
        !Object.values(s.enemies).some((e) => e.location === l),
    ),
  reactions: (s, t, self) =>
    t.type === 'enemyDefeated' && t.enemy.id === self.id && t.by && clueTargets(s, t.by).length > 0
      ? [
          {
            key: `${self.id}:clue`,
            investigator: t.by,
            label: 'ability.altar.servant',
            then: [
              {
                type: 'Ask',
                investigator: t.by,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseLocation',
                  choices: clueTargets(s, t.by).map((l) => ({
                    label: 'choice.location',
                    params: { location: l.name },
                    then: [
                      { type: 'DiscoverClues', investigator: t.by!, location: l.id, amount: 1 },
                    ],
                  })),
                },
              },
            ],
          },
        ]
      : [],
})
const clueTargets = (s: GameState, i: string) =>
  Object.values(s.locations).filter(
    (l) => l.clues > 0 && !scenarioBehavior(s.scenarioId)?.cannotDiscoverClues?.(s, i, l.id, false),
  )
