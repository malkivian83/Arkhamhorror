// RR: Initiation, Costs, Evade, Parley, Skill Tests ST.7, Target, Weaknesses.
import {
  registerPlayerCard,
  getInvestigator,
  distancesFrom,
  playerCardDef,
  eventsToDeckBottom,
  attachedStat,
  scenarioBehavior,
  engagedEnemies,
  type GameState,
  type Message,
  type Choice,
  type Enemy,
} from '@lcg/engine'
import { ask, continuation, cardName } from '../dunwich-pilot/effects'
const elite = (e: Enemy) => e.traits?.includes('Elite')
const local = (s: GameState, by: string) =>
  Object.values(s.enemies).filter(
    (e) => e.location === getInvestigator(s, by).location && !e.hasNoStats,
  )
const targets = (s: GameState, by: string, range: boolean) => {
  const here = getInvestigator(s, by).location
  const ds = here === null ? new Map<string, number>() : distancesFrom(s, here)
  return Object.values(s.enemies).filter(
    (e) =>
      !elite(e) &&
      !e.hasNoStats &&
      (range ? (ds.get(e.location) ?? Infinity) <= 2 : e.location === here),
  )
}
const cost = (id: number) => ((id & 1) + ((id >> 1) & 1)) * 2
const clueLocations = (s: GameState, by: string, range: boolean) => {
  const here = getInvestigator(s, by).location
  const ds = here === null ? new Map<string, number>() : distancesFrom(s, here)
  return Object.values(s.locations).filter(
    (l) => l.revealed && l.clues > 0 && (range ? (ds.get(l.id) ?? Infinity) <= 2 : l.id === here),
  )
}
const stat = (s: GameState, e: Enemy, key: 'fight' | 'evade', by: string) =>
  Math.max(
    0,
    e[key] +
      attachedStat(s, e.id, key) +
      (scenarioBehavior(s.scenarioId)?.enemyStat?.(s, e, key, undefined, by) ?? 0),
  )
