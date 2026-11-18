// RR: Actions, Activate, Costs, Synergy, Basic Actions, Lasting Effects.
import {
  availableAbilities,
  cluesBlocked,
  scenarioBehavior,
  filterImmediateActions,
  filterImmediateAbilities,
  getInvestigator,
  getLocation,
  movementConnections,
  physicalMovementState,
  playerCardDef,
  playerCardBehavior,
  turnActionTiming,
  type Asset,
  type AbilityOption,
  type Choice,
  type GameState,
  type ImmediateActionRule,
  type Message,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  mayParticipate,
  option,
  ask,
  cardName,
  continuation,
} from '../advanced-tests/common'
import { controlledClassTypes } from '../synergy/classes'
const owned = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const immediate = (by: string, rule: ImmediateActionRule = {}): Message => ({
  type: 'TakeImmediateAction',
  investigator: by,
  rule,
})
const canGrant = (s: GameState, by: string, rule: ImmediateActionRule) => {
  const i = getInvestigator(s, by),
    own = turnActionTiming(s, by) !== null
  const preview: GameState = {
    ...s,
    activeTurn: by,
    investigators: s.investigators.map((x) =>
      x.id === by ? { ...x, actionsRemaining: (own ? x.actionsRemaining : 0) + 1 } : x,
    ),
    immediateActions: [
      ...(s.immediateActions ?? []),
      {
        investigator: by,
        activeTurn: s.activeTurn ?? null,
        ownTurn: own,
        actionsRemaining: i.actionsRemaining,
        rule,
      },
    ],
  }
  return (
    mayParticipate(s, by) &&
    !i.eliminated &&
    !!(
      filterImmediateActions(preview, by, rule).length +
      filterImmediateAbilities(preview, by, rule).length
    )
  )
}
const fast = (a: Asset, then: Message[]) => ({ ...option(a, then), actions: 0, provokes: false })
const actionsFast = (code: string, s: GameState, a: Asset) => {
  const by = a.owner
  if (!mayParticipate(s, by)) return []
  if (code === '05040')
    return turnActionTiming(s, by) !== null && canGrant(s, by, { skillBonus: 2 })
      ? [
          fast(a, [
            { type: 'RemoveAssetFromGame', asset: a.id },
            { type: 'GrantBonusAction', investigator: by, bonus: 2, code },
          ]),
        ]
      : []
  if (a.exhausted || a.uses < 1) return []
  if (code === '08062')
    return canGrant(s, by, { basic: true, willpower: true })
      ? [
          fast(a, [
            { type: 'ExhaustAsset', asset: a.id },
            { type: 'SpendUses', asset: a.id, amount: 1 },
            immediate(by, { basic: true, willpower: true }),
          ]),
        ]
      : []
  if (
    turnActionTiming(s, by) === null ||
    !['move', 'evade', 'investigate'].some((t) => canGrant(s, by, { types: [t] }))
  )
    return []
  return [
    fast(a, [
      { type: 'ExhaustAsset', asset: a.id },
      { type: 'SpendUses', asset: a.id, amount: 1 },
      continuation(code, by, 'chart', { left: code === '08100' ? 2 : 1, used: '' }),
    ]),
  ]
}
/** Resolving an ability waives the first arrow, never ammo, exhaust, resources or later arrows. */
export const freeAbilities = (
  s: GameState,
  by: string,
  filter: (a: Asset) => boolean,
  allowFast = false,
): Choice[] => {
  const budget = turnActionTiming(s, by) !== null ? getInvestigator(s, by).actionsRemaining : 0
  const preview = {
    ...s,
    investigators: s.investigators.map((i) => (i.id === by ? { ...i, actionsRemaining: 100 } : i)),
  }
  const options: AbilityOption[] = [
    ...availableAbilities(preview, by),
    ...(allowFast
      ? owned(s, by)
          .filter(filter)
          .flatMap((a) => playerCardBehavior(a.code)?.fastOptions?.(preview, a) ?? [])
          .map((o) => ({ ...o, actions: 0, provokes: false }))
      : []),
  ]
  return options
    .filter((o, n, all) => all.findIndex((x) => x.key === o.key) === n)
    .flatMap((o) => {
      const a = owned(s, by).find((a) => o.key.startsWith(a.id + ':'))
      const extra = Math.max(0, o.actions - 1)
      if (
        !a ||
        !filter(a) ||
        o.actions < 0 ||
        (!allowFast && o.actions === 0) ||
        extra > budget ||
        !mayParticipate(s, by)
      )
        return []
      let then: Message[] = [...(o.costs ?? []), ...o.then]
      for (let n = 0; n < extra; n++)
        then = [{ type: 'SpendAdditionalAction', investigator: by, then }]
      return [
        {
          label: o.label,
          ...(o.params ? { params: o.params } : {}),
          ...(o.target ? { target: o.target } : {}),
          then: [
            {
              type: 'UseAbility',
              investigator: by,
              key: o.key,
              actions: 0,
              printedActions: o.actions,
              provokes: false,
              ...(o.actionKind ? { actionKind: o.actionKind } : {}),
              ...(o.parley ? { parley: true } : {}),
              ...(o.limit ? { limit: o.limit } : {}),
              then,
            },
          ],
        },
      ]
    })
}
const spells = (a: Asset) =>
  playerCardDef(a.code)?.traits.some((t) => ['Spell', 'Ritual'].includes(t)) ?? false
