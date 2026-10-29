// RR: Triggered Abilities, Maximum Hand Size, Search, Uses, Fast, Costs, Research.
import {
  canPlayByEffect,
  getInvestigator,
  playerCardBehavior,
  playerCardDef,
  registerInvestigator,
  registerPlayerCard,
  registerTreachery,
  stuckInPlay,
  type Asset,
  type Choice,
  type GameState,
  type Message,
} from '@lcg/engine'
import { ask, continuation, cardName, destinations } from '../dunwich-pilot/effects'
import { targets, testChoices } from '../basic-events/register'
const draw = (investigator: string, amount = 1): Message => ({
  type: 'DrawCards',
  investigator,
  amount,
})
const here = (s: GameState, by: string) => {
  const location = getInvestigator(s, by).location
  return location === null
    ? []
    : s.investigators.filter((i) => !i.eliminated && i.location === location)
}
const ownTurn = (s: GameState, by: string) => {
  const root = s.immediateActions?.[0]
  return root ? root.activeTurn === by && !root.endedTurn : s.activeTurn === by
}
const use = (a: Asset, n = 1): Message[] => [{ type: 'SpendUses', asset: a.id, amount: n }]
const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const reaction = (a: Asset, label: string, then: Message[]) => ({
  key: a.id + ':' + label,
  investigator: a.owner,
  label,
  params: { card: cardName(a.code) },
  then,
})
const hasTrait = (code: string, trait: string) =>
  playerCardDef(code)?.traits.includes(trait) ?? false

