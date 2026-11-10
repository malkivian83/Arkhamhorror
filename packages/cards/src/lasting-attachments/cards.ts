// RR: Attach To, Lasting Effects ("until the end of the phase/round/turn"), Enemy Phase (Hunter
// movement), Upkeep (readying), Skill Tests (ST.3 reveal), Evade, Fight, Investigate, Shroud,
// Keywords (aloof, alert, elusive, retaliate), Limit X per location/enemy, Exhaust, Uses.
import {
  attachedStat,
  attachmentsAt,
  effectiveVitals,
  engagedEnemies,
  enemiesAt,
  getInvestigator,
  getLocation,
  investigatorsAt,
  playerCardDef,
  registerPlayerCard,
  registerTreachery,
  shroudOf,
  testMargin,
  type AbilityOption,
  type Asset,
  type ChaosToken,
  type Choice,
  type Enemy,
  type EnemyKeyword,
  type GameState,
  type InvestigatorId,
  type LocationAttachment,
  type Message,
  type ReactionOption,
  type SkillType,
  type Treachery,
  type Trigger,
} from '@lcg/engine'
import { registerBasicAsset } from '../basic-abilities/register'
import { basicTest, registerBasicEvent, type BasicEvent } from '../basic-events/register'
import { ask, cardName, continuation } from '../dunwich-pilot/effects'

const SYMBOLS: ChaosToken[] = ['skull', 'cultist', 'tablet', 'elderThing']
const elite = (e: Enemy) => (e.traits ?? []).includes('Elite')
const here = (s: GameState, by: InvestigatorId) => getInvestigator(s, by).location
const enemiesHere = (s: GameState, by: InvestigatorId) => {
  const at = here(s, by)
  return at === null ? [] : enemiesAt(s, at)
}
const enemyChoices = (
  enemies: Enemy[],
  then: (e: Enemy) => Message[],
  label = 'choice.enemy',
): Choice[] =>
  enemies.map((e) => ({
    label,
    params: { enemy: e.name },
    target: { type: 'enemy', id: e.id },
    then: then(e),
  }))
const discardAttachment = (a: LocationAttachment): Message => ({
  type: 'DiscardLocationAttachment',
  attachment: a.id,
})
const attach = (
  by: InvestigatorId,
  code: string,
  enemy: Enemy,
): Extract<Message, { type: 'AttachPlayerCardToEnemy' }> => ({
  type: 'AttachPlayerCardToEnemy',
  investigator: by,
  code,
  enemy: enemy.id,
})
const sameTitleAt = (s: GameState, code: string, location: string) =>
  attachmentsAt(s, location).some((a) => playerCardDef(a.code)?.name === playerCardDef(code)?.name)
/** "Attach to your location" (optionally "Limit 1 per location"). */
const attachHere = (code: string, limit = false) => ({
  canPlay: (s: GameState, by: InvestigatorId) => {
    const at = here(s, by)
    return at !== null && !(limit && sameTitleAt(s, code, at))
  },
  play: (s: GameState, by: InvestigatorId): Message[] => {
    const at = here(s, by)
    return at === null
      ? []
      : [
          {
            type: 'AttachEventToLocation',
            investigator: by,
            code,
            location: at,
            ...(limit ? { limitTitle: true } : {}),
          },
        ]
  },
})
/** The enemy that just entered the attachment's location and is still there. */
const entering = (s: GameState, t: Trigger, a: LocationAttachment): Enemy | null => {
  if (t.type !== 'enemyEntersLocation' || t.location !== a.location) return null
  const e = s.enemies[t.enemy]
  return e && e.location === a.location ? e : null
}
const attachedEnemy = (s: GameState, self: Treachery) =>
  self.placement.type === 'enemy' ? (s.enemies[self.placement.enemy] ?? null) : null

// --------------------------------------------------------------------------- Enemy modifiers

/** Anatomical Diagrams: -2 fight and -2 evade until the end of the active investigator's turn. */
function registerAnatomicalDiagrams(code: string) {
  registerPlayerCard({
    code,
    playInAnyFastWindow: true,
    canPlay: (s, by) => {
      const i = getInvestigator(s, by)
      return (
        s.phase === 'investigation' &&
        !!s.activeTurn &&
        effectiveVitals(s, i).sanity - i.horror >= 5 &&
        enemiesHere(s, by).some((e) => !elite(e))
      )
    },
    play: (s, by) =>
      ask(
        by,
        enemyChoices(
          enemiesHere(s, by).filter((e) => !elite(e)),
          (e) => [
            {
              type: 'AddEnemyModifier',
              enemy: e.id,
              modifier: { source: code, until: 'turn', fight: -2, evade: -2 },
            },
          ],
        ),
      ),
  })
}

