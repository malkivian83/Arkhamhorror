import {
  getInvestigator,
  isPermanent,
  playerCardDef,
  push,
  registerLocation,
  skillValueFor,
  type GameState,
  type SkillType,
} from '@lcg/engine'
import { ask, damage, on, specific } from './helpers'
import { TOWN } from './night-data'
import { search } from './night-citizens'

for (const row of TOWN)
  registerLocation({
    code: row.id,
    onReveal: () => [
      {
        type: 'PlaceAsset',
        code: row.npc,
        name: playerCardDef(row.npc)!.name,
        placement: { type: 'location', location: row.id },
      },
    ],
    abilities: (s, _self, by) => {
      const limit = { per: 'round' as const }
      if (row.id === '78025')
        return Array.from({ length: getInvestigator(s, by).resources }, (_, n) => ({
          key: '78025:search',
          label: 'ability.plaguebearer.night.store',
          params: { amount: n + 1 },
          actions: 0,
          provokes: false,
          limit,
          costs: [{ type: 'SpendResources' as const, investigator: by, amount: n + 1 }],
          then: [specific('night.storeSearch', { investigator: by, amount: n + 1 })],
        }))
      if (row.id === '78027')
        return [
          {
            key: '78027:search',
            label: 'ability.plaguebearer.night.boarding',
            actions: 1,
            provokes: true,
            limit,
            then: [search(by, ['Ally'], 'hand')],
          },
        ]
      if (row.id === '78030')
        return [
          {
            key: '78030:search',
            label: 'ability.plaguebearer.night.shop',
            actions: 1,
            provokes: true,
            limit,
            then: [
              { type: 'DrawEncounterCard', investigator: by },
              search(by, ['Spell', 'Relic'], 'put'),
            ],
          },
        ]
      return []
    },
    forced: (s, t, self) => {
      if (
        row.id === '78028' &&
        self.revealed &&
        t.type === 'afterCardsDrawn' &&
        s.phase === 'upkeep' &&
        getInvestigator(s, t.investigator).location === self.id &&
        getInvestigator(s, t.investigator).hand.length >= 5 &&
        s.scenarioMeta?.[`night:library:${t.investigator}`] !== s.round
      )
        return [
          { type: 'SetScenarioMeta', key: `night:library:${t.investigator}`, value: s.round },
          { type: 'DrawCards', investigator: t.investigator, amount: 1 },
        ]
      if (
        row.id === '78029' &&
        self.revealed &&
        t.type === 'afterCommit' &&
        getInvestigator(s, t.by).location === self.id
      ) {
        const card =
          s.skillTest?.committed.find((c) => c.id === t.commitId) ?? s.skillTest?.committed.at(-1)
        if (card && playerCardDef(card.code)?.type === 'skill')
          return [specific('night.docks', { investigator: t.by })]
      }
      return []
    },
  })
on('night.docks', (s, d) =>
  s.skillTest
    ? {
        ...s,
        skillTest: {
          ...s.skillTest,
          tags: [...(s.skillTest.tags ?? []), `night:docks:${d.investigator}`],
        },
      }
    : s,
)
for (const row of TOWN)
  registerLocation({
    code: row.ruin,
    forced: (s, t, self) =>
      self.revealed &&
      t.type === 'turnBegins' &&
      getInvestigator(s, t.investigator).location === self.id
        ? [specific('night.ruinedTurn', { investigator: t.investigator, location: row.ruin })]
        : [],
  })

const owned = (s: GameState, by: string) =>
  Object.values(s.assets).filter((a) => a.owner === by && !isPermanent(a.code))
