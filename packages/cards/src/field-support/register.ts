import { resolvedFaces, resolvedPhysical } from '../chaos-allies/common'
// RR: Drawing Cards, Revelation, Cancel, Search, Healing, Uses, Campaign Play.
import {
  getInvestigator,
  assetBehavior,
  playerCardDef,
  scenarioBehavior,
  assetTraits,
  immuneToPlayerCards,
  type GameState,
  type Asset,
  type Message,
  type Choice,
  type Trigger,
  type ReactionOption,
  type SkillTest,
  type EncounterCard,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  option,
  ask,
  cardName,
  continuation,
  mayParticipate,
} from '../advanced-tests/common'
import { startTokens, nextToken } from '../chaos-allies/common'
type Data = Record<string, string | number | boolean>
const call = (code: string, by: string, step: string, d: Data = {}) =>
  continuation(code, by, step, d) as Extract<Message, { type: 'PlayerCardEffect' }>
const here = (s: GameState, by: string) => getInvestigator(s, by).location
const draw = (by: string, amount = 1): Message => ({ type: 'DrawCards', investigator: by, amount })

const take = (c: string, then: Message[], target?: Choice['target']): Choice => ({
  label: 'choice.takeCard',
  params: { card: cardName(c) },
  ...(target ? { target } : {}),
  then,
})
const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const pending = (s: GameState, t: Trigger) =>
  t.type === 'whenEncounterDrawn' || t.type === 'afterEncounterDrawn'
    ? s.queue.find(
        (m): m is Extract<Message, { type: 'ResolveEncounterCard' }> =>
          m.type === 'ResolveEncounterCard' && m.draw?.id === t.draw,
      )
    : undefined
const local = (s: GameState, a: string, b: string) =>
  here(s, a) !== null && here(s, a) === here(s, b)
const onLocation = (s: GameState, t: SkillTest) =>
  t.kind.type === 'investigate' ||
  !!(
    (t.revelation || t.onTreachery) &&
    s.treacheries[(t.revelation || t.onTreachery)!]?.placement.type === 'location'
  ) ||
  !!s.locations[t.source ?? '']