registerInvestigator({
  code: '60201',
  elderSign: (_s, self) => ({ modifier: 1, immediate: [draw(self.id)] }),
  reactions: (s, t, self) =>
    t.type === 'afterCardsDrawn' &&
    t.amount > 0 &&
    s.phase === 'investigation' &&
    here(s, self.id).some((i) => i.id === t.investigator)
      ? [
          {
            key: 'harvey',
            investigator: self.id,
            label: 'ability.harveyDraw',
            limit: { per: 'round' },
            then: [draw(t.investigator)],
          },
        ]
      : [],
})
registerPlayerCard({
  code: '60202',
  handSize: 2,
  reactions: (_s, t, a) =>
    t.type === 'afterSkillTest' &&
    t.kind === 'investigate' &&
    t.succeeded &&
    t.investigator === a.owner &&
    !a.exhausted
      ? [
          reaction(a, 'ability.vaultKnowledge', [
            exhaust(a),
            continuation(a.code, a.owner, 'recipient'),
          ]),
        ]
      : [],
  effect: (s, by, step) =>
    step === 'recipient'
      ? ask(
          by,
          here(s, by).map((i) => ({
            label: 'choice.investigator',
            params: { name: i.name },
            then: [draw(i.id)],
          })),
          true,
        )
      : [],
})
registerTreachery({
  code: '60203',
  revelation: (s, by) => [
    {
      type: 'TakeDamage',
      investigator: by,
      damage: Math.floor(getInvestigator(s, by).hand.length / 3),
      horror: 0,
      source: cardName('60203'),
    },
  ],
})
registerTreachery({
  code: '60204',
  revelation: (_s, by, t) => [
    {
      type: 'PlaceTreachery',
      treachery: t.id,
      placement: { type: 'threatArea', investigator: by },
    },
  ],
  forced: (_s, t, self) =>
    t.type === 'turnBegins' &&
    self.placement.type === 'threatArea' &&
    self.placement.investigator === t.investigator
      ? [
          {
            type: 'DiscardRandomFromHand',
            investigator: t.investigator,
            amount: 1,
            nonWeaknessOnly: true,
          },
        ]
      : [],
  abilities: (_s, self) => [
    {
      key: self.id + ':discard',
      label: 'ability.discardTreachery',
      params: { card: self.name },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ],
})
registerPlayerCard({
  code: '60206',
  skillModifier: (s, a, t) => {
    const n = getInvestigator(s, a.owner).hand.length
    return t.skill === 'intellect'
      ? Number(n >= 5) + Number(n >= 15)
      : t.skill === 'willpower'
        ? Number(n >= 10)
        : 0
  },
})
registerPlayerCard({
  code: '60207',
  reactions: (s, t, a) => {
    if (t.type !== 'enemySpawned' || t.location !== getInvestigator(s, a.owner).location) return []
    const enemy = s.enemies[t.enemy]
    if (!enemy || enemy.traits?.includes('Elite')) return []
    const choices: Choice[] = [
      ...(!enemy.cannotBeEvaded && !enemy.hasNoStats
        ? [
            {
              label: 'action.evade',
              params: { enemy: enemy.name },
              then: [{ type: 'EvadeEnemy' as const, enemy: enemy.id, by: a.owner }],
            },
          ]
        : []),
      {
        label: 'choice.harveyDamageEnemy',
        params: { enemy: enemy.name, n: 2 },
        then: [
          {
            type: 'DamageEnemy',
            enemy: enemy.id,
            amount: 2,
            by: a.owner,
            source: { traits: playerCardDef(a.code)!.traits },
          },
        ],
      },
    ]
    return [
      reaction(a, 'ability.discItzamna', [
        { type: 'DiscardAsset', asset: a.id },
        ...ask(a.owner, choices, true),
      ]),
    ]
  },
})
registerPlayerCard({
  code: '60210',
  abilities: (_s, a, by) =>
    a.exhausted || a.uses < 1
      ? []
      : [
          {
            key: a.id + ':draw',
            label: 'ability.forbiddenTome',
            params: { card: cardName(a.code) },
            actions: 1,
            provokes: true,
            costs: [exhaust(a), ...use(a)],
            then: [draw(by), continuation(a.code, by, 'translate', { asset: a.id })],
          },
        ],
  effect: (s, by, step, data) => {
    const a = s.assets[String(data.asset)]
    return step === 'translate' &&
      a &&
      a.code === '60210' &&
      a.owner === by &&
      a.uses === 0 &&
      getInvestigator(s, by).hand.length >= 10
      ? ask(
          by,
          [
            { label: 'choice.skip', then: [] },
            {
              label: 'choice.harveyTranslate',
              then: [
                { type: 'DiscardAsset', asset: a.id },
                { type: 'RecordNote', note: 'translatedTheTome' },
              ],
            },
          ],
          true,
        )
      : []
  },
})
registerPlayerCard({
  code: '60211',
  testOptions: (s, t, a) =>
    t.investigator === a.owner &&
    ['willpower', 'intellect'].includes(t.skill) &&
    getInvestigator(s, a.owner).hand.length >= 5 &&
    getInvestigator(s, a.owner).resources >= 1
      ? [
          {
            key: a.id + ':pump',
            investigator: a.owner,
            label: 'ability.pump',
            params: { card: cardName(a.code), skill: t.skill, amount: 1 },
            then: [
              { type: 'SpendResources', investigator: a.owner, amount: 1 },
              { type: 'BoostSkillTest', amount: 1 },
            ],
          },
        ]
      : [],
})
for (const code of ['60213', '60223'])
  registerPlayerCard({
    code,
    skillModifier: (s, a, t) =>
      Object.values(s.assets).some(
        (x) =>
          x.owner === a.owner &&
          playerCardDef(x.code)?.traits.some((trait) => ['Tome', 'Relic'].includes(trait)),
      ) &&
      (t.skill === 'intellect' || (code === '60223' && t.skill === 'willpower'))
        ? 1
        : 0,
    reactions: (_s, t, a) =>
      !a.exhausted &&
      (t.type === 'afterRevealLocation' || t.type === 'afterPutLocation') &&
      t.investigator === a.owner
        ? [
            reaction(a, 'ability.whittonSearch', [
              exhaust(a),
              {
                type: 'SearchDeck',
                investigator: a.owner,
                top: code === '60223' ? 9 : 6,
                traits: ['Tome', 'Relic'],
                to: 'hand',
                drawFound: true,
                optional: true,
              },
            ]),
          ]
        : [],
  })
for (const code of ['60215', '60224'])
  registerPlayerCard({
    code,
    play: (s, by) => [
      {
        type: 'GainResources',
        investigator: by,
        amount: code === '60215' ? 2 : getInvestigator(s, by).hand.length >= 10 ? 4 : 3,
      },
    ],
    handReactions: (s, t, by) =>
      t.type === 'afterDrawCard' && t.investigator === by && t.card === code && ownTurn(s, by)
        ? [
            {
              key: 'hand:' + code,
              investigator: by,
              label: 'ability.playCard',
              params: { card: cardName(code) },
              target: { type: 'hand', code },
              then: [{ type: 'PlayCard', investigator: by, code, byEffect: true }],
            },
          ]
        : [],
  })
registerPlayerCard({
  code: '60216',
  selfCostModifier: (s, by) =>
    -Math.max(
      0,
      getInvestigator(s, by).hand.length - Number(getInvestigator(s, by).hand.includes('60216')),
    ),
  canPlay: (s, by) => {
    const location = getInvestigator(s, by).location
    return location !== null && s.locations[location]!.clues > 0
  },
  play: (_s, by) => [{ type: 'DiscoverClues', investigator: by, amount: 2 }],
})
// Additional discard costs are chosen before this event's effect (and any opportunity attacks).
registerPlayerCard({
  code: '60217',
  noAttacksOfOpportunity: true,
  canPlay: (s, by) => targets({ action: 'fight' }, s, by).length > 0,
  additionalPlayDiscard: { max: 2 },
  play: (s, by, _x, _fromDiscard, discarded) =>
    testChoices(
      {
        action: 'fight',
        skill: 'intellect',
        modifier: discarded ?? 0,
        extraDamage: discarded ?? 0,
        tags: ['spell'],
      },
      { state: s, investigator: by, code: '60217' },
    ),
})
const docentReturns = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => {
    if (a.owner !== by || !hasTrait(a.code, 'Tome') || stuckInPlay(s, a)) return false
    const assets = { ...s.assets }
    delete assets[a.id]
    const projected = {
      ...s,
      assets,
      investigators: s.investigators.map((i) =>
        i.id === (a.originalOwner ?? a.owner) ? { ...i, hand: [...i.hand, a.code] } : i,
      ),
    }
    return [...new Set(getInvestigator(projected, by).hand)].some(
      (code) =>
        hasTrait(code, 'Tome') &&
        cardName(code) !== cardName(a.code) &&
        canPlayByEffect(projected, by, code, 'hand', false, 2),
    )
  })
