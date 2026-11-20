// RR: Additional Costs, Research, Moving, Lasting Effects, Uses and triggered abilities.
import {
  getInvestigator,
  getLocation,
  immuneToPlayerCards,
  playerCardDef,
  canPlayByEffect,
  type SkillType,
  type GameState,
  type Asset,
  type Message,
  type Choice,
  type AbilityOption,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  continuation,
  option,
  mayParticipate,
} from '../advanced-tests/common'
type Data = Record<string, string | number | boolean>
const call = (code: string, by: string, step: string, data: Data = {}): Message =>
  continuation(code, by, step, data)
const active = (s: GameState) => s.investigators.filter((i) => !i.eliminated && !i.resigned)
const target = (type: 'enemy' | 'location' | 'investigator', id: string) => ({ type, id })
const adjust = (
  type: 'enemy' | 'location' | 'investigator',
  id: string,
  amount: number,
): Message => ({ type: 'AdjustLeylines', target: target(type, id), amount })
const pick = (
  label: string,
  params: Choice['params'],
  then: Message[],
  ref?: Choice['target'],
): Choice => ({ label, ...(params ? { params } : {}), then, ...(ref ? { target: ref } : {}) })
const investigator = (s: GameState, id: string, then: Message[]): Choice =>
  pick('choice.investigator', { name: getInvestigator(s, id).name }, then, {
    type: 'investigator',
    id,
  })
