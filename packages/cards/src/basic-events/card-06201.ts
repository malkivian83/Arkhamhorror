import {
  fightEnemies,
  getInvestigator,
  registerPlayerCard,
  type Choice,
  type Message,
} from '@lcg/engine'
import { SYMBOLS } from '../basic-abilities/register'
import {
  actionFlags,
  basicTest,
  elite,
  returnAtEndOfTurn,
  skillValue,
  targets,
  type BasicEvent,
} from './register'
// Spectral Razor (0, 2): add your willpower; +1 damage (+2 against non-Elite). You may
// engage the attacked enemy immediately before the attack. Level 2 returns to hand at the
// end of your turn if a symbol was revealed.
for (const [code, comeBack] of [
  ['06201', false],
  ['10102', true],
] as const) {
  const spec: BasicEvent = {
    action: 'fight',
    tags: ['spell'],
    modifier: ({ state, investigator }) => skillValue(state, investigator, 'willpower'),
    extraDamage: (_ctx, enemy) => (elite(enemy) ? 1 : 2),
    ...(comeBack
      ? {
          after: ({ investigator }) => [
            {
              type: 'IfTestResult',
              tokens: [...SYMBOLS, 'elderSign'],
              then: [returnAtEndOfTurn(investigator, code)],
            } as Message,
          ],
        }
      : {}),
  }
  registerPlayerCard({
    code,
    ...actionFlags(spec),
    canPlay: (state, investigator) => {
      const here = getInvestigator(state, investigator).location
      return here !== null && fightEnemies(state, investigator).length > 0
    },
    play: (state, investigator) => {
      const ctx = { state, investigator, code }
      const direct = new Set(targets(spec, state, investigator).map((e) => e.id))
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: fightEnemies(state, investigator).flatMap((enemy): Choice[] => [
              ...(direct.has(enemy.id)
                ? [
                    {
                      label: 'choice.enemy',
                      params: { enemy: enemy.name },
                      target: { type: 'enemy' as const, id: enemy.id },
                      then: [basicTest(spec, ctx, enemy)],
                    },
                  ]
                : []),
              ...(!enemy.global &&
              enemy.engagedWith !== investigator &&
              !enemy.keywords.includes('massive')
                ? [
                    {
                      label: 'choice.engageThenAttack',
                      params: { enemy: enemy.name },
                      then: [
                        { type: 'EngageEnemy', enemy: enemy.id, investigator } as Message,
                        basicTest(spec, ctx, enemy),
                      ],
                    },
                  ]
                : []),
            ]),
          },
        },
      ]
    },
  })
}
