// RR: Chaos Bag, Triggered Abilities ("when … would"), Ignore, Uses, Skill Tests ST.3.
import {
  getInvestigator,
  registerPlayerCard,
  skillTestValue,
  wouldRevealFor,
  type Asset,
  type ChaosToken,
  type GameState,
  type Message,
  type ReactionOption,
  type SkillTest,
  type TokenRevealReplacement,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { cardName } from '../dunwich-pilot/effects'

export const SYMBOLS: ChaosToken[] = ['skull', 'cultist', 'tablet', 'elderThing', 'autoFail']
const replace = (replacement: TokenRevealReplacement): Message => ({
  type: 'ReplaceNextTokenReveal',
  replacement,
})
const spend = (a: Asset, amount = 1): Message => ({ type: 'SpendUses', asset: a.id, amount })
const ownTest = (s: GameState, a: Asset) =>
  !!s.skillTest && !s.wouldReveal && s.skillTest.investigator === a.owner

/** "Reveal X additional chaos tokens … Choose one to resolve and ignore the rest." */
function extraTokens(
  self: Asset,
  test: SkillTest,
  state: GameState,
  code: string,
): ReactionOption[] {
  if (test.source !== self.id || !wouldRevealFor(state, self.owner)) return []
  return Array.from({ length: Math.min(3, self.uses) }, (_, n) => ({
    key: `${self.id}:extra:${n + 1}`,
    investigator: self.owner,
    label: 'ability.tokenRevealExtra',
    params: { card: cardName(code), n: n + 1 },
    then: [
      spend(self, n + 1),
      replace({ investigator: self.owner, reveal: n + 2, source: self.id }),
    ],
  }))
}
/** The resolved token of this card's choice equals one of the tokens it ignored. */
const matched = (test: SkillTest, self: Asset) =>
  !!test.succeeded &&
  test.tokenChoice?.source === self.id &&
  test.tokenChoice.ignored.includes(test.tokenChoice.chosen)

export function registerRevealReplacement(code: string): boolean {
  // Grotesque Statue (4, 2): when you would reveal a chaos token, spend 1 charge: reveal 2
  // and choose 1 to resolve. It is discarded without charges (discardWhenEmpty).
  if (['01071', '01571', '60421'].includes(code)) {
    registerPlayerCard({
      code,
      discardWhenEmpty: true,
      wouldRevealOptions: (_s, self) =>
        self.uses > 0
          ? [
              {
                key: `${self.id}:statue`,
                investigator: self.owner,
                label: 'ability.tokenRevealReplace',
                params: { card: cardName(code), n: 2 },
                then: [spend(self), replace({ investigator: self.owner, reveal: 2 })],
              },
            ]
          : [],
    })
    return true
  }
  // Dark Prophecy: fast, when you would reveal a chaos token (in or outside a skill test).
  // A token with a skull/cultist/tablet/elder thing/auto-fail symbol must be chosen if any.
  if (['04032', '60417'].includes(code)) {
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      playWhenWouldReveal: true,
      canPlay: (s, by) => wouldRevealFor(s, by),
      play: (_s, by) => [replace({ investigator: by, reveal: 5, prefer: SYMBOLS })],
    })
    return true
  }
  // Against All Odds: during your skill test whose difficulty exceeds your base skill value,
  // reveal X additional tokens (X is that difference) and resolve one of them.
  if (code === '04202') {
    const difference = (s: GameState, by: string) =>
      s.skillTest?.investigator === by ? s.skillTest.difficulty - skillTestValue(s).base : 0
    registerPlayerCard({
      code,
      playInAnyFastWindow: true,
      canPlay: (s, by) => !s.wouldReveal && wouldRevealFor(s, by) && difference(s, by) > 0,
      play: (s, by) => [replace({ investigator: by, reveal: 1 + difference(s, by) })],
    })
    return true
  }
  // Breath of the Sleeper / Eyes of the Dreamer: willpower attack/investigation; before
  // revealing, up to 3 charges reveal that many more tokens, one is resolved. A resolved
  // token matching an ignored one adds +2 damage or 1 additional clue.
  if (code === '11066' || code === '11067') {
    const fight = code === '11066'
    registerBasicAsset(
      code,
      [{ action: fight ? 'fight' : 'investigate', skills: ['willpower'] }],
      () => ({
        testOptions: (s, test, self) => extraTokens(self, test, s, code),
        beforeResults: (s, test, self) => {
          if (!matched(test, self)) return []
          if (fight)
            return test.kind.type === 'fight' ? [{ type: 'ModifySkillTest', extraDamage: 2 }] : []
          const here = getInvestigator(s, test.investigator).location
          return test.kind.type === 'investigate' && here !== null
            ? [
                {
                  type: 'ModifySkillTest',
                  onSuccess: [
                    {
                      type: 'DiscoverClues',
                      investigator: test.investigator,
                      amount: 1,
                      location: here,
                    },
                  ],
                },
              ]
            : []
        },
      }),
    )
    return true
  }
  // Katarina Sojka (errata): when you would reveal a chaos token during a skill test you are
  // performing, exhaust her: reveal until a symbol token, resolve it and ignore the rest.
  if (code === '11069') {
    registerPlayerCard({
      code,
      wouldRevealOptions: (s, self) =>
        self.exhausted || !ownTest(s, self)
          ? []
          : [
              {
                key: `${self.id}:katarina`,
                investigator: self.owner,
                label: 'ability.tokenRevealUntilSymbol',
                params: { card: cardName(code) },
                then: [
                  { type: 'ExhaustAsset', asset: self.id },
                  replace({ investigator: self.owner, reveal: 0, untilSymbol: true }),
                ],
              },
            ],
    })
    return true
  }
  return false
}