const taskMoves = (s: GameState, by: string): string[] => {
  const physical = physicalMovementState(s, by)
  const at = getInvestigator(physical, by).location
  return at ? movementConnections(physical, at) : []
}
const taskChoices = (s: GameState, by: string, left: string[]): Choice[] =>
  s.investigators
    .filter(
      (i) => !i.eliminated && i.location !== null && i.location === getInvestigator(s, by).location,
    )
    .flatMap((i) =>
      left.flatMap((task) => {
        const after = continuation('10027', by, 'tasks', {
          left: left.filter((t) => t !== task).join(','),
        })
        const common = {
          params: { name: i.name },
          target: { type: 'investigator' as const, id: i.id },
        }
        if (task === 'activate')
          return freeAbilities(s, i.id, () => true).length
            ? [
                {
                  ...common,
                  label: 'choice.extraActionActivate',
                  then: [
                    continuation('10027', by, 'taskAsset', {
                      actor: i.id,
                      left: left.filter((t) => t !== task).join(','),
                    }),
                  ],
                },
              ]
            : []
        if (task === 'move')
          return taskMoves(s, i.id).length
            ? [
                {
                  ...common,
                  label: 'choice.extraActionMove',
                  then: [
                    continuation('10027', by, 'taskMove', {
                      actor: i.id,
                      left: left.filter((t) => t !== task).join(','),
                    }),
                  ],
                },
              ]
            : []
        return getLocation(s, i.location!).clues > 0 &&
          !cluesBlocked(s, i.id) &&
          !scenarioBehavior(s.scenarioId)?.cannotDiscoverClues?.(s, i.id, i.location!, false)
          ? [
              {
                ...common,
                label: 'choice.extraActionClue',
                then: [
                  { type: 'DiscoverClues', investigator: i.id, location: i.location!, amount: 1 },
                  after,
                ],
              },
            ]
          : []
      }),
    )
