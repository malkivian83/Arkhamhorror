/**
 * Cartas de jugador de la caja básica de 2026: datos (generados con
 * scripts/import-core-2026.mjs, sin texto), investigadores, mazos iniciales y
 * el comportamiento de las cartas ya implementadas.
 */
import {
  enemiesAt,
  enemyHasKeyword,
  engagedEnemies,
  getInvestigator,
  getLocation,
  shroudOf,
  registerPlayerCard,
  registerPlayerCards,
  playerCardDef,
  type AbilityOption,
  type Asset,
  type GameState,
  type InvestigatorId,
  type CardCode,
  type InvestigatorSetup,
  type Message,
  type PlayerCardDef,
  type SkillType,
} from '@lcg/engine'
import data from '../data/core-2026.json'
import pete from '../data/ashcan-pete.json'

/**
 * Reverso de cada investigador (datos públicos de ArkhamDB): tamaño del mazo,
 * opciones de construcción y cartas exclusivas (las dos que lo siguen en la caja).
 */
const DECKBUILDING: Record<number, Pick<PlayerCardDef, 'deckSize' | 'deckOptions'>> = {
  1: { deckSize: 30, deckOptions: [option(['guardian', 'neutral'], 5), option(['survivor'], 2)] },
  4: { deckSize: 30, deckOptions: [option(['seeker', 'neutral'], 5), option(['guardian'], 2)] },
  7: { deckSize: 30, deckOptions: [option(['rogue', 'neutral'], 5), option(['seeker'], 2)] },
  10: { deckSize: 30, deckOptions: [option(['mystic', 'neutral'], 5), option(['rogue'], 2)] },
  13: { deckSize: 30, deckOptions: [option(['survivor', 'neutral'], 5), option(['mystic'], 2)] },
}
function option(classes: string[], maxLevel: number) {
  return { classes, maxLevel }
}
function boxCode(position: number) {
  return `12${String(position).padStart(3, '0')}`
}

export const playerCards: PlayerCardDef[] = (data as PlayerCardDef[]).map((card) => {
  const position = Number(card.code.slice(2))
  const rules = DECKBUILDING[position]
  return rules
    ? { ...card, ...rules, signatures: [boxCode(position + 1), boxCode(position + 2)] }
    : card
})
registerPlayerCards([...playerCards, ...(pete as PlayerCardDef[])])

/** Código de carta a partir del número de colección de la caja (p. ej. 20 → "12020"). */
export const code = (position: number) => `12${String(position).padStart(3, '0')}`

export const def = (position: number): PlayerCardDef => {
  const found = playerCards.find((c) => c.code === code(position))
  if (!found) throw new Error(`Carta desconocida: ${position}`)
  return found
}

// ---------------------------------------------------------------------------
// Mazos iniciales (reglamento, páginas 25–29)
// ---------------------------------------------------------------------------

type DeckList = {
  investigator: number
  investigatorCode?: string
  cardCodes?: string[]
  cards: [position: number, copies?: number][]
  weaknesses: number[]
}

export const STARTER_DECKS: Record<string, DeckList> = {
  pete: {
    investigator: 5,
    investigatorCode: '02005',
    cards: [],
    weaknesses: [],
    cardCodes: [
      '02014',
      '02015',
      '12102',
      ...[
        '01072',
        '03114',
        '01075',
        '02032',
        '02033',
        '03039',
        '04112',
        '04201',
        '02155',
        '01087',
        '12089',
        '12090',
        '12091',
        '12092',
        '12094',
      ].flatMap((c) => [c, c]),
    ],
  },
  daniela: {
    investigator: 1,
    cards: [
      [2],
      [16],
      [17],
      [18],
      [19],
      [20],
      [21],
      [72],
      [73],
      [74],
      [75],
      [76],
      [77],
      [86, 2],
      [88, 2],
      [22],
      [23],
      [24],
      [78],
      [79],
      [89, 2],
      [25],
      [80],
      [81],
      [92, 2],
      [94, 2],
    ],
    weaknesses: [3, 104],
  },
  joe: {
    investigator: 4,
    cards: [
      [30],
      [31],
      [32],
      [33],
      [34],
      [35],
      [16],
      [17],
      [18],
      [19],
      [20],
      [21],
      [87, 2],
      [88, 2],
      [5],
      [36],
      [37],
      [38],
      [22],
      [23],
      [24],
      [89, 2],
      [39],
      [25],
      [93, 2],
      [92, 2],
    ],
    weaknesses: [6, 100],
  },
  trish: {
    investigator: 7,
    cards: [
      [8],
      [44],
      [45],
      [46],
      [47],
      [48],
      [49],
      [30],
      [31],
      [32],
      [33],
      [34],
      [35],
      [86, 2],
      [88, 2],
      [50],
      [51],
      [52],
      [36],
      [37],
      [38],
      [89, 2],
      [53],
      [39],
      [91, 2],
      [93, 2],
    ],
    weaknesses: [9, 103],
  },
  dexter: {
    investigator: 10,
    cards: [
      [58],
      [59],
      [60],
      [61],
      [62],
      [63],
      [44],
      [45],
      [46],
      [47],
      [48],
      [49],
      [86, 2],
      [88, 2],
      [11],
      [64],
      [65],
      [66],
      [50],
      [51],
      [52],
      [89, 2],
      [67],
      [53],
      [90, 2],
      [91, 2],
    ],
    weaknesses: [12, 101],
  },
  isabelle: {
    investigator: 13,
    cards: [
      [14],
      [72],
      [73],
      [74],
      [75],
      [76],
      [77],
      [58],
      [59],
      [60],
      [61],
      [62],
      [63],
      [86, 2],
      [88, 2],
      [78],
      [79],
      [64],
      [65],
      [66],
      [89, 2],
      [80],
      [81],
      [67],
      [94, 2],
      [90, 2],
    ],
    weaknesses: [15, 102],
  },
}

