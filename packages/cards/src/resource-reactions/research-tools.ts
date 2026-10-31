// RR: Investigate, Research, Skill Test Results, Printed Cost, Heal, Cancel.
import {
  getInvestigator,
  getLocation,
  playerCardDef,
  playerCardBehavior,
  registerPlayerCard,
  uniqueAssetInPlay,
  limitTitleReached,
  type GameState,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
import { boost } from '../asset-utilities/register'
const glyphs = ['03192', '03193', '52004']
const handAssets = (s: GameState, by: string, max: number) =>
  [...new Set(getInvestigator(s, by).hand)].filter((code) => {
    const d = playerCardDef(code),
      b = playerCardBehavior(code)
    return (
      d?.type === 'asset' &&
      (d.cost ?? 0) <= max &&
      !b?.permanent &&
      !uniqueAssetInPlay(s, code) &&
      !limitTitleReached(s, by, code) &&
      !(
        b?.limitTrait &&
        Object.values(s.assets).some(
          (a) => a.owner === by && playerCardDef(a.code)?.traits.includes(b.limitTrait!),
        )
      )
    )
  })
export function registerResearchTools(code: string): boolean {
  const compass = ['07121', '10122'].includes(code)
  if ([...glyphs, '04022', '07121', '10122'].includes(code)) {
    registerBasicAsset(
      code,
      [
        {
          action: 'investigate',
          ...(compass
            ? { cost: ['exhaust'] as const }
            : { ...(glyphs.includes(code) ? { cost: ['use'] as const } : {}) }),
          ...(code === '04022' ? { shroud: 3, extraClues: 1 } : {}),
          onSuccess: ({ self, investigator }) =>
            ['03193', '52004', '04022'].includes(code)
              ? [continuation(code, investigator, 'success', { asset: self.id })]
              : [],
          onFail: ({ self }) => (code === '10122' ? [{ type: 'ReadyAsset', asset: self.id }] : []),
        },
      ],
      () => ({
        ...(glyphs.includes(code) ? { requiredResearch: 'translatedGlyphs' } : {}),
        beforeResults: (s, t, a) =>
          t.succeeded && (code === '03192' || compass)
            ? [
                {
                  type: 'AddInvestigationResults',
                  extraClues:
                    code === '03192'
                      ? Math.floor(Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty) / 2)
                      : getInvestigator(s, a.owner).resources === 0
                        ? 1
                        : 0,
                },
              ]
            : [],
        testOptions: (s, t, a) =>
          compass &&
          t.investigator === a.owner &&
          t.source === a.id &&
          t.kind.type === 'investigate' &&
          getInvestigator(s, a.owner).resources > 0 &&
          (t.abilityCounts?.[a.id + ':compass'] ?? 0) < 3
            ? [
                boost(
                  a,
                  'pump',
                  'ability.pump',
                  { skill: 'intellect' },
                  [
                    { type: 'SpendResources', investigator: a.owner, amount: 1 },
                    { type: 'ModifySkillTest', use: a.id + ':compass' },
                  ],
                  1,
                ),
              ]
            : [],
        effect: (s, by, step, data) => {
          if (step !== 'success') return []
          const t = s.skillTest,
            a =
              s.assets[String(data.asset)] ??
              (t?.sourceSnapshot?.id === String(data.asset) ? t.sourceSnapshot : undefined)
          if (!a || !t) return []
          if (code === '04022')
            return [
              { type: 'DiscardAsset', asset: a.id },
              { type: 'RecordNote', note: 'identifiedStone', value: String(t.difficulty) },
            ]
          if (code === '03193')
            return ask(
              by,
              [
                ...Object.values(s.enemies)
                  .filter((e) => e.engagedWith === by && !e.cannotBeEvaded)
                  .map((e) => ({
                    label: 'choice.chargedEnemy',
                    params: { enemy: e.name },
                    target: { type: 'enemy' as const, id: e.id },
                    then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by }],
                  })),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          if (code === '52004')
            return ask(
              by,
              [
                ...handAssets(s, by, Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty)).map(
                  (c) => ({
                    label: 'choice.toolEntry',
                    params: { card: cardName(c) },
                    target: { type: 'hand' as const, code: c },
                    then: [
                      {
                        type: 'PutAssetIntoPlay' as const,
                        investigator: by,
                        code: c,
                        fromHand: true,
                      },
                    ],
                  }),
                ),
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          return []
        },
      }),
    )
    const b = playerCardBehavior(code)!,
      abilities = b.abilities!
    registerPlayerCard({
      ...b,
      abilities: (s, a, by) =>
        abilities(s, a, by).map((o) => ({
          ...o,
          provokes: code === '03193' ? false : o.provokes,
          actions:
            o.actions +
            (getInvestigator(s, by).location === null
              ? 0
              : (getLocation(s, getInvestigator(s, by).location!).investigateExtraActions ?? 0)),
        })),
    })
    return true
  }
  if (code === '08095') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (t.type !== 'whenTreacheryDrawn' || t.investigator !== a.owner) return []
        const card = s.treacheries[t.treachery]
        return card && !card.canceled && card.traits?.includes('Hazard')
          ? [
              {
                key: a.id + ':hazard',
                investigator: a.owner,
                label: 'choice.resourceReact',
                params: { card: cardName(code) },
                then: [
                  { type: 'DamageAsset', asset: a.id, damage: 1, horror: 1 },
                  { type: 'CancelRevelation', treachery: card.id },
                ],
              },
            ]
          : []
      },
    })
    return true
  }
  if (['08117', '08119'].includes(code)) {
    const high = code === '08119'
    registerPlayerCard({
      code,
      abilities: (_s, a, by) => [
        {
          key: a.id + ':serenity',
          label: 'choice.resourceReact',
          params: { card: cardName(code) },
          actions: 1,
          provokes: true,
          then: [
            {
              type: 'BeginSkillTest',
              investigator: by,
              source: a.id,
              skill: 'willpower',
              difficulty: high ? 0 : 1,
              kind: {
                type: 'effect',
                source: cardName(code),
                onSuccess: [continuation(code, by, 'healing', { asset: a.id })],
                onFail: [],
                onFailEach: [],
              },
            },
          ],
        },
      ],
      effect: (s, by, step, data) => {
        const a =
          s.assets[String(data.asset)] ??
          (s.skillTest?.sourceSnapshot?.id === String(data.asset)
            ? s.skillTest.sourceSnapshot
            : undefined)
        if (!a) return []
        if (step === 'healing') {
          const t = s.skillTest,
            margin = Math.max(0, (t?.modifiedSkill ?? 0) - (t?.difficulty ?? 0))
          return margin === 0
            ? [{ type: 'LoseResources', investigator: by, amount: high ? 2 : 1 }]
            : [continuation(code, by, 'heal', { asset: a.id, left: margin })]
        }
        if (step !== 'heal' || !s.assets[a.id] || a.uses < 1 || Number(data.left) < 1) return []
        return ask(
          by,
          [
            ...s.investigators
              .filter((i) => !i.eliminated && i.location === getInvestigator(s, by).location)
              .flatMap((i) =>
                (['damage', 'horror'] as const).flatMap((kind) =>
                  i[kind] > 0
                    ? [
                        {
                          label: 'choice.chargedHeal',
                          params: { n: 1, kind, name: i.name },
                          target: { type: 'investigator' as const, id: i.id },
                          then: [
                            { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                            {
                              type: 'Heal' as const,
                              investigator: i.id,
                              damage: kind === 'damage' ? 1 : 0,
                              horror: kind === 'horror' ? 1 : 0,
                            },
                            continuation(code, by, 'heal', {
                              asset: a.id,
                              left: Number(data.left) - 1,
                            }),
                          ],
                        },
                      ]
                    : [],
                ),
              ),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      },
    })
    return true
  }
  return false
}