on('night.ruinedTurn', (s, d) => {
  const by = String(d.investigator),
    id = String(d.location),
    i = getInvestigator(s, by)
  if (id === '78276')
    return push(s, { type: 'LoseResources', investigator: by, amount: Math.ceil(i.resources / 2) })
  if (id === '78280')
    return i.hand.length > 3
      ? push(s, { type: 'ChooseDiscardFromHand', investigator: by, amount: i.hand.length - 3 })
      : s
  if (id === '78277')
    return ask(
      s,
      by,
      owned(s, by).map((a) => ({
        label: 'choice.discard',
        params: { card: playerCardDef(a.code)!.name },
        then: [
          { type: 'DiscardAsset', asset: a.id },
          ...(Object.values(s.assets).filter((a) => a.owner === by).length >= 5
            ? [specific('night.discardAsset', { investigator: by })]
            : []),
        ],
      })),
    )
  if (id === '78278') {
    const skills: SkillType[] = ['willpower', 'intellect', 'combat', 'agility']
    const values = skills.map((skill) =>
      skillValueFor(s, by, skill, {
        type: 'effect',
        source: id,
        onSuccess: [],
        onFail: [],
        onFailEach: [],
      }),
    )
    const maximum = Math.max(...values)
    return ask(
      s,
      by,
      skills
        .filter((_, n) => values[n] === maximum)
        .map((skill) => ({
          label: `choice.test.${skill}`,
          params: { difficulty: 1 },
          then: [
            {
              type: 'UntilPhaseSkillBonus',
              investigator: by,
              skill,
              amount: 1 - maximum,
              code: id,
              phase: s.phase,
              round: s.round,
            },
          ],
        })),
    )
  }
  if (id === '78279') {
    const allies = owned(s, by)
      .map((a) => playerCardDef(a.code)!)
      .filter((a) => a.traits.includes('Ally'))
    const max = Math.max(-1, ...allies.map((a) => a.cost ?? 0)),
      highest = allies.filter((a) => (a.cost ?? 0) === max)
    return ask(
      s,
      by,
      highest.flatMap((a) => [
        ...((a.health ?? 0) > 0
          ? [{ label: 'choice.plaguebearer.damage', then: [damage(by, a.health!)] }]
          : []),
        ...((a.sanity ?? 0) > 0
          ? [{ label: 'choice.plaguebearer.horror', then: [damage(by, 0, a.sanity!)] }]
          : []),
      ]),
    )
  }
  if (id === '78282') {
    const assets = owned(s, by).filter((a) => !playerCardDef(a.code)?.traits.includes('Ally'))
    const max = Math.max(-1, ...assets.map((a) => playerCardDef(a.code)?.cost ?? 0))
    return ask(s, by, [
      {
        label: 'choice.plaguebearer.night.encounter',
        then: [{ type: 'DrawEncounterCard', investigator: by }],
      },
      ...assets
        .filter((a) => (playerCardDef(a.code)?.cost ?? 0) === max)
        .map((a) => ({
          label: 'choice.discard',
          params: { card: playerCardDef(a.code)!.name },
          then: [{ type: 'DiscardAsset' as const, asset: a.id }],
        })),
    ])
  }
  if (id === '78281')
    return ask(
      s,
      by,
      [...new Set(i.hand.filter((c) => playerCardDef(c)?.type === 'skill'))].map((code) => {
        const icons = Object.values(playerCardDef(code)!.icons ?? {}).reduce(
          (n, v) => n + (v ?? 0),
          0,
        )
        return {
          label: 'choice.card',
          params: { card: playerCardDef(code)!.name },
          then: [specific('night.docksSkill', { investigator: by, code, icons })],
        }
      }),
    )
  if (id === '78275')
    return ask(
      s,
      by,
      [...new Set([...i.hand, ...i.discard].filter((c) => playerCardDef(c)?.type === 'event'))].map(
        (code) => ({
          label: 'choice.card',
          params: { card: playerCardDef(code)!.name },
          then: [specific('night.advertiserEvent', { investigator: by, code })],
        }),
      ),
    )
  return s
})
on('night.discardAsset', (s, d) =>
  ask(
    s,
    String(d.investigator),
    owned(s, String(d.investigator)).map((a) => ({
      label: 'choice.discard',
      params: { card: playerCardDef(a.code)!.name },
      then: [{ type: 'DiscardAsset', asset: a.id }],
    })),
  ),
)
on('night.docksSkill', (s, d) =>
  ask(s, String(d.investigator), [
    {
      label: 'choice.discard',
      then: [
        { type: 'DiscardFromHand', investigator: String(d.investigator), card: String(d.code) },
      ],
    },
    {
      label: 'choice.plaguebearer.horror',
      then: [damage(String(d.investigator), 0, Number(d.icons))],
    },
  ]),
)
on('night.advertiserEvent', (s, d) => {
  const by = String(d.investigator),
    code = String(d.code),
    cost = Math.max(0, playerCardDef(code)?.cost ?? 0),
    i = getInvestigator(s, by)
  if (cost === 0) {
    const zone = i.hand.includes(code) ? 'hand' : 'discard',
      at = i[zone].indexOf(code)
    return {
      ...s,
      investigators: s.investigators.map((other) =>
        other.id === by ? { ...other, [zone]: i[zone].filter((_, n) => n !== at) } : other,
      ),
    }
  }
  return ask(
    s,
    by,
    Array.from({ length: cost + 1 }, (_, n) => ({
      label: 'choice.plaguebearer.night.damageSplit',
      params: { damage: n, horror: cost - n },
      then: [damage(by, n, cost - n)],
    })),
  )
})