/** Investigador listo para `createGame` con su mazo inicial y sus debilidades. */
export function starterInvestigator(key: keyof typeof STARTER_DECKS): InvestigatorSetup {
  const list = STARTER_DECKS[key]
  if (!list) throw new Error(`Mazo desconocido: ${key}`)
  return investigatorSetup(list.investigatorCode ?? code(list.investigator), starterDeck(key))
}

/** Lista de cartas del mazo inicial (con sus debilidades). */
export function starterDeck(key: keyof typeof STARTER_DECKS): CardCode[] {
  const list = STARTER_DECKS[key]
  if (!list) throw new Error(`Mazo desconocido: ${key}`)
  if (list.cardCodes) return [...list.cardCodes]
  return [
    ...list.cards.flatMap(([position, copies = 1]) =>
      Array.from({ length: copies }, () => code(position)),
    ),
    ...list.weaknesses.map(code),
  ]
}

/** Investigador listo para empezar un escenario con este mazo. */
export function investigatorSetup(investigatorCode: CardCode, deck: CardCode[]): InvestigatorSetup {
  const investigator = playerCardDef(investigatorCode) as
    (PlayerCardDef & { skills: Record<SkillType, number>; elderSignModifier?: number }) | undefined
  if (!investigator) throw new Error(`Investigador desconocido: ${investigatorCode}`)
  return {
    id: investigator.code,
    name: investigator.name,
    skills: { ...investigator.skills },
    health: investigator.health ?? 0,
    sanity: investigator.sanity ?? 0,
    elderSignModifier: investigator.elderSignModifier ?? 0,
    deck: [...deck],
  }
}

// ---------------------------------------------------------------------------
// Ayudas para escribir cartas
// ---------------------------------------------------------------------------

export const name = (position: number) => def(position).name

/** Enemigos a los que el investigador puede atacar en su localización. */
export function attackable(state: GameState, investigator: InvestigatorId) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return enemiesAt(state, here).filter(
    (e) => e.engagedWith !== null || !enemyHasKeyword(state, e, 'aloof'),
  )
}

interface FightOptions {
  skill?: SkillType
  tags?: string[]
  /** Acciones que cuesta (por defecto 1) y sufijo de la clave si el apoyo tiene varias. */
  actions?: number
  key?: string
  /** Campos extra del ataque contra este enemigo (al derrotarlo, daño por margen…). */
  attack?: (
    asset: Asset,
    enemyId: string,
  ) => { onDefeat?: Message[]; bonusPerSuccess?: number; failDamagePerPoint?: number }
  modifier?: number | ((state: GameState, investigator: InvestigatorId) => number)
  extraDamage?: (state: GameState, investigator: InvestigatorId, enemyId: string) => number
  cost?: Message[]
  onSuccess?: (asset: Asset) => Message[]
  available?: (asset: Asset) => boolean
}

