// RR: Chaos Bag (Bless/Curse tokens), Triggered Abilities ("when"/"after" a token is
// revealed), Skill Tests (ST.3 reveal, ST.4 resolve, ST.8 return), Cancel, Automatic Success,
// Permanent, Exile, Uses (charges), Fight, Investigate, Evade.
import {
  enemiesAt,
  getInvestigator,
  getLocation,
  poolTokensAvailable,
  registerPlayerCard,
  type Asset,
  type ChaosToken,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
  type SkillTest,
  type Trigger,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { ask, cardName, continuation, moveChoices } from '../dunwich-pilot/effects'

type Data = Record<string, string | number | boolean>
const here = (s: GameState, by: InvestigatorId) => getInvestigator(s, by).location
/** The investigator performing the test is at `by`'s location. */
const atLocationOf = (s: GameState, test: SkillTest, by: InvestigatorId) => {
  const at = here(s, by)
  return at !== null && here(s, test.investigator) === at
}
const count = (tokens: ChaosToken[] | undefined, token: ChaosToken) =>
  (tokens ?? []).filter((t) => t === token).length
/** Held token of a "when revealed" window during a skill test. */
const held = (s: GameState, t: Trigger) =>
  t.type === 'whenRevealChaosToken' && s.skillTest?.revealing ? s.skillTest.revealing : null
const option = (
  a: { id: string; owner: InvestigatorId },
  code: string,
  then: Message[],
  label = 'ability.tokenTrigger.' + code,
  params: Record<string, string | number> = {},
): ReactionOption => ({
  key: a.id + ':' + code,
  investigator: a.owner,
  label,
  params: { card: cardName(code), ...params },
  target: { type: 'asset', id: a.id },
  then,
})
const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const skip: Choice = { label: 'choice.skip', then: [] }

// --------------------------------------------------------------------------- Cursed spells

const CURSED_SPELLS = {
  '07117': { action: 'fight', upgraded: false },
  '07226': { action: 'fight', upgraded: true },
  '07118': { action: 'investigate', upgraded: false },
  '07227': { action: 'investigate', upgraded: true },
  '07119': { action: 'evade', upgraded: false },
  '07228': { action: 'evade', upgraded: true },
} as const

/**
 * "If a [curse] token is revealed" (level 0: once per test) / "for each [curse] token revealed"
 * (level 4): you may resolve the effect or place 1 charge on the spell. FAQ (2022): each
 * [curse] resolves separately, as it is revealed.
 */
function curseChoices(s: GameState, a: Asset, action: 'fight' | 'investigate' | 'evade') {
  const by = a.owner,
    at = here(s, by)
  if (at === null) return []
  const effects: Choice[] =
    action === 'fight'
      ? enemiesAt(s, at).map((e) => ({
          label: 'choice.curseDamage',
          params: { card: cardName(a.code), enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [
            {
              type: 'DamageEnemy',
              enemy: e.id,
              amount: 1,
              by,
              source: { code: a.code, traits: ['Spell'] },
            },
          ],
        }))
      : action === 'investigate'
        ? getLocation(s, at)
            .connections.filter((id) => s.locations[id]?.revealed && s.locations[id]!.clues > 0)
            .map((id) => ({
              label: 'choice.curseClue',
              params: { card: cardName(a.code), location: getLocation(s, id).name },
              target: { type: 'location', id },
              then: [{ type: 'DiscoverClues', investigator: by, amount: 1, location: id }],
            }))
        : moveChoices(s, by).map((c) => ({
            ...c,
            label: 'choice.curseMove',
            params: { card: cardName(a.code), location: String(c.params?.location ?? '') },
          }))
  return ask(
    by,
    [
      ...effects,
      {
        label: 'choice.curseCharge',
        params: { card: cardName(a.code) },
        then: [{ type: 'AddUses', asset: a.id, amount: 1 }],
      },
      skip,
    ],
    true,
  )
}

function registerCursedSpell(code: keyof typeof CURSED_SPELLS) {
  const { action, upgraded } = CURSED_SPELLS[code]
  registerBasicAsset(
    code,
    [
      {
        action,
        skills: ['willpower'],
        cost: ['use'],
        modifier: upgraded ? 2 : 0,
        ...(action === 'fight' ? { extraDamage: 1 } : {}),
        ...(action === 'investigate' ? { extraClues: 1 } : {}),
        // Shroud of Shadows: a non-Elite evaded enemy may move to a connecting location.
        ...(action === 'evade'
          ? {
              onSuccess: ({ investigator }, enemy) =>
                enemy && !enemy.traits?.includes('Elite')
                  ? [continuation(code, investigator, 'moveEnemy', { enemy: enemy.id })]
                  : [],
            }
          : {}),
      },
    ],
    () => ({
      onTokenRevealed: (s, token, self) =>
        token === 'curse' && (upgraded || !s.skillTest?.tokens.includes('curse'))
          ? curseChoices(s, self, action)
          : [],
      effect: (s, by, step, data) => {
        const enemy = s.enemies[String(data?.enemy)]
        if (step !== 'moveEnemy' || !enemy?.location) return []
        return ask(
          by,
          [
            ...getLocation(s, enemy.location)
              .connections.filter((id) => s.locations[id])
              .map((id): Choice => ({
                label: 'choice.moveEnemyTo',
                params: { enemy: enemy.name, location: getLocation(s, id).name },
                target: { type: 'location', id },
                then: [{ type: 'MoveEnemy', enemy: enemy.id, location: id }],
              })),
            skip,
          ],
          true,
        )
      },
    }),
  )
}

// --------------------------------------------------------------------------- Covenants

/** Permanent. "When an investigator at your location reveals a [curse]/[bless] token". */
function registerCovenant(code: string) {
  registerPlayerCard({
    code,
    permanent: {},
    reactions: (s, t, a) => {
      const test = s.skillTest
      if (!test || a.exhausted) return []
      // After the "reveal chaos token" step (FAQ: Sacred and Paradoxical Covenant).
      if (t.type === 'afterRevealStep') {
        const bless = count(test.tokens, 'bless')
        if (code === '07110' && bless > 0)
          return [
            option(a, code, [
              exhaust(a),
              ...ask(
                a.owner,
                Array.from({ length: bless }, (_, n) => bless - n).map((n): Choice => ({
                  label: 'choice.sacredReturn',
                  params: { n },
                  then: [
                    {
                      type: 'IgnoreRevealedTokenModifiers',
                      token: 'bless',
                      count: n,
                      returnToBag: true,
                    },
                  ],
                })),
                true,
              ),
            ]),
          ]
        if (
          code === '07120' &&
          atLocationOf(s, test, a.owner) &&
          bless > 0 &&
          count(test.tokens, 'curse') > 0
        )
          return [option(a, code, [exhaust(a), { type: 'AutoSucceedSkillTest' }])]
        return []
      }
      const token = held(s, t)
      if (!token || token.effect || !atLocationOf(s, test, a.owner)) return []
      if (code === '07113' && token.face === 'curse' && token.modifier === undefined)
        return [
          option(a, code, [
            exhaust(a),
            { type: 'ReplaceRevealedTokenEffect', modifier: 1 },
            { type: 'ReturnTokensToBagAfterTest', tokens: ['curse'] },
          ]),
        ]
      if (code === '07116' && token.face === 'curse')
        return [
          option(a, code, [
            exhaust(a),
            { type: 'CancelRevealedToken', redraw: true, toPool: true },
          ]),
        ]
      if (code === '07122' && token.face === 'bless' && !token.noRevealAnother)
        return [
          option(a, code, [
            exhaust(a),
            { type: 'ReplaceRevealedTokenEffect', noRevealAnother: true },
          ]),
        ]
      return []
    },
  })
}

// --------------------------------------------------------------------------- Other assets

/** Blessing of Isis / Curse of Aeons: "when a second [bless]/[curse] token is revealed". */
function registerSecondToken(code: '07190' | '07195') {
  const token: ChaosToken = code === '07190' ? 'bless' : 'curse'
  const face: ChaosToken = code === '07190' ? 'elderSign' : 'skull'
  registerPlayerCard({
    code,
    reactions: (s, t, a) => {
      const test = s.skillTest,
        h = held(s, t)
      if (!test || !h || a.exhausted || h.effect || h.face !== token) return []
      if (count(test.tokens, token) !== 1 || !atLocationOf(s, test, a.owner)) return []
      const isis = code === '07190'
      const returned = isis || test.keepInBag?.includes('curse') ? 2 : 1
      return [
        option(a, code, [
          exhaust(a),
          { type: 'TreatRevealedTokenAs', token: face },
          // Isis returns both. Aeons returns the canceled second curse unless removed at ST.8.
          { type: 'ReturnTokensToBagAfterTest', tokens: isis ? [token, token] : [token] },
          ...(isis
            ? []
            : [
                {
                  type: 'AfterCurrentSkillTest' as const,
                  then: ask(
                    a.owner,
                    [
                      {
                        label: 'choice.aeonsRemove',
                        then: [
                          {
                            type: 'RemoveChaosTokens',
                            tokens: Array<ChaosToken>(returned).fill(token),
                          },
                        ],
                      },
                      { label: 'choice.aeonsKeep', then: [] },
                    ],
                    true,
                  ),
                },
              ]),
        ]),
      ]
    },
  })
}

const BLACK_CAT: Partial<Record<string, string>> = {
  tablet: 'ability.blackCatTablet',
  elderThing: 'ability.blackCatElderThing',
  elderSign: 'ability.blackCatElderSign',
}

const SIGILS: ChaosToken[] = [
  'skull',
  'cultist',
  'tablet',
  'elderThing',
  'autoFail',
  'bless',
  'curse',
  'frost',
]

function registerAsset(code: string): boolean {
  if (code in CURSED_SPELLS) {
    registerCursedSpell(code as keyof typeof CURSED_SPELLS)
    return true
  }
  if (['07110', '07113', '07116', '07120', '07122'].includes(code)) {
    registerCovenant(code)
    return true
  }
  if (code === '07190' || code === '07195') {
    registerSecondToken(code)
    return true
  }
  // "Lucky" Penny: Forced - when you reveal a [bless]/[curse] token during your skill test,
  // flip a coin: heads, treat it as [bless]; tails, as [curse] (draw 1 if it was a [bless]).
  if (code === '07224') {
    const as = (from: ChaosToken, to: 'bless' | 'curse', by: InvestigatorId): Message[] =>
      from === to
        ? []
        : [
            { type: 'TreatRevealedTokenAs', token: to },
            ...(to === 'curse'
              ? [{ type: 'DrawCards', investigator: by, amount: 1 } as Message]
              : []),
          ]
    registerPlayerCard({
      code,
      forced: (s, t, a) => {
        const h = held(s, t)
        if (!h || !['bless', 'curse'].includes(String(h.face))) return []
        if (s.skillTest?.investigator !== a.owner) return []
        return [
          {
            type: 'FlipCoin',
            investigator: a.owner,
            heads: as(h.face, 'bless', a.owner),
            tails: as(h.face, 'curse', a.owner),
          },
        ]
      },
    })
    return true
  }
  // The Black Cat: when you reveal a [tablet], [elder_thing] or [elder_sign] during a skill
  // test, you may resolve these effects instead of the symbol's normal effects.
  if (code === '06285') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        const h = held(s, t)
        const label = h ? BLACK_CAT[String(h.face)] : undefined
        if (!h || !label || h.effect || s.skillTest?.investigator !== a.owner) return []
        const effect =
          h.face === 'tablet'
            ? {
                modifier: -1,
                immediate: [{ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 } as Message],
              }
            : h.face === 'elderThing'
              ? {
                  modifier: -1,
                  immediate: [
                    { type: 'DamageAsset', asset: a.id, damage: 0, horror: 1 } as Message,
                  ],
                }
              : {
                  modifier: 5,
                  immediate: [
                    {
                      type: 'HealAsset',
                      asset: a.id,
                      damage: a.damage,
                      horror: a.horror,
                    } as Message,
                  ],
                }
        return [
          {
            ...option(a, code, [{ type: 'ReplaceRevealedTokenEffect', effect }], label),
            key: a.id + ':' + code + ':' + String(h.face),
          },
        ]
      },
    })
    return true
  }
  // Token of Faith: after a test ends in which [curse]/[auto_fail] tokens were revealed,
  // exhaust: add that many [bless]; if it failed, its investigator may attempt it again.
  if (code === '10126') {
    registerPlayerCard({
      code,
      reactions: (s, t, a) => {
        if (t.type !== 'skillTestEnded' || a.exhausted) return []
        const n = count(t.tokens, 'curse') + count(t.tokens, 'autoFail')
        if (n <= 0) return []
        const bless = Math.min(n, poolTokensAvailable(s, 'bless'))
        const retry =
          !t.succeeded && s.lastSkillTest?.investigator === t.investigator
            ? ask(
                t.investigator,
                [
                  {
                    label: 'choice.retryTokenOfFaith',
                    params: { card: cardName(code) },
                    then: [{ type: 'RepeatSkillTest', investigator: t.investigator, modifier: 0 }],
                  },
                  skip,
                ],
                true,
              )
            : []
        return [
          option(
            a,
            code,
            [
              exhaust(a),
              ...(bless
                ? [
                    {
                      type: 'AddChaosTokens',
                      tokens: Array(bless).fill('bless'),
                      scenarioOnly: true,
                    } as Message,
                  ]
                : []),
              ...retry,
            ],
            undefined,
            { n },
          ),
        ]
      },
    })
    return true
  }
  // Prismatic Spectacles: [action] add 1 [curse] to the bag: Investigate, +2 skill value. If a
  // [curse] is revealed, you may exhaust it to discover 1 additional clue at your location.
  if (code === '10056') {
    registerBasicAsset(
      code,
      [
        {
          action: 'investigate',
          modifier: 2,
          available: ({ state }) => poolTokensAvailable(state, 'curse') > 0,
          extraCosts: () => [{ type: 'AddChaosTokens', tokens: ['curse'], scenarioOnly: true }],
        },
      ],
      () => ({
        onTokenRevealed: (s, token, self) =>
          token === 'curse' && !s.assets[self.id]?.exhausted
            ? ask(
                self.owner,
                [
                  {
                    label: 'choice.spectaclesClue',
                    params: { card: cardName(code) },
                    then: [exhaust(self), { type: 'AddInvestigationResults', extraClues: 1 }],
                  },
                  skip,
                ],
                true,
              )
            : [],
      }),
    )
    return true
  }
  // Nkosi Mabati: after it enters play, name a non-[elder_sign] symbol token (your sigil).
  // [reaction] When an investigator at your location reveals a [cultist], [tablet] or
  // [elder_thing], exhaust: search the bag for your sigil and reveal it instead.
  if (code === '08091') {
    registerPlayerCard({
      code,
      forced: (s, t, a) =>
        t.type === 'afterAssetEntersPlay' && t.asset === a.id
          ? ask(
              a.owner,
              [
                ...SIGILS.map((token): Choice => ({
                  label: 'choice.nameSigil',
                  params: { token: String(token) },
                  then: [
                    { type: 'SetAssetForm', asset: a.id, form: String(token) },
                    { type: 'Log', key: 'log.sigilNamed', params: { token: String(token) } },
                  ],
                })),
                skip,
              ],
              true,
            )
          : [],
      reactions: (s, t, a) => {
        const test = s.skillTest,
          h = held(s, t),
          sigil = a.form as ChaosToken | undefined
        if (!test || !h || a.exhausted || h.effect || !sigil) return []
        if (!['cultist', 'tablet', 'elderThing'].includes(String(h.face))) return []
        if (!s.chaosBag.includes(sigil) || !atLocationOf(s, test, a.owner)) return []
        return [
          option(
            a,
            code,
            [
              exhaust(a),
              { type: 'CancelRevealedToken' },
              { type: 'RevealChaosToken', token: sigil, search: true },
            ],
            undefined,
            { token: String(sigil) },
          ),
        ]
      },
    })
    return true
  }
  return false
}

