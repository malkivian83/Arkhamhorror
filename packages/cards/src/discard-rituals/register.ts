import { resolvedFaces } from '../chaos-allies/common'
// RR: Effects, Exile, Parley, Attach To, Play, Commit, Draw, Uses, Lasting Effects.
import {
  canPlayByEffect,
  customizedCard,
  enemiesAt,
  getInvestigator,
  immuneToPlayerCards,
  playerCardBehavior,
  playerCardDef,
  poolTokensAvailable,
  registerTreachery,
  turnActionTiming,
  type Asset,
  type ChaosToken,
  type GameState,
  type Message,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  mayParticipate,
  ask,
  cardName,
  continuation,
} from '../advanced-tests/common'
import { startTokens, nextToken, type Data } from '../chaos-allies/common'
import { freeAbilities } from '../extra-actions/register'
const here = (s: GameState, by: string) => getInvestigator(s, by).location
const targets = (s: GameState, by: string) =>
  here(s, by)
    ? enemiesAt(s, here(s, by)!).filter(
        (e) => !e.traits?.includes('Elite') && !immuneToPlayerCards(e),
      )
    : []
const own = (s: GameState, by: string) => Object.values(s.assets).filter((a) => a.owner === by)
const spells = (s: GameState, by: string) =>
  [...new Set(getInvestigator(s, by).discard)].filter(
    (c) =>
      playerCardDef(c)?.type === 'event' &&
      playerCardDef(c)?.traits.some((t) => t === 'Spell' || t === 'Ritual'),
  )
const initial = (s: GameState, a: Asset) => {
  const projected = a.customization
    ? {
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === a.owner
            ? { ...i, customizations: { ...i.customizations, [a.code]: a.customization! } }
            : i,
        ),
      }
    : s
  return (
    playerCardBehavior(a.code)?.initialUses?.(projected, a.owner) ??
    playerCardDef(a.code)?.uses?.count ??
    0
  )
}
const replenishTargets = (s: GameState, by: string) =>
  own(s, by).filter(
    (a) =>
      ['charge', 'secret'].includes(playerCardDef(a.code)?.uses?.type ?? '') &&
      initial(s, a) > a.uses,
  )
const exileTargets = (s: GameState, by: string) =>
  [...new Set(getInvestigator(s, by).hand)].filter((c) => {
    const d = playerCardDef(c)
    if (!d) return false
    const xp = customizedCard(d, getInvestigator(s, by).customizations).xp
    return xp !== undefined && xp >= 0 && xp <= 5
  })
