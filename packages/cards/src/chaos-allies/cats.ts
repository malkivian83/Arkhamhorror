// RR: Bonded, Set Aside, Automatic Success, Base Skill Value, Costs, Then.
import {
  attackBlocked,
  engagedEnemies,
  fightEnemies,
  immuneToPlayerCards,
  enemyHasKeyword,
  investigationBlocked,
  getInvestigator,
  getLocation,
  setAsideCards,
  shroudOf,
  type SkillTestKind,
} from '@lcg/engine'
import { ask, cardName, continuation, here, registerPlayerCard, take } from './common'

const CATS = ['06031', '06032', '06033']
export function registerCats(code: string): boolean {
  if (code === '06030') {
    registerPlayerCard({
      code,
      setsAsideBondedOnLeave: true,
      forced: (s, t, a) => {
        if (t.type !== 'afterAssetEntersPlay' || t.asset !== a.id) return []
        const cats = CATS.filter((c) => setAsideCards(s, a.owner, c, true).length)
        return cats.length
          ? [
              {
                type: 'RandomChoice',
                choices: cats.map((chosen) => [
                  take(a.owner, chosen, 'play'),
                  ...cats.filter((c) => c !== chosen).map((c) => take(a.owner, c, 'deck')),
                ]),
              },
            ]
          : []
      },
    })
    return true
  }
  if (!CATS.includes(code)) return false
  const skill = code === '06031' ? 'agility' : code === '06032' ? 'combat' : 'intellect'
  registerPlayerCard({
    code,
    forced: (s, t, a) =>
      t.type === 'afterAssetEntersPlay' && t.asset === a.id
        ? Object.values(s.assets)
            .filter((x) => x.owner === a.owner && CATS.includes(x.code) && x.id !== a.id)
            .map((x) => ({ type: 'DiscardAsset', asset: x.id }))
        : [],
    abilities: (s, a) => {
      if (a.exhausted || !here(s, a.owner)) return []
      const targets =
        code === '06031'
          ? engagedEnemies(s, a.owner).filter(
              (e) => !e.cannotBeEvaded && !e.hasNoStats && !immuneToPlayerCards(e),
            )
          : code === '06032'
            ? fightEnemies(s, a.owner).filter(
                (e) =>
                  !attackBlocked(s, a.owner, e, code) &&
                  (e.engagedWith !== null || !enemyHasKeyword(s, e, 'aloof')),
              )
            : []
      const kinds: SkillTestKind[] =
        code === '06033' && !investigationBlocked(s, here(s, a.owner)!)
          ? [{ type: 'investigate', location: here(s, a.owner)! }]
          : targets.map((e) => ({ type: code === '06031' ? 'evade' : 'fight', enemy: e.id }))
      return kinds.flatMap((kind) =>
        [false, true].map((discard) => ({
          key:
            a.id +
            ':' +
            (kind.type === 'investigate'
              ? kind.location
              : kind.type === 'fight' || kind.type === 'evade'
                ? kind.enemy
                : '') +
            ':' +
            discard,
          label: discard ? 'choice.chaosCatsDiscard' : 'choice.chaosCatsExhaust',
          params: {
            card: cardName(code),
            target:
              kind.type === 'investigate'
                ? getLocation(s, kind.location).name
                : kind.type === 'fight' || kind.type === 'evade'
                  ? targets.find((e) => e.id === kind.enemy)!.name
                  : '',
          },
          target:
            kind.type === 'fight' || kind.type === 'evade'
              ? { type: 'enemy' as const, id: kind.enemy }
              : { type: 'location' as const, id: here(s, a.owner)! },
          actions: 1,
          actionKind:
            kind.type === 'investigate'
              ? ('investigate' as const)
              : code === '06031'
                ? ('evade' as const)
                : ('fight' as const),
          provokes: kind.type === 'investigate',
          costs: [
            { type: discard ? ('DiscardAsset' as const) : ('ExhaustAsset' as const), asset: a.id },
          ],
          then: [
            {
              type: 'BeginSkillTest' as const,
              investigator: a.owner,
              source: a.id,
              sourceSnapshot: a,
              skill,
              baseSkill: 5,
              kind,
              difficulty:
                kind.type === 'investigate'
                  ? shroudOf(s, kind.location)
                  : kind.type === 'evade'
                    ? targets.find((e) => e.id === kind.enemy)!.evade
                    : kind.type === 'fight'
                      ? targets.find((e) => e.id === kind.enemy)!.fight
                      : 0,
              ...(discard
                ? { autoSuccess: true, afterEnd: [continuation(code, a.owner, 'swap')] }
                : {}),
            },
          ],
        })),
      )
    },
    effect: (s, by) => {
      if (!getInvestigator(s, by).discard.includes(code)) return []
      const other = CATS.filter((c) => c !== code && getInvestigator(s, by).discard.includes(c))
      return ask(
        by,
        other.map((c) => ({
          label: 'choice.chaosCatsSwap',
          params: { card: cardName(c) },
          then: [{ type: 'CycleBondedCat', investigator: by, shuffled: code, played: c }],
        })),
        true,
      )
    },
  })
  return true
}
