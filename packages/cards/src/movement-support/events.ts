// RR: Move, Evade, Engage, Fight, Immune, Nested Effects, Delayed Effects.
import {
  attackBlocked,
  engagedEnemies,
  enemiesAt,
  getLocation,
  enemyHasKeyword,
  immuneToPlayerCards,
  skillValueFor,
  scenarioBehavior,
  revealedTestTokens,
  type GameState,
  type Message,
  type Enemy,
} from '@lcg/engine'
import {
  ask,
  continuation,
  event,
  here,
  neighbors,
  distance,
  walk,
  registerPlayerCard,
} from './common'

const enemies = (s: GameState) =>
  Object.values(s.enemies).filter((e) => !e.hasNoStats && !e.global && !immuneToPlayerCards(e))
const selectEnemies = (by: string, list: Enemy[], then: (e: Enemy) => Message[]) =>
  ask(
    by,
    list.map((e) => ({
      label: 'choice.enemy',
      params: { enemy: e.name },
      target: { type: 'enemy' as const, id: e.id },
      then: then(e),
    })),
    true,
  )
const routes = (s: GameState, by: string) =>
  enemies(s).filter(
    (e) =>
      e.location !== here(s, by) &&
      here(s, by) &&
      Number.isFinite(distance(s, here(s, by)!, e.location)),
  )
const huntTargets = (s: GameState, by: string) =>
  enemies(s).filter((e) => here(s, by) && distance(s, here(s, by)!, e.location, false) <= 2)
const walks =
  (code: string) =>
  (s: GameState, by: string, step: string, d: Record<string, string | number | boolean>) =>
    step === 'walk' ? walk(s, by, code, d) : []

