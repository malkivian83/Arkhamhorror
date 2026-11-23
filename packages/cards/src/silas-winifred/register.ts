// RR: Skill Tests ST.2/ST.3/ST.7/ST.8, Committing Cards, Costs, Cannot, Then.
import {
  actualDiscard,
  canCommitFrom,
  engagedEnemies,
  immuneToPlayerCards,
  playerCardDef,
  registerInvestigator,
  registerTreachery,
  type GameState,
  type Investigator,
  type SkillTest,
  type Message,
} from '@lcg/engine'
import {
  ask,
  cardName,
  continuation,
  mayParticipate,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
import { fightOptions } from '../dunwich-pilot/effects'

const activeCopies = (t: SkillTest) => t.committed.filter((c) => !c.returnToHand && !c.putIntoPlay)
const ownSkills = (t: SkillTest, by: string) =>
  activeCopies(t).filter((c) => c.by === by && playerCardDef(c.code)?.type === 'skill')
const winiOptions = (s: GameState, i: Investigator) => {
  const t = s.skillTest
  return t?.commitWindowClosed &&
    !t.usedAbilities?.includes('wini:draw') &&
    mayParticipate(s, i.id) &&
    new Set(
      activeCopies(t)
        .filter((c) => c.by === i.id && !playerCardDef(c.code)?.weakness)
        .map((c) => cardName(c.code)),
    ).size >= 2
    ? [
        {
          key: '60301:draw',
          investigator: i.id,
          label: 'ability.winifredDraw',
          then: [
            { type: 'MarkTestAbility' as const, key: 'wini:draw' },
            { type: 'DrawCards' as const, investigator: i.id, amount: 1 },
          ],
        },
      ]
    : []
}
const hadSkill = (t: SkillTest, by: string) =>
  t.usedAbilities?.includes('silas:skill:' + by) ||
  t.committed.some((c) => c.by === by && playerCardDef(c.code)?.type === 'skill')
function retrieve(s: GameState, by: string, code: string, remaining: number): Message[] {
  const copies = s.skillTest
    ? activeCopies(s.skillTest).filter(
        (c) => c.by === by && !c.returnAfterTest && c.id !== undefined,
      )
    : []
  return remaining > 0
    ? ask(
        by,
        copies.map((c) => ({
          label: 'choice.winifredReturn',
          params: { card: cardName(c.code) },
          then: [
            { type: 'ReturnCommittedAfterTest' as const, commitId: c.id! },
            continuation(code, by, 'return', { remaining: remaining - 1 }),
          ],
        })),
        true,
      )
    : []
}
export function registerSilasWinifredCard(code: string): void {
  if (code === '07005') {
    registerInvestigator({
      code,
      observesCommitCopies: true,
      reactions: (s, t, i) =>
        t.type === 'afterRevealChaosToken' &&
        t.investigator === i.id &&
        s.skillTest &&
        mayParticipate(s, i.id)
          ? ownSkills(s.skillTest, i.id).map((c) => ({
              key: code + ':return',
              investigator: i.id,
              label: 'ability.silasReturn',
              params: { card: cardName(c.code) },
              limit: { per: 'round' as const },
              then: [
                { type: 'ReturnCommittedCard' as const, index: s.skillTest!.committed.indexOf(c) },
              ],
            }))
          : [],
      elderSign: (s, i) => ({
        modifier: 0,
        immediate: ask(
          i.id,
          [
            ...[...new Set(actualDiscard(s, i.id))]
              .filter(
                (c) =>
                  playerCardDef(c)?.type === 'skill' && canCommitFrom(s, i.id, c, 'discard', true),
              )
              .map((c) => ({
                label: 'choice.silasCommit',
                params: { card: cardName(c) },
                then: [
                  {
                    type: 'CommitCard' as const,
                    investigator: i.id,
                    code: c,
                    from: 'discard' as const,
                    byEffect: true,
                    returnAfterTest: true,
                  },
                ],
              })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        ),
      }),
    })
    return
  }
  if (code === '07014' || code === '07015') {
    registerPlayerCard({
      code,
      forced: (s, t, a) =>
        t.type === 'afterCommit' &&
        s.skillTest?.source === a.id &&
        t.by === s.skillTest.investigator &&
        s.skillTest.committed.some(
          (c) => c.id === t.commitId && playerCardDef(c.code)?.type === 'skill',
        )
          ? [{ type: 'MarkTestAbility', key: 'silas:skill:' + t.by }]
          : [],
      abilities: (s, a, by) =>
        code === '07014'
          ? fightOptions(s, a, by, 1)
          : engagedEnemies(s, by).map((e) => ({
              key: a.id + ':evade',
              label: 'ability.evadeWith',
              params: { card: cardName(code), enemy: e.name, skill: 'agility' },
              target: { type: 'enemy' as const, id: e.id },
              actions: 1,
              provokes: false,
              then: [
                {
                  type: 'BeginSkillTest' as const,
                  investigator: by,
                  source: a.id,
                  skill: 'agility' as const,
                  difficulty: e.evade ?? 0,
                  modifier: 1,
                  kind: { type: 'evade' as const, enemy: e.id },
                },
              ],
            })),
      beforeResults: (s, t, a) =>
        !hadSkill(t, t.investigator)
          ? []
          : code === '07014'
            ? [{ type: 'AdjustAttackDamage', amount: 1 }]
            : t.succeeded && t.kind.type === 'evade'
              ? ask(
                  t.investigator,
                  [
                    ...engagedEnemies(s, t.investigator)
                      .filter(
                        (e) =>
                          t.kind.type === 'evade' &&
                          e.id !== t.kind.enemy &&
                          !immuneToPlayerCards(e),
                      )
                      .map((e) => ({
                        label: 'choice.silasEvade',
                        params: { enemy: e.name },
                        then: [{ type: 'EvadeEnemy' as const, enemy: e.id, by: a.owner }],
                      })),
                    { label: 'choice.skip', then: [] },
                  ],
                  true,
                )
              : [],
      beforeTestEnds: (s, t, a) =>
        ownSkills(t, a.owner).length
          ? ask(
              a.owner,
              [
                {
                  label: 'choice.silasRetrieve',
                  params: { card: cardName(code) },
                  then: [
                    {
                      type: 'ReturnAssetToHand',
                      asset: a.id,
                      onReturn: [continuation(code, a.owner, 'returnSkills')],
                    },
                  ],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
      effect: (s, by, step) =>
        step === 'returnSkills' && s.skillTest
          ? ownSkills(s.skillTest, by).map((c) => ({
              type: 'ReturnCommittedAfterTest',
              commitId: c.id!,
            }))
          : [],
      observesCommitCopies: true,
    })
    return
  }
  if (code === '07016') {
    registerPlayerCard({ code })
    registerTreachery({
      code,
      commitCostPerIcon: 1,
      revelation: (_s, by, t) => [
        {
          type: 'PlaceTreachery',
          treachery: t.id,
          placement: { type: 'threatArea', investigator: by },
        },
      ],
      abilities: (_s, a) => [
        {
          key: a.id + ':discard',
          label: 'ability.silasDiscardCall',
          actions: 2,
          provokes: true,
          then: [{ type: 'DiscardTreachery', treachery: a.id }],
        },
      ],
    })
    return
  }
  if (code === '60301') {
    registerInvestigator({
      code,
      observesCommitCopies: true,
      afterCommitOptions: winiOptions,
      fastOptions: winiOptions,
      elderSign: () => ({
        modifier: 1,
        immediate: [{ type: 'MarkTestAbility', key: 'wini:elder' }],
      }),
      beforeTestEnds: (s, t, i) =>
        t.succeeded
          ? retrieve(
              s,
              i.id,
              code,
              Math.floor(Math.max(0, (t.modifiedSkill ?? 0) - t.difficulty) / 2) *
                (t.usedAbilities?.filter((k) => k === 'wini:elder').length ?? 0),
            )
          : [],
    })
    registerPlayerCard({
      code,
      effect: (s, by, step, d) =>
        step === 'return' ? retrieve(s, by, code, Number(d.remaining)) : [],
    })
    return
  }
  if (code === '60302') {
    registerPlayerCard({ code, canCommit: (_s, t, by) => t.investigator === by })
    return
  }
  if (code === '60303') {
    registerPlayerCard({
      code,
      mandatoryCommit: true,
      subtractsIcons: true,
      afterCommittedTest: (_s, _t, succeeded, _by, copy) =>
        succeeded && copy?.id !== undefined
          ? [{ type: 'ReturnCommittedAfterTest', commitId: copy.id }]
          : [],
    })
    return
  }
  if (code === '60304') {
    registerPlayerCard({
      code,
      exclusiveCommit: true,
      commitWithoutIcons: true,
      observesCommitCopies: true,
      canCommit: (_s, t, by) => t.investigator === by,
      afterCommittedTest: (_s, _t, succeeded, _by, copy) =>
        !succeeded && copy?.id !== undefined
          ? [{ type: 'ReturnCommittedAfterTest', commitId: copy.id }]
          : [],
      handForced: (_s, t, by) =>
        t.type === 'turnEnds' && t.investigator === by
          ? [
              { type: 'Log', key: 'log.recklessRevealed' },
              { type: 'LoseResources', investigator: by, amount: 2 },
            ]
          : [],
    })
    return
  }
  throw Error('Unreviewed Silas/Winifred card ' + code)
}
