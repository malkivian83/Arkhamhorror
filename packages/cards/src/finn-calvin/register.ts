// RR: Additional Actions, Skill Values, Direct Damage/Horror, Search, Draw, Ready, Movement.
import {
  actualDiscard,
  discardLocked,
  enemyHasKeyword,
  enemiesAt,
  getInvestigator,
  getLocation,
  playerCardDef,
  registerInvestigator,
  registerTreachery,
  testMargin,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { fightOptions } from '../dunwich-pilot/effects'

export function registerFinnCalvinCard(code: string): void {
  if (code === '04003') {
    registerInvestigator({
      code,
      extraEvadeAction: true,
      elderSign: (s, i) => ({
        modifier: Object.values(s.enemies).filter((e) => e.exhausted).length,
        onSuccess: [continuation(code, i.id, 'clue')],
      }),
    })
    registerPlayerCard({
      code,
      effect: (s, by, step) => {
        const location = getInvestigator(s, by).location
        return step === 'clue' && s.skillTest && testMargin(s.skillTest) >= 2 && location
          ? ask(
              by,
              [
                {
                  label: 'choice.finnClue',
                  then: [{ type: 'DiscoverClues', investigator: by, location, amount: 1 }],
                },
              ],
              true,
            )
          : []
      },
    })
    return
  }
  if (code === '04010') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => {
        const here = getInvestigator(s, by).location
        return here !== null && !enemiesAt(s, here).some((e) => !e.exhausted)
      },
      play: (s, by) =>
        ask(
          by,
          [
            {
              label: 'choice.finnSearchDeck',
              then: [
                {
                  type: 'SearchDeck',
                  investigator: by,
                  top: 9,
                  traits: ['Illicit'],
                  anyType: true,
                  to: 'hand',
                  drawFound: true,
                  optional: true,
                },
                { type: 'ShufflePlayedEvent', investigator: by, code, fromBottom: false },
              ],
            },
            ...(!discardLocked(s, by)
              ? [
                  {
                    label: 'choice.finnSearchDiscard',
                    then: ask(
                      by,
                      [
                        ...[...new Set(actualDiscard(s, by))]
                          .filter((c) => playerCardDef(c)?.traits.includes('Illicit'))
                          .map((c) => ({
                            label: 'choice.takeCard',
                            params: { card: cardName(c) },
                            then: [
                              {
                                type: 'DiscardToHand' as const,
                                investigator: by,
                                code: c,
                                drawFound: true,
                              },
                            ],
                          })),
                        { label: 'choice.skip', then: [] },
                      ],
                      true,
                    ),
                  },
                ]
              : []),
          ],
          true,
        ),
    })
    return
  }
  if (code === '04011') {
    registerPlayerCard({
      code,
      effectAttackDamage: (s, test) =>
        test.kind.type === 'fight' &&
        s.enemies[test.kind.enemy] &&
        s.enemies[test.kind.enemy]!.engagedWith !== test.investigator
          ? 1
          : 0,
      abilities: (s, a, by) =>
        a.owner === by && a.uses > 0
          ? fightOptions(s, a, by, 2).map((o) => {
              return {
                ...o,
                costs: [{ type: 'SpendUses' as const, asset: a.id, amount: 1 }],
                then: o.then.map((m) =>
                  m.type === 'BeginSkillTest'
                    ? {
                        ...m,
                        effectSource: code,
                      }
                    : m,
                ),
              }
            })
          : [],
    })
    return
  }
  if (code === '04012') {
    registerPlayerCard({
      code,
      effect: (s, by, step, d) => {
        if (step !== 'finish') return []
        const before = JSON.parse(String(d.enemies)) as Record<string, string>
        return Object.entries(before).some(
          ([id, location]) =>
            s.enemies[id]?.location !== undefined && s.enemies[id]?.location !== location,
        )
          ? []
          : [{ type: 'ShuffleTreacheryIntoDeck', investigator: by, treachery: String(d.treachery) }]
      },
    })
    registerTreachery({
      code,
      revelation: (s, by, t) => {
        const here = getInvestigator(s, by).location
        if (!here) return [{ type: 'ShuffleTreacheryIntoDeck', investigator: by, treachery: t.id }]
        const connections = getLocation(s, here).connections
        const nearby = Object.values(s.enemies).filter(
          (e) => e.location === here || connections.includes(e.location),
        )
        const hunters = nearby.filter((e) => e.location !== here && enemyHasKeyword(s, e, 'hunter'))
        return [
          ...nearby.flatMap((e) => [
            { type: 'ReadyEnemy' as const, enemy: e.id },
            { type: 'CheckEngagement' as const, location: e.location },
          ]),
          ...hunters.map((e) => ({ type: 'MoveEnemy' as const, enemy: e.id, location: here })),
          continuation(code, by, 'finish', {
            treachery: t.id,
            enemies: JSON.stringify(Object.fromEntries(hunters.map((e) => [e.id, e.location]))),
          }),
        ]
      },
    })
    return
  }
  if (code === '04005') {
    registerInvestigator({
      code,
      skillModifier: (_s, i, test) =>
        ['willpower', 'intellect'].includes(test.skill) ? i.horror : i.damage,
      elderSign: (_s, i) => ({
        modifier: 0,
        immediate: ask(
          i.id,
          [
            ...(i.damage
              ? [
                  {
                    label: 'choice.calvinHealDamage',
                    then: [{ type: 'Heal' as const, investigator: i.id, damage: 1, horror: 0 }],
                  },
                ]
              : []),
            ...(i.horror
              ? [
                  {
                    label: 'choice.calvinHealHorror',
                    then: [{ type: 'Heal' as const, investigator: i.id, damage: 0, horror: 1 }],
                  },
                ]
              : []),
            {
              label: 'choice.calvinTakeDamage',
              then: [
                { type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0, direct: true },
              ],
            },
            {
              label: 'choice.calvinTakeHorror',
              then: [
                { type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1, direct: true },
              ],
            },
            { label: 'choice.skip', then: [] },
          ],
          true,
        ),
      }),
    })
    registerPlayerCard({ code })
    return
  }
  if (code === '04015') {
    registerPlayerCard({ code, soaksDirect: true, simultaneousAssignment: true })
    return
  }
  if (code === '04016') {
    registerPlayerCard({ code })
    registerTreachery({
      code,
      revelation: (_s, by) =>
        ask(
          by,
          [
            {
              label: 'choice.calvinPhysicalTrauma',
              then: [
                { type: 'SufferTrauma', investigator: by, physical: 1 },
                { type: 'TakeDamage', investigator: by, damage: 1, horror: 0, direct: true },
              ],
            },
            {
              label: 'choice.calvinMentalTrauma',
              then: [
                { type: 'SufferTrauma', investigator: by, mental: 1 },
                { type: 'TakeDamage', investigator: by, damage: 0, horror: 1, direct: true },
              ],
            },
          ],
          true,
        ),
    })
    return
  }
  throw new Error('Unreviewed Finn/Calvin card: ' + code)
}