export function registerMovementEvent(code: string): boolean {
  if (code === '08047') {
    registerPlayerCard({
      code,
      moveAction: true,
      canPlay: (s, by) => neighbors(s, by).length > 0,
      play: (_s, by) => [
        { type: 'SuppressEngagement', investigator: by, active: true },
        continuation(code, by, 'walk', { left: 3, optional: true }),
        { type: 'SuppressEngagement', investigator: by, active: false },
        continuation(code, by, 'finish'),
      ],
      effect: (s, by, step, d) =>
        step === 'finish'
          ? here(s, by)
            ? [{ type: 'CheckEngagement', location: here(s, by)! }]
            : []
          : walks(code)(s, by, step, d),
    })
    return true
  }
  if (code === '07154') {
    const targets = (s: GameState, by: string) =>
      Object.values(s.locations).filter(
        (l) => !l.revealed && here(s, by) && Number.isFinite(distance(s, here(s, by)!, l.id)),
      )
    registerPlayerCard({
      code,
      moveAction: true,
      canPlay: (s, by) =>
        !engagedEnemies(s, by).length && neighbors(s, by).length > 0 && targets(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          targets(s, by).map((l) => ({
            label: 'choice.location',
            params: { location: l.name },
            target: { type: 'location', id: l.id },
            then: [
              continuation(code, by, 'walk', {
                target: l.id,
                left: Object.keys(s.locations).length,
                stopOnReveal: true,
                stopOnEngage: true,
              }),
            ],
          })),
          true,
        ),
      effect: (s, by, step, d) =>
        d.stopOnEngage && engagedEnemies(s, by).length ? [] : walks(code)(s, by, step, d),
    })
    return true
  }
  if (code === '07109') {
    registerPlayerCard({
      code,
      engageAction: true,
      canPlay: (s, by) => huntTargets(s, by).length > 0,
      play: (s, by) =>
        selectEnemies(by, huntTargets(s, by), (e) => [
          continuation(code, by, 'walk', {
            target: e.location,
            left: Object.keys(s.locations).length,
          }),
          continuation(code, by, 'hunt', { enemy: e.id }),
        ]),
      effect: (s, by, step, d) => {
        if (step === 'walk') return walk(s, by, code, d)
        const e = s.enemies[String(d.enemy)]
        if (!e) return []
        const n = Math.max(
          0,
          e.horror + (scenarioBehavior(s.scenarioId)?.enemyHorrorModifier?.(s, e) ?? 0),
        )
        return [
          ...(e.location === here(s, by)
            ? [{ type: 'EngageEnemy' as const, enemy: e.id, investigator: by }]
            : []),
          {
            type: 'AddChaosTokens',
            tokens: Array.from({ length: n }, () => 'bless' as const),
            scenarioOnly: true,
          },
        ]
      },
    })
    return true
  }
  if (code === '08084' || code === '08085') {
    const clues = (s: GameState, by: string, e: Enemy) =>
      Object.values(s.locations).filter(
        (l) =>
          l.id !== e.location &&
          l.id !== here(s, by) &&
          l.clues > 0 &&
          !s.investigators.some((i) => !i.eliminated && i.location === l.id) &&
          !enemiesAt(s, l.id).length &&
          distance(s, here(s, by)!, l.id) + distance(s, l.id, e.location) ===
            distance(s, here(s, by)!, e.location),
      )
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        routes(s, by).some(
          (e) => neighbors(s, by).length || (code === '08084' && clues(s, by, e).length),
        ),
      play: (s, by) =>
        selectEnemies(by, routes(s, by), (e) =>
          code === '08085'
            ? [continuation(code, by, 'walk', { target: e.location, left: 2, clues: true })]
            : ask(
                by,
                [
                  ...(neighbors(s, by).length
                    ? [
                        {
                          label: 'choice.movementTrail',
                          then: [continuation(code, by, 'walk', { target: e.location, left: 2 })],
                        },
                      ]
                    : []),
                  ...clues(s, by, e).map((l) => ({
                    label: 'choice.movementClue',
                    params: { location: l.name },
                    target: { type: 'location' as const, id: l.id },
                    then: [
                      {
                        type: 'DiscoverClues' as const,
                        investigator: by,
                        location: l.id,
                        amount: 1,
                      },
                    ],
                  })),
                ],
                true,
              ),
        ),
      effect: walks(code),
    })
    return true
  }
  if (code === '08029') {
    const targets = (s: GameState, by: string) =>
      enemies(s).filter(
        (e) =>
          s.locations[e.location]?.revealed &&
          !attackBlocked(s, by, e, code) &&
          (e.engagedWith !== null || !enemyHasKeyword(s, e, 'aloof')),
      )
    registerPlayerCard({
      code,
      fightAction: true,
      noAttacksOfOpportunity: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        selectEnemies(by, targets(s, by), (e) => {
          const fight = continuation(code, by, 'fang', { enemy: e.id })
          return e.location !== here(s, by)
            ? ask(
                by,
                [
                  ...(neighborsForTeleport(s, by, e.location)
                    ? [
                        {
                          label: 'choice.movementBeforeAttack',
                          then: [
                            { type: 'MoveTo' as const, investigator: by, location: e.location },
                            fight,
                          ],
                        },
                      ]
                    : []),
                  { label: 'choice.movementStay', then: [fight] },
                ],
                true,
              )
            : [fight]
        }),
      effect: (s, by, _step, d) => {
        const e = s.enemies[String(d.enemy)]
        return !e || attackBlocked(s, by, e, code)
          ? []
          : [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'combat',
                difficulty: e.fight,
                modifier: skillValueFor(s, by, 'agility', { type: 'fight', enemy: e.id }),
                kind: { type: 'fight', enemy: e.id, extraDamage: 3 },
              },
            ]
      },
    })
    return true
  }
  if (code === '06164' || code === '10100') {
    const targets = (s: GameState, by: string) =>
      engagedEnemies(s, by).filter(
        (e) => !e.cannotBeEvaded && !e.hasNoStats && !immuneToPlayerCards(e),
      )
    registerPlayerCard({
      code,
      evadeAction: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        selectEnemies(by, targets(s, by), (e) => [
          {
            type: 'BeginSkillTest',
            investigator: by,
            skill: 'agility',
            modifier: skillValueFor(s, by, 'willpower', { type: 'evade', enemy: e.id }),
            difficulty: e.evade,
            kind: {
              type: 'evade',
              enemy: e.id,
              onSuccess: [
                { type: 'BecomeEthereal', investigator: by },
                continuation(code, by, 'return'),
              ],
              onFail: [continuation(code, by, 'return')],
            },
          },
        ]),
      effect: (s, by) =>
        code === '10100' &&
        s.skillTest &&
        revealedTestTokens(s.skillTest).some((t) => typeof t !== 'number')
          ? [
              {
                type: 'AtEndOfTurn',
                investigator: by,
                then: [{ type: 'DiscardToHand', investigator: by, code }],
              },
            ]
          : [],
    })
    return true
  }
  if (code === '06234') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenEnemyAttacks') return []
        const e = s.enemies[t.enemy],
          attack = s.queue.find((m) => m.type === 'ResolveEnemyAttack' && m.enemy === t.enemy)
        if (
          !e ||
          e.traits?.includes('Elite') ||
          attack?.type !== 'ResolveEnemyAttack' ||
          attack.investigator === by
        )
          return []
        const to = here(s, attack.investigator),
          from = here(s, by)
        if (!to || !from || (to !== from && !getLocation(s, from).connections.includes(to)))
          return []
        return event(code, by, [
          ...(to !== from ? [{ type: 'MoveTo' as const, investigator: by, location: to }] : []),
          continuation(code, by, 'rescue', { enemy: e.id }),
        ])
      },
      effect: (s, by, _step, d) => {
        const e = s.enemies[String(d.enemy)]
        if (!e || e.location !== here(s, by)) return []
        return [
          { type: 'EngageEnemy', enemy: e.id, investigator: by },
          {
            type: 'RedirectPendingAttack',
            enemy: e.id,
            investigator: by,
            then: [{ type: 'DamageEnemy', enemy: e.id, by, amount: 1, source: { code } }],
          },
        ]
      },
    })
    return true
  }
  if (code === '06114') {
    const targets = (s: GameState, by: string) =>
      here(s, by)
        ? enemiesAt(s, here(s, by)!).filter((e) => !e.hasNoStats && !immuneToPlayerCards(e))
        : []
    registerPlayerCard({
      code,
      investigateAction: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      playEnemyChoices: (s, by) =>
        targets(s, by).map((e) => ({
          enemy: e.id,
          quiet: true,
          effect: [continuation(code, by, 'followed', { enemy: e.id })],
        })),
      effect: (s, by, _step, d) => {
        const at = here(s, by),
          e = s.enemies[String(d.enemy)]
        return at && e
          ? [
              {
                type: 'BeginSkillTest',
                investigator: by,
                skill: 'intellect',
                difficulty: shroudOf(s, at),
                modifier: Math.min(5, e.damageTaken),
                kind: { type: 'investigate', location: at, extraClues: 1 },
              },
            ]
          : []
      },
    })
    return true
  }
  return false
}

import { canAffordEntry, canEnter, leavingBlocked, moveBlocked, shroudOf } from '@lcg/engine'
function neighborsForTeleport(s: GameState, by: string, to: string): boolean {
  const from = here(s, by)
  return (
    !!from &&
    !leavingBlocked(s, from) &&
    !moveBlocked(s, by) &&
    canEnter(s, by, to) &&
    canAffordEntry(s, to, by)
  )
}
