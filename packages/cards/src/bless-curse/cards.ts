// RR: Chaos Bag (Bless/Curse tokens, token pool limit 10), Costs, Fast, Triggered Abilities,
// Skill Tests ST.2-ST.8, Cancel, Enemy Attacks, Uses, Healing.
import {
  enemyBehavior,
  getInvestigator,
  poolTokensAvailable,
  registerPlayerCard,
  skillTestValue,
  testMargin,
  type ChaosToken,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type SkillTest,
} from '@lcg/engine'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

type PoolToken = 'bless' | 'curse'
/** Bless/curse tokens are scenario-only: they come from the token pool. */
export const add = (token: PoolToken, n: number): Message[] =>
  n > 0 ? [{ type: 'AddChaosTokens', tokens: Array(n).fill(token), scenarioOnly: true }] : []
const remove = (token: PoolToken, n: number): Message[] =>
  n > 0 ? [{ type: 'RemoveChaosTokens', tokens: Array(n).fill(token) }] : []
export const inBag = (s: GameState, token: ChaosToken) =>
  s.chaosBag.filter((t) => t === token).length
const canAdd = (s: GameState, token: PoolToken, n: number) => poolTokensAvailable(s, token) >= n
const here = (s: GameState, by: InvestigatorId) => getInvestigator(s, by).location
const atLocation = (s: GameState, by: InvestigatorId) =>
  s.investigators.filter((i) => !i.eliminated && i.location !== null && i.location === here(s, by))
const revealed = (test: { tokens?: ChaosToken[] }, ...faces: ChaosToken[]) =>
  (test.tokens ?? []).filter((t) => faces.includes(t)).length
const SKILLS = ['willpower', 'intellect', 'combat', 'agility'] as const

/** "Investigators at your location draw/gain a combined total of N": one unit at a time. */
function distribute(code: string, kind: 'draw' | 'gain') {
  return (s: GameState, by: InvestigatorId, remaining: number): Message[] => {
    const targets = atLocation(s, by)
    if (remaining <= 0 || !targets.length) return []
    const give = (id: string): Message =>
      kind === 'draw'
        ? { type: 'DrawCards', investigator: id, amount: 1 }
        : { type: 'GainResources', investigator: id, amount: 1 }
    if (targets.length === 1)
      return kind === 'draw'
        ? [{ type: 'DrawCards', investigator: targets[0]!.id, amount: remaining }]
        : [{ type: 'GainResources', investigator: targets[0]!.id, amount: remaining }]
    return ask(
      by,
      targets.map((i): Choice => ({
        label: kind === 'draw' ? 'choice.blessCurseDraw' : 'choice.blessCurseGain',
        params: { name: i.name, n: remaining },
        target: { type: 'investigator', id: i.id },
        then: [give(i.id), continuation(code, by, kind, { remaining: remaining - 1 })],
      })),
      true,
    )
  }
}

/** "Choose one per point: add 1 [bless] token or remove 1 [curse] token" (Purified). */
function purify(code: string, s: GameState, by: InvestigatorId, left: number): Message[] {
  if (left <= 0) return []
  const choices: Choice[] = []
  if (canAdd(s, 'bless', 1))
    choices.push({
      label: 'choice.addBless',
      params: { n: 1 },
      then: [...add('bless', 1), continuation(code, by, 'purify', { left: left - 1 })],
    })
  if (inBag(s, 'curse'))
    choices.push({
      label: 'choice.removeCurse',
      params: { n: 1 },
      then: [...remove('curse', 1), continuation(code, by, 'purify', { left: left - 1 })],
    })
  return ask(by, choices, true)
}