const inspect = (code: string, by: string, a: Asset): Message => ({
  type: 'InspectDeck',
  count: 9,
  then: call(code, by, 'codex', { asset: a.id }),
})
function targets(
  s: GameState,
  c: EncounterCard,
): { type: 'enemy' | 'treachery' | 'location'; id: string }[] {
  if (c.traits?.includes('Elite')) return []
  return [
    ...Object.values(s.enemies)
      .filter((e) => e.code === c.code && !immuneToPlayerCards(e))
      .map((e) => ({ type: 'enemy' as const, id: e.id })),
    ...Object.values(s.treacheries)
      .filter((t) => t.code === c.code && t.placement.type !== 'limbo')
      .map((t) => ({ type: 'treachery' as const, id: t.id })),
    ...Object.values(s.locations)
      .filter((l) => (l.encounterCard?.code ?? l.id) === c.code)
      .map((l) => ({ type: 'location' as const, id: l.id })),
  ]
}
function discardTarget(
  _s: GameState,
  target: { type: 'enemy' | 'treachery' | 'location'; id: string },
): Message[] {
  if (target.type === 'enemy') return [{ type: 'DiscardEnemy', enemy: target.id }]
  if (target.type === 'treachery') return [{ type: 'DiscardTreachery', treachery: target.id }]
  return [{ type: 'RemoveLocation', location: target.id, discardContents: true }]
}
function fast(s: GameState, a: Asset): ReactionOption[] {
  if (!mayParticipate(s, a.owner) || a.exhausted) return []
  if (a.code === '10123')
    return [
      ...Object.values(s.locationAttachments ?? {}).filter(
        (x) => x.owner === a.owner && x.location === here(s, a.owner),
      ),
      ...Object.values(s.treacheries)
        .filter(
          (t) =>
            t.owner === a.owner &&
            t.placement.type === 'location' &&
            t.placement.location === here(s, a.owner),
        )
        .map((t) => ({ ...t, location: here(s, a.owner)! })),
    ].map((x) => ({
      ...option(
        a,
        [exhaust(a), { type: 'ReturnLocationAttachment', attachment: x.id }],
        ':' + x.id,
      ),
      label: 'choice.fieldRetrieve',
      params: { card: cardName(x.code) },
      target: { type: 'location' as const, id: x.location },
    }))
  if (a.code === '09063') {
    const amount = Math.min(2, 10 - a.uses, getInvestigator(s, a.owner).resources)
    return amount > 0
      ? Array.from({ length: amount }, (_, n) => ({
          ...option(
            a,
            [exhaust(a), { type: 'MoveResourcesToAsset', asset: a.id, amount: n + 1 }],
            ':' + n,
          ),
          label: 'choice.fieldDeposit',
          params: { n: n + 1 },
        }))
      : []
  }
  return []
}
export function registerSupport(code: string): void {
  if (code === '10024') {
    registerPlayerCard({
      code,
      play: (_s, by, x) => [startTokens(code, by, { left: 3 + (x ?? 0) })],
      effect: (s, by, step, d) => {
        if (step === 'heal') {
          const left = Number(d.left)
          if (!left) return []
          const choices: Choice[] = [
            ...s.investigators
              .filter((i) => !i.eliminated && local(s, by, i.id) && i.horror > 0)
              .map((i) => ({
                label: 'choice.bonded.healHorror',
                params: { card: i.name },
                target: { type: 'investigator' as const, id: i.id },
                then: [
                  { type: 'Heal' as const, investigator: i.id, damage: 0, horror: 1, healer: by },
                  call(code, by, 'heal', { left: left - 1 }),
                ],
              })),
            ...Object.values(s.assets)
              .filter(
                (a) => assetTraits(a).includes('Ally') && local(s, by, a.owner) && a.horror > 0,
              )
              .map((a) => ({
                label: 'choice.bonded.healHorror',
                params: { card: cardName(a.code) },
                target: { type: 'asset' as const, id: a.id },
                then: [
                  { type: 'HealAsset' as const, asset: a.id, damage: 0, horror: 1, healer: by },
                  call(code, by, 'heal', { left: left - 1 }),
                ],
              })),
          ]
          return choices.length ? ask(by, choices, true) : []
        }
        const faces = JSON.parse(String(d.faces ?? '[]')) as (string | number)[]
        if (step === 'draw') {
          if (Number(d.left) > 0 && s.chaosBag.length) return [nextToken(code, by, d)]
          return [
            { type: 'ReturnHeldChaosTokens', group: String(d.group) },
            {
              type: 'AddChaosTokens',
              tokens: faces.filter((x) => typeof x === 'number').map(() => 'bless' as const),
            },
            call(code, by, 'heal', { left: faces.filter((x) => x === 'bless').length }),
          ]
        }
        if (step === 'token' && d.canceled)
          return [call(code, by, 'draw', { ...d, left: Number(d.left) - 1 })]
        if (step === 'token')
          return [
            {
              type: 'StoreHeldChaosTokens',
              group: String(d.group),
              tokens: [...resolvedPhysical(d), ...JSON.parse(String(d.ignored ?? '[]'))],
            },
            call(code, by, 'draw', {
              ...d,
              left: Number(d.left) - 1,
              faces: JSON.stringify([...faces, ...resolvedFaces(d).filter((x) => x !== null)]),
            }),
          ]
        return []
      },
    })
    return
  }
  registerPlayerCard({
    code,
    ...(code === '08113'
      ? { limitTitle: true, cannotLeavePlay: (s, a) => !!assetBehavior(s, a) }
      : {}),
    ...(code === '07267' ? { drawStoredOnLeave: true, storesForeignDraws: true } : {}),
    ...(code === '09114' ? { storedLimit: 5 } : {}),
    ...(code === '11100'
      ? {
          requiredInvestigatorTraits: ['Artist', 'Clairvoyant', 'Dreamer', 'Performer'],
          canCommit: (_s, t) => !!(t.revelation || t.onTreachery),
          afterCommittedTest: (_s, t, success, by, copy) =>
            success && copy
              ? [
                  {
                    type: 'PutCommittedIntoPlay' as const,
                    investigator: by,
                    code,
                    index: t.committed.indexOf(copy),
                  },
                ]
              : [],
        }
      : {}),
    ...(code === '08049'
      ? {
          canPlay: () => false,
          handReactions: (s: GameState, t: Trigger, by: string): ReactionOption[] => {
            if (t.type !== 'whenTreacheryDrawn') return []
            const c = s.treacheries[t.treachery]
            if (!c || c.owner || playerCardDef(c.code)?.weakness) return []
            const options: ReactionOption[] = []
            for (const any of [false, true])
              for (const personal of [false, true]) {
                if (!any && t.investigator !== by) continue
                const extra = (Number(any) + Number(personal)) * 2
                options.push({
                  key: 'hand:' + code + ':' + any + ':' + personal,
                  investigator: by,
                  label: personal ? 'choice.fieldCounterPlayer' : 'choice.fieldCounterEncounter',
                  params: { n: extra },
                  target: { type: 'hand', code },
                  then: [
                    {
                      type: 'PlayCard',
                      investigator: by,
                      code,
                      discount: -extra,
                      effect: [
                        { type: 'CancelRevelation', treachery: c.id },
                        personal ? draw(by) : { type: 'DrawEncounterCard', investigator: by },
                      ],
                    },
                  ],
                })
              }
            return options
          },
        }
      : {}),
    fastOptions: fast,
    abilities: (s, a) => [
      ...fast(s, a).map((o) => ({ ...o, actions: 0, provokes: false })),
      ...(code === '09114' &&
      a.storedCards?.length &&
      !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, a.owner)
        ? [
            {
              key: a.id + ':draw',
              label: 'ability.advancedTest',
              params: { card: cardName(code) },
              actions: 1,
              provokes: true,
              then: ask(
                a.owner,
                a.storedCards.map((c, index) =>
                  take(c.code, [
                    {
                      type: 'TakeStoredCard',
                      asset: a.id,
                      index,
                      investigator: a.owner,
                      draw: true,
                    },
                  ]),
                ),
                true,
              ),
            },
          ]
        : []),
      ...(code === '06158' && !a.exhausted && a.uses > 0 && s.encounterDeck.length
        ? [
            {
              key: a.id + ':codex',
              label: 'ability.advancedTest',
              params: { card: cardName(code) },
              actions: 1,
              provokes: true,
              costs: [exhaust(a), { type: 'SpendUses' as const, asset: a.id, amount: 1 }],
              then: [inspect(code, a.owner, a)],
            },
          ]
        : []),
    ],
    skillModifier: (s, a, t) =>
      code === '07267' && ['willpower', 'intellect'].includes(t.skill)
        ? 1 - (a.storedCards?.length ?? 0)
        : code === '09037' && !!t.revelation && !t.revelation.startsWith('player:')
          ? 1
          : 0,
    testOptions: (s, t, a) =>
      code === '10123' && !a.exhausted && t.investigator === a.owner && onLocation(s, t)
        ? [option(a, [exhaust(a), { type: 'BoostSkillTest', amount: 2 }])]
        : [],
    whenGameEndsInPlay: (s, a, reason) =>
      code === '08113' && getInvestigator(s, a.owner).resources < 10
        ? [{ type: 'ExileCard', investigator: a.originalOwner ?? a.owner, code, asset: a.id }]
        : code === '09063' && (reason === 'gameEnds' || getInvestigator(s, a.owner).resigned)
          ? [call(code, a.owner, 'treasure', { left: Math.floor(a.uses / 2) })]
          : [],
    reactions: (s, t, a) => {
      if (code === '08113' && t.type === 'afterPlayAsset' && t.asset === a.id)
        return [option(a, [{ type: 'GainResources', investigator: a.owner, amount: 10 }])]
      if (
        code === '09071' &&
        t.type === 'afterGainResources' &&
        t.investigator === a.owner &&
        s.activeTurn === a.owner &&
        t.amount > 0 &&
        t.playerCard &&
        t.sourceAsset !== a.id &&
        !a.exhausted
      )
        return [
          option(a, [
            exhaust(a),
            { type: 'GainResources', investigator: a.owner, amount: 1, effectAsset: a.id },
          ]),
        ]
      if (
        code === '11100' &&
        t.type === 'whenTreacheryDrawn' &&
        t.investigator === a.owner &&
        t.fromEncounterDeck
      ) {
        const c = s.treacheries[t.treachery]
        return c && !c.keywords.includes('peril')
          ? [
              option(a, [
                { type: 'RemoveAssetFromGame', asset: a.id },
                { type: 'CancelRevelation', treachery: c.id },
              ]),
            ]
          : []
      }

      if (t.type === 'whenPlayerCardDrawn' && !a.exhausted) {
        if (
          code === '09114' &&
          t.fromDeck &&
          t.investigator === a.owner &&
          !playerCardDef(t.card)?.weakness &&
          (a.storedCards?.length ?? 0) < 5
        )
          return [
            option(a, [
              exhaust(a),
              {
                type: 'StorePlayerCard',
                asset: a.id,
                investigator: t.investigator,
                code: t.card,
                from: 'hand',
              },
              draw(a.owner),
            ]),
          ]
        if (
          code === '07267' &&
          local(s, a.owner, t.investigator) &&
          playerCardDef(t.card)?.weakness === 'basicweakness'
        )
          return [
            option(a, [
              exhaust(a),
              {
                type: 'StorePlayerCard',
                asset: a.id,
                investigator: t.investigator,
                code: t.card,
                from: 'hand',
              },
            ]),
          ]
      }
      const p = pending(s, t)
      if (!p || a.exhausted) return []
      if (
        code === '09037' &&
        t.type === 'afterEncounterDrawn' &&
        p.investigator !== a.owner &&
        local(s, a.owner, p.investigator) &&
        !(p.card.kind === 'treachery' && p.card.keywords.includes('peril'))
      )
        return [
          option(a, [
            exhaust(a),
            { type: 'RedirectEncounterDraw', draw: t.draw, investigator: a.owner },
          ]),
        ]
      if (
        code === '09054' &&
        t.type === 'whenEncounterDrawn' &&
        p.fromEncounterDeck &&
        getInvestigator(s, a.owner).clues > 0 &&
        here(s, a.owner) &&
        !scenarioBehavior(s.scenarioId)?.cannotPlaceClues?.(s, here(s, a.owner)!)
      )
        return [
          option(a, [
            exhaust(a),
            { type: 'PlaceCluesOnLocation', investigator: a.owner, amount: 1 },
            { type: 'DrawEncounterCard', investigator: p.investigator, chooseWith: t.draw },
          ]),
        ]
      return []
    },
    effect: (s, by, step, d) => {
      if (step === 'treasure') {
        const left = Number(d.left)
        return left > 0
          ? ask(
              by,
              s.investigators.map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                target: { type: 'investigator', id: i.id },
                then: [
                  {
                    type: 'AddNextScenarioResources',
                    investigator: i.id,
                    amount: 1,
                  },
                  call(code, by, 'treasure', { left: left - 1 }),
                ],
              })),
              true,
            )
          : []
      }
      if (step === 'codex') {
        const cards = JSON.parse(String(d.cards ?? '[]')) as EncounterCard[]
        const back: Message[] = [
          { type: 'ReturnInspectedCards', top: cards, bottom: [] },
          { type: 'ShuffleEncounterDeck' },
        ]
        return ask(
          by,
          [
            ...cards.flatMap((c) =>
              targets(s, c).map((target) => ({
                label: 'choice.card',
                params: { card: c.name },
                target,
                then: [...discardTarget(s, target), ...back],
              })),
            ),
            { label: 'choice.done', then: back },
          ],
          true,
        )
      }
      return []
    },
  })
}
