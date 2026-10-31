import {
  availableAbilities,
  canPlayByEffect,
  enemiesAt,
  enemyMaxHealth,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerPlayerCard,
  stuckInPlay,
  type Choice,
  type GameState,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { ask, cardName, continuation, moveChoices } from '../dunwich-pilot/effects'
const ownTurn = (s: GameState, by: string) =>
  s.phase === 'investigation' &&
  (s.immediateActions?.[0]
    ? s.immediateActions[0].endedTurn
      ? null
      : s.immediateActions[0].activeTurn
    : s.activeTurn) === by
const spell = (c: string) =>
  playerCardDef(c)?.traits.some((t) => ['Spell', 'Ritual'].includes(t)) ?? false
const playOptions = (
  s: GameState,
  by: string,
  discount: number,
  discard = false,
  assets = false,
): Choice[] =>
  (['hand', ...(discard ? ['discard'] : [])] as ('hand' | 'discard')[]).flatMap((from) =>
    [...new Set(getInvestigator(s, by)[from])]
      .filter(
        (c) =>
          (assets ? playerCardDef(c)?.type === 'asset' : spell(c)) &&
          canPlayByEffect(s, by, c, from, false, discount),
      )
      .map((c) => ({
        label: 'choice.toolPlay',
        params: { card: cardName(c), n: discount },
        ...(from === 'hand' ? { target: { type: 'hand' as const, code: c } } : {}),
        then: [{ type: 'PlayCard', investigator: by, code: c, from, byEffect: true, discount }],
      })),
  )
export function registerEvents(code: string): boolean {
  if (code === '03023') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => playOptions(s, by, 1, false, true).length > 0,
      play: (_s, by) => [continuation(code, by, 'next', { left: 3 })],
      effect: (s, by, step, data) =>
        step === 'next' && Number(data.left) > 0
          ? ask(
              by,
              [
                ...playOptions(s, by, 1, false, true).map((c) => ({
                  ...c,
                  then: [
                    ...c.then,
                    continuation(code, by, 'next', { left: Number(data.left) - 1 }),
                  ],
                })),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
    })
    return true
  }
  if (['03033', '09095'].includes(code)) {
    const upgrade = code === '09095'
    registerPlayerCard({
      code,
      canPlay: (s, by) =>
        playOptions(s, by, 3, upgrade).length > 0 ||
        (upgrade &&
          Object.values(s.assets).some(
            (a) => a.owner === by && spell(a.code) && !stuckInPlay(s, a),
          )),
      play: (s, by) =>
        upgrade
          ? ask(
              by,
              [
                ...Object.values(s.assets)
                  .filter((a) => a.owner === by && spell(a.code) && !stuckInPlay(s, a))
                  .map((a) => ({
                    label: 'choice.toolDiscardSpell',
                    params: { card: cardName(a.code) },
                    target: { type: 'asset' as const, id: a.id },
                    then: [
                      { type: 'DiscardAsset' as const, asset: a.id },
                      continuation(code, by, 'play'),
                    ],
                  })),
                { label: 'choice.skip', then: [continuation(code, by, 'play')] },
              ],
              true,
            )
          : ask(by, playOptions(s, by, 3), true),
      effect: (s, by, step) => (step === 'play' ? ask(by, playOptions(s, by, 3, true), true) : []),
    })
    return true
  }
  if (code === '06202') {
    registerPlayerCard({
      code,
      play: (_s, by) => [
        {
          type: 'SearchDeck',
          investigator: by,
          traits: ['Spell'],
          anyType: true,
          to: 'hand',
          drawFound: true,
          optional: true,
        },
      ],
    })
    return true
  }
  if (code === '03196') {
    registerPlayerCard({
      code,
      play: (s, by) => {
        const cards = [...getInvestigator(s, by).discard],
          index = cards.lastIndexOf(code)
        if (index >= 0) cards.splice(index, 1)
        return [
          { type: 'RemoveFromDiscard', investigator: by, code },
          ...cards.map((c): Message => ({ type: 'RemoveFromDiscard', investigator: by, code: c })),
          { type: 'ShuffleCardsIntoDeck', investigator: by, cards },
          { type: 'DrawCards', investigator: by, amount: 1 },
        ]
      },
    })
    return true
  }
  if (code === '06284') {
    registerPlayerCard({
      code,
      play: (s, by) => [
        { type: 'RemoveFromDiscard', investigator: by, code },
        {
          type: 'GainResources',
          investigator: by,
          amount: Math.max(0, 5 - getInvestigator(s, by).resources),
        },
        continuation(code, by, 'draw'),
      ],
      effect: (s, by, step) =>
        step === 'draw'
          ? [
              {
                type: 'DrawCards',
                investigator: by,
                amount: Math.max(0, 5 - getInvestigator(s, by).hand.length),
              },
            ]
          : [],
    })
    return true
  }
  if (code === '10030') {
    const eligible = (s: GameState, by: string) => {
      const projected = {
        ...s,
        investigators: s.investigators.map((i) =>
          i.id === by ? { ...i, actionsRemaining: 100 } : i,
        ),
      }
      const keys = new Set(
        Object.values(s.assets)
          .filter(
            (a) =>
              a.owner === by &&
              playerCardDef(a.code)?.traits.some((t) => ['Tool', 'Weapon'].includes(t)),
          )
          .flatMap(
            (a) =>
              playerCardBehavior(a.code)
                ?.abilities?.(projected, a, by)
                .filter((o) => o.actions > 0)
                .map((o) => o.key) ?? [],
          ),
      )
      return availableAbilities(projected, by)
        .filter((o) => o.actions > 0 && keys.has(o.key))
        .map((o) => {
          const test = o.then.find((m) => m.type === 'BeginSkillTest')
          const extraActions =
            test?.type === 'BeginSkillTest' && test.kind.type === 'investigate'
              ? (s.locations[test.kind.location]?.investigateExtraActions ?? 0)
              : 0
          return { ...o, extraActions }
        })
        .filter((o) => getInvestigator(s, by).actionsRemaining >= o.extraActions)
    }
    registerPlayerCard({
      code,
      canPlay: (s, by) => ownTurn(s, by) && eligible(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          eligible(s, by).map((o) => ({
            label: o.label,
            params: o.params!,
            ...(o.target ? { target: o.target } : {}),
            then: [
              {
                type: 'UseAbility',
                investigator: by,
                key: o.key,
                actions: 0,
                provokes: false,
                ...(o.limit ? { limit: o.limit } : {}),
                ...(o.costs && !o.extraActions ? { costs: o.costs } : {}),
                then: o.extraActions
                  ? Array.from({ length: o.extraActions }).reduce<Message[]>(
                      (then) => [{ type: 'SpendAdditionalAction', investigator: by, then }],
                      [...(o.costs ?? []), ...o.then],
                    )
                  : o.then,
              },
            ],
          })),
          true,
        ),
    })
    return true
  }
  if (['10057', '10094', '10073', '10083', '05020', '11056', '11072'].includes(code)) {
    const targets = (s: GameState, by: string) =>
      enemiesAt(s, getInvestigator(s, by).location ?? '').filter((e) =>
        code === '05020'
          ? e.traits?.includes('Humanoid')
          : code === '11072'
            ? e.owner === undefined
            : true,
      )
    registerPlayerCard({
      code,
      parley: true,
      canPlay: (s, by) => targets(s, by).length > 0,
      play: (s, by) =>
        ask(
          by,
          targets(s, by).map((e) => {
            const elite = e.traits?.includes('Elite'),
              combined = e.damage + e.horror
            const skill: SkillType = ['05020', '11056'].includes(code)
              ? 'combat'
              : ['10094', '11072'].includes(code)
                ? 'willpower'
                : 'intellect'
            const difficulty =
              code === '10057'
                ? e.evade
                : code === '10094'
                  ? e.fight
                  : code === '05020'
                    ? 3 + e.damage
                    : code === '11056'
                      ? Math.max(0, enemyMaxHealth(s, e) - e.damageTaken)
                      : code === '11072'
                        ? 3 + e.horror
                        : combined
            let success: Message[] = []
            if (code === '10057')
              success = [
                { type: 'DiscoverClues', investigator: by, amount: 2 },
                ...(!elite
                  ? [
                      { type: 'EvadeEnemy' as const, enemy: e.id },
                      { type: 'EnemyStaysExhausted' as const, enemy: e.id },
                    ]
                  : []),
              ]
            if (code === '10094')
              success = [continuation(code, by, 'drain', { enemy: e.id, max: elite ? 1 : 2 })]
            if (['10073', '10083'].includes(code))
              success = [
                continuation(code, by, 'area', {
                  amount: code === '10073' ? 2 : combined,
                  escape: code === '10083',
                }),
              ]
            if (code === '05020')
              success = [
                { type: 'DiscoverClues', investigator: by, amount: 1 },
                continuation(code, by, 'otherClue'),
              ]
            if (code === '11056')
              success = elite
                ? [{ type: 'DamageEnemy', enemy: e.id, amount: 2, by }]
                : [
                    { type: 'PutEnemyOnEncounterDeck', enemy: e.id },
                    { type: 'ShuffleSetAsideIntoEncounter', codes: [] },
                  ]
            if (code === '11072')
              success = [
                elite
                  ? { type: 'DamageEnemy', enemy: e.id, amount: 3, by }
                  : { type: 'DefeatEnemy', enemy: e.id, by },
              ]
            return {
              label: 'choice.toolParley',
              params: { enemy: e.name },
              target: { type: 'enemy' as const, id: e.id },
              then: [
                {
                  type: 'BeginSkillTest',
                  investigator: by,
                  skill,
                  difficulty,
                  tags: ['parley'],
                  kind: {
                    type: 'effect',
                    source: cardName(code),
                    onSuccess: success,
                    onFail:
                      code === '11072'
                        ? [{ type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1, checkAgenda: false }]
                        : [],
                    onFailEach: [],
                  },
                },
              ],
            }
          }),
          true,
        ),
      effect: (s, by, step, data) => {
        if (step === 'drain') {
          if (!s.enemies[String(data.enemy)]) return []
          const max = Math.min(Number(data.max), getInvestigator(s, by).damage)
          const min = Number(data.max) === 1 && max > 0 ? 1 : 0
          return ask(
            by,
            Array.from({ length: max - min + 1 }, (_, i) => {
              const n = i + min
              return {
                label: 'choice.toolDrain',
                params: { n, enemy: s.enemies[String(data.enemy)]!.name },
                then: Array.from({ length: n }, (): Message => ({
                  type: 'MoveDamage',
                  from: { type: 'investigator', id: by },
                  to: { type: 'enemy', id: String(data.enemy) },
                  kind: 'damage',
                  by,
                })),
              }
            }),
            true,
          )
        }
        if (step === 'otherClue')
          return ask(
            by,
            Object.values(s.locations)
              .filter((l) => l.id !== getInvestigator(s, by).location && l.clues > 0)
              .map((l) => ({
                label: 'choice.location',
                params: { location: l.name },
                target: { type: 'location' as const, id: l.id },
                then: [
                  { type: 'DiscoverClues' as const, investigator: by, location: l.id, amount: 1 },
                ],
              })),
            true,
          )
        if (step === 'area') {
          const escape =
            !!data.escape || (s.skillTest?.modifiedSkill ?? 0) - (s.skillTest?.difficulty ?? 0) >= 2
          return [
            ...enemiesAt(s, getInvestigator(s, by).location ?? '').map((e): Message => ({
              type: 'DamageEnemy',
              enemy: e.id,
              amount: Number(data.amount),
              by,
            })),
            ...(escape ? [continuation(code, by, 'escape')] : []),
          ]
        }
        if (step === 'escape')
          return ask(
            by,
            [
              ...moveChoices(s, by).map((c) => ({
                ...c,
                then: [{ type: 'DisengageAll' as const, investigator: by }, ...c.then],
              })),
              { label: 'choice.skip', then: [] },
            ],
            true,
          )
        return []
      },
    })
    return true
  }
  return false
}
