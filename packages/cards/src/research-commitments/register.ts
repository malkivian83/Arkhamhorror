// RR: Search, Research, Draw, Commit, Ownership and Control, Skill Tests ST.2/ST.8.
import {
  canCommitFrom,
  getInvestigator,
  getLocation,
  playerCardDef,
  scenarioBehavior,
  type GameState,
  type Message,
  type Asset,
  type Choice,
} from '@lcg/engine'
import {
  registerAdvancedCard as registerPlayerCard,
  ask,
  cardName,
  continuation,
  mayParticipate,
  local,
  option,
} from '../advanced-tests/common'

type Data = Record<string, string | number | boolean>
const read = (d: Data, key = 'cards'): string[] => JSON.parse(String(d[key] ?? '[]'))
const effect = (code: string, by: string, step: string, data: Data = {}) =>
  continuation(code, by, step, data) as Extract<Message, { type: 'PlayerCardEffect' }>
const search = (
  code: string,
  by: string,
  top: number,
  step = 'searched',
  data: Data = {},
): Message => ({
  type: 'BeginDeckSearch',
  investigator: by,
  top,
  then: effect(code, by, step, data),
})
const shuffle = (by: string): Message => ({ type: 'ShuffleDeck', investigator: by })
const commit = (by: string, code: string, extra = {}): Message => ({
  type: 'CommitCard',
  investigator: by,
  code,
  byEffect: true,
  ...extra,
})
const choice = (code: string, then: Message[]): Choice => ({
  label: 'choice.takeCard',
  params: { card: cardName(code) },
  target: { type: 'hand', code },
  then,
})
const eligible = (
  s: GameState,
  by: string,
  zone: 'hand' | 'discard',
  cards: string[],
  owner = by,
) =>
  [...new Set(cards)].filter((c) =>
    canCommitFrom(s, by, c, zone, true, { fromInvestigator: owner }),
  )
const gifts = (s: GameState, by: string) =>
  eligible(s, by, 'discard', getInvestigator(s, by).discard).filter(
    (c) =>
      playerCardDef(c)?.type === 'skill' &&
      (playerCardDef(c)?.classes ?? [playerCardDef(c)?.class]).includes('survivor'),
  )
const paymentCards = (s: GameState, by: string) =>
  getInvestigator(s, by).hand.filter((c) => !playerCardDef(c)?.weakness)
const foundCommit = (s: GameState, a: Asset): Message[] =>
  s.skillTest?.investigator === a.owner && canCommitFrom(s, a.owner, a.code, 'hand', true)
    ? [commit(a.owner, a.code, { fromAsset: a.id, research: true })]
    : []
const rookAbilities = (a: Asset) =>
  a.exhausted || a.uses < 1
    ? []
    : [3, 6, 9].map((top) => ({
        key: a.id + ':search:' + top,
        label: 'choice.researchDepth',
        params: { n: top },
        actions: 0,
        provokes: false,
        costs: [
          { type: 'ExhaustAsset' as const, asset: a.id },
          { type: 'SpendUses' as const, asset: a.id, amount: 1 },
        ],
        then: [search('05153', a.owner, top)],
      }))