function registerEvent(code: string): boolean {
  // Keep Faith (0, 2): fast, any [fast] window. Add 4 [bless] tokens.
  if (code === '07034' || code === '10124') {
    registerPlayerCard({ code, playInAnyFastWindow: true, play: () => add('bless', 4) })
    return true
  }
  // Tempt Fate: add 3 [curse], then add 3 [bless] and draw 1 card.
  if (code === '07037') {
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      play: (_s, by) => [
        ...add('curse', 3),
        ...add('bless', 3),
        { type: 'DrawCards', investigator: by, amount: 1 },
      ],
    })
    return true
  }
  // Deep Knowledge / Faustian Bargain: additional cost, add 2 [curse] (all of them, or it
  // cannot be played). Investigators at your location draw 3 cards / gain 5 resources in total.
  if (code === '07023' || code === '07028') {
    const kind = code === '07023' ? 'draw' : 'gain'
    const spread = distribute(code, kind)
    registerPlayerCard({
      code,
      canPlay: (s, by) => canAdd(s, 'curse', 2) && here(s, by) !== null,
      additionalPlayCosts: () => add('curse', 2),
      play: (_s, by) => [continuation(code, by, kind, { remaining: kind === 'draw' ? 3 : 5 })],
      effect: (s, by, step, data) => (step === kind ? spread(s, by, Number(data.remaining)) : []),
    })
    return true
  }
  // Stirring Up Trouble: additional cost, add [curse] equal to your location's shroud.
  // Discover 2 clues at your location.
  if (code === '07112') {
    const shroud = (s: GameState, by: string) => {
      const at = here(s, by)
      return at === null ? 0 : Math.max(0, s.locations[at]?.shroud ?? 0)
    }
    registerPlayerCard({
      code,
      canPlay: (s, by) => here(s, by) !== null && canAdd(s, 'curse', shroud(s, by)),
      additionalPlayCosts: (s, by) => add('curse', shroud(s, by)),
      play: (s, by) => {
        const at = here(s, by)
        return at === null
          ? []
          : [{ type: 'DiscoverClues', investigator: by, amount: 2, location: at }]
      },
    })
    return true
  }
  // Harmony Restored: return X [curse] from the bag to the pool (X = [bless] in the bag);
  // gain 1 resource for each one removed.
  if (code === '07230') {
    registerPlayerCard({
      code,
      play: (s, by) => {
        const n = Math.min(inBag(s, 'bless'), inBag(s, 'curse'))
        return n
          ? [...remove('curse', n), { type: 'GainResources', investigator: by, amount: n }]
          : []
      },
    })
    return true
  }
  // The Stygian Eye: fast, only during your turn; costs 1 less per [curse] in the bag.
  // Until the end of the round, +3 to each of your skills.
  if (code === '07263') {
    registerPlayerCard({
      code,
      selfCostModifier: (s) => -inBag(s, 'curse'),
      canPlay: (s, by) => s.activeTurn === by,
      play: (_s, by) =>
        SKILLS.map((skill) => ({
          type: 'RoundSkillBonus',
          investigator: by,
          skill,
          amount: 3,
          code,
        })),
    })
    return true
  }
  // Control Variable: fast, after an investigator reveals a [curse] token during a skill
  // test at your location. Discover 1 clue at your location.
  if (code === '10046') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        const at = here(s, by)
        if (t.type !== 'afterRevealChaosToken' || t.token !== 'curse' || !s.skillTest) return []
        if (at === null || here(s, t.investigator) !== at) return []
        return [
          {
            key: code + ':clue',
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [{ type: 'DiscoverClues', investigator: by, amount: 1, location: at }],
              },
            ],
          },
        ]
      },
    })
    return true
  }
  // Hand of Fate: fast, when an enemy attacks an investigator at your location. Cancel that
  // attack, then add [bless] equal to the attacker's damage plus horror.
  if (code === '07020') {
    registerPlayerCard({
      code,
      handReactions: (s, t, by) => {
        if (t.type !== 'whenEnemyAttacks' || s.canceledAttack === t.enemy) return []
        const e = s.enemies[t.enemy] ?? s.attackSourcesWithoutLocation?.[t.enemy]
        const at = here(s, by)
        if (!e || enemyBehavior(e.code)?.attacksCannotBeCanceled) return []
        if (at === null || here(s, t.investigator) !== at) return []
        return [
          {
            key: code + ':cancel',
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            target: { type: 'hand', code },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [
                  { type: 'CancelEnemyAttack', enemy: e.id },
                  ...add('bless', Math.max(0, e.damage) + Math.max(0, e.horror)),
                ],
              },
            ],
          },
        ]
      },
    })
    return true
  }
  return false
}