const at = (s: GameState, by: string) => getInvestigator(s, by).location
const local = (s: GameState, a: string, b: string) => at(s, a) !== null && at(s, a) === at(s, b)
const fast = (a: Asset, then: Message[], suffix: string) => option(a, then, suffix)
function ability(a: Asset, then: Message[], safe = false): AbilityOption {
  return {
    key: a.id + ':conduit',
    label: 'ability.advancedTest',
    params: { card: cardName(a.code) },
    actions: 1,
    provokes: !safe,
    then,
  }
}
function destinationChoices(s: GameState, a: Asset): Choice[] {
  const type = a.code === '08042' ? 'location' : a.code === '08044' ? 'investigator' : 'enemy'
  const entries =
    type === 'location'
      ? Object.values(s.locations).filter((l) => l.revealed)
      : type === 'investigator'
        ? active(s)
        : Object.values(s.enemies).filter(
            (e) => !e.traits?.includes('Elite') && !immuneToPlayerCards(e),
          )
  return entries.map((x) =>
    pick(
      type === 'investigator'
        ? 'choice.investigator'
        : type === 'enemy'
          ? 'choice.enemy'
          : 'choice.location',
      type === 'investigator'
        ? { name: x.name }
        : type === 'enemy'
          ? { enemy: x.name }
          : { location: x.name },
      [{ type: 'RemoveUses', asset: a.id, amount: 1 }, adjust(type, x.id, 1)],
      { type, id: x.id },
    ),
  )
}
function options(s: GameState, a: Asset): Choice[] {
  if (a.code === '08044')
    return active(s)
      .filter((i) => (i.leylines ?? 0) > 0)
      .map((i) =>
        investigator(s, i.id, [call(a.code, a.owner, 'healChoice', { asset: a.id, who: i.id })]),
      )
  if (a.code === '08043')
    return active(s).flatMap((i) =>
      Object.values(s.enemies)
        .filter((e) => e.engagedWith === i.id && (e.leylines ?? 0) > 0)
        .flatMap((e) => {
          const from = i.location ? s.locations[i.location] : undefined
          return (from?.connections ?? [])
            .filter((id) => s.locations[id])
            .map((id) =>
              pick(
                'choice.conduitEvadeMove',
                { name: i.name, enemy: e.name, location: getLocation(s, id).name },
                [
                  { type: 'DisengageEnemy', enemy: e.id },
                  { type: 'MoveTo', investigator: i.id, location: id },
                  call(a.code, a.owner, 'evadeBonus', { asset: a.id, enemy: e.id, who: i.id }),
                ],
                { type: 'location', id },
              ),
            )
        }),
    )
  const entries =
    a.code === '08042'
      ? Object.values(s.locations).filter((l) => l.revealed && (l.leylines ?? 0) > 0)
      : Object.values(s.enemies).filter(
          (e) => (e.leylines ?? 0) > 0 && !!e.location && s.locations[e.location]?.revealed,
        )
  return active(s).flatMap((i) =>
    entries.map((e) => {
      const location = a.code === '08042' ? e.id : 'location' in e ? e.location : null
      return pick(
        'choice.conduitTravel',
        { name: i.name, destination: e.name },
        [
          { type: 'MoveTo', investigator: i.id, location: location! },
          call(a.code, a.owner, 'travelBonus', {
            asset: a.id,
            who: i.id,
            id: e.id,
            location: location!,
          }),
        ],
        { type: a.code === '08042' ? 'location' : 'enemy', id: e.id },
      )
    }),
  )
}
export function registerSupport(code: string): void {
  if (['08033', '08041', '08042', '08043', '08044'].includes(code)) {
    registerPlayerCard({
      code,
      ...(code === '08033'
        ? {
            canPlay: (s: GameState) => Object.keys(s.locations).length >= 4,
            additionalPlayCosts: (_s: GameState, by: string) => [
              call(code, by, 'place', { selected: '[]' }),
            ],
            reactions: (s, t, a) =>
              t.type === 'afterSkillTest' &&
              t.investigator === a.owner &&
              t.kind === 'investigate' &&
              t.succeeded &&
              !a.exhausted &&
              !!t.location &&
              (s.locations[t.location]?.leylines ?? 0) > 0
                ? [
                    option(a, [
                      { type: 'ExhaustAsset', asset: a.id },
                      adjust('location', t.location, -1),
                      { type: 'AddUses', asset: a.id, amount: 1 },
                      call(code, a.owner, 'identify', { asset: a.id }),
                    ]),
                  ]
                : [],
          }
        : {
            requiredResearch: 'identifiedGateway',
            fastOptions: (s, a) =>
              a.uses > 0 && mayParticipate(s, a.owner)
                ? [fast(a, ask(a.owner, destinationChoices(s, a), true), ':place')].filter(
                    (o) => o.then.length,
                  )
                : [],
            abilities: (s, a) => {
              const choices = options(s, a)
              return choices.length
                ? [ability(a, ask(a.owner, choices, true), code === '08043')]
                : []
            },
          }),
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        if (step === 'place') {
          const selected = JSON.parse(String(d.selected)) as string[]
          if (selected.length === 4) return []
          return ask(
            by,
            Object.values(s.locations)
              .filter((l) => !selected.includes(l.id))
              .map((l) =>
                pick(
                  'choice.location',
                  { location: l.name },
                  [
                    adjust('location', l.id, 1),
                    call(code, by, 'place', { selected: JSON.stringify([...selected, l.id]) }),
                  ],
                  { type: 'location', id: l.id },
                ),
              ),
            true,
          )
        }
        if (!a) return []
        if (step === 'identify')
          return a.uses >= 4
            ? [
                { type: 'DiscardAsset', asset: a.id },
                { type: 'GainResources', investigator: by, amount: a.uses },
                { type: 'RecordNote', note: 'identifiedGateway' },
              ]
            : []
        const who = String(d.who)
        if (step === 'healChoice') {
          const i = getInvestigator(s, who)
          if (!(i.leylines ?? 0)) return []
          return ask(
            by,
            [
              pick('choice.conduitKeep', {}, [call(code, by, 'heal', { ...d, n: 1 })]),
              pick('choice.conduitRemove', {}, [
                adjust('investigator', who, -1),
                call(code, by, 'heal', { ...d, n: 2 }),
              ]),
            ],
            true,
          )
        }
        if (step === 'heal')
          return [
            { type: 'DrawCards', investigator: who, amount: Number(d.n) },
            ...ask(
              by,
              (['damage', 'horror'] as const).map((kind) =>
                pick(
                  kind === 'damage' ? 'choice.conduitHealDamage' : 'choice.conduitHealHorror',
                  { kind },
                  [
                    {
                      type: 'Heal',
                      investigator: who,
                      damage: kind === 'damage' ? Number(d.n) : 0,
                      horror: kind === 'horror' ? Number(d.n) : 0,
                      healer: by,
                    },
                  ],
                ),
              ),
              true,
            ),
          ]
        if (step === 'evadeBonus')
          return (s.enemies[String(d.enemy)]?.leylines ?? 0) > 0
            ? ask(
                by,
                [
                  pick('choice.conduitRemove', {}, [
                    adjust('enemy', String(d.enemy), -1),
                    { type: 'EvadeEnemy', enemy: String(d.enemy), by: who },
                  ]),
                  { label: 'choice.skip', then: [] },
                ],
                true,
              )
            : []
        if (step === 'travelBonus') {
          const type = code === '08042' ? 'location' : 'enemy',
            id = String(d.id)
          if ((type === 'location' ? s.locations[id]?.leylines : s.enemies[id]?.leylines) ?? 0) {
            const bonus: Message =
              code === '08042'
                ? {
                    type: 'TakeImmediateAction',
                    investigator: who,
                    rule: { types: ['investigate'] },
                  }
                : { type: 'DamageEnemy', enemy: id, by: who, amount: 1, source: { code } }
            return ask(
              by,
              [
                pick('choice.conduitRemove', {}, [adjust(type, id, -1), bonus]),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          }
        }
        return []
      },
    })
    return
  }
  if (code === '11065') {
    registerPlayerCard({
      code,
      observesDoomPlacement: true,
      reactions: (_s, t, a) =>
        t.type === 'afterDoomOnControlledCard' && t.investigator === a.owner && !a.exhausted
          ? [
              option(a, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'AddUses', asset: a.id, amount: 1 },
              ]),
            ]
          : [],
      fastOptions: (s, a) =>
        !a.exhausted && a.uses >= 3 && mayParticipate(s, a.owner)
          ? [
              option(
                a,
                ask(
                  a.owner,
                  active(s)
                    .filter((i) => local(s, a.owner, i.id))
                    .map((i) =>
                      investigator(s, i.id, [
                        { type: 'ExhaustAsset', asset: a.id },
                        { type: 'RemoveUses', asset: a.id, amount: a.uses },
                        { type: 'TakeImmediateAction', investigator: i.id },
                      ]),
                    ),
                  true,
                ),
              ),
            ].filter((o) => o.then.length)
          : [],
    })
    return
  }
  if (code === '09067') {
    const eligible = (s: GameState, by: string, n: number) =>
      [...new Set(getInvestigator(s, by).hand)].filter((c) => {
        const def = playerCardDef(c)
        return (
          def?.type === 'asset' &&
          def.traits.includes('Item') &&
          canPlayByEffect(s, by, c, 'hand', false, n, false, true, true)
        )
      })
    registerPlayerCard({
      code,
      attachedTraits: ['Illicit'],
      handReactions: (s, t, by) => {
        if (
          t.type !== 'afterSkillTest' ||
          !t.succeeded ||
          t.investigator !== by ||
          !(
            t.kind === 'investigate' ||
            (t.kind === 'evade' && t.enemy && s.enemies[t.enemy]?.traits?.includes('Humanoid'))
          ) ||
          !eligible(s, by, t.margin).length
        )
          return []
        return [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            then: [
              {
                type: 'PlayCard',
                code,
                investigator: by,
                effect: [call(code, by, 'item', { discount: t.margin })],
              },
            ],
          },
        ]
      },
      effect: (s, by, step, d) => {
        if (step === 'item')
          return ask(
            by,
            eligible(s, by, Number(d.discount)).map((c) =>
              pick('choice.takeCard', { card: cardName(c) }, [
                {
                  type: 'PlayCard',
                  investigator: by,
                  code: c,
                  discount: Number(d.discount),
                  byEffect: true,
                  asFast: true,
                },
                call(code, by, 'attach', {
                  item: c,
                  previous: JSON.stringify(Object.keys(s.assets)),
                }),
              ]),
            ),
            true,
          )
        if (step === 'attach') {
          const old = JSON.parse(String(d.previous)) as string[]
          const a = Object.values(s.assets).find(
            (a) => a.owner === by && a.code === String(d.item) && !old.includes(a.id),
          )
          return a
            ? [{ type: 'AttachEventToAsset', asset: a.id, investigator: by, code, trait: 'Item' }]
            : []
        }
        return []
      },
    })
    return
  }
  if (code === '11091') {
    const available = (s: GameState) => !Object.values(s.assets).some((a) => a.code === code)
    registerPlayerCard({
      code,
      canPlay: available,
      handReactions: (s, t, by) =>
        t.type === 'investigationPhaseBegins' && available(s)
          ? [
              {
                key: 'hand:' + code,
                investigator: by,
                label: 'ability.playCard',
                params: { card: cardName(code) },
                then: [
                  { type: 'PlayCard', code, investigator: by, effect: [call(code, by, 'weather')] },
                ],
              },
            ]
          : [],
      forced: (_s, t, a) =>
        t.type === 'investigationPhaseBegins' ? [{ type: 'DiscardAsset', asset: a.id }] : [],
      skillAura: (_s, a, t) => (a.form === t.skill ? 2 : 0),
      effect: (s, by, step, d) =>
        step === 'weather'
          ? ask(
              by,
              (['willpower', 'intellect', 'combat', 'agility'] as SkillType[]).map((skill) => ({
                label: 'skill.' + skill,
                then: [
                  {
                    type: 'PutAssetIntoPlay',
                    investigator: by,
                    code,
                    fromDiscard: by,
                    noSlot: true,
                    onEntered: continuation(code, by, 'weatherForm', { skill }) as Extract<
                      Message,
                      { type: 'PlayerCardEffect' }
                    >,
                  },
                ],
              })),
              true,
            )
          : step === 'weatherForm'
            ? [{ type: 'SetAssetForm', asset: String(d.asset), form: String(d.skill) }]
            : [],
    })
    return
  }
  throw Error('Unreviewed leyline support ' + code)
}