export function registerExtraAction(code: string): void {
  if (['05040', '08062', '08098', '08100'].includes(code)) {
    registerPlayerCard({
      code,
      ...(code === '05040'
        ? {
            openingHandReactions: (_s, by, hand) =>
              hand
                .filter((c) => c === code)
                .map((_, n) => ({
                  key: code + ':opening:' + by + ':' + n,
                  investigator: by,
                  label: 'choice.windowPut',
                  params: { card: cardName(code) },
                  then: [
                    { type: 'PutAssetIntoPlay', investigator: by, code, fromHand: true },
                  ] as Message[],
                })),
          }
        : {}),
      ...(code === '08062'
        ? { initialUses: (s, by) => new Set([...controlledClassTypes(s, by), 'mystic']).size }
        : {}),
      abilities: (s, a, by) =>
        by === a.owner && !s.immediateActions?.length ? actionsFast(code, s, a) : [],
      fastOptions: (s, a) => actionsFast(code, s, a).map((o) => ({ ...o, investigator: a.owner })),
      effect: (s, by, step, d) => {
        if (step !== 'chart') return []
        if (Number(d.left) <= 0) return []
        const used = String(d.used).split(',')
        const choices: Choice[] = ['move', 'evade', 'investigate']
          .filter((t) => !used.includes(t) && canGrant(s, by, { types: [t] }))
          .map((t) => ({
            label: 'choice.extraAction.' + t,
            then: [
              immediate(by, { types: [t] }),
              continuation(code, by, 'chart', {
                left: Number(d.left) - 1,
                used: [...used, t].join(','),
              }),
            ],
          }))
        return choices.length ? ask(by, choices, true) : []
      },
    })
    return
  }
  if (code === '06239') {
    registerPlayerCard({
      code,
      limitTitle: true,
      observesCompletedActions: true,
      reactions: (s, t, a) =>
        t.type === 'afterCompletedAction' && t.investigator === a.owner && !a.exhausted
          ? [...new Set(t.kinds.filter((k) => t.previous.includes(k)))]
              .filter((k) => canGrant(s, a.owner, { types: [k] }))
              .map((k) => ({
                ...option(
                  a,
                  [{ type: 'ExhaustAsset', asset: a.id }, immediate(a.owner, { types: [k] })],
                  k,
                ),
                label: 'ability.extraActionHaste.' + k,
                params: { card: cardName(code), action: k },
              }))
          : [],
    })
    return
  }
  if (code === '54008') {
    registerPlayerCard({
      code,
      restrictedSlots: [{ slot: 'arcane', count: 1, trait: ['Spell', 'Ritual'] }],
      observesActionAbilities: true,
      reactions: (s, t, a) => {
        if (
          t.type !== 'afterActionAbility' ||
          t.investigator !== a.owner ||
          a.exhausted ||
          !playerCardDef(t.code)?.traits.some((x) => ['Spell', 'Ritual'].includes(x))
        )
          return []
        const choices = freeAbilities(
          s,
          a.owner,
          (x) => spells(x) && (t.asset ? x.id !== t.asset : x.code !== t.code),
        )
        return choices.length
          ? [option(a, [{ type: 'ExhaustAsset', asset: a.id }, ...ask(a.owner, choices, true)])]
          : []
      },
    })
    return
  }
  if (code === '10027') {
    registerPlayerCard({
      code,
      additionalPlayActions: 1,
      canPlay: (s, by) => taskChoices(s, by, ['activate', 'move', 'clue']).length > 0,
      play: (_s, by) => [continuation(code, by, 'tasks', { left: 'activate,move,clue' })],
      effect: (s, by, step, d) => {
        const left = String(d.left).split(',').filter(Boolean)
        if (step === 'tasks') return left.length ? ask(by, taskChoices(s, by, left), true) : []
        const actor = String(d.actor),
          after = continuation(code, by, 'tasks', { left: left.join(',') })
        if (step === 'taskAsset')
          return ask(
            actor,
            freeAbilities(s, actor, () => true).map((c) => ({ ...c, then: [...c.then, after] })),
            true,
          )
        if (step === 'taskMove') {
          const at = getInvestigator(s, actor).location
          return at
            ? ask(
                actor,
                taskMoves(s, actor).map((to) => ({
                  label: 'choice.moveTo',
                  params: { location: getLocation(s, to).name },
                  then: [{ type: 'MoveTo', investigator: actor, location: to }, after],
                })),
                true,
              )
            : [after]
        }
        return []
      },
    })
    return
  }
  if (code === '10037') {
    registerPlayerCard({
      code,
      fightAction: true,
      additionalPlayActions: 1,
      canPlay: (s, by) => owned(s, by).some((a) => playerCardDef(a.code)?.traits.includes('Melee')),
      play: (_s, by) => [continuation(code, by, 'flurry', { left: 4 })],
      effect: (s, by, step, d) => {
        if (step !== 'flurry') return []
        const finish: Message[] = [
          ...(turnActionTiming(s, by) !== null
            ? [{ type: 'EndTurn' as const, investigator: by }]
            : []),
        ]
        if (Number(d.left) <= 0 || !canGrant(s, by, { types: ['fight'], traits: ['Melee'] }))
          return finish
        const then: Message[] = [
          immediate(by, { types: ['fight'], traits: ['Melee'] }),
          continuation(code, by, 'flurry', { left: Number(d.left) - 1 }),
        ]
        return Number(d.left) === 4
          ? then
          : ask(
              by,
              [
                { label: 'choice.extraActionRepeat', then },
                { label: 'choice.done', then: finish },
              ],
              true,
            )
      },
    })
    return
  }
  throw Error('Unknown extra action card ' + code)
}