function registerAsset(code: string): boolean {
  // Book of Psalms: [action] spend 1 secret: heal 1 horror from an investigator at your
  // location; add 2 [bless].
  if (code === '07017') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        by !== a.owner || a.uses < 1
          ? []
          : [
              {
                key: a.id + ':psalms',
                label: 'ability.bookOfPsalms',
                params: { card: cardName(code) },
                actions: 1,
                provokes: true,
                costs: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
                then: [continuation(code, by, 'heal')],
              },
            ],
      effect: (s, by, step) => {
        if (step !== 'heal') return []
        const hurt = atLocation(s, by).filter((i) => i.horror > 0)
        const bless = add('bless', 2)
        if (!hurt.length) return bless
        return ask(
          by,
          hurt.map((i) => ({
            label: 'choice.healHorrorOf',
            params: { name: i.name },
            target: { type: 'investigator' as const, id: i.id },
            then: [
              { type: 'Heal' as const, investigator: i.id, damage: 0, horror: 1, healer: by },
              ...bless,
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  // Spirit of Humanity: [fast] exhaust and take 1 damage and 1 horror: add 2 [bless].
  // [fast] exhaust and add 2 [curse]: heal 1 damage and 1 horror.
  if (code === '07229') {
    registerPlayerCard({
      code,
      fastOptions: (s, a) =>
        a.exhausted
          ? []
          : [
              {
                key: a.id + ':bless',
                investigator: a.owner,
                label: 'ability.spiritBless',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  { type: 'TakeDamage', investigator: a.owner, damage: 1, horror: 1 },
                  ...add('bless', 2),
                ],
              },
              ...(canAdd(s, 'curse', 2)
                ? [
                    {
                      key: a.id + ':curse',
                      investigator: a.owner,
                      label: 'ability.spiritCurse',
                      params: { card: cardName(code) },
                      then: [
                        { type: 'ExhaustAsset' as const, asset: a.id },
                        ...add('curse', 2),
                        { type: 'Heal' as const, investigator: a.owner, damage: 1, horror: 1 },
                      ],
                    },
                  ]
                : []),
            ],
    })
    return true
  }
  // Gabriel Carillo: +1 [intellect]. [reaction] at the start of your turn, add 1 [curse]:
  // draw 1 card.
  if (code === '10052') {
    registerPlayerCard({
      code,
      skillModifier: (_s, _a, t) => (t.skill === 'intellect' ? 1 : 0),
      reactions: (s, t, a) =>
        t.type === 'turnBegins' && t.investigator === a.owner && canAdd(s, 'curse', 1)
          ? [
              {
                key: a.id + ':gabriel',
                investigator: a.owner,
                label: 'ability.curseDraw',
                params: { card: cardName(code) },
                then: [...add('curse', 1), { type: 'DrawCards', investigator: a.owner, amount: 1 }],
              },
            ]
          : [],
    })
    return true
  }
  // Scrimshaw Charm: [action] add 1-3 [curse] and exhaust: gain 1 resource plus 1 per token.
  if (code === '10068') {
    registerPlayerCard({
      code,
      abilities: (s, a, by) =>
        by !== a.owner || a.exhausted
          ? []
          : [1, 2, 3]
              .filter((n) => canAdd(s, 'curse', n))
              .map((n) => ({
                key: `${a.id}:scrimshaw:${n}`,
                label: 'ability.scrimshaw',
                params: { card: cardName(code), n, gain: n + 1 },
                actions: 1,
                provokes: true,
                costs: [...add('curse', n), { type: 'ExhaustAsset', asset: a.id }],
                then: [{ type: 'GainResources', investigator: by, amount: n + 1 }],
              })),
    })
    return true
  }
  // Priest of Two Faiths: [reaction] after it enters play, add 3 [bless]. Forced - at the end
  // of the upkeep phase: add 1 [curse] or discard it (discard if no curse can be added).
  if (code === '07156') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? [
              {
                key: a.id + ':priest',
                investigator: a.owner,
                label: 'ability.addBless',
                params: { card: cardName(code), n: 3 },
                then: add('bless', 3),
              },
            ]
          : [],
      forced: (s, t, a) => {
        if (t.type !== 'upkeepPhaseEnds') return []
        const discard: Message = { type: 'DiscardAsset', asset: a.id }
        if (!canAdd(s, 'curse', 1)) return [discard]
        return [
          {
            type: 'Ask',
            investigator: a.owner,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.priestOfTwoFaiths',
              choices: [
                { label: 'choice.addCurse', params: { n: 1 }, then: add('curse', 1) },
                { label: 'choice.discardCard', params: { card: cardName(code) }, then: [discard] },
              ],
            },
          },
        ]
      },
    })
    return true
  }
  // Ancestral Token: [reaction] after you defeat an enemy, exhaust: add [bless] equal to its
  // printed health (max 5).
  if (code === '10019') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) =>
        t.type === 'enemyDefeated' && t.by === a.owner && !a.exhausted
          ? [
              {
                key: a.id + ':ancestral',
                investigator: a.owner,
                label: 'ability.addBless',
                params: { card: cardName(code), n: Math.min(5, Math.max(0, t.enemy.health)) },
                then: [
                  { type: 'ExhaustAsset', asset: a.id },
                  ...add('bless', Math.min(5, Math.max(0, t.enemy.health))),
                ],
              },
            ]
          : [],
    })
    return true
  }
  // Token of Faith (0): [reaction] after a skill test ends in which 1 or more [curse] or
  // [auto_fail] tokens were revealed, exhaust: add that many [bless].
  if (code === '07033') {
    registerPlayerCard({
      code,
      reactions: (_s, t, a) => {
        if (t.type !== 'skillTestEnded' || a.exhausted) return []
        const n = revealed(t, 'curse', 'autoFail')
        return n
          ? [
              {
                key: a.id + ':faith',
                investigator: a.owner,
                label: 'ability.addBless',
                params: { card: cardName(code), n },
                then: [{ type: 'ExhaustAsset', asset: a.id }, ...add('bless', n)],
              },
            ]
          : []
      },
    })
    return true
  }
  return false
}