const burn = (by: string, level: number): Message[] => [
  { type: 'DiscoverClues', investigator: by, amount: 2 },
  ...(level >= 2
    ? [{ type: 'RemoveDoom' as const, target: { type: 'agenda' as const }, amount: 1 }]
    : []),
  { type: 'ExileCard', investigator: by, code: '08076', playedEvent: true },
]
export function registerDiscardRitual(code: string): void {
  if (code === '06203') {
    registerPlayerCard({
      code,
      cannotPlayFromHand: true,
      canCommit: (_s, _t, _by, zone = 'hand') => zone !== 'hand',
      skillModifier: (_s, _a, t) => (['willpower', 'agility'].includes(t.skill) ? 1 : 0),
      discardReactions: (s, t, by) =>
        t.type === 'afterHandDiscard' &&
        t.investigator === by &&
        t.cards.includes(code) &&
        mayParticipate(s, by) &&
        canPlayByEffect(s, by, code, 'discard', false, 0, false, true, true)
          ? [
              {
                key: 'discard:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                target: { type: 'hand', code },
                then: [
                  {
                    type: 'PlayCard',
                    investigator: by,
                    code,
                    from: 'discard',
                    byEffect: true,
                    asFast: true,
                    noOpportunity: true,
                  },
                ],
              },
            ]
          : [],
    })
    return
  }
  if (code === '07265') {
    registerPlayerCard({
      code,
      skillModifier: () => 1,
      forced: (s, t, a) => {
        if (t.type === 'afterAssetEntersPlay' && t.asset === a.id)
          return ask(
            a.owner,
            ['draw', 'play', 'commit'].map((p) => ({
              label: 'choice.geas.' + p,
              then: [
                { type: 'SetAssetAbilityState', asset: a.id, values: { promise: p } },
                { type: 'Log', key: 'log.geas.' + p, params: { card: cardName(code) } },
              ],
            })),
            true,
          )
        if (turnActionTiming(s, a.owner) === null) return []
        const p = a.abilityState?.promise
        const broke =
          (p === 'play' && t.type === 'afterPlayCard' && t.investigator === a.owner) ||
          (p === 'commit' && t.type === 'afterCommit' && t.by === a.owner) ||
          (p === 'draw' && t.type === 'afterDrawCard' && t.investigator === a.owner) ||
          (p === 'draw' &&
            t.type === 'whenEncounterDrawn' &&
            s.queue.some(
              (m) =>
                m.type === 'ResolveEncounterCard' &&
                m.draw?.id === t.draw &&
                m.investigator === a.owner,
            ))
        return broke
          ? [
              { type: 'DiscardAsset', asset: a.id },
              { type: 'AddChaosTokens', tokens: Array<ChaosToken>(10).fill('curse') },
            ]
          : []
      },
    })
    return
  }
  if (code === '10099') {
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        poolTokensAvailable(s, 'curse') >= 3 && replenishTargets(s, by).length > 0,
      additionalPlayCosts: () => [{ type: 'AddChaosTokens', tokens: ['curse', 'curse', 'curse'] }],
      play: (s, by) =>
        ask(
          by,
          replenishTargets(s, by).map((a) => ({
            label: 'choice.asset',
            params: { asset: cardName(a.code) },
            target: { type: 'asset', id: a.id },
            then: [
              { type: 'AddUses', asset: a.id, amount: Math.max(0, initial(s, a) - a.uses) },
              continuation(code, by, 'activate', { asset: a.id }),
            ],
          })),
          true,
        ),
      effect: (s, by, step, d) =>
        step === 'activate' && s.assets[String(d.asset)]
          ? ask(
              by,
              [
                ...freeAbilities(s, by, (a) => a.id === d.asset, true),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
    })
    return
  }
  if (code === '10091') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        by !== a.owner || a.uses < 1 || !spells(s, by).length
          ? []
          : [
              {
                key: a.id + ':parley',
                label: 'ability.advancedTest',
                params: { card: cardName(code) },
                actions: 1,
                provokes: false,
                parley: true,
                then: ask(
                  by,
                  spells(s, by).map((event) => ({
                    label: 'choice.card',
                    params: { card: cardName(event) },
                    then: [continuation(code, by, 'offerings', { asset: a.id, event })],
                  })),
                  true,
                ),
              },
            ],
      effect: (s, by, step, d: Data): Message[] => {
        if (step === 'offerings') {
          const a = s.assets[String(d.asset)]
          return a
            ? ask(
                by,
                Array.from({ length: a.uses }, (_, n) => n + 1).map((n) => ({
                  label: 'choice.ritualOfferings',
                  params: { n },
                  then: [
                    { type: 'SpendUses', asset: a.id, amount: n },
                    startTokens(code, by, {
                      draws: Number(d.draws ?? 0) + 1,
                      event: String(d.event),
                      left: n,
                      countsDuringTest: true,
                    }),
                  ],
                })),
                true,
              )
            : []
        }
        if (step === 'draw')
          return s.chaosBag.length
            ? [nextToken(code, by, d)]
            : [{ type: 'ReturnHeldChaosTokens', group: String(d.group) }]
        if (step !== 'token') return []
        const seen = [
          ...(JSON.parse(String(d.faces)) as (ChaosToken | null)[]),
          ...resolvedFaces(d),
        ]
        if (Number(d.draws ?? 0) + 1 < Number(d.left) && s.chaosBag.length)
          return [
            nextToken(code, by, {
              draws: Number(d.draws ?? 0) + 1,
              event: String(d.event),
              left: d.left!,
              group: d.group!,
              countsDuringTest: true,
              faces: JSON.stringify(seen),
            }),
          ]
        return [
          { type: 'ReturnHeldChaosTokens', group: String(d.group) },
          ...(seen.some((t) => t === 'skull' || t === 'curse') &&
          getInvestigator(s, by).discard.includes(String(d.event))
            ? [{ type: 'DiscardToHand' as const, investigator: by, code: String(d.event) }]
            : []),
        ]
      },
    })
    return
  }
  if (code === '08076') {
    registerPlayerCard({
      code,
      play: (s, by) => {
        const cards = exileTargets(s, by)
        return cards.length
          ? ask(
              by,
              cards.map((c) => ({
                label: 'choice.card',
                params: { card: cardName(c) },
                then: [
                  { type: 'ExileCard', investigator: by, code: c, from: 'hand' },
                  ...burn(
                    by,
                    customizedCard(playerCardDef(c)!, getInvestigator(s, by).customizations).xp!,
                  ),
                ],
              })),
              true,
            )
          : burn(by, 0)
      },
    })
    return
  }
  if (code === '09052') {
    registerPlayerCard({
      code,
      parley: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          targets(s, by).flatMap((e) =>
            (['willpower', 'intellect'] as const).map((skill) => ({
              label: 'choice.ritualRiddle.' + skill,
              params: { enemy: e.name },
              target: { type: 'enemy' as const, id: e.id },
              then: [
                {
                  type: 'BeginSkillTest',
                  investigator: by,
                  skill,
                  difficulty: Math.max(0, 8 - getInvestigator(s, by).hand.length),
                  effectSource: code,
                  tags: ['parley'],
                  kind: {
                    type: 'effect',
                    source: cardName(code),
                    onSuccess: [
                      { type: 'EvadeEnemy', enemy: e.id, by },
                      { type: 'AttachPlayerCardToEnemy', investigator: by, code, enemy: e.id },
                    ],
                    onFail: [],
                    onFailEach: [],
                  },
                },
              ],
            })),
          ),
          true,
        ),
    })
    registerTreachery({ code, revelation: () => [], attachedEnemy: { gains: ['aloof'] } })
    return
  }
  if (code === '09088') {
    registerPlayerCard({
      code,
      parley: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          targets(s, by).flatMap((e) => [
            {
              label: 'choice.ritualCurseEvade',
              params: { enemy: e.name },
              target: { type: 'enemy' as const, id: e.id },
              then: [
                { type: 'EvadeEnemy' as const, enemy: e.id, by },
                { type: 'PlaceDoomOnEnemy' as const, enemy: e.id, amount: 1, checkAgenda: false },
                {
                  type: 'AddEnemyModifier' as const,
                  enemy: e.id,
                  modifier: { source: code, until: 'round' as const, cannotTakeDamage: true },
                },
                { type: 'DiscoverClues' as const, investigator: by, amount: 1 },
              ],
            },
            ...((e.doom ?? 0) > 0
              ? [
                  {
                    label: 'choice.ritualCurseDefeat',
                    params: { enemy: e.name },
                    target: { type: 'enemy' as const, id: e.id },
                    then: [
                      { type: 'DefeatEnemy' as const, enemy: e.id, by },
                      { type: 'GainResources' as const, investigator: by, amount: e.doom! },
                    ],
                  },
                ]
              : []),
          ]),
          true,
        ),
    })
    return
  }
  throw Error('Unreviewed discard ritual ' + code)
}
