// RR: Setup, Search, Face Down, Drawing Cards, Costs, Attach To, Bonded, Cancel.
import {
  getInvestigator,
  playerCardDef,
  playerCardBehavior,
  isPermanent,
  scenarioBehavior,
  uniqueAssetInPlay,
  limitTitleReached,
  enemyMaxHealth,
  immuneToPlayerCards,
  setAsideCards,
  shroudOf,
  type Asset,
  type GameState,
  type Message,
  type Choice,
  type ReactionOption,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  option,
  ask,
  cardName,
  continuation,
  mayParticipate,
} from '../advanced-tests/common'
import { CLASSIFIED_SPECIES } from '../bonded-cards/register'

type Data = Record<string, string | number | boolean>
const call = (a: Asset, step: string, data: Data = {}) =>
  continuation(a.code, a.owner, step, { asset: a.id, ...data }) as Extract<
    Message,
    { type: 'PlayerCardEffect' }
  >
const choice = (code: string, then: Message[], target?: Choice['target']): Choice => ({
  label: 'choice.takeCard',
  params: { card: cardName(code) },
  ...(target ? { target } : {}),
  then,
})
const children = (s: GameState, a: Asset) =>
  Object.values(s.assets).filter((x) => x.attachedTo === a.id)
const canDraw = (s: GameState, by: string) =>
  !scenarioBehavior(s.scenarioId)?.cannotDrawCards?.(s, by)
const take = (a: Asset, index: number): Message => ({
  type: 'TakeStoredCard',
  asset: a.id,
  index,
  investigator: a.owner,
  draw: true,
})
const drawChoices = (a: Asset) =>
  (a.storedCards ?? []).map((c, index) => choice(c.code, [take(a, index)]))
const store = (a: Asset, code: string): Message => ({
  type: 'StorePlayerCard',
  asset: a.id,
  investigator: a.owner,
  code,
  from: 'deck',
})
const shuffle = (a: Asset): Message => ({ type: 'ShuffleDeck', investigator: a.owner })
const setupCards = (s: GameState, a: Asset) =>
  getInvestigator(s, a.owner).deck.filter((c) => {
    const def = playerCardDef(c)
    if (!def) return false
    if (a.code === '09077') return def.traits.includes('Illicit')
    if (a.code === '03264')
      return def.type === 'event' && def.traits.some((t) => t === 'Tactic' || t === 'Supply')
    return def.traits.includes('Trick')
  })
