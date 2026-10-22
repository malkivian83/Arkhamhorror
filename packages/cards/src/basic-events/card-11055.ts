import { getLocation, type Message } from '@lcg/engine'
import { elite, registerBasicEvent, skillValue } from './register'
// Bum's Rush: add your combat to the evasion; by 2, 1 damage to that enemy and, if it is
// non-Elite, you may move it to a connecting location.
registerBasicEvent('11055', {
  action: 'evade',
  tags: ['tactic', 'trick'],
  modifier: ({ state, investigator }) => skillValue(state, investigator, 'combat'),
  onSuccess: ({ state, investigator }, enemy) => {
    const moves: Message[] = elite(enemy!)
      ? []
      : [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.optional',
              choices: [
                ...getLocation(state, enemy!.location)
                  .connections.filter((id) => state.locations[id])
                  .map((id) => ({
                    label: 'choice.moveEnemy',
                    params: { enemy: enemy!.name, location: getLocation(state, id).name },
                    target: { type: 'location' as const, id },
                    then: [{ type: 'MoveEnemy' as const, enemy: enemy!.id, location: id }],
                  })),
                { label: 'choice.skip', then: [] },
              ],
            },
          },
        ]
    return [
      {
        type: 'IfTestResult',
        atLeast: 2,
        then: [{ type: 'DamageEnemy', enemy: enemy!.id, amount: 1, by: investigator }, ...moves],
      },
    ]
  },
})