registerPlayerCard({
  code: '60220',
  reactions: (s, t, a) =>
    t.type === 'afterAssetEntersPlay' && t.asset === a.id && docentReturns(s, a.owner).length > 0
      ? [reaction(a, 'ability.libraryDocent', [continuation(a.code, a.owner, 'return')])]
      : [],
  effect: (s, by, step, data) => {
    if (step === 'return')
      return ask(
        by,
        docentReturns(s, by).map((a) => ({
          label: 'choice.returnToHand',
          params: { card: cardName(a.code) },
          target: { type: 'asset', id: a.id },
          then: [
            { type: 'ReturnAssetToHand', asset: a.id },
            continuation('60220', by, 'play', { title: cardName(a.code) }),
          ],
        })),
        true,
      )
    if (step !== 'play') return []
    return ask(
      by,
      [...new Set(getInvestigator(s, by).hand)]
        .filter(
          (code) =>
            hasTrait(code, 'Tome') &&
            cardName(code) !== data.title &&
            canPlayByEffect(s, by, code, 'hand', false, 2),
        )
        .map((code) => ({
          label: 'ability.playCard',
          params: { card: cardName(code) },
          target: { type: 'hand', code },
          then: [{ type: 'PlayCard', investigator: by, code, discount: 2, byEffect: true }],
        })),
      true,
    )
  },
})
registerPlayerCard({
  code: '60221',
  play: (_s, by) => [draw(by), continuation('60221', by, 'choose', { selected: '[]' })],
  effect: (s, by, step, data) => {
    if (step !== 'choose') return []
    const selected = JSON.parse(String(data.selected)) as string[]
    const available = [...getInvestigator(s, by).hand]
    for (const code of selected) {
      const index = available.indexOf(code)
      if (index >= 0) available.splice(index, 1)
    }
    return ask(
      by,
      [
        {
          label: 'choice.harveyFinish',
          then: selected.length
            ? [
                { type: 'ShuffleCardsIntoDeck', investigator: by, cards: selected, fromHand: true },
                draw(by, selected.length),
              ]
            : [],
        },
        ...[...new Set(available)]
          .filter((code) => !playerCardDef(code)?.weakness)
          .map((code) => ({
            label: 'choice.harveyShuffle',
            params: { card: cardName(code) },
            target: { type: 'hand' as const, code },
            then: [
              continuation('60221', by, 'choose', {
                selected: JSON.stringify([...selected, code]),
              }),
            ],
          })),
      ],
      true,
    )
  },
})
registerPlayerCard({
  code: '60226',
  canPlay: (s, by) => ownTurn(s, by),
  play: (_s, by) => [
    {
      type: 'RoundSkillAddition',
      investigator: by,
      from: 'intellect',
      skills: ['combat', 'agility'],
      code: '60226',
    },
    draw(by),
  ],
})
const tomeActions = (s: GameState, by: string) =>
  Math.max(1, 4 - Math.floor(getInvestigator(s, by).hand.length / 4))
