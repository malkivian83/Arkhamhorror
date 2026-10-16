/**
 * Cartas de jugador de la caja básica de 2026: datos (generados con
 * scripts/import-core-2026.mjs, sin texto), investigadores, mazos iniciales y
 * el comportamiento de las cartas ya implementadas.
 */
import {
  enemiesAt,
  engagedEnemies,
  getInvestigator,
  getLocation,
  registerPlayerCard,
  registerPlayerCards,
  type AbilityOption,
  type Asset,
  type GameState,
  type InvestigatorId,
  type InvestigatorSetup,
  type Message,
  type PlayerCardDef,
  type SkillType,
} from '@lcg/engine'
import data from '../data/core-2026.json'

export const playerCards = data as PlayerCardDef[]
registerPlayerCards(playerCards)

/** Código de carta a partir del número de colección de la caja (p. ej. 20 → "12020"). */
export const code = (position: number) => `12${String(position).padStart(3, '0')}`

const def = (position: number): PlayerCardDef => {
  const found = playerCards.find((c) => c.code === code(position))
  if (!found) throw new Error(`Carta desconocida: ${position}`)
  return found
}

// ---------------------------------------------------------------------------
// Mazos iniciales (reglamento, páginas 25–29)
// ---------------------------------------------------------------------------

type DeckList = {
  investigator: number
  cards: [position: number, copies?: number][]
  weaknesses: number[]
}

export const STARTER_DECKS: Record<string, DeckList> = {
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

/**
 * Investigador listo para `createGame` con su mazo inicial. Las debilidades aún
 * no se incluyen (su revelación está pendiente).
 */
export function starterInvestigator(key: keyof typeof STARTER_DECKS): InvestigatorSetup {
  const list = STARTER_DECKS[key]
  if (!list) throw new Error(`Mazo desconocido: ${key}`)
  const investigator = def(list.investigator) as PlayerCardDef & {
    skills: Record<SkillType, number>
    elderSignModifier?: number
  }
  return {
    id: investigator.code,
    name: investigator.name,
    skills: { ...investigator.skills },
    health: investigator.health ?? 0,
    sanity: investigator.sanity ?? 0,
    elderSignModifier: investigator.elderSignModifier ?? 0,
    deck: list.cards.flatMap(([position, copies = 1]) =>
      Array.from({ length: copies }, () => code(position)),
    ),
  }
}

// ---------------------------------------------------------------------------
// Ayudas para escribir cartas
// ---------------------------------------------------------------------------

const name = (position: number) => def(position).name

/** Enemigos a los que el investigador puede atacar en su localización. */
function attackable(state: GameState, investigator: InvestigatorId) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return enemiesAt(state, here).filter(
    (e) => e.engagedWith !== null || !e.keywords.includes('aloof'),
  )
}

interface FightOptions {
  skill?: SkillType
  modifier?: number | ((state: GameState, investigator: InvestigatorId) => number)
  extraDamage?: (state: GameState, investigator: InvestigatorId, enemyId: string) => number
  cost?: Message[]
  onSuccess?: (asset: Asset) => Message[]
  available?: (asset: Asset) => boolean
}

/** Habilidad "[acción]: Luchar" de un apoyo, una opción por enemigo atacable. */
function fightAbility(position: number, options: FightOptions = {}) {
  return (state: GameState, self: Asset, investigator: InvestigatorId): AbilityOption[] => {
    if (options.available && !options.available(self)) return []
    return attackable(state, investigator).map((enemy) => {
      const modifier =
        typeof options.modifier === 'function'
          ? options.modifier(state, investigator)
          : (options.modifier ?? 0)
      return {
        key: `${self.id}:fight`,
        label: 'ability.fightWith',
        params: { card: name(position), enemy: enemy.name },
        target: { type: 'enemy', id: enemy.id },
        actions: 1,
        provokes: false,
        then: [
          ...(options.cost ?? []).map((m) => ({ ...m, asset: self.id }) as Message),
          {
            type: 'BeginSkillTest',
            investigator,
            skill: options.skill ?? 'combat',
            difficulty: enemy.fight,
            modifier,
            kind: {
              type: 'fight',
              enemy: enemy.id,
              extraDamage: options.extraDamage?.(state, investigator, enemy.id) ?? 0,
              onSuccess: options.onSuccess?.(self) ?? [],
            },
          },
        ],
      }
    })
  }
}