/** Habilidad "[acción]: Luchar" de un apoyo, una opción por enemigo atacable. */
export function fightAbility(position: number, options: FightOptions = {}) {
  return (state: GameState, self: Asset, investigator: InvestigatorId): AbilityOption[] => {
    if (options.available && !options.available(self)) return []
    return attackable(state, investigator).map((enemy) => {
      const modifier =
        typeof options.modifier === 'function'
          ? options.modifier(state, investigator)
          : (options.modifier ?? 0)
      return {
        key: `${self.id}:fight${options.key ?? ''}`,
        label: (options.actions ?? 1) > 1 ? 'ability.heavyFightWith' : 'ability.fightWith',
        params: { card: name(position), enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        actions: options.actions ?? 1,
        provokes: false,
        then: [
          ...(options.cost ?? []).map((m) => ({ ...m, asset: self.id }) as Message),
          {
            type: 'BeginSkillTest',
            investigator,
            skill: options.skill ?? 'combat',
            difficulty: enemy.fight,
            modifier,
            source: self.id,
            ...(options.tags ? { tags: options.tags } : {}),
            kind: {
              type: 'fight',
              enemy: enemy.id,
              extraDamage: options.extraDamage?.(state, investigator, enemy.id) ?? 0,
              onSuccess: options.onSuccess?.(self) ?? [],
              ...options.attack?.(self, enemy.id),
            },
          },
        ],
      }
    })
  }
}

interface InvestigateOptions {
  skills?: SkillType[]
  tags?: string[]
  modifier?: number
  /** Cambio del velo de tu localización solo para esta investigación (Old Compass: −1). */
  shroud?: number
  extraClues?: number
  cost?: (asset: Asset) => Message[]
  onSuccess?: Message[]
  available?: (asset: Asset) => boolean
}

/** Habilidad "[acción]: Investigar" de un apoyo. Provoca ataques de oportunidad. */
export function investigateAbility(position: number, options: InvestigateOptions = {}) {
  return (state: GameState, self: Asset, investigator: InvestigatorId): AbilityOption[] => {
    if (options.available && !options.available(self)) return []
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    return (options.skills ?? ['intellect']).map((skill) => ({
      key: `${self.id}:investigate`,
      label: 'ability.investigateWith',
      params: { card: name(position), skill },
      target: { type: 'location', id: here },
      // FAQ 1.6: los costes adicionales de investigar la localización (Waterfront) también
      // se pagan al investigar con una carta.
      actions: 1 + (getLocation(state, here).investigateExtraActions ?? 0),
      provokes: true,
      costs: options.cost?.(self) ?? [],
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: Math.max(0, shroudOf(state, here) + (options.shroud ?? 0)),
          modifier: options.modifier ?? 0,
          source: self.id,
          ...(options.tags ? { tags: options.tags } : {}),
          kind: {
            type: 'investigate',
            location: here,
            extraClues: options.extraClues ?? 0,
            onSuccess: options.onSuccess ?? [],
          },
        },
      ],
    }))
  }
}

export const spendUse = (asset: Asset): Message => ({
  type: 'SpendUses',
  asset: asset.id,
  amount: 1,
})
export const hasUses = (asset: Asset) => asset.uses > 0

/** "Si tienes éxito, puedes…": pregunta opcional al investigador. */
export function mayChoose(
  investigator: InvestigatorId,
  label: string,
  params: Record<string, string | number>,
  then: Message[],
): Message {
  return {
    type: 'Ask',
    investigator,
    question: {
      kind: 'chooseOne',
      prompt: 'prompt.optional',
      choices: [
        { label, params, then },
        { label: 'choice.skip', then: [] },
      ],
    },
  }
}

// ---------------------------------------------------------------------------
// Armas
// ---------------------------------------------------------------------------

// Daniela's Wrench: [rápida] agótala: un enemigo de tu localización se enfrenta a ti
// y ataca. [acción]: Luchar +2 [combat]; +1 daño si ese enemigo te ha atacado esta ronda.
registerPlayerCard({
  code: code(2),
  abilities: (state, self, investigator) => {
    const attackedMe = (enemy: string) =>
      (state.enemyAttacks ?? []).some(
        (a) => a.enemy === enemy && a.investigator === investigator && a.round === state.round,
      )
    const fights = fightAbility(2, {
      modifier: 2,
      extraDamage: (_s, _i, enemy) => (attackedMe(enemy) ? 1 : 0),
    })(state, self, investigator)
    const here = getInvestigator(state, investigator).location
    const provoke: AbilityOption[] =
      self.exhausted || here === null
        ? []
        : enemiesAt(state, here).map((enemy) => ({
            key: `${self.id}:provoke`,
            label: 'ability.wrenchProvoke',
            params: { enemy: enemy.name },
            target: { type: 'enemy', id: enemy.id },
            actions: 0,
            provokes: false,
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              { type: 'EngageEnemy', enemy: enemy.id, investigator },
              { type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false },
            ],
          }))
    return [...fights, ...provoke]
  },
})

