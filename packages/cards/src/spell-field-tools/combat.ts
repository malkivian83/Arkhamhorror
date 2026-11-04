// RR: Fight, Evade, Uses, Additional Costs, Researched, Reaction Opportunities.
import {
  distancesFrom,
  getInvestigator,
  playerCardBehavior,
  registerPlayerCard,
  skillValueFor,
  canEnter,
  canAffordEntry,
  moveBlocked,
  leavingBlocked,
} from '@lcg/engine'
import { registerBasicAsset, type BasicAbility } from '../basic-abilities/register'
import { ask, continuation, exhaust, hurt, react, cardName } from './common'
export function registerFieldCombat(code: string): boolean {
  if (code === '60580') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          skills: ['agility'],
          modifier: 2,
          extraDamage: 2,
          cost: ['use'],
          ignoreAloof: true,
        },
      ],
      () => ({}),
      (_c, { self }) =>
        self.uses >= 1
          ? []
          : [
              {
                key: self.id + ':reload',
                label: 'ability.combatReload',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                then: [{ type: 'AddUses', asset: self.id, amount: 1 - self.uses }],
              },
            ],
    )
    return true
  }
  if (['60280', '60281'].includes(code)) {
    const fight = code === '60280'
    registerBasicAsset(
      code,
      [1, 2].map(
        (n) =>
          ({
            action: fight ? 'fight' : 'investigate',
            skills: ['intellect'],
            modifier: 3,
            ...(fight ? { extraDamage: n } : { extraClues: n }),
            key: ':' + n,
            label: 'choice.fieldSecrets',
            params: { n },
            available: ({ self }) => self.uses >= n,
            extraCosts: ({ self, investigator }) => [
              { type: 'SpendUses', asset: self.id, amount: n },
              hurt(investigator, 0, 1),
            ],
          }) as BasicAbility,
      ),
      () => ({ requiredResearch: 'you have unearthed the secrets of the Pharaohs' }),
    )
    return true
  }
  if (code === '60474') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          skills: ['willpower'],
          modifier: 2,
          extraDamage: 1,
          extraCosts: ({ self }) => [{ type: 'PlaceDoomOnAsset', asset: self.id, amount: 1 }],
        },
      ],
      () => ({
        onTokenRevealed: (_s, t, a) =>
          ['skull', 'elderThing'].includes(String(t))
            ? [{ type: 'RemoveDoom', target: { type: 'asset', id: a.id }, amount: a.doom ?? 0 }]
            : [],
      }),
    )
    const b = playerCardBehavior(code)!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) =>
        b.abilities!(s, a, by).map((o) => ({
          ...o,
          then: o.then.map((m) =>
            m.type === 'BeginSkillTest' && m.kind.type === 'fight'
              ? {
                  ...m,
                  kind: {
                    ...m.kind,
                    onSuccess: [],
                    onDefeat: [
                      { type: 'RemoveDoom', target: { type: 'asset', id: a.id }, amount: 1 },
                    ],
                  },
                }
              : m,
          ),
        })),
    })
    return true
  }
  if (code === '60475') {
    registerBasicAsset(
      code,
      [
        {
          action: 'fight',
          skills: ['combat'],
          modifier: ({ state, investigator }, e) =>
            skillValueFor(state, investigator, 'willpower', { type: 'fight', enemy: e!.id }),
        },
      ],
      () => ({
        observesEventPlay: true,
        reactions: (s, t, a) =>
          t.type === 'afterEventPlayed' &&
          t.investigator === a.owner &&
          !a.exhausted &&
          getInvestigator(s, a.owner).discard.includes(t.code) &&
          playerCardBehavior(t.code) !== undefined &&
          ['Spell'].some((trait) => importedTraits(t.code).includes(trait))
            ? [
                react(a, [
                  hurt(a.owner, 1),
                  exhaust(a),
                  {
                    type: 'ShufflePlayedEvent',
                    investigator: a.owner,
                    code: t.code,
                    fromBottom: false,
                  },
                ]),
              ]
            : [],
      }),
    )
    return true
  }
  if (['60461', '60482'].includes(code)) {
    registerBasicAsset(
      code,
      [
        {
          action: 'evade',
          skills: ['willpower'],
          modifier: code === '60482' ? 2 : 0,
          onSuccess: ({ self, investigator }) => [
            continuation(code, investigator, 'move', { asset: self.id }),
          ],
        },
      ],
      () => ({
        onTokenRevealed: (_s, t, a) =>
          t !== 'tablet'
            ? []
            : a.uses > 0
              ? [{ type: 'SpendUses', asset: a.id, amount: 1 }]
              : [
                  { type: 'LoseActions', investigator: a.owner, amount: 1 },
                  { type: 'DiscardAsset', asset: a.id },
                ],
        effect: (s, by, _step, data) => {
          const a = s.assets[String(data.asset)],
            here = getInvestigator(s, by).location
          if (!a || a.uses < 1 || here === null || moveBlocked(s, by) || leavingBlocked(s, here))
            return []
          const dist = distancesFrom(s, here),
            range = code === '60482' ? 2 : 1
          return ask(
            by,
            [
              { label: 'choice.skip', then: [] },
              ...Object.values(s.locations)
                .filter(
                  (l) =>
                    l.id !== here &&
                    (dist.get(l.id) ?? 99) <= range &&
                    canEnter(s, by, l.id) &&
                    canAffordEntry(s, l.id),
                )
                .map((l) => ({
                  label: 'choice.pilotMove',
                  params: { name: getInvestigator(s, by).name, location: l.name },
                  target: { type: 'location' as const, id: l.id },
                  then: [
                    { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                    { type: 'MoveTo' as const, investigator: by, location: l.id },
                  ],
                })),
            ],
            true,
          )
        },
      }),
    )
    return true
  }
  return false
}
import { playerCardDef } from '@lcg/engine'
const importedTraits = (code: string) => playerCardDef(code)?.traits ?? []