/** Setup searches deliberately bypass Research/Mandy (FAQ 1.26). */
function selectSetup(s: GameState, a: Asset): Message[] {
  const market = a.code === '09077',
    limit = market ? 10 : 3
  if ((a.storedCards?.length ?? 0) >= limit)
    return [market ? { type: 'ShuffleStoredCards', asset: a.id } : shuffle(a)]
  const titles = new Set((a.storedCards ?? []).map((c) => playerCardDef(c.code)?.name))
  const cards = [...new Set(setupCards(s, a))].filter(
    (c) => market || !titles.has(playerCardDef(c)?.name),
  )
  return ask(
    a.owner,
    [
      ...cards.map((c) => choice(c, [store(a, c), call(a, 'setup')])),
      ...(!market ? [{ label: 'choice.done', then: [shuffle(a)] }] : []),
    ],
    true,
  )
}
function libraryTargets(s: GameState, a: Asset) {
  if (
    children(s, a).length ||
    s.activeTurn !== a.owner ||
    s.phase !== 'investigation' ||
    (a.code === '11118' ? a.exhausted : getInvestigator(s, a.owner).resources < 1)
  )
    return []
  return [...new Set(getInvestigator(s, a.owner).hand)].filter((c) => {
    const def = playerCardDef(c)
    return (
      def?.type === 'asset' &&
      def.traits.includes('Tome') &&
      !uniqueAssetInPlay(s, c) &&
      !limitTitleReached(s, a.owner, c) &&
      !isPermanent(c) &&
      !playerCardBehavior(c)?.cannotEnterPlay?.(s, a.owner)
    )
  })
}
function fastOptions(s: GameState, a: Asset): ReactionOption[] {
  if (!mayParticipate(s, a.owner)) return []
  if (a.code === '07303')
    return !a.exhausted && canDraw(s, a.owner) && a.storedCards?.length
      ? [option(a, [{ type: 'ExhaustAsset', asset: a.id }, ...ask(a.owner, drawChoices(a), true)])]
      : []
  if (a.code === '11099' || a.code === '11118')
    return libraryTargets(s, a)
      .map((c) =>
        option(
          a,
          [
            ...(a.code === '11118'
              ? [{ type: 'ExhaustAsset' as const, asset: a.id }]
              : [{ type: 'SpendResources' as const, investigator: a.owner, amount: 1 }]),
            {
              type: 'PutAssetIntoPlay',
              investigator: a.owner,
              code: c,
              fromHand: true,
              attachedTo: a.id,
            },
          ],
          ':' + c,
        ),
      )
      .map((o, index) => ({
        ...o,
        label: 'choice.archiveAttach',
        params: { card: cardName(libraryTargets(s, a)[index]!) },
      }))
  return []
}
export function registerArchive(code: string): void {
  if (code === '10059' || code === '10060') {
    const options = (s: GameState, a: Asset): ReactionOption[] =>
      !mayParticipate(s, a.owner)
        ? []
        : [
            ...(setAsideCards(s, a.owner, '10045', true).length
              ? [
                  {
                    ...option(
                      a,
                      [
                        {
                          type: 'TakeSetAside' as const,
                          investigator: a.owner,
                          code: '10045',
                          count: 1,
                          to: 'hand' as const,
                          bonded: true,
                        },
                      ],
                      ':growth',
                    ),
                    limit: { per: 'round' as const },
                  },
                ]
              : []),
            ...(code === '10060'
              ? Object.values(s.enemies)
                  .filter(
                    (e) =>
                      getInvestigator(s, a.owner).location !== null &&
                      e.location === getInvestigator(s, a.owner).location &&
                      !e.traits?.includes('Elite') &&
                      !e.hasNoStats &&
                      !immuneToPlayerCards(e) &&
                      enemyMaxHealth(s, e) - e.damageTaken <= a.uses,
                  )
                  .map((e) => ({
                    ...option(
                      a,
                      [
                        { type: 'DefeatEnemy' as const, enemy: e.id, by: a.owner },
                        call(a, 'clearGrowth'),
                      ],
                      ':defeat:' + e.id,
                    ),
                    target: { type: 'enemy' as const, id: e.id },
                  }))
              : []),
          ]
    registerPlayerCard({
      code,
      limitTitle: true,
      requiredResearch: CLASSIFIED_SPECIES,
      fastOptions: options,
      abilities: (s, a) => options(s, a).map((o) => ({ ...o, actions: 0, provokes: false })),
      effect: (s, by, step, d) => {
        const a = s.assets[String(d.asset)]
        return step === 'clearGrowth' && a?.owner === by
          ? [{ type: 'SpendUses', asset: a.id, amount: a.uses }]
          : []
      },
      reactions: (s, t, a) => {
        if (code !== '10059' || t.type !== 'whenEncounterDrawn') return []
        const draw = s.queue.find(
          (m): m is Extract<Message, { type: 'ResolveEncounterCard' }> =>
            m.type === 'ResolveEncounterCard' && m.draw?.id === t.draw,
        )
        if (!draw || draw.card.kind !== 'treachery') return []
        const here = getInvestigator(s, draw.investigator).location
        if (!here || shroudOf(s, here) > a.uses) return []
        return [
          option(a, [
            { type: 'CancelEncounterDraw', draw: t.draw, destination: 'discard' },
            call(a, 'clearGrowth'),
          ]),
        ]
      },
    })
    return
  }
  registerPlayerCard({
    code,
    ...(code !== '11099' ? { permanent: {} } : {}),
    ...(code === '03264'
      ? { playsStoredCards: true, exhaustToPlayStored: true, storedLimit: 3 }
      : {}),
    ...(code === '10079' ? { storedLimit: 3 } : {}),
    ...(code === '09077' ? { storedLimit: 10, hiddenStoredCards: true } : {}),
    ...(['11099', '11118'].includes(code)
      ? {
          requiredInvestigatorTraits: ['Miskatonic', 'Scholar'],
          attachmentSlots: 'all' as const,
          attachmentLimit: 1,
        }
      : {}),
    fastOptions,
    abilities: (s, a) => fastOptions(s, a).map((o) => ({ ...o, actions: 0, provokes: false })),
    reactions: (s, t, a) => {
      if (
        t.type === 'beforeOpeningHand' &&
        t.investigator === a.owner &&
        !['11099', '11118'].includes(code)
      ) {
        if (code === '07303')
          return getInvestigator(s, a.owner).deck.some(
            (c) => playerCardDef(c)?.type === 'skill' && !playerCardDef(c)?.weakness,
          )
            ? [option(a, [{ type: 'StoreRandomSkills', asset: a.id, count: 5 }])]
            : []
        if (code === '09077' && setupCards(s, a).length < 10) return []
        return [option(a, [call(a, 'setup')])]
      }
      if (
        code === '10079' &&
        t.type === 'afterEngage' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        a.storedCards?.length
      ) {
        const choices: Choice[] = [
          ...(canDraw(s, a.owner) ? drawChoices(a) : []),
          ...(getInvestigator(s, a.owner).deck.length
            ? [
                {
                  label: 'ability.searchDeck',
                  then: [
                    {
                      type: 'BeginDeckSearch' as const,
                      investigator: a.owner,
                      top: 9,
                      then: call(a, 'copy'),
                    },
                  ],
                },
              ]
            : []),
        ]
        return choices.length
          ? [option(a, [{ type: 'ExhaustAsset', asset: a.id }, ...ask(a.owner, choices, true)])]
          : []
      }
      if (
        code === '09077' &&
        t.type === 'turnBegins' &&
        t.investigator === a.owner &&
        a.storedCards?.length
      )
        return [option(a, [call(a, 'market')])]
      return []
    },
    forced: (s, t, a) => {
      if (!['11099', '11118'].includes(code) || t.type !== 'turnEnds' || t.investigator !== a.owner)
        return []
      const child = children(s, a)[0]
      if (!child) return []
      const bottom: Message = { type: 'ReturnAssetToDeck', asset: child.id }
      return code === '11099' || getInvestigator(s, a.owner).resources < 1
        ? [bottom]
        : ask(
            a.owner,
            [
              {
                label: 'choice.archivePay',
                then: [{ type: 'SpendResources', investigator: a.owner, amount: 1 }],
              },
              { label: 'choice.archiveReturn', then: [bottom] },
            ],
            true,
          )
    },
    effect: (s, by, step, d) => {
      const a = s.assets[String(d.asset)]
      if (!a || a.owner !== by) return []
      if (step === 'setup') return selectSetup(s, a)
      if (step === 'copy') {
        const cards = JSON.parse(String(d.cards ?? '[]')) as string[]
        const titles = new Set((a.storedCards ?? []).map((c) => playerCardDef(c.code)?.name))
        return ask(
          by,
          [
            ...(canDraw(s, by)
              ? [...new Set(cards)]
                  .filter((c) => titles.has(playerCardDef(c)?.name))
                  .map((c) =>
                    choice(c, [{ type: 'DrawSearchedCards', investigator: by, cards: [c] }]),
                  )
              : []),
            { label: 'choice.done', then: [shuffle(a)] },
          ],
          true,
        )
      }
      if (step === 'market') {
        const revealed = a.storedCards?.slice(0, 2) ?? []
        return [
          ...revealed.map((c) => ({
            type: 'Log' as const,
            key: 'log.archiveReveal',
            params: { card: cardName(c.code) },
          })),
          ...ask(
            by,
            [
              ...(getInvestigator(s, by).resources >= 1 && canDraw(s, by)
                ? revealed.map((c, index) =>
                    choice(c.code, [
                      { type: 'SpendResources', investigator: by, amount: 1 },
                      take(a, index),
                      call(a, 'bottom', { left: revealed.length - 1 }),
                    ]),
                  )
                : []),
              { label: 'choice.skip', then: [call(a, 'bottom', { left: revealed.length })] },
            ],
            true,
          ),
        ]
      }
      if (step === 'bottom') {
        const left = Number(d.left)
        if (!left) return []
        return ask(
          by,
          (a.storedCards ?? [])
            .slice(0, left)
            .map((c, index) =>
              choice(c.code, [
                { type: 'MoveStoredToBottom', asset: a.id, index },
                call(a, 'bottom', { left: left - 1 }),
              ]),
            ),
          true,
        )
      }
      return []
    },
  })
}