/**
 * Expose Weakness: [intellect] test against the enemy's current fight value. Level 1: -1 fight
 * per point succeeded by; level 3: fight 0. Both last for the next attack against it this phase.
 */
function registerExposeWeakness(code: string, upgraded: boolean) {
  registerPlayerCard({
    code,
    playInAnyFastWindow: true,
    canPlay: (s, by) => enemiesHere(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        enemyChoices(enemiesHere(s, by), (e) => [
          {
            type: 'BeginSkillTest',
            investigator: by,
            skill: 'intellect',
            difficulty: Math.max(0, e.fight + attachedStat(s, e.id, 'fight')),
            effectSource: code,
            kind: {
              type: 'effect',
              source: code,
              onSuccess: [continuation(code, by, 'expose', { enemy: e.id })],
              onFail: [],
              onFailEach: [],
            },
          },
        ]),
      ),
    effect: (s, by, step, data) => {
      const enemy = String(data.enemy)
      if (step !== 'expose' || !s.enemies[enemy] || !s.skillTest) return []
      const margin = testMargin(s.skillTest)
      if (!upgraded && margin <= 0) return []
      return [
        {
          type: 'AddEnemyModifier',
          enemy,
          modifier: upgraded
            ? { source: code, until: 'nextAttack', fightSetTo: 0 }
            : { source: code, until: 'nextAttack', fight: -margin },
        },
        ...(upgraded ? [{ type: 'DrawCards' as const, investigator: by, amount: 1 }] : []),
      ]
    },
  })
}

/**
 * Wither: a [willpower] attack; a [skull]/[cultist]/[tablet]/[elder_thing] revealed gives the
 * enemy -1 fight and -1 evade (level 4: and -1 health) for the rest of the turn, to a minimum
 * of 1. It applies as the symbol is revealed, so it also lowers this attack's difficulty.
 */
function registerWither(code: string, upgraded: boolean) {
  registerBasicAsset(
    code,
    [{ action: 'fight', skills: ['willpower'], modifier: upgraded ? 2 : 0 }],
    () => ({
      onTokenRevealed: (s, token, self) => {
        const test = s.skillTest
        if (!SYMBOLS.includes(token) || test?.kind.type !== 'fight') return []
        const enemy = test.kind.enemy
        return [
          {
            type: 'AddEnemyModifier',
            enemy,
            modifier: {
              source: self.code,
              until: 'turn',
              fight: -1,
              evade: -1,
              ...(upgraded ? { health: -1 } : {}),
              minimum: 1,
            },
          },
          continuation(code, self.owner, 'wither', {
            enemy,
            before: attachedStat(s, enemy, 'fight'),
          }),
        ]
      },
      effect: (s, _by, step, data) => {
        const test = s.skillTest
        const enemy = String(data.enemy)
        if (step !== 'wither' || test?.kind.type !== 'fight' || test.kind.enemy !== enemy) return []
        const delta = attachedStat(s, enemy, 'fight') - Number(data.before)
        return delta ? [{ type: 'ModifySkillTest', difficultyDelta: delta }] : []
      },
    }),
  )
}

/**
 * Sixth Sense: a [willpower] investigation; when a symbol is revealed you may investigate a
 * revealed connecting location instead, using either shroud value.
 */
function registerSixthSense(code: string) {
  registerBasicAsset(code, [{ action: 'investigate', skills: ['willpower'] }], () => ({
    onTokenRevealed: (s, token, self) => {
      const test = s.skillTest
      if (!SYMBOLS.includes(token) || test?.kind.type !== 'investigate') return []
      const from = test.kind.location
      const own = shroudOf(s, from)
      const choices = getLocation(s, from)
        .connections.filter((id) => s.locations[id]?.revealed)
        .flatMap((id): Choice[] => {
          const other = shroudOf(s, id)
          const name = getLocation(s, id).name
          const option = (shroud: number): Choice => ({
            label: 'choice.sixthSense',
            params: { card: cardName(code), location: name, shroud },
            target: { type: 'location', id },
            then: [
              {
                type: 'ModifySkillTest',
                investigateLocation: id,
                ...(shroud !== own ? { difficultyDelta: shroud - own } : {}),
              },
            ],
          })
          return other === own ? [option(own)] : [option(own), option(other)]
        })
      return choices.length
        ? ask(self.owner, [...choices, { label: 'choice.skip', then: [] }], true)
        : []
    },
  }))
}