export function registerResearchCommitment(code: string): void {
  if (code === '05153') {
    registerPlayerCard({
      code,
      abilities: (_s, a) => rookAbilities(a),
      fastOptions: (s, a) =>
        mayParticipate(s, a.owner)
          ? rookAbilities(a).map((o) => ({
              ...o,
              investigator: a.owner,
              then: [...o.costs, ...o.then],
            }))
          : [],
      effect: (_s, by, step, d) => {
        const cards = read(d)
        if (step === 'searched')
          return ask(
            by,
            [
              ...[...new Set(cards)].map((c) =>
                choice(c, [
                  effect(code, by, 'weakness', {
                    cards: JSON.stringify(cards),
                    selected: JSON.stringify([c]),
                  }),
                ]),
              ),
              {
                label: 'choice.skip',
                then: [effect(code, by, 'weakness', { cards: JSON.stringify(cards) })],
              },
            ],
            true,
          )
        if (step !== 'weakness') return []
        const selected = read(d, 'selected'),
          remaining = [...cards]
        for (const c of selected) remaining.splice(remaining.indexOf(c), 1)
        const weaknesses = [...new Set(remaining.filter((c) => playerCardDef(c)?.weakness))]
        const draw = (cs: string[]): Message => ({
          type: 'DrawSearchedCards',
          investigator: by,
          cards: cs,
        })
        return weaknesses.length
          ? ask(
              by,
              weaknesses.map((c) => choice(c, [draw([...selected, c])])),
              true,
            )
          : [draw(selected)]
      },
    })
    return
  }
  if (code === '06023') {
    registerPlayerCard({
      code,
      cannotPlayFromHand: true,
      canPlay: () => false,
      researchEffect: (s, by) =>
        mayParticipate(s, by)
          ? [
              { type: 'DiscardFromDeck', investigator: by, code },
              ...ask(
                by,
                [
                  {
                    label: 'choice.researchResources',
                    then: [{ type: 'GainResources', investigator: by, amount: 2 }],
                  },
                  ...Object.values(s.assets)
                    .filter((a) => a.owner === by && playerCardDef(a.code)?.uses?.type === 'secret')
                    .map((a) => ({
                      ...choice(a.code, [{ type: 'AddUses', asset: a.id, amount: 1 }]),
                      target: { type: 'asset' as const, id: a.id },
                    })),
                ],
                true,
              ),
            ]
          : [],
    })
    return
  }
  if (code === '06278') {
    registerPlayerCard({
      code,
      researchEffect: (s, by) =>
        mayParticipate(s, by) ? [{ type: 'TakeFromDeck', investigator: by, code, to: 'put' }] : [],
      forced: (s, t, a) =>
        (t.type === 'afterSkillTestInitiated' && t.investigator === a.owner) ||
        (t.type === 'afterAssetEntersPlay' && t.asset === a.id)
          ? foundCommit(s, a)
          : [],
      afterCommittedTestEnds: (_s, _t, success, by, copy) =>
        success && copy?.research ? [{ type: 'DrawCards', investigator: by, amount: 1 }] : [],
    })
    return
  }
  if (code === '06197') {
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      canPlay: (s, by) => !!s.skillTest && local(s, s.skillTest, by) && mayParticipate(s, by),
      play: (_s, by) => [search(code, by, 9)],
      effect: (s, by, step, d) =>
        step !== 'searched'
          ? []
          : ask(
              by,
              [
                ...eligible(s, by, 'hand', read(d))
                  .filter(
                    (c) =>
                      playerCardDef(c)?.type === 'skill' &&
                      playerCardDef(c)?.traits.includes('Practiced'),
                  )
                  .map((c) =>
                    choice(c, [
                      commit(by, c, { from: 'deck', returnAfterSuccess: true }),
                      shuffle(by),
                    ]),
                  ),
                { label: 'choice.skip', then: [shuffle(by)] },
              ],
              true,
            ),
    })
    return
  }
  if (code === '07223') {
    registerPlayerCard({
      code,
      helpsOtherTests: true,
      testOptions: (s, t, a) =>
        !a.abilityState?.searched && local(s, t, a.owner)
          ? [
              option(a, [
                { type: 'SetAssetAbilityState', asset: a.id, values: { searched: true } },
                ...ask(
                  t.investigator,
                  [
                    {
                      label: 'choice.researchSearch',
                      then: [
                        search(code, t.investigator, 3, 'searched', {
                          asset: a.id,
                          owner: a.owner,
                        }),
                      ],
                    },
                    { label: 'choice.skip', then: [] },
                  ],
                  true,
                ),
              ]),
            ]
          : [],
      forced: (_s, t, a) =>
        t.type === 'skillTestEnded' && a.abilityState?.searched
          ? [{ type: 'SetAssetAbilityState', asset: a.id, values: { searched: false } }]
          : [],
      effect: (s, by, step, d) => {
        if (step !== 'searched') return []
        const a = s.assets[String(d.asset)],
          owner = String(d.owner)
        const choices =
          a?.owner === owner && a.uses > 0 && mayParticipate(s, owner)
            ? eligible(s, by, 'hand', read(d)).map((c) =>
                choice(
                  c,
                  ask(
                    owner,
                    [
                      {
                        label: 'choice.researchPay',
                        then: [
                          { type: 'SpendUses', asset: a.id, amount: 1 },
                          commit(by, c, { from: 'deck' }),
                          shuffle(by),
                        ],
                      },
                      { label: 'choice.skip', then: [shuffle(by)] },
                    ],
                    true,
                  ),
                ),
              )
            : []
        // The performing investigator searches; the asset's controller chooses whether to pay.
        return ask(by, [...choices, { label: 'choice.skip', then: [shuffle(by)] }], true)
      },
    })
    return
  }
  if (code === '09047') {
    registerPlayerCard({
      code,
      play: (_s, by) => [search(code, by, 6, 'clues')],
      effect: (s, by, step, d) => {
        const cards = read(d)
        if (step === 'clues')
          return ask(
            by,
            Array.from(
              {
                length:
                  (getInvestigator(s, by).location === null ||
                  scenarioBehavior(s.scenarioId)?.cannotPlaceClues?.(
                    s,
                    getInvestigator(s, by).location!,
                  )
                    ? 0
                    : Math.min(3, getInvestigator(s, by).clues)) + 1,
              },
              (_, n) => ({
                label: 'choice.researchClues',
                params: { n },
                then: [
                  ...(n
                    ? [{ type: 'PlaceCluesOnLocation' as const, investigator: by, amount: n }]
                    : []),
                  effect(code, by, 'take', { cards: JSON.stringify(cards), left: n * 2 }),
                ],
              }),
            ),
            true,
          )
        const left = Number(d.left)
        if (step !== 'take' || left <= 0 || !cards.length) return [shuffle(by)]
        return ask(
          by,
          [...new Set(cards)].map((c) =>
            choice(c, [
              { type: 'TakeFromDeck', investigator: by, code: c, to: 'hand' },
              effect(code, by, 'take', {
                cards: JSON.stringify(cards.filter((_, n) => n !== cards.indexOf(c))),
                left: left - 1,
              }),
            ]),
          ),
          true,
        )
      },
    })
    return
  }
  if (code === '11094') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) =>
        t.type === 'afterCommit' &&
        t.by === a.owner &&
        t.tester === a.owner &&
        gifts(s, a.owner).length &&
        paymentCards(s, a.owner).length
          ? [
              {
                ...option(a, [effect(code, a.owner, 'chooseSkill')]),
                limit: { per: 'round' },
              },
            ]
          : [],
      effect: (s, by, step, d) =>
        step === 'chooseSkill'
          ? ask(
              by,
              gifts(s, by).map((c) => choice(c, [effect(code, by, 'payment', { chosen: c })])),
              true,
            )
          : step === 'payment'
            ? ask(
                by,
                [...new Set(paymentCards(s, by))].map((c) =>
                  choice(c, [
                    { type: 'DiscardFromHand', investigator: by, card: c },
                    commit(by, String(d.chosen), { from: 'discard', toDeckBottom: true }),
                  ]),
                ),
                true,
              )
            : [],
    })
    return
  }
  if (code === '60330') {
    registerPlayerCard({
      code,
      onCommit: (_s, by) => [effect(code, by, 'commit')],
      effect: (s, by) =>
        ask(
          by,
          [
            ...s.investigators
              .filter((i) => i.id !== by && !i.eliminated)
              .flatMap((i) =>
                eligible(s, by, 'discard', i.discard, i.id)
                  .filter((c) => playerCardDef(c)?.type === 'skill')
                  .map((c) => ({
                    ...choice(c, [
                      commit(by, c, {
                        from: 'discard',
                        fromInvestigator: i.id,
                        toDeckBottom: true,
                      }),
                    ]),
                    label: 'choice.researchCopy',
                    params: { card: cardName(c), name: i.name },
                  })),
              ),
          ],
          true,
        ),
    })
    return
  }
  if (code === '09032') {
    registerPlayerCard({
      code,
      helpsOtherTests: true,
      helpsConnectingTests: true,
      testOptions: (s, t, a) => {
        const owner = getInvestigator(s, a.owner),
          tester = getInvestigator(s, t.investigator)
        if (
          !a.uses ||
          !owner.location ||
          !tester.location ||
          (owner.location !== tester.location &&
            !getLocation(s, owner.location).connections.includes(tester.location))
        )
          return []
        const permission = { wildIcons: true, allowConnecting: true }
        return [...new Set(owner.hand)]
          .filter(
            (c) =>
              !playerCardDef(c)?.weakness && canCommitFrom(s, a.owner, c, 'hand', true, permission),
          )
          .map((c) => ({
            ...option(
              a,
              [{ type: 'SpendUses', asset: a.id, amount: 1 }, commit(a.owner, c, permission)],
              ':' + c,
            ),
            label: 'choice.researchBestow',
            params: { card: cardName(c) },
          }))
      },
    })
    return
  }
  throw Error('Unreviewed research/commitment card ' + code)
}