// Isabelle's Twin .45s: gasta 1 munición: Luchar +1 [combat], +1 daño. Después,
// [reacción] gasta 1 munición y agótalas: Luchar ([agility]) +1 [agility], +1 daño.
registerPlayerCard({
  code: code(14),
  abilities: (state, self, investigator) =>
    fightAbility(14, {
      modifier: 1,
      extraDamage: () => 1,
      available: hasUses,
      cost: [spendUse(self)],
    })(state, self, investigator),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'skillTestEnded' || trigger.source !== self.id) return []
    if (trigger.kind !== 'fight' || self.exhausted || self.uses <= 0 || state.skillTest) return []
    const enemy = trigger.enemy ? state.enemies[trigger.enemy] : undefined
    const here = getInvestigator(state, self.owner).location
    if (!enemy || enemy.location !== here) return []
    return [
      {
        key: `${self.id}:second`,
        investigator: self.owner,
        label: 'ability.twinSecond',
        params: { enemy: enemy.name },
        then: [
          spendUse(self),
          { type: 'ExhaustAsset', asset: self.id },
          {
            type: 'BeginSkillTest',
            investigator: self.owner,
            skill: 'agility',
            difficulty: enemy.fight,
            modifier: 1,
            kind: { type: 'fight', enemy: enemy.id, extraDamage: 1 },
          },
        ],
      },
    ]
  },
})

// M1911: gasta 1 munición: Luchar +1 [combat], +1 daño.
registerPlayerCard({
  code: code(19),
  abilities: (state, self, investigator) =>
    fightAbility(19, {
      modifier: 1,
      extraDamage: () => 1,
      available: hasUses,
      cost: [spendUse(self)],
    })(state, self, investigator),
})

// Machete: Luchar +1 [combat]; +1 daño si es el único enemigo enfrentado contigo.
registerPlayerCard({
  code: code(20),
  abilities: fightAbility(20, {
    modifier: 1,
    extraDamage: (state, investigator, enemy) => {
      const engaged = engagedEnemies(state, investigator)
      return engaged.length === 1 && engaged[0]?.id === enemy ? 1 : 0
    },
  }),
})

// M1903 Hammerless: gasta 1 munición: Luchar ([agility]); +1 daño si el enemigo está agotado.
registerPlayerCard({
  code: code(45),
  abilities: (state, self, investigator) =>
    fightAbility(45, {
      skill: 'agility',
      extraDamage: (s, _i, enemy) => (s.enemies[enemy]?.exhausted ? 1 : 0),
      available: hasUses,
      cost: [spendUse(self)],
    })(state, self, investigator),
})

// Cosmic Flame: Luchar ([willpower]); si aciertas, puedes gastar 1 carga para +1 daño.
// Si revelas una calavera, retira 1 carga (si no puedes, 1 daño y descártala).
registerPlayerCard({
  code: code(59),
  abilities: (state, self, investigator) =>
    attackable(state, investigator).flatMap((enemy) =>
      fightAbility(59, {
        skill: 'willpower',
        tags: ['spell'],
        onSuccess: (asset) =>
          asset.uses > 0
            ? [
                mayChoose(investigator, 'choice.spendChargeForDamage', {}, [
                  spendUse(asset),
                  { type: 'DamageEnemy', enemy: enemy.id, amount: 1, by: investigator },
                ]),
              ]
            : [],
      })(state, self, investigator).filter(
        (a) => a.target?.type === 'enemy' && a.target.id === enemy.id,
      ),
    ),
  onTokenRevealed: (_state, token, self) =>
    token !== 'skull'
      ? []
      : self.uses > 0
        ? [spendUse(self)]
        : [
            { type: 'TakeDamage', investigator: self.owner, damage: 1, horror: 0, direct: true },
            { type: 'DiscardAsset', asset: self.id },
          ],
})

// Broken Bottle: Luchar +1 [combat]. Si aciertas, puedes descartarla para +1 daño.
registerPlayerCard({
  code: code(86),
  abilities: (state, self, investigator) =>
    attackable(state, investigator).flatMap((enemy) =>
      fightAbility(86, {
        modifier: 1,
        onSuccess: (asset) => [
          mayChoose(investigator, 'choice.discardForDamage', { card: name(86) }, [
            { type: 'DiscardAsset', asset: asset.id },
            { type: 'DamageEnemy', enemy: enemy.id, amount: 1, by: investigator },
          ]),
        ],
      })(state, self, investigator).filter(
        (a) => a.target?.type === 'enemy' && a.target.id === enemy.id,
      ),
    ),
})