/** Ofuda: [fast] spend 1 charge: a non-Elite enemy at your location loses keywords this round. */
const OFUDA_KEYWORDS: EnemyKeyword[] = ['alert', 'aloof', 'elusive', 'retaliate']
function registerOfuda(code: string) {
  const replenished = (s: GameState, a: Asset) =>
    s.log.some(
      (l) => l.key === 'log.ofudaReplenish' && l.round === s.round && l.params?.asset === a.id,
    )
  registerPlayerCard({
    code,
    abilities: (s, a, by) =>
      a.uses < 1
        ? []
        : enemiesHere(s, by)
            .filter((e) => !elite(e))
            .map((e): AbilityOption => ({
              key: a.id + ':ofuda',
              label: 'ability.ofuda',
              params: { card: cardName(code), enemy: e.name },
              target: { type: 'enemy', id: e.id },
              actions: 0,
              provokes: false,
              costs: [{ type: 'SpendUses', asset: a.id, amount: 1 }],
              then: [
                {
                  type: 'AddEnemyModifier',
                  enemy: e.id,
                  modifier: { source: code, until: 'round', loses: OFUDA_KEYWORDS },
                },
              ],
            })),
    // "Replenish this charge the first time a [bless] token is revealed at your location each
    // round": only the first one each round counts, even if the charge is still there.
    forced: (s, t, a) => {
      if (t.type !== 'afterRevealChaosToken' || t.token !== 'bless') return []
      const at = here(s, a.owner)
      if (at === null || here(s, t.investigator) !== at || replenished(s, a)) return []
      return [
        { type: 'Log', key: 'log.ofudaReplenish', params: { card: cardName(code), asset: a.id } },
        ...(a.uses < 1 ? [{ type: 'AddUses' as const, asset: a.id, amount: 1 }] : []),
      ]
    },
  })
}

// --------------------------------------------------------------------------- Enemy attachments

/** Bolas: [combat] evasion; attached: -1 evade, exhausted after it moves. */
function registerBolas(code: string) {
  const spec: BasicEvent = {
    action: 'evade',
    skill: 'combat',
    tags: ['Tactic'],
    onSuccess: (ctx, e) => (e && !elite(e) ? [attach(ctx.investigator, code, e)] : []),
  }
  registerBasicEvent(code, spec)
  registerTreachery({
    code,
    revelation: () => [],
    attachedEnemy: { evade: -1 },
    forced: (s, t, self) => {
      const e = attachedEnemy(s, self)
      return e && t.type === 'enemyEntersLocation' && t.enemy === e.id && !e.exhausted
        ? [{ type: 'ExhaustEnemy', enemy: e.id }]
        : []
    },
  })
}

/** Fend Off: when a non-Elite enemy spawns at your location it attacks you, then is evaded. */
function registerFendOff(code: string) {
  registerPlayerCard({
    code,
    handReactions: (s, t, by) => {
      if (t.type !== 'enemySpawned' || !t.location || here(s, by) !== t.location) return []
      const e = s.enemies[t.enemy]
      if (!e || elite(e) || e.location !== t.location) return []
      return [
        {
          key: 'hand:' + code,
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
                {
                  type: 'EnemyAttack',
                  enemy: e.id,
                  investigator: by,
                  exhaustAfter: false,
                  evenIfExhausted: true,
                },
                { type: 'EvadeEnemy', enemy: e.id, by },
                attach(by, code, e),
              ],
            },
          ],
        },
      ]
    },
  })
  registerTreachery({ code, revelation: () => [], attachedEnemyCannotReady: true })
}

/** Grievous Wound: after a successful attack with a [[Melee]] asset; 1 damage each round end. */
function registerGrievousWound(code: string) {
  registerPlayerCard({
    code,
    handReactions: (s, t, by) => {
      if (
        t.type !== 'skillTestEnded' ||
        t.investigator !== by ||
        t.kind !== 'fight' ||
        !t.succeeded ||
        !t.enemy ||
        !t.source
      )
        return []
      const asset = s.assets[t.source]
      const e = s.enemies[t.enemy]
      if (!asset || !playerCardDef(asset.code)?.traits.includes('Melee') || !e || elite(e))
        return []
      return [
        {
          key: 'hand:' + code,
          investigator: by,
          label: 'ability.playCard',
          params: { card: cardName(code) },
          target: { type: 'hand', code },
          then: [{ type: 'PlayCard', investigator: by, code, effect: [attach(by, code, e)] }],
        },
      ]
    },
  })
  registerTreachery({
    code,
    revelation: () => [],
    forced: (s, t, self) => {
      const e = attachedEnemy(s, self)
      return e && t.type === 'roundEnds'
        ? [
            {
              type: 'DamageEnemy',
              enemy: e.id,
              amount: 1,
              ...(self.owner ? { by: self.owner } : {}),
              source: { code },
            },
          ]
        : []
    },
  })
}