/** Difference between the test's difficulty and the performer's base skill value. */
const overBase = (s: GameState, test: SkillTest) => test.difficulty - skillTestValue(s).base

function registerSkill(code: string): boolean {
  // Promise of Power: after you commit it, add 1 [curse]; if you cannot, take 2 horror.
  if (code === '07032') {
    registerPlayerCard({
      code,
      onCommit: (s, by) =>
        canAdd(s, 'curse', 1)
          ? add('curse', 1)
          : [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 2 }],
    })
    return true
  }
  // Predestined: max 1, any test. If it fails, add 2 [bless] or remove 2 [curse].
  if (code === '07035') {
    registerPlayerCard({
      code,
      commitWithoutIcons: true,
      afterCommittedTest: (s, _t, succeeded, by) => {
        if (succeeded) return []
        const choices: Choice[] = [
          { label: 'choice.addBless', params: { n: 2 }, then: add('bless', 2) },
          { label: 'choice.removeCurse', params: { n: 2 }, then: remove('curse', 2) },
        ]
        return ask(by, choices, true)
      },
    })
    return true
  }
  // Signum Crucis: only your test whose difficulty exceeds your base skill value; after you
  // commit it, add X [bless] (X is that difference).
  if (code === '07197') {
    registerPlayerCard({
      code,
      canCommit: (s, test, by) => test.investigator === by && overBase(s, test) > 0,
      onCommit: (s) => (s.skillTest ? add('bless', overBase(s, s.skillTest)) : []),
    })
    return true
  }
  // Justify the Means: any test; additional cost, add [curse] equal to the difficulty (in
  // full). The test automatically succeeds.
  if (code === '07306') {
    registerPlayerCard({
      code,
      commitWithoutIcons: true,
      canCommit: (s, test) => canAdd(s, 'curse', Math.max(0, test.difficulty)),
      onCommit: (s) => [
        ...add('curse', Math.max(0, s.skillTest?.difficulty ?? 0)),
        { type: 'AutoSucceedSkillTest' },
      ],
    })
    return true
  }
  // Purified: max 1, any test. If successful, per point succeeded by (max 5), add 1 [bless]
  // or remove 1 [curse].
  if (code === '10029') {
    registerPlayerCard({
      code,
      commitWithoutIcons: true,
      afterCommittedTest: (_s, test, succeeded, by) =>
        succeeded
          ? [continuation(code, by, 'purify', { left: Math.min(5, Math.max(0, testMargin(test))) })]
          : [],
      effect: (s, by, step, data) =>
        step === 'purify' ? purify(code, s, by, Number(data.left)) : [],
    })
    return true
  }
  // Esoteric Method: after this test ends, add 1 [curse] per point succeeded or failed by.
  if (code === '10055') {
    registerPlayerCard({
      code,
      afterCommittedTestEnds: (_s, test) => add('curse', Math.abs(testMargin(test))),
    })
    return true
  }
  // Accursed: when committed, add up to 3 [curse]; [curse] modifiers are 0 during this test.
  if (code === '10095') {
    registerPlayerCard({
      code,
      committedTokenModifiers: { curse: 0 },
      onCommit: (s, by) =>
        ask(
          by,
          [0, 1, 2, 3]
            .filter((n) => canAdd(s, 'curse', n))
            .map((n) => ({ label: 'choice.addCurse', params: { n }, then: add('curse', n) })),
          true,
        ),
    })
    return true
  }
  // Skeptic: during this test, each [bless] and [curse] modifier is +1.
  if (code === '07115') {
    registerPlayerCard({ code, committedTokenModifiers: { bless: 1, curse: 1 } })
    return true
  }
  // Fey: if a [curse] token is revealed during this test, you may return it to your hand
  // when this test ends.
  if (code === '07222') {
    registerPlayerCard({
      code,
      afterCommittedTestEnds: (s, test, _ok, by) =>
        revealed(test, 'curse') && getInvestigator(s, by).discard.includes(code)
          ? ask(
              by,
              [
                {
                  label: 'choice.returnToHand',
                  params: { card: cardName(code) },
                  then: [{ type: 'DiscardToHand', investigator: by, code }],
                },
                { label: 'choice.skip', then: [] },
              ],
              true,
            )
          : [],
    })
    return true
  }
  // Providential: if successful, add 1 [bless] per damage or horror on you (whichever is less).
  if (code === '10125') {
    registerPlayerCard({
      code,
      afterCommittedTest: (s, _t, succeeded, by) => {
        const i = getInvestigator(s, by)
        return succeeded ? add('bless', Math.min(i.damage, i.horror)) : []
      },
    })
    return true
  }
  return false
}

export function registerBlessCurse(code: string): void {
  if (registerEvent(code) || registerAsset(code) || registerSkill(code)) return
  throw Error('Unreviewed bless/curse card ' + code)
}
