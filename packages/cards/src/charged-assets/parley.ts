// RR: Parley, Skill Tests, Then, Evade, Moving Enemies, Costs.
import {
  enemiesAt,
  getInvestigator,
  getLocation,
  registerPlayerCard,
  stuckInPlay,
  type Message,
  type SkillType,
  type GameState,
  type Choice,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
const skills: SkillType[] = ['willpower', 'intellect', 'agility', 'combat']
const localEnemies = (s: GameState, by: string) => {
  const here = getInvestigator(s, by).location
  return here === null ? [] : enemiesAt(s, here)
}
export function registerParley(code: string): boolean {
  if (['10066', '10082'].includes(code)) {
    const high = code === '10082'
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        !high && a.exhausted
          ? []
          : localEnemies(s, by).map((e) => ({
              key: a.id + ':parley:' + e.id,
              actions: 1,
              provokes: false,
              parley: true,
              label: 'choice.chargedParley',
              params: { enemy: e.name, card: cardName(code) },
              target: { type: 'enemy', id: e.id },
              costs: high ? [] : [{ type: 'ExhaustAsset' as const, asset: a.id }],
              then: [
                {
                  type: 'BeginSkillTest' as const,
                  investigator: by,
                  skill: 'intellect' as const,
                  source: a.id,
                  difficulty: (high ? 0 : 1) + a.uses,
                  tags: ['parley'],
                  kind: {
                    type: 'effect' as const,
                    source: cardName(code),
                    onFailEach: [],
                    onSuccess: [continuation(code, by, 'success', { asset: a.id })],
                    onFail: [continuation(code, by, 'fail', { asset: a.id, enemy: e.id })],
                  },
                },
              ],
            })),
      effect: (s, by, step, data) => {
        const a = s.assets[String(data.asset)]
        if (!a) return []
        if (step === 'success') {
          const here = getInvestigator(s, by).location
          const clues: Message[] =
            here === null
              ? []
              : !high
                ? [{ type: 'DiscoverClues', investigator: by, amount: 1 }]
                : ask(
                    by,
                    [here, ...getLocation(s, here).connections]
                      .filter((l) => (s.locations[l]?.clues ?? 0) > 0)
                      .map((l) => ({
                        label: 'choice.chargedClue',
                        params: { location: getLocation(s, l).name },
                        target: { type: 'location', id: l },
                        then: [{ type: 'DiscoverClues', investigator: by, amount: 1, location: l }],
                      })),
                  )
          return [
            ...clues,
            ...(high
              ? [
                  {
                    type: 'IfTestResult' as const,
                    below: 2,
                    then: [{ type: 'AddUses' as const, asset: a.id, amount: 1 }],
                  },
                ]
              : [{ type: 'AddUses' as const, asset: a.id, amount: 1 }]),
          ]
        }
        if (step === 'fail')
          return high
            ? [{ type: 'ReturnAssetToHand', asset: a.id }]
            : ask(
                by,
                [
                  ...(!stuckInPlay(s, a)
                    ? [
                        {
                          label: 'choice.chargedTrash',
                          params: { card: cardName(code) },
                          then: [{ type: 'DiscardAsset' as const, asset: a.id }],
                        },
                      ]
                    : []),
                  ...(s.enemies[String(data.enemy)]
                    ? [
                        {
                          label: 'choice.chargedEnemyAttack',
                          params: { enemy: s.enemies[String(data.enemy)]!.name },
                          then: [
                            {
                              type: 'EnemyAttack' as const,
                              enemy: String(data.enemy),
                              investigator: by,
                              exhaustAfter: false,
                              evenIfExhausted: true,
                            },
                          ],
                        },
                      ]
                    : []),
                ],
                true,
              )
        return []
      },
    })
    return true
  }
  if (!['10074', '10081'].includes(code)) return false
  const high = code === '10081'
  registerPlayerCard({
    code,
    parley: true,
    canPlay: (s, by) => localEnemies(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        localEnemies(s, by).map((e) => ({
          label: 'choice.chargedEnemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [continuation(code, by, 'select', { enemy: e.id, selected: '' })],
        })),
      ),
    effect: (s, by, step, data) => {
      const enemy = String(data.enemy),
        e = s.enemies[enemy]
      const selected = String(data.selected ?? '')
        .split(',')
        .filter(Boolean)
      if (step === 'select') {
        const choices: Choice[] = skills
          .filter((skill) => !selected.includes(skill))
          .map((skill) => ({
            label: 'choice.chargedSkill',
            params: { skill },
            then: [
              continuation(code, by, high ? 'select' : 'order', {
                enemy,
                selected: [...selected, skill].join(','),
              }),
            ],
          }))
        if (high)
          choices.push({
            label: 'choice.chargedVampDone',
            then: [continuation(code, by, 'order', { enemy, selected: selected.join(',') })],
          })
        return ask(by, choices, true)
      }
      if (step === 'order')
        return ask(
          by,
          selected.map((skill) => ({
            label: 'choice.chargedSkill',
            params: { skill },
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: skill as SkillType,
                difficulty: high ? 2 : 3,
                effectSource: code,
                tags: ['parley'],
                kind: {
                  type: 'effect',
                  source: cardName(code),
                  onFailEach: [],
                  onSuccess: [
                    continuation(code, by, 'result', { enemy, skill }),
                    {
                      type: 'AfterCurrentSkillTest',
                      then: [
                        continuation(code, by, 'order', {
                          enemy,
                          selected: selected.filter((v) => v !== skill).join(','),
                        }),
                      ],
                    },
                  ],
                  onFail: [
                    {
                      type: 'AfterCurrentSkillTest',
                      then: [
                        continuation(code, by, 'order', {
                          enemy,
                          selected: selected.filter((v) => v !== skill).join(','),
                        }),
                      ],
                    },
                  ],
                },
              },
            ],
          })),
          true,
        )
      if (step === 'result') {
        if (data.skill === 'intellect')
          return !high || e?.location
            ? [
                {
                  type: 'DiscoverClues',
                  investigator: by,
                  amount: 1,
                  ...(high && e?.location ? { location: e.location } : {}),
                },
              ]
            : []
        if (!e) return []
        if (data.skill === 'willpower')
          return [{ type: 'RemoveDoom', target: { type: 'enemy', id: enemy }, amount: 1 }]
        if (data.skill === 'combat')
          return [{ type: 'DamageEnemy', enemy, amount: 2, investigator: by }]
        if (data.skill === 'agility')
          return [{ type: 'EvadeEnemy', enemy, by }, continuation(code, by, 'move', { enemy })]
      }
      if (step === 'move' && e?.location && !e.traits?.includes('Elite'))
        return ask(
          by,
          getLocation(s, e.location)
            .connections.filter((l) => s.locations[l])
            .map((location) => ({
              label: 'choice.chargedMoveEnemy',
              params: { enemy: e.name, location: getLocation(s, location).name },
              target: { type: 'location', id: location },
              then: [{ type: 'MoveEnemy', enemy, location }],
            })),
          true,
        )
      return []
    },
  })
  return true
}