export function registerService(code: string) {
  if (code === '04153') {
    registerPlayerCard({
      code,
      canCommit: (s, t) =>
        !!t.tags?.includes('scenario') &&
        !t.effectSource &&
        (!t.source || !s.assets[t.source] || !!playerCardDef(s.assets[t.source]!.code)?.story),
      afterCommittedTest: (_s, _t, success, by) =>
        success ? [{ type: 'DiscoverClues', investigator: by, amount: 1 }] : [],
    })
    return
  }
  if (['05111', '05234', '05277'].includes(code)) {
    registerPlayerCard({
      code,
      ...(code === '05234' ? { evadeAction: true, noAttacksOfOpportunity: true } : {}),
      canPlay: (s, by) =>
        code === '05111'
          ? clueLocations(s, by, true).length > 0
          : targets(s, by, true).some((e) => code !== '05234' || !e.cannotBeEvaded),
      playVariants: (s, by) =>
        [0, 1, 2, 3]
          .filter((id) =>
            code === '05111'
              ? clueLocations(s, by, !!(id & 2)).length > 0
              : targets(s, by, !!(id & 2)).some((e) => code !== '05234' || !e.cannotBeEvaded),
          )
          .map((id) => ({ id, cost: cost(id), label: `choice.serviceMode${id}` })),
      play: (_s, by, _x, _discard, _discardCost, variant = 0) => [
        continuation(code, by, 'target', { variant, left: variant & 1 ? 2 : 1, selected: '' }),
      ],
      effect: (s, by, step, data) => {
        const selected = String(data.selected ?? '')
          .split(',')
          .filter(Boolean)
        if (step === 'evade' || (step === 'target' && Number(data.left) <= 0))
          return selected.map((enemy): Message => ({ type: 'EvadeEnemy', enemy, by }))
        if (step !== 'target') return []
        const range = !!(Number(data.variant) & 2),
          amount = Number(data.variant) & 1 ? 2 : 1
        if (code === '05111') {
          const here = getInvestigator(s, by).location
          const ds = here === null ? new Map<string, number>() : distancesFrom(s, here)
          return ask(
            by,
            Object.values(s.locations)
              .filter(
                (l) =>
                  l.revealed &&
                  l.clues > 0 &&
                  (range ? (ds.get(l.id) ?? Infinity) <= 2 : l.id === here),
              )
              .map((l) => ({
                label: 'choice.location',
                params: { location: l.name },
                target: { type: 'location' as const, id: l.id },
                then: [{ type: 'DiscoverClues', investigator: by, amount, location: l.id }],
              })),
            true,
          )
        }
        const choices: Choice[] = targets(s, by, range)
          .filter((e) => !selected.includes(e.id) && (code !== '05234' || !e.cannotBeEvaded))
          .map((e) => ({
            label: 'choice.serviceEnemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then:
              code === '05234'
                ? [
                    continuation(code, by, 'target', {
                      ...data,
                      left: Number(data.left) - 1,
                      selected: [...selected, e.id].join(','),
                    }),
                  ]
                : [{ type: 'DamageEnemy', enemy: e.id, amount, by }],
          }))
        if (code === '05234' && amount === 2)
          choices.push({
            label: 'choice.serviceDone',
            then: [continuation(code, by, 'evade', data)],
          })
        return ask(by, choices, true)
      },
    })
    return
  }
  if (['04105', '10114'].includes(code)) {
    const available = (s: GameState, by: string) =>
      local(s, by).filter(
        (e) =>
          code !== '04105' ||
          (e.traits?.includes('Humanoid') && !e.owner && !playerCardDef(e.code)?.weakness),
      )
    registerPlayerCard({
      code,
      parley: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => available(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          available(s, by).map((e) => ({
            label: 'choice.serviceEnemy',
            params: { enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: code === '04105' ? 'intellect' : 'willpower',
                difficulty:
                  code === '04105'
                    ? 3 +
                      Math.max(
                        0,
                        e.horror +
                          (scenarioBehavior(s.scenarioId)?.enemyHorrorModifier?.(s, e) ?? 0),
                      )
                    : Math.min(stat(s, e, 'fight', by), stat(s, e, 'evade', by)),
                tags: ['parley'],
                kind: {
                  type: 'effect',
                  source: cardName(code),
                  onSuccess: [continuation(code, by, 'success', { enemy: e.id })],
                  onFail: code === '10114' ? [continuation(code, by, 'return')] : [],
                  onFailEach: [],
                },
              },
            ],
          })),
          true,
        ),
      effect: (s, by, step, data): Message[] => {
        if (step === 'return')
          return eventsToDeckBottom(s, by)
            ? [{ type: 'TakeFromDeck', investigator: by, code, to: 'hand', fromBottom: true }]
            : [{ type: 'DiscardToHand', investigator: by, code }]
        const e = s.enemies[String(data.enemy)]
        if (step !== 'success' || !e) return []
        if (code === '10114')
          return [
            { type: 'ExhaustEnemy', enemy: e.id },
            ...(!elite(e) ? [{ type: 'EnemyStaysExhausted' as const, enemy: e.id }] : []),
          ]
        if (!elite(e) && (e.encounterBack === false || e.originalCardCode || playerCardDef(e.code)))
          return []
        return elite(e)
          ? [{ type: 'EvadeEnemy', enemy: e.id, by }]
          : [
              { type: 'PutEnemyOnEncounterDeck', enemy: e.id },
              { type: 'ShuffleSetAsideIntoEncounter', codes: [] },
            ]
      },
    })
    return
  }
  if (code === '05113') {
    registerPlayerCard({
      code,
      evadeAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) =>
        engagedEnemies(s, by).some((e) => !elite(e) && !e.cannotBeEvaded && !e.hasNoStats),
      play: (s, by) =>
        ask(
          by,
          engagedEnemies(s, by)
            .filter((e) => !elite(e) && !e.cannotBeEvaded && !e.hasNoStats)
            .map((e) => ({
              label: 'choice.serviceEnemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: [
                {
                  type: 'BeginSkillTest',
                  investigator: by,
                  skill: 'willpower',
                  difficulty: e.evade,
                  kind: {
                    type: 'evade',
                    enemy: e.id,
                    onSuccess: [continuation(code, by, 'move', { enemy: e.id })],
                  },
                },
              ],
            })),
          true,
        ),
      effect: (s, by, step, data) => {
        const e = s.enemies[String(data.enemy)]
        if (step !== 'move' || !e || elite(e)) return []
        const lock = s.skillTest?.tokens.some((t) =>
          ['skull', 'cultist', 'tablet', 'elderThing'].includes(String(t)),
        )
        return [
          ...(lock ? [{ type: 'EnemyStaysExhausted' as const, enemy: e.id }] : []),
          ...ask(
            by,
            Object.values(s.locations).map((l) => ({
              label: 'choice.location',
              params: { location: l.name },
              target: { type: 'location' as const, id: l.id },
              then: [{ type: 'MoveEnemy', enemy: e.id, location: l.id }],
            })),
            true,
          ),
        ]
      },
    })
    return
  }
  throw Error('Unreviewed service: ' + code)
}