/** Hunter's Mark: attach to an enemy at your location (limit 1 per enemy). */
function registerHuntersMark(code: string) {
  const marked = (s: GameState, e: Enemy) =>
    Object.values(s.treacheries).some(
      (t) => t.code === code && t.placement.type === 'enemy' && t.placement.enemy === e.id,
    )
  registerPlayerCard({
    code,
    canPlay: (s, by) => enemiesHere(s, by).some((e) => !marked(s, e)),
    play: (s, by) =>
      ask(
        by,
        enemyChoices(
          enemiesHere(s, by).filter((e) => !marked(s, e)),
          (e) => [attach(by, code, e)],
        ),
      ),
  })
  registerTreachery({
    code,
    revelation: () => [],
    attachedFightSkillBonus: 1,
    // "When damage is dealt to attached enemy": the window before the damage is applied, which
    // the engine opens for damage dealt by an investigator.
    reactions: (s, t, self): ReactionOption[] => {
      const e = attachedEnemy(s, self)
      if (!e || t.type !== 'beforeEnemyDamage' || t.enemy !== e.id) return []
      const who = [...new Set([t.investigator, ...(self.owner ? [self.owner] : [])])]
      return who.map((investigator) => ({
        key: self.id + ':mark',
        investigator,
        label: 'ability.huntersMark',
        params: { card: cardName(code), enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          { type: 'DiscardTreachery', treachery: self.id },
          { type: 'AdjustPendingEnemyDamage', enemy: e.id, amount: 1 },
        ],
      }))
    },
  })
}

/** Handcuffs: [combat] evasion of a Humanoid enemy; attached non-Elite enemies stay exhausted. */
function registerHandcuffs(code: string, upgraded: boolean) {
  registerPlayerCard({
    code,
    abilities: (s, a, by) =>
      engagedEnemies(s, by)
        .filter((e) => (e.traits ?? []).includes('Humanoid'))
        .map((e): AbilityOption => ({
          key: a.id + ':handcuffs',
          label: 'ability.evadeWith',
          params: { card: cardName(code), enemy: e.name, skill: 'combat' },
          target: { type: 'enemy', id: e.id },
          actions: 1,
          provokes: false,
          then: [
            {
              type: 'BeginSkillTest',
              investigator: by,
              skill: 'combat' as SkillType,
              difficulty: e.evade,
              source: a.id,
              kind: {
                type: 'evade',
                enemy: e.id,
                onSuccess: [
                  ...(upgraded
                    ? [
                        {
                          type: 'RemoveDoom' as const,
                          target: { type: 'enemy' as const, id: e.id },
                          amount: e.doom ?? 0,
                        },
                      ]
                    : []),
                  { ...attach(by, code, e), fromAsset: a.id },
                ],
              },
            },
          ],
        })),
  })
  registerTreachery({
    code,
    revelation: () => [],
    attachedNonEliteOnly: true,
    attachedEnemyCannotReady: true,
    attachedEnemyNoDoom: true,
  })
}

// --------------------------------------------------------------------------- Location attachments

/** Barricade: non-Elite enemies cannot move in; discarded when an investigator leaves. */
function registerBarricade(code: string) {
  registerPlayerCard({
    code,
    ...attachHere(code),
    locationAttachmentBarsEnemies: true,
    locationAttachmentForced: (_s, t, self) =>
      t.type === 'afterMove' && t.from === self.location ? [discardAttachment(self)] : [],
  })
}

/** Ambush: 2 damage to an enemy that spawns there; discarded if no investigator is there. */
function registerAmbush(code: string) {
  registerPlayerCard({
    code,
    ...attachHere(code),
    locationAttachmentForced: (s, t, self) => {
      if (investigatorsAt(s, self.location).length === 0) return [discardAttachment(self)]
      if (t.type !== 'enemySpawned' || t.location !== self.location || !s.enemies[t.enemy])
        return []
      return [
        {
          type: 'DamageEnemy',
          enemy: t.enemy,
          amount: 2,
          by: self.owner,
          source: { code },
        },
        discardAttachment(self),
      ]
    },
  })
}

