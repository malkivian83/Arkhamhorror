// RR: Skill Tests ST.2–ST.8, Costs, Ignore, Uses, Myriad, Lasting Effects.
import {
  registerPlayerCard,
  playerCardDef,
  playerCardBehavior,
  getInvestigator,
  eventsToDeckBottom,
  shroudOf,
  type GameState,
  type Message,
  type Choice,
  type ReactionOption,
  type SkillTest,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'
const symbols = ['skull', 'cultist', 'tablet', 'elderThing'] as const
const count = (cards: string[], code: string) => cards.filter((c) => c === code).length
const weapon = (s: GameState, t: SkillTest) =>
  t.kind.type === 'fight' &&
  !!playerCardDef(
    (t.source ? s.assets[t.source]?.code : undefined) ?? t.sourceSnapshot?.code ?? '',
  )?.traits.some((x) => x === 'Melee' || x === 'Ranged')
const option = (code: string, by: string, then: Message[]): ReactionOption => ({
  key: `${code}:${by}`,
  investigator: by,
  label: 'choice.tokenSkillUse',
  params: { card: cardName(code) },
  then,
})
const spentKey = (by: string, name: string) => `prescient:${by}:${name}`
export function registerTokenSkill(code: string): void {
  if (['02190', '04198'].includes(code)) {
    registerPlayerCard({
      code,
      onCommit: (_s, by) =>
        code === '04198'
          ? [{ type: 'IgnoreSkillTestTokens', tokens: [...symbols] }]
          : ask(
              by,
              symbols.map((token) => ({
                label: `chaosTokenName.${token}`,
                then: [{ type: 'IgnoreSkillTestTokens', tokens: [token] }],
              })),
              true,
            ),
    })
    return
  }
  if (code === '03235') {
    registerPlayerCard({
      code,
      observesCommitCopies: true,
      onCommit: (_s, by) => [continuation(code, by, 'begin')],
      effect: (s, by, step, data) => {
        const c = s.skillTest?.committed.findLast((c) => c.code === code && c.by === by)
        if (!c || c.id === undefined) return []
        const id = step === 'begin' ? c.id : Number(data.commitId),
          left = step === 'begin' ? 3 : Number(data.left)
        if (left <= 0) return []
        return ask(
          by,
          [
            ...Object.values(s.assets)
              .filter(
                (a) =>
                  a.owner === by &&
                  a.uses > 0 &&
                  ['charge', 'charges'].includes(playerCardDef(a.code)?.uses?.type ?? ''),
              )
              .map((a) => ({
                label: 'choice.tokenSkillCharge',
                params: { card: cardName(a.code) },
                target: { type: 'asset' as const, id: a.id },
                then: [
                  { type: 'SpendUses' as const, asset: a.id, amount: 1 },
                  { type: 'AddCommittedIcon' as const, commitId: id, icon: 'willpower' as const },
                  { type: 'AddCommittedIcon' as const, commitId: id, icon: 'wild' as const },
                  continuation(code, by, 'spend', { commitId: id, left: left - 1 }),
                ],
              })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === '60419') {
    registerPlayerCard({
      code,
      onCommit: (_s, by) =>
        ask(
          by,
          ['even', 'odd', 'symbol'].map((name) => ({
            label: `choice.tokenSkill${name[0]!.toUpperCase() + name.slice(1)}`,
            then: [{ type: 'ModifySkillTest', use: spentKey(by, name) }],
          })),
          true,
        ),
      afterCommittedTestEnds: (_s, t, _success, by) => {
        const hit = t.tokens.some((token) =>
          typeof token === 'number'
            ? !!t.abilityCounts?.[spentKey(by, Math.abs(token) % 2 === 0 ? 'even' : 'odd')]
            : !!t.abilityCounts?.[spentKey(by, 'symbol')],
        )
        return hit ? [continuation(code, by, 'recover')] : []
      },
      effect: (s, by, step) =>
        step === 'recover'
          ? ask(
              by,
              [...new Set(getInvestigator(s, by).discard)]
                .filter((c) => playerCardDef(c)?.traits.includes('Spell'))
                .map<Choice>((c) => ({
                  label: 'choice.tokenSkillRecover',
                  params: { card: cardName(c) },
                  then: [{ type: 'DiscardToHand', investigator: by, code: c }],
                }))
                .concat([{ label: 'choice.skip', then: [] }]),
              true,
            )
          : [],
    })
    return
  }
  if (['09049', '10031'].includes(code)) {
    registerPlayerCard({
      code,
      ...(code === '10031'
        ? { committedAttackDamage: (s: GameState, t: SkillTest) => (weapon(s, t) ? 1 : 0) }
        : {}),
      committedReactions: (s, t, by) => {
        if (t.type !== 'afterRevealingChaosToken' || !s.skillTest?.revealing) return []
        const i = getInvestigator(s, by)
        if (code === '09049' && (i.clues <= 0 || !i.location)) return []
        if (code === '10031' && !weapon(s, s.skillTest)) return []
        return [
          option(code, by, [
            code === '09049'
              ? {
                  type: 'MoveClues',
                  from: { type: 'investigator', id: by },
                  to: { type: 'location', id: i.location! },
                  amount: 1,
                }
              : { type: 'TakeDamage', investigator: by, damage: 1, horror: 0 },
            { type: 'CancelRevealedToken', redraw: true },
          ]),
        ]
      },
    })
    return
  }
  if (code === '11097') {
    registerPlayerCard({
      code,
      onCommit: () => [{ type: 'TrackSkillTestReveals' }],
      additionalIcons: (_s, t) => ({ wild: Math.min(3, Math.max(0, (t.revealCount ?? 0) - 1)) }),
    })
    return
  }
  if (code === '60471') {
    registerPlayerCard({
      code,
      afterCommittedTest: (_s, t, _success, by) =>
        t.tokens.some((x) => typeof x === 'string') ? [continuation(code, by, 'choose')] : [],
      effect: (s, by, step, data) => {
        const use = String(data.use ?? ''),
          left = step === 'choose' ? 2 : Number(data.left)
        if (left <= 0) return []
        return ask(
          by,
          [
            ...Object.values(s.assets)
              .filter((a) => {
                const kind = playerCardDef(a.code)?.uses?.type ?? ''
                return (
                  a.owner === by &&
                  ['charge', 'charges', 'secret', 'secrets'].includes(kind) &&
                  (!use || kind.replace(/s$/, '') === use) &&
                  a.uses < (playerCardBehavior(a.code)?.maxUses ?? Infinity)
                )
              })
              .map((a) => ({
                label: playerCardDef(a.code)!.uses!.type.startsWith('charge')
                  ? 'choice.tokenSkillAddCharge'
                  : 'choice.tokenSkillAddSecret',
                params: { card: cardName(a.code) },
                target: { type: 'asset' as const, id: a.id },
                then: [
                  { type: 'AddUses' as const, asset: a.id, amount: 1 },
                  continuation(code, by, 'add', {
                    left: left - 1,
                    use: playerCardDef(a.code)!.uses!.type.replace(/s$/, ''),
                  }),
                ],
              })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        )
      },
    })
    return
  }
  if (code === '11042') {
    registerPlayerCard({
      code,
      additionalIcons: (s, _t, by) => {
        const n = count(getInvestigator(s, by).discard, code)
        return { intellect: n, agility: n }
      },
      afterCommittedTestEnds: (s, _t, _success, by, copy) => {
        const ownDiscarded = !copy?.fromDiscard && !copy?.toDeckBottom && !copy?.returnToHand
        const n = Math.max(0, count(getInvestigator(s, by).discard, code) - (ownDiscarded ? 1 : 0))
        return n
          ? ask(
              by,
              [
                {
                  label: 'choice.tokenSkillShuffle',
                  params: { n, card: cardName(code) },
                  then: [
                    {
                      type: 'ShuffleCardsIntoDeck',
                      investigator: by,
                      cards: Array(n).fill(code),
                      fromDiscard: true,
                    },
                  ],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : []
      },
    })
    return
  }
  if (code === '06199') {
    registerPlayerCard({
      code,
      onCommit: (_s, by) => [continuation(code, by, 'aces')],
      effect: (s, by) => {
        const t = s.skillTest
        return t &&
          t.committed.filter((c) => c.code === code && c.by === by).length >= 3 &&
          !t.abilityCounts?.threeAces
          ? [
              { type: 'ModifySkillTest', use: 'threeAces' },
              { type: 'AutoSucceedSkillTest' },
              { type: 'DrawCards', investigator: by, amount: 3 },
              { type: 'GainResources', investigator: by, amount: 3 },
            ]
          : []
      },
    })
    return
  }
  if (code === '06245') {
    registerPlayerCard({
      code,
      onlyFromDiscard: true,
      playableFromDiscard: true,
      play: (s, by) => [
        ...Array(count(getInvestigator(s, by).discard, code))
          .fill(null)
          .map((): Message => ({ type: 'DiscardToHand', investigator: by, code })),
        ...(eventsToDeckBottom(s, by)
          ? [
              {
                type: 'TakeFromDeck' as const,
                investigator: by,
                code,
                to: 'hand' as const,
                fromBottom: true,
              },
            ]
          : []),
      ],
    })
    return
  }
  if (code === '06034') {
    registerPlayerCard({
      code,
      investigateAction: true,
      selfCostModifier: (s, by, from) =>
        Math.max(0, count(getInvestigator(s, by).discard, code) - (from === 'discard' ? 1 : 0)),
      canPlay: (s, by) => getInvestigator(s, by).location !== null,
      play: (s, by) => {
        const location = getInvestigator(s, by).location!,
          x = Math.max(
            0,
            count(getInvestigator(s, by).discard, code) - (eventsToDeckBottom(s, by) ? 0 : 1),
          )
        return [
          {
            type: 'BeginSkillTest',
            investigator: by,
            skill: 'intellect',
            modifier: x,
            difficulty: shroudOf(s, location),
            kind: { type: 'investigate', location, extraClues: x },
          },
        ]
      },
    })
    return
  }
  throw Error('Unreviewed token skill ' + code)
}
