// RR: Deckbuilding Restrictions, Fast Abilities, Costs, Movement, Damage Assignment.
import {
  enemiesAt,
  getInvestigator,
  registerPlayerCard,
  playerCardDef,
  type Message,
} from '@lcg/engine'
import { ask, continuation, exhaust, react, heal, draw, gain, destinations } from './common'
const traits: Record<string, string[]> = {
  '11102': ['Drifter', 'Hunter', 'Wayfarer'],
  '11104': ['Civic', 'Silver Twilight', 'Socialite'],
  '11106': ['Blessed', 'Chosen', 'Drifter'],
  '11110': ['Detective', 'Hunter', 'Wayfarer'],
  '11112': ['Assistant', 'Medic', 'Warden'],
  '11113': ['Agency', 'Police', 'Veteran'],
}
export function registerTraitTool(code: string): boolean {
  const requiredInvestigatorTraits = traits[code]
  if (!requiredInvestigatorTraits) return false
  const base = { code, requiredInvestigatorTraits }
  if (code === '11102')
    registerPlayerCard({
      ...base,
      limitTitle: true,
      fastOptions: (s, a) =>
        s.activeTurn !== a.owner || a.exhausted
          ? []
          : getInvestigator(s, a.owner)
              .hand.filter((c) => !playerCardDef(c)?.weakness)
              .flatMap((card, index, all) =>
                all.indexOf(card) !== index
                  ? []
                  : destinations(s, a.owner).map((location) => ({
                      ...react(a, [
                        { type: 'DiscardFromHand', investigator: a.owner, card },
                        exhaust(a),
                        { type: 'MoveTo', investigator: a.owner, location },
                      ]),
                      key: a.id + ':' + card + ':' + location,
                      label: 'choice.fieldDiscardMove',
                      params: {
                        card: playerCardDef(card)?.name ?? card,
                        location: s.locations[location]!.name,
                      },
                      target: { type: 'location' as const, id: location },
                    })),
              ),
    })
  if (code === '11104')
    registerPlayerCard({
      ...base,
      skillModifier: (_s, _a, t) => (t.tags?.includes('parley') ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'afterSkillTest' &&
        t.investigator === a.owner &&
        t.succeeded &&
        s.skillTest?.tags?.includes('parley') &&
        !a.exhausted
          ? [react(a, [exhaust(a), gain(a.owner)])]
          : [],
    })
  if (code === '11106')
    registerPlayerCard({
      ...base,
      play: (_s, by) => [continuation(code, by, 'choose', { mask: 0 })],
      effect: (s, by, _step, data) => {
        const mask = Number(data.mask ?? 0),
          i = getInvestigator(s, by)
        const options: [string, Message[], boolean][] = [
          ['draw', [draw(by, 2)], true],
          [
            'clue',
            [{ type: 'DiscoverClues', investigator: by, amount: 1 }],
            i.location !== null && s.locations[i.location]!.clues > 0,
          ],
          ['damage', [heal(by, 1)], i.damage > 0],
          ['horror', [heal(by, 0, 1)], i.horror > 0],
        ]
        return ask(
          by,
          options.flatMap(([label, then, legal], n) =>
            !legal || mask & (1 << n)
              ? []
              : [
                  {
                    label: 'choice.field' + label,
                    then: [
                      ...then,
                      ...(mask === 0 ? [continuation(code, by, 'choose', { mask: 1 << n })] : []),
                    ],
                  },
                ],
          ),
          true,
        )
      },
    })
  if (code === '11110')
    registerPlayerCard({
      ...base,
      skillModifier: (s, a, t) =>
        ['willpower', 'combat'].includes(t.skill) &&
        enemiesAt(s, getInvestigator(s, a.owner).location ?? '').some((e) =>
          e.traits?.some((t) => ['Creature', 'Monster'].includes(t)),
        )
          ? 1
          : 0,
      fastOptions: (s, a) =>
        a.exhausted
          ? []
          : Object.values(s.enemies)
              .filter((e) => {
                const here = getInvestigator(s, a.owner).location
                return (
                  here !== null &&
                  ((e.location === here && e.engagedWith !== a.owner) ||
                    destinations(s, a.owner).includes(e.location ?? ''))
                )
              })
              .map((e) => ({
                ...react(a, [
                  exhaust(a),
                  { type: 'MoveTo', investigator: a.owner, location: e.location! },
                  { type: 'EngageEnemy', investigator: a.owner, enemy: e.id },
                ]),
                key: a.id + ':' + e.id,
                label: 'choice.enemy',
                params: { enemy: e.name },
                target: { type: 'enemy' as const, id: e.id },
              })),
    })
  if (code === '11112')
    registerPlayerCard({
      ...base,
      limitTitle: true,
      soaksAtLocation: true,
      reactions: (_s, t, a) =>
        t.type === 'turnBegins' && t.investigator === a.owner && (a.damage > 0 || a.horror > 0)
          ? [
              react(
                a,
                ask(a.owner, [
                  ...(a.damage > 0
                    ? [
                        {
                          label: 'choice.fielddamage',
                          then: [{ type: 'HealAsset' as const, asset: a.id, damage: 1, horror: 0 }],
                        },
                      ]
                    : []),
                  ...(a.horror > 0
                    ? [
                        {
                          label: 'choice.fieldhorror',
                          then: [{ type: 'HealAsset' as const, asset: a.id, damage: 0, horror: 1 }],
                        },
                      ]
                    : []),
                ]),
              ),
            ]
          : [],
    })
  if (code === '11113')
    registerPlayerCard({
      ...base,
      forced: (s, t, a) =>
        t.type === 'whenEnemyAttacks' &&
        t.investigator === a.owner &&
        t.opportunity &&
        s.enemyAttacks?.filter(
          (attack) =>
            attack.investigator === a.owner && attack.round === s.round && attack.opportunity,
        ).length === 1
          ? [{ type: 'CancelEnemyAttack', enemy: t.enemy }]
          : [],
    })
  return true
}