// --------------------------------------------------------------------------- Skills, event

function registerOther(code: string): boolean {
  // Stroke of Luck: commit only to your own test. After revealing chaos tokens, you may exile
  // it: the test automatically succeeds (FAQ: an [auto_fail] still makes it fail, and it is
  // exiled anyway).
  if (code === '02271') {
    registerPlayerCard({
      code,
      canCommit: (_s, test, by) => test.investigator === by,
      committedReactions: (s, t, by) =>
        t.type === 'afterRevealStep' && s.skillTest?.investigator === by
          ? [
              {
                key: 'committed:' + code,
                investigator: by,
                label: 'ability.tokenTrigger.' + code,
                params: { card: cardName(code) },
                then: [
                  { type: 'RemoveCommittedCard', investigator: by, code, exile: true },
                  { type: 'AutoSucceedSkillTest' },
                ],
              },
            ]
          : [],
    })
    return true
  }
  // Beloved: if a [bless] is revealed during this test, you may remove it from the game to
  // replace that token's effects with "You automatically succeed" (no further token; it
  // returns to the chaos bag after the test).
  if (code === '07036') {
    registerPlayerCard({
      code,
      committedReactions: (s, t, by) => {
        const h = held(s, t)
        if (!h || h.face !== 'bless' || h.effect) return []
        return [
          {
            key: 'committed:' + code,
            investigator: by,
            label: 'ability.tokenTrigger.' + code,
            params: { card: cardName(code) },
            then: [
              { type: 'RemoveCommittedCard', investigator: by, code },
              {
                type: 'ReplaceRevealedTokenEffect',
                effect: { modifier: 0, autoSucceed: true },
                noRevealAnother: true,
              },
              { type: 'ReturnTokensToBagAfterTest', tokens: ['bless'] },
            ],
          },
        ]
      },
    })
    return true
  }
  // Dawn Star: fast, play at the end of ST.3 of a test at your location (FAQ 2024): ignore
  // the modifiers of each [curse] revealed; deal 1 damage to an enemy at your location for
  // each one ignored, immediately.
  if (code === '10131') {
    registerPlayerCard({
      code,
      canPlay: () => false,
      handReactions: (s, t, by) => {
        const test = s.skillTest
        if (t.type !== 'afterRevealStep' || !test || !atLocationOf(s, test, by)) return []
        const n = count(test.tokens, 'curse') - count(test.ignoredModifiers, 'curse')
        if (n <= 0) return []
        return [
          {
            key: 'hand:' + code,
            investigator: by,
            label: 'ability.playCard',
            params: { card: cardName(code) },
            then: [
              {
                type: 'PlayCard',
                investigator: by,
                code,
                effect: [
                  { type: 'IgnoreRevealedTokenModifiers', token: 'curse' },
                  continuation(code, by, 'damage', { left: n }),
                ],
              },
            ],
          },
        ]
      },
      effect: (s, by, step, data: Data) => {
        const left = Number(data.left ?? 0),
          at = here(s, by)
        if (step !== 'damage' || left <= 0 || at === null) return []
        return ask(
          by,
          enemiesAt(s, at).map((e) => ({
            label: 'choice.curseDamage',
            params: { card: cardName(code), enemy: e.name },
            target: { type: 'enemy', id: e.id },
            then: [
              {
                type: 'DamageEnemy',
                enemy: e.id,
                amount: 1,
                by,
                source: { code, traits: ['Ritual', 'Blessed'] },
              },
              continuation(code, by, 'damage', { left: left - 1 }),
            ],
          })),
          true,
        )
      },
    })
    return true
  }
  return false
}

export function registerTokenTrigger(code: string): void {
  if (registerAsset(code) || registerOther(code)) return
  throw Error('Unreviewed token trigger card ' + code)
}