/** Snare Trap: catches the next non-Elite enemy that enters; discarded when it would ready. */
function registerSnareTrap(code: string) {
  registerPlayerCard({
    code,
    ...attachHere(code, true),
    locationAttachmentForced: (s, t, self) => {
      const e = entering(s, t, self)
      if (!e || elite(e)) return []
      return [
        { type: 'ExhaustEnemy', enemy: e.id },
        { type: 'DisengageEnemy', enemy: e.id },
        { ...attach(self.owner, code, e), fromLocationAttachment: self.id },
      ]
    },
  })
  registerTreachery({ code, revelation: () => [], attachedDiscardInsteadOfReady: true })
}

/** Under Surveillance: evades a non-Elite enemy that enters and discovers 1 clue there. */
function registerUnderSurveillance(code: string) {
  registerPlayerCard({
    code,
    ...attachHere(code, true),
    locationAttachmentForced: (s, t, self) => {
      const e = entering(s, t, self)
      if (!e || elite(e)) return []
      return [
        discardAttachment(self),
        { type: 'EvadeEnemy', enemy: e.id, by: self.owner },
        { type: 'DiscoverClues', investigator: self.owner, amount: 1, location: self.location },
        { type: 'EnemyStaysExhausted', enemy: e.id },
      ]
    },
  })
}

/** Hiding Spot: non-Elite enemies there gain aloof; discarded if a ready enemy is there. */
function registerHidingSpot(code: string) {
  registerPlayerCard({
    code,
    canPlay: (s) => Object.keys(s.locations).length > 0,
    play: (s, by) =>
      ask(
        by,
        Object.values(s.locations).map((l): Choice => ({
          label: 'choice.attachTo',
          params: { card: cardName(code), location: l.name },
          target: { type: 'location', id: l.id },
          then: [{ type: 'AttachEventToLocation', investigator: by, code, location: l.id }],
        })),
        true,
      ),
    locationAttachmentEnemyKeywords: ['aloof'],
    locationAttachmentForced: (s, t, self) =>
      t.type === 'enemyPhaseEnds' && enemiesAt(s, self.location).some((e) => !e.exhausted)
        ? [discardAttachment(self)]
        : [],
  })
}

/** Lure: in the enemy phase, moving enemies go toward it; discarded at the end of the round. */
function registerLure(code: string, connecting: boolean) {
  const spots = (s: GameState, by: InvestigatorId) => {
    const at = here(s, by)
    if (at === null) return []
    return connecting
      ? [at, ...getLocation(s, at).connections.filter((id) => s.locations[id])]
      : [at]
  }
  registerPlayerCard({
    code,
    canPlay: (s, by) => spots(s, by).length > 0,
    play: (s, by) =>
      ask(
        by,
        spots(s, by).map((id): Choice => ({
          label: 'choice.attachTo',
          params: { card: cardName(code), location: getLocation(s, id).name },
          target: { type: 'location', id },
          then: [{ type: 'AttachEventToLocation', investigator: by, code, location: id }],
        })),
      ),
    locationAttachmentLure: true,
    locationAttachmentForced: (_s, t, self) =>
      t.type === 'roundEnds' ? [discardAttachment(self)] : [],
  })
}

/** Map the Area: investigation adding [willpower] or [agility]; attached: tests there -1. */
function registerMapTheArea(code: string) {
  const spec = (skill: 'willpower' | 'agility'): BasicEvent => ({
    action: 'investigate',
    modifier: (ctx) => getInvestigator(ctx.state, ctx.investigator).skills[skill],
    replaceClue: true,
    onSuccess: (ctx) => [continuation(code, ctx.investigator, 'map')],
  })
  registerPlayerCard({
    code,
    investigateAction: true,
    canPlay: (s, by) => here(s, by) !== null,
    play: (s, by) => {
      const ctx = { state: s, investigator: by, code }
      // Limit 1 per location: with one already attached, the test discovers clues normally.
      const taken = sameTitleAt(s, code, here(s, by)!)
      return ask(
        by,
        (['willpower', 'agility'] as const).map((skill) => {
          const test = basicTest({ ...spec(skill), replaceClue: !taken }, ctx)
          return {
            label: 'choice.mapTheArea',
            params: { card: cardName(code), skill },
            then: [test],
          }
        }),
        true,
      )
    },
    effect: (s, by, step) => {
      const at = s.skillTest?.kind.type === 'investigate' ? s.skillTest.kind.location : null
      if (step !== 'map' || at === null || sameTitleAt(s, code, at)) return []
      return [{ type: 'AttachEventToLocation', investigator: by, code, location: at }]
    },
    locationAttachmentTestDifficulty: -1,
  })
}