interface InvestigateOptions {
  skills?: SkillType[]
  modifier?: number
  extraClues?: number
  cost?: (asset: Asset) => Message[]
  onSuccess?: Message[]
  available?: (asset: Asset) => boolean
}

/** Habilidad "[acción]: Investigar" de un apoyo. Provoca ataques de oportunidad. */
function investigateAbility(position: number, options: InvestigateOptions = {}) {
  return (state: GameState, self: Asset, investigator: InvestigatorId): AbilityOption[] => {
    if (options.available && !options.available(self)) return []
    const here = getInvestigator(state, investigator).location
    if (here === null) return []
    const location = getLocation(state, here)
    return (options.skills ?? ['intellect']).map((skill) => ({
      key: `${self.id}:investigate`,
      label: 'ability.investigateWith',
      params: { card: name(position), skill },
      target: { type: 'location', id: here },
      actions: 1,
      provokes: true,
      then: [
        ...(options.cost?.(self) ?? []),
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty: location.shroud,
          modifier: options.modifier ?? 0,
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

const spendUse = (asset: Asset): Message => ({ type: 'SpendUses', asset: asset.id, amount: 1 })
const hasUses = (asset: Asset) => asset.uses > 0

// ---------------------------------------------------------------------------
// Armas
// ---------------------------------------------------------------------------

// Daniela's Wrench: Luchar con +2 [combat]. (Pendiente: su habilidad rápida y el +1 daño.)
registerPlayerCard({ code: code(2), abilities: fightAbility(2, { modifier: 2 }) })

// Isabelle's Twin .45s: gasta 1 munición: Luchar +1 [combat], +1 daño. (Pendiente: segunda reacción.)
registerPlayerCard({
  code: code(14),
  abilities: (state, self, investigator) =>
    fightAbility(14, {
      modifier: 1,
      extraDamage: () => 1,
      available: hasUses,
      cost: [spendUse(self)],
    })(state, self, investigator),
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

// Cosmic Flame: Luchar ([willpower]); si aciertas, gasta 1 carga para +1 daño.
// (Simplificado: la carga se gasta siempre que queden. Pendiente: efecto de la calavera.)
registerPlayerCard({
  code: code(59),
  abilities: (state, self, investigator) =>
    fightAbility(59, {
      skill: 'willpower',
      onSuccess: (asset) => (asset.uses > 0 ? [spendUse(asset)] : []),
      extraDamage: () => (self.uses > 0 ? 1 : 0),
    })(state, self, investigator),
})

// Meat Cleaver: Luchar +1 [combat] (+2 con 3 o menos de cordura restante).
registerPlayerCard({
  code: code(77),
  abilities: fightAbility(77, {
    modifier: (state, investigator) => {
      const i = getInvestigator(state, investigator)
      return i.sanity - i.horror <= 3 ? 2 : 1
    },
  }),
})

// Broken Bottle: Luchar +1 [combat]. (Pendiente: descartarla para +1 daño.)
registerPlayerCard({ code: code(86), abilities: fightAbility(86, { modifier: 1 }) })

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

// Hand-Crank Flashlight: Investigar +1 [intellect]. (Pendiente: descartarla para −1 velo.)
registerPlayerCard({ code: code(88), abilities: investigateAbility(88, { modifier: 1 }) })

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Scene of the Crime: solo como primera acción; descubre 1 pista (2 si hay un enemigo).
// (Pendiente: no debería provocar ataques de oportunidad.)
registerPlayerCard({
  code: code(24),
  canPlay: (state, investigator) => getInvestigator(state, investigator).actionsRemaining === 3,
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
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && test.kind.type === 'fight'
      ? [{ type: 'DamageEnemy', enemy: test.kind.enemy, amount: 1 }]
      : [],
})

// Deduction: si la prueba tiene éxito investigando, descubre 1 pista más.
registerPlayerCard({
  code: code(39),
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && test.kind.type === 'investigate'
      ? [{ type: 'DiscoverClues', investigator: test.investigator, amount: 1 }]
      : [],
})

// Guts, Manual Dexterity, Overpower, Perception: si la prueba tiene éxito, roba 1 carta.
for (const position of [90, 91, 92, 93]) {
  registerPlayerCard({ code: code(position), afterCommittedTest: drawOnSuccess() })
}
