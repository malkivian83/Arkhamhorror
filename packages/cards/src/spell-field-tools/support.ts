// RR: Forced Abilities, Reaction Opportunities, Costs, Uses, Defeat, Movement.
import {
  distancesFrom,
  enemiesAt,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type Message,
} from '@lcg/engine'
import { continuation, draw, gain, heal, hurt, local, exhaust, react, destinations } from './common'
export function registerFieldSupport(code: string): boolean {
  if (code === '60478') {
    registerPlayerCard({ code, permanent: { slots: { arcane: 1 } } })
    return true
  }
  if (code === '11030') {
    registerPlayerCard({
      code,
      permanent: {},
      initialUsesBonus: (c) => {
        const d = playerCardDef(c)
        return d?.traits.includes('Firearm') && d.uses?.type === 'ammo' ? 1 : 0
      },
    })
    return true
  }
  if (['60479', '60555'].includes(code)) {
    const jim = code === '60479'
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === (jim ? 'willpower' : 'agility') ? 1 : 0),
      reactions: (s, t, a) =>
        !a.exhausted &&
        (jim
          ? t.type === 'afterTakeDamage' &&
            t.investigator === a.owner &&
            (t.damage > 0 || t.horror > 0)
          : t.type === 'skillTestEnded' &&
            t.investigator === a.owner &&
            !t.succeeded &&
            ['fight', 'evade'].includes(t.kind) &&
            s.lastSkillTest?.investigator === a.owner)
          ? [
              react(a, [
                exhaust(a),
                ...(jim
                  ? [draw(a.owner), gain(a.owner)]
                  : [{ type: 'RepeatSkillTest' as const, investigator: a.owner, modifier: 1 }]),
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '60561') {
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      usesAsResources: (s, a, by, c) =>
        getInvestigator(s, by).location !== null &&
        getInvestigator(s, by).location === getInvestigator(s, a.owner).location &&
        playerCardDef(c)?.type === 'event',
    })
    return true
  }
  if (code === '60556') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (t.type !== 'enemySpawned' || a.exhausted) return []
        const here = getInvestigator(s, a.owner).location
        if (here === null || here === t.location) return []
        const dist = distancesFrom(s, t.location),
          n = dist.get(here)
        if (n === undefined) return []
        return destinations(s, a.owner)
          .filter((l) => dist.get(l) === n - 1)
          .map((l) => ({
            ...react(a, [exhaust(a), { type: 'MoveTo', investigator: a.owner, location: l }]),
            key: a.id + ':' + l,
            label: 'choice.pilotMove',
            params: { name: getInvestigator(s, a.owner).name, location: s.locations[l]!.name },
            target: { type: 'location' as const, id: l },
          }))
      },
    })
    return true
  }
  if (code === '10119') {
    registerPlayerCard({
      code,
      forced: (s, t, a) =>
        t.type === 'turnBegins' &&
        t.investigator === a.owner &&
        getInvestigator(s, a.owner).damage > 0
          ? [
              {
                type: 'MoveDamage',
                from: { type: 'investigator', id: a.owner },
                to: { type: 'asset', id: a.id },
                kind: 'damage',
              },
            ]
          : t.type === 'assetDefeated' && t.asset.id === a.id
            ? [
                ...enemiesAt(s, getInvestigator(s, a.owner).location ?? '').map((e) => ({
                  type: 'DamageEnemy' as const,
                  enemy: e.id,
                  amount: 2,
                  by: a.owner,
                  source: { attack: false, traits: playerCardDef(code)!.traits },
                })),
                ...local(s, a.owner).map((i) => hurt(i.id, 2)),
              ]
            : [],
    })
    return true
  }
  if (code === '11049') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (
          t.type !== 'afterSkillTest' ||
          t.investigator !== a.owner ||
          !t.succeeded ||
          a.exhausted
        )
          return []
        const i = getInvestigator(s, a.owner),
          m = t.margin
        let effect: Message[] = []
        if ([1, 3].includes(m) && i.location !== null && s.locations[i.location]!.clues > 0)
          effect = [{ type: 'DiscoverClues', investigator: a.owner, amount: 1 }]
        if ([2, 4].includes(m)) effect = [draw(a.owner), gain(a.owner)]
        if (m === 5)
          effect = [{ type: 'NextTurnBenefits', investigator: a.owner, code, actions: 1 }]
        return effect.length ? [react(a, [exhaust(a), ...effect])] : []
      },
    })
    return true
  }
  if (code === '11027') {
    registerPlayerCard({
      code,
      firstInvestigateSafe: true,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterDiscoverClues' &&
        t.investigator === a.owner &&
        !a.exhausted &&
        enemiesAt(s, getInvestigator(s, a.owner).location ?? '').length > 0
          ? [
              react(a, [
                exhaust(a),
                { type: 'ChooseEnemyToDamage', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
    return true
  }
  if (code === '60256') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) =>
        s.activeTurn !== a.owner || a.exhausted || a.uses < 1
          ? []
          : local(s, a.owner)
              .filter((i) => i.horror > 0)
              .map((i) => ({
                ...react(a, [
                  exhaust(a),
                  { type: 'SpendUses', asset: a.id, amount: 1 },
                  heal(i.id, 0, 2),
                  {
                    type: 'BeginSkillTest',
                    investigator: a.owner,
                    skill: 'willpower',
                    difficulty: 2,
                    source: a.id,
                    kind: {
                      type: 'effect',
                      source: code,
                      onSuccess: [],
                      onFailEach: [],
                      onFail: [{ type: 'DiscardRandomFromHand', investigator: a.owner, amount: 1 }],
                    },
                  },
                ]),
                key: a.id + ':' + i.id,
                label: 'choice.investigator',
                params: { name: i.name },
                target: { type: 'investigator' as const, id: i.id },
              })),
    })
    return true
  }
  if (code === '60259') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        a.exhausted || a.uses < 1
          ? []
          : [
              ...local(s, by).map((i) => ({
                label: 'choice.investigator',
                params: { name: i.name },
                then: [hurt(i.id, 0, 1)],
              })),
              ...Object.values(s.assets)
                .filter(
                  (other) =>
                    playerCardDef(other.code)?.traits.includes('Ally') &&
                    local(s, by).some((i) => i.id === other.owner),
                )
                .map((other) => ({
                  label: 'choice.fieldAbility',
                  params: { card: playerCardDef(other.code)!.name },
                  then: [{ type: 'DamageAsset' as const, asset: other.id, damage: 0, horror: 1 }],
                })),
            ].map((c, n) => ({
              key: a.id + ':' + n,
              label: c.label,
              params: c.params,
              actions: 1,
              provokes: true,
              costs: [exhaust(a), { type: 'SpendUses' as const, asset: a.id, amount: 1 }],
              then: [...c.then, continuation(code, by, 'research', { asset: a.id })],
            })),
      effect: (s, by, _step, data) =>
        s.assets[String(data.asset)]?.uses === 0
          ? [
              { type: 'DiscardAsset', asset: String(data.asset) },
              draw(by, 3),
              { type: 'RecordNote', note: 'you have unearthed the secrets of the Pharaohs' },
            ]
          : [],
    })
    return true
  }
  return false
}