// ---------------------------------------------------------------------------
// Herramientas de investigación
// ---------------------------------------------------------------------------

// Fingerprint Kit: agota y gasta 1 suministro: Investigar +1 [intellect], 1 pista más.
registerPlayerCard({
  code: code(31),
  abilities: investigateAbility(31, {
    modifier: 1,
    extraClues: 1,
    available: (a) => !a.exhausted && hasUses(a),
    cost: (a) => [{ type: 'ExhaustAsset', asset: a.id }, spendUse(a)],
  }),
})

// Magnifying Glass: +1 [intellect] al investigar.
registerPlayerCard({
  code: code(34),
  skillModifier: (_state, _self, test) => (test.kind.type === 'investigate' ? 1 : 0),
})

// Thieves' Kit: gasta 1 suministro: Investigar con [agility] o [intellect]; si aciertas, +1 recurso.
registerPlayerCard({
  code: code(49),
  abilities: (state, self, investigator) =>
    investigateAbility(49, {
      skills: ['intellect', 'agility'],
      available: hasUses,
      cost: (a) => [spendUse(a)],
      onSuccess: [{ type: 'GainResources', investigator, amount: 1 }],
    })(state, self, investigator),
})

// Hand-Crank Flashlight: Investigar +1 [intellect]. Si tienes éxito, puedes descartarla:
// el velo de tu localización baja 1 hasta el final de la ronda.
registerPlayerCard({
  code: code(88),
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const onSuccess: Message[] =
      here === null
        ? []
        : [
            mayChoose(investigator, 'choice.discardForShroud', { card: name(88) }, [
              { type: 'DiscardAsset', asset: self.id },
              { type: 'ModifyShroud', location: here, amount: -1 },
            ]),
          ]
    return investigateAbility(88, { modifier: 1, onSuccess })(state, self, investigator)
  },
})

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Scene of the Crime: solo como primera acción; descubre 1 pista (2 si hay un enemigo).
// No provoca ataques de oportunidad.
registerPlayerCard({
  code: code(24),
  noAttacksOfOpportunity: true,
  // FAQ 2.18: solo como acción de tu turno (nunca rápida ni fuera de turno), y la primera.
  canPlay: (state, investigator) =>
    state.activeTurn === investigator &&
    (getInvestigator(state, investigator).actionsTaken ?? 0) === 0,
  play: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    const enemyHere = here !== null && enemiesAt(state, here).length > 0
    return [{ type: 'DiscoverClues', investigator, amount: enemyHere ? 2 : 1 }]
  },
})

// Working a Hunch: rápido, solo durante tu turno: descubre 1 pista en tu localización.
registerPlayerCard({
  code: code(38),
  canPlay: (state, investigator) => {
    const here = getInvestigator(state, investigator).location
    return here !== null && getLocation(state, here).clues > 0
  },
  play: (_state, investigator) => [{ type: 'DiscoverClues', investigator, amount: 1 }],
})

// Emergency Cache: obtienes 3 recursos.
registerPlayerCard({
  code: code(89),
  play: (_state, investigator) => [{ type: 'GainResources', investigator, amount: 3 }],
})

// ---------------------------------------------------------------------------
// Habilidades (cartas para comprometer)
// ---------------------------------------------------------------------------

const drawOnSuccess =
  () =>
  (_state: GameState, _test: unknown, succeeded: boolean, by: InvestigatorId): Message[] =>
    succeeded ? [{ type: 'DrawCards', investigator: by, amount: 1 }] : []

// Vicious Blow: si la prueba tiene éxito durante un ataque, +1 daño.
registerPlayerCard({
  code: code(25),
  committedAttackDamage: () => 1,
})

// Deduction: si la prueba tiene éxito investigando, descubre 1 pista más.
registerPlayerCard({
  code: code(39),
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && test.kind.type === 'investigate'
      ? [
          {
            type: 'DiscoverClues',
            investigator: test.investigator,
            amount: 1,
            location: test.kind.location,
          },
        ]
      : [],
})

// Guts, Manual Dexterity, Overpower, Perception: si la prueba tiene éxito, roba 1 carta.
for (const position of [90, 91, 92, 93]) {
  registerPlayerCard({ code: code(position), afterCommittedTest: drawOnSuccess() })
}

// Printed soak and skill icons are resolved by the generic engine rules.
for (const position of [21, 87, 94]) registerPlayerCard({ code: code(position) })
