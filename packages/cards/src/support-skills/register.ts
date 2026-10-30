import {
  canPlayByEffect,
  getInvestigator,
  playerCardDef,
  registerPlayerCard,
  type GameState,
  type SkillTest,
  type SkillType,
} from '@lcg/engine'
import { ask, cardName } from '../dunwich-pilot/effects'
import { boost, fast } from '../asset-utilities/register'
import { fightOptions } from '../dunwich-pilot/effects'
const pairs: Record<string, SkillType[]> = {
  '03107': ['combat', 'agility'],
  '03109': ['intellect', 'combat'],
  '03111': ['willpower', 'agility'],
  '03113': [],
  '03115': ['willpower', 'intellect'],
  '08027': ['combat', 'agility'],
  '08040': ['intellect', 'combat'],
  '08056': ['willpower', 'agility'],
  '08069': [],
  '08081': ['willpower', 'intellect'],
}
const spell = (s: GameState, t: SkillTest) => {
  const code = t.effectSource ?? (t.source ? (s.assets[t.source]?.code ?? t.source) : undefined)
  return (!!code && !!playerCardDef(code)?.traits.includes('Spell')) || !!t.tags?.includes('spell')
}
const actualTurn = (s: GameState) =>
  s.immediateActions?.[0]
    ? s.immediateActions[0].endedTurn
      ? null
      : s.immediateActions[0].activeTurn
    : s.activeTurn
export function registerSupport(code: string): void {
  if (code === '02266') {
    registerPlayerCard({
      code,
      canPlay: (s, by) => actualTurn(s) === by,
      play: (_s, by) => [{ type: 'GainActions', investigator: by, amount: 3 }],
    })
    return
  }
  if (['03032', '52007'].includes(code)) {
    const cap = code === '03032' ? 3 : 4
    registerPlayerCard({
      code,
      abilities: (_s, a, by) =>
        a.exhausted || a.uses < 1
          ? []
          : [
              {
                key: a.id + ':alchemy',
                label: 'choice.gainResources',
                params: { n: cap },
                actions: 1,
                provokes: true,
                costs: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'SpendUses', asset: a.id, amount: 1 },
                ],
                then: [
                  {
                    type: 'BeginSkillTest',
                    investigator: by,
                    source: a.id,
                    skill: 'willpower',
                    difficulty: code === '03032' ? 1 : 0,
                    kind: {
                      type: 'effect',
                      source: cardName(code),
                      onSuccess: Array.from({ length: cap }, (_, n) => ({
                        type: 'IfTestResult',
                        atLeast: n + 1,
                        then: [{ type: 'GainResources', investigator: by, amount: 1 }],
                      })),
                      onFail: [],
                      onFailEach: [],
                    },
                  },
                ],
              },
            ],
      onTokenRevealed: (_s, t, a) =>
        typeof t === 'string' && t !== 'elderSign'
          ? [{ type: 'TakeDamage', investigator: a.owner, damage: 1, horror: 0 }]
          : [],
    })
    return
  }
  if (code in pairs) {
    const skills = pairs[code]!,
      up = code.startsWith('08')
    registerPlayerCard({
      code,
      limitTrait: 'Composure',
      canPlay: (s, by) =>
        !Object.values(s.assets).some(
          (a) => a.owner === by && playerCardDef(a.code)?.traits.includes('Composure'),
        ),
      beforeOwnerAssignment: up ? ['damage', 'horror'] : ['horror'],
      skillModifier: (s, _a, t) =>
        up && (skills.length ? skills.includes(t.skill) : spell(s, t)) ? 1 : 0,
      testOptions: (s, t, a) =>
        t.investigator === a.owner &&
        getInvestigator(s, a.owner).resources > 0 &&
        (skills.length ? skills.includes(t.skill) : spell(s, t))
          ? [
              boost(
                a,
                'composure',
                'ability.spendForSkill',
                { skill: t.skill, n: 1 },
                [{ type: 'SpendResources', investigator: a.owner, amount: 1 }],
                1,
              ),
            ]
          : [],
    })
    return
  }
  if (['01063', '03271'].includes(code)) {
    registerPlayerCard({
      code,
      forced: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? code === '01063'
            ? [{ type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 }]
            : ask(
                a.owner,
                [
                  {
                    label: 'ability.supportDoom',
                    then: [{ type: 'PlaceDoomOnAsset', asset: a.id, amount: 1 }],
                  },
                  {
                    label: 'choice.assignToAsset',
                    params: { card: cardName(code) },
                    then: [{ type: 'DamageAsset', asset: a.id, damage: 0, horror: 2 }],
                  },
                ],
                true,
              )
          : [],
      abilities: (_s, a, by) =>
        a.exhausted
          ? []
          : [
              fast(
                a,
                'search',
                'ability.searchDeck',
                {},
                [{ type: 'ExhaustAsset', asset: a.id }],
                [
                  {
                    type: 'SearchDeck',
                    investigator: by,
                    top: 3,
                    traits: ['Spell'],
                    anyType: true,
                    to: 'hand',
                    drawFound: true,
                    optional: true,
                  },
                ],
              ),
            ],
    })
    return
  }
  if (code === '02272') {
    registerPlayerCard({
      code,
      forced: (s, t, a) =>
        t.type === 'afterSkillTestInitiated' &&
        t.investigator === a.owner &&
        s.skillTest?.tags?.includes('parley')
          ? [{ type: 'ReduceSkillTestDifficulty', amount: 2 }]
          : [],
    })
    return
  }
  if (code === '01058') {
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      abilities: (_s, a, by) =>
        a.exhausted || a.uses < 1
          ? []
          : [
              fast(
                a,
                'knowledge',
                'choice.gainResources',
                { n: 1 },
                [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'TakeDamage', investigator: by, damage: 0, horror: 1 },
                ],
                [{ type: 'MoveUsesToResources', asset: a.id, investigator: by, amount: 1 }],
              ),
            ],
    })
    return
  }
  if (code === '03035') {
    registerPlayerCard({
      code,
      testOptions: (s, t, a) =>
        t.investigator === a.owner && !a.exhausted && spell(s, t)
          ? [
              boost(
                a,
                'athame',
                'ability.exhaustForBonus',
                {},
                [{ type: 'ExhaustAsset', asset: a.id }],
                2,
              ),
            ]
          : [],
      abilities: (s, a, by) =>
        a.exhausted
          ? []
          : fightOptions(s, a, by, 2).map((o) => ({
              ...o,
              costs: [{ type: 'ExhaustAsset' as const, asset: a.id }],
            })),
    })
    return
  }
  if (code === '02265')
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        getInvestigator(s, by).resources < 1
          ? []
          : [...new Set(getInvestigator(s, by).hand)]
              .filter(
                (c) =>
                  playerCardDef(c)?.type === 'asset' &&
                  playerCardDef(c)?.traits.includes('Item') &&
                  canPlayByEffect(
                    {
                      ...s,
                      investigators: s.investigators.map((i) =>
                        i.id === by ? { ...i, resources: i.resources - 1 } : i,
                      ),
                    },
                    by,
                    c,
                    'hand',
                  ),
              )
              .map((c) =>
                fast(
                  a,
                  c,
                  'ability.playCard',
                  { card: cardName(c) },
                  [{ type: 'SpendResources', investigator: by, amount: 1 }],
                  [{ type: 'PlayCard', investigator: by, code: c, byEffect: true }],
                ),
              ),
    })
}