/** Breach the Door: [combat] (1); attached with 1 lead per point succeeded by; -1 shroud each. */
function registerBreachTheDoor(code: string) {
  registerPlayerCard({
    code,
    canPlay: (s, by) => here(s, by) !== null,
    play: (_s, by) => [
      {
        type: 'BeginSkillTest',
        investigator: by,
        skill: 'combat',
        difficulty: 1,
        effectSource: code,
        kind: {
          type: 'effect',
          source: code,
          onSuccess: [continuation(code, by, 'breach')],
          onFail: [],
          onFailEach: [],
        },
      },
    ],
    effect: (s, by, step) => {
      const at = here(s, by)
      if (step !== 'breach' || at === null || !s.skillTest) return []
      const leads = Math.max(0, testMargin(s.skillTest))
      return [
        {
          type: 'AttachEventToLocation',
          investigator: by,
          code,
          location: at,
          ...(leads ? { resources: leads } : {}),
        },
      ]
    },
    locationAttachmentShroud: (_s, self) => -(self.resources ?? 0),
  })
}

/** Vantage Point: after a location enters play or is revealed during a turn. */
function registerVantagePoint(code: string) {
  registerPlayerCard({
    code,
    handReactions: (s, t, by) => {
      if (
        (t.type !== 'afterRevealLocation' && t.type !== 'afterPutLocation') ||
        s.phase !== 'investigation' ||
        !s.activeTurn ||
        !s.locations[t.location]
      )
        return []
      return [
        {
          key: 'hand:' + code + ':' + t.location,
          investigator: by,
          label: 'ability.playCard',
          params: { card: cardName(code) },
          target: { type: 'hand', code },
          then: [
            {
              type: 'PlayCard',
              investigator: by,
              code,
              effect: [continuation(code, by, 'vantage', { location: t.location })],
            },
          ],
        },
      ]
    },
    effect: (s, by, step, data) => {
      const target = String(data.location)
      if (step !== 'vantage' || !s.locations[target]) return []
      const owner = s.activeTurn ?? by
      const sources = Object.values(s.locations).filter((l) => l.id !== target && l.clues > 0)
      return [
        { type: 'TurnShroudModifier', location: target, amount: -1, investigator: owner },
        ...ask(
          by,
          [
            ...sources.map((l): Choice => ({
              label: 'choice.vantageClue',
              params: { from: l.name, location: getLocation(s, target).name },
              target: { type: 'location', id: l.id },
              then: [
                {
                  type: 'MoveClues',
                  from: { type: 'location', id: l.id },
                  to: { type: 'location', id: target },
                  amount: 1,
                },
              ],
            })),
            { label: 'choice.skip', then: [] },
          ],
          sources.length > 0,
        ),
      ]
    },
  })
}

const REGISTER: Record<string, () => void> = {
  '03108': () => registerAnatomicalDiagrams('03108'),
  '02228': () => registerExposeWeakness('02228', false),
  '04195': () => registerExposeWeakness('04195', true),
  '05157': () => registerWither('05157', false),
  '05321': () => registerWither('05321', true),
  '05158': () => registerSixthSense('05158'),
  '10022': () => registerOfuda('10022'),
  '09025': () => registerBolas('09025'),
  '08082': () => registerFendOff('08082'),
  '09027': () => registerGrievousWound('09027'),
  '11026': () => registerHuntersMark('11026'),
  '04265': () => registerHandcuffs('04265', false),
  '09035': () => registerHandcuffs('09035', true),
  '01038': () => registerBarricade('01038'),
  '01538': () => registerBarricade('01538'),
  '03148': () => registerAmbush('03148'),
  '03199': () => registerSnareTrap('03199'),
  '07157': () => registerUnderSurveillance('07157'),
  '03038': () => registerHidingSpot('03038'),
  '02156': () => registerLure('02156', false),
  '05323': () => registerLure('05323', true),
  '09048': () => registerMapTheArea('09048'),
  '09026': () => registerBreachTheDoor('09026'),
  '04306': () => registerVantagePoint('04306'),
}

export function registerLastingAttachment(code: string): void {
  const register = REGISTER[code]
  if (!register) throw new Error('Unreviewed lasting attachment: ' + code)
  register()
}
