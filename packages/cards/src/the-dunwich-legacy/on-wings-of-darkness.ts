import { engagedEnemies, registerTreachery, type Message } from '@lcg/engine'
import { damage, effectTest } from '../scenario-helpers'
import { B } from './altar-codes'
registerTreachery({
  code: B.wings,
  revelation: (s, i) => {
    const central = [B.commons, '01125'].filter((id) => s.locations[id])
    const move: Message[] =
      central.length === 1
        ? [{ type: 'MoveTo', investigator: i, location: central[0]! }]
        : central.length
          ? [
              {
                type: 'Ask',
                investigator: i,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseLocation',
                  choices: central.map((location) => ({
                    label: 'choice.location',
                    params: { location: s.locations[location]!.name },
                    target: { type: 'location', id: location },
                    then: [{ type: 'MoveTo', investigator: i, location }],
                  })),
                },
              },
            ]
          : []
    return [
      effectTest(i, 'On Wings of Darkness', 'agility', 4, {
        onFail: [
          damage(i, 1, 1),
          ...engagedEnemies(s, i)
            .filter((e) => !e.traits?.includes('Nightgaunt'))
            .map((e) => ({ type: 'DisengageEnemy' as const, enemy: e.id })),
          ...move,
          ...[
            ...new Set(
              engagedEnemies(s, i)
                .filter((e) => !e.traits?.includes('Nightgaunt'))
                .map((e) => e.location),
            ),
          ].map((location) => ({ type: 'CheckEngagement' as const, location })),
        ],
      }),
    ]
  },
})
