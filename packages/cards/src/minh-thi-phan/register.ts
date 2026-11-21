// RR: Committing Cards, Skill Test Timing ST.2/ST.6/ST.8, Limits, Cannot, Slots.
import { commitIcons, getInvestigator, playerCardDef, registerInvestigator } from '@lcg/engine'
import {
  ask,
  cardName,
  mayParticipate,
  option,
  registerAdvancedCard as registerPlayerCard,
} from '../advanced-tests/common'
export function registerMinhCard(code: string): void {
  if (code === '03002') {
    registerInvestigator({
      code,
      observesCommitCopies: true,
      reactions: (s, t, i) => {
        if (
          t.type !== 'afterCommit' ||
          t.commitId === undefined ||
          !mayParticipate(s, i.id) ||
          !i.location ||
          getInvestigator(s, t.by).location !== i.location
        )
          return []
        const copy = s.skillTest?.committed.find((c) => c.id === t.commitId)
        return copy
          ? [
              {
                key: code + ':icon:' + t.by,
                investigator: i.id,
                label: 'ability.minhIcon',
                params: { card: cardName(copy.code) },
                limit: { per: 'round' },
                then: [{ type: 'AddCommittedIcon', commitId: t.commitId, icon: 'wild' }],
              },
            ]
          : []
      },
      elderSign: (s, i) => ({
        modifier: 1,
        immediate: ask(
          i.id,
          [
            ...(s.skillTest?.committed ?? [])
              .filter(
                (c) =>
                  c.id !== undefined &&
                  !c.returnToHand &&
                  !c.putIntoPlay &&
                  playerCardDef(c.code)?.type === 'skill',
              )
              .map((c) => ({
                label: 'choice.minhReturn',
                params: { card: cardName(c.code) },
                then: [{ type: 'ReturnCommittedAfterTest' as const, commitId: c.id! }],
              })),
            { label: 'choice.skip', then: [] },
          ],
          true,
        ),
      }),
    })
    return
  }
  if (code === '03010') {
    registerPlayerCard({
      code,
      remoteCommit: true,
      reactions: (s, t, a) =>
        t.type === 'afterCommit' &&
        t.by === a.owner &&
        !a.exhausted &&
        (t.groupSize ?? 1) === 1 &&
        s.skillTest?.committed.filter((c) => c.by === a.owner).length === 1 &&
        mayParticipate(s, a.owner)
          ? [
              option(a, [
                { type: 'ExhaustAsset', asset: a.id },
                { type: 'DrawCards', investigator: a.owner, amount: 1 },
              ]),
            ]
          : [],
    })
    return
  }
  if (code === '03011') {
    registerPlayerCard({
      code,
      minimumCommittedCards: 3,
      cannotLeavePlay: () => true,
      revelation: (_s, by) => [{ type: 'PutAssetIntoPlay', investigator: by, code }],
      reactions: (s, t, a) => {
        const test = s.skillTest
        if (t.type !== 'afterSkillTest' || !t.succeeded || !test) return []
        const icons = test.committed
          .filter((c) => c.by === a.owner && !c.returnToHand && !c.putIntoPlay)
          .reduce(
            (n, c) => n + commitIcons(s, test, c.code, c.by, 'committed', c.iconBonus, c.wildIcons),
            0,
          )
        return icons >= 6
          ? [option(a, [{ type: 'DiscardAsset', asset: a.id, byOwnAbility: true }])]
          : []
      },
    })
    return
  }
  throw Error('Unreviewed Minh card ' + code)
}