for (const code of ['60229', '60230'])
  registerPlayerCard({
    code,
    requiredResearch: 'translatedTheTome',
    abilities: (s, a, by) => {
      if (a.exhausted || getInvestigator(s, by).location === null) return []
      const location = getInvestigator(s, by).location!
      const sources = [
        ...here(s, by)
          .filter((i) => i.damage > 0)
          .map((i) => ({ type: 'investigator' as const, id: i.id, name: i.name })),
        ...Object.values(s.assets)
          .filter((x) => x.damage > 0 && here(s, by).some((i) => i.id === x.owner))
          .map((x) => ({ type: 'asset' as const, id: x.id, name: cardName(x.code) })),
      ]
      const enemies = Object.values(s.enemies).filter(
        (e) => e.location === location && !e.hasNoStats,
      )
      if (code === '60229')
        return sources.flatMap((source) =>
          enemies.map((enemy) => ({
            key: a.id + ':damage:' + source.id + ':' + enemy.id,
            label: 'ability.forbiddenTomeDamage',
            params: { card: cardName(code), from: source.name, enemy: enemy.name },
            actions: tomeActions(s, by),
            provokes: true,
            costs: [exhaust(a)],
            then: [
              {
                type: 'MoveDamage' as const,
                from: { type: source.type, id: source.id },
                to: { type: 'enemy' as const, id: enemy.id },
                by,
                kind: 'damage' as const,
              },
            ],
          })),
        )
      return [
        {
          key: a.id + ':clue',
          label: 'ability.forbiddenTomeClue',
          params: { card: cardName(code) },
          actions: tomeActions(s, by),
          provokes: true,
          costs: [exhaust(a)],
          then: [
            ...ask(
              by,
              [
                { label: 'choice.skip', then: [] },
                ...destinations(s, by).map((id) => ({
                  label: 'choice.location',
                  params: { location: s.locations[id]!.name },
                  target: { type: 'location' as const, id },
                  then: [{ type: 'MoveTo' as const, investigator: by, location: id }],
                })),
              ],
              true,
            ),
            { type: 'DiscoverClues', investigator: by, amount: 1 },
          ],
        },
      ]
    },
  })
registerPlayerCard({
  code: '60231',
  fastOptions: (s, a) => {
    if (a.exhausted || !ownTurn(s, a.owner) || getInvestigator(s, a.owner).hand.length < 8)
      return []
    return [...new Set(getInvestigator(s, a.owner).hand)]
      .filter(
        (code) =>
          playerCardDef(code)?.type === 'event' &&
          playerCardBehavior(code)?.play &&
          canPlayByEffect(s, a.owner, code, 'hand'),
      )
      .map((code) => ({
        key: a.id + ':play:' + code,
        investigator: a.owner,
        label: 'ability.farsight',
        params: { card: cardName(code) },
        target: { type: 'hand', code },
        then: [exhaust(a), { type: 'PlayCard', investigator: a.owner, code, byEffect: true }],
      }))
  },
})
registerPlayerCard({
  code: '60232',
  permanent: {},
  restrictedSlots: [{ slot: 'ally', count: 2, trait: 'Miskatonic' }],
  assignmentTraitLimit: { trait: 'Miskatonic', amount: 1 },
})
registerPlayerCard({
  code: '60233',
  testOptions: (_s, t, a) =>
    t.investigator === a.owner && a.uses >= 1
      ? [
          reaction(a, 'ability.necronomiconSkill', [
            ...use(a),
            { type: 'BoostSkillTest', amount: 2 },
          ]),
        ]
      : [],
  fastOptions: (s, a) => [
    ...(a.uses >= 2
      ? [reaction(a, 'ability.necronomiconDraw', [...use(a, 2), draw(a.owner, 2)])]
      : []),
    ...(a.uses >= 3
      ? Object.values(s.locations)
          .filter((l) => l.clues > 0)
          .map((l) => ({
            ...reaction(a, 'ability.necronomiconClue', [
              ...use(a, 3),
              { type: 'DiscoverClues', investigator: a.owner, amount: 1, location: l.id },
            ]),
            key: a.id + ':clue:' + l.id,
            params: { location: l.name },
          }))
      : []),
    ...(a.uses >= 4
      ? Object.values(s.enemies)
          .filter((e) => e.engagedWith === a.owner && !e.hasNoStats)
          .map((e) => ({
            ...reaction(a, 'ability.necronomiconDamage', [
              ...use(a, 4),
              {
                type: 'DamageEnemy',
                enemy: e.id,
                amount: 3,
                by: a.owner,
                source: { traits: playerCardDef(a.code)!.traits },
              },
            ]),
            key: a.id + ':damage:' + e.id,
            params: { enemy: e.name },
          }))
      : []),
  ],
})
