/**
 * La fiesta del Valle de la Cicuta, Escenario: La hermana perdida (guía, pp. 23–26).
 * Mazo de Cavernas, Lugares Oscuros (sus cartas usan los efectos de Noche, `vale-time.ts`),
 * Enemigos de doble cara (Híbridos), Helen, Theo y Gideon bajo control, Mutaciones y
 * Micónidos, planes, actos, tarjeta de referencia, códice y resoluciones.
 */
import {
  activeInvestigators,
  distancesFrom,
  emptyAdjacentPositions,
  getInvestigator,
  nextInt,
  playerCardDef,
  printedCode,
  push,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  residentAvailable,
  seedRng,
  shuffle,
  valleyTime,
  type ChaosToken,
  type Choice,
  type EncounterCard,
  type Enemy,
  type EnemyCard,
  type EnemyKeyword,
  type GameState,
  type InvestigatorId,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type TokenEffect,
  type TreacheryCard,
  type ValleyResident,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { hemlockValeChaosBag } from './chaos-bag'
import {
  crystalParasite,
  crystalParasiteFight,
  daySetDeck,
  horrorsInTheRockDeck,
} from './rock-encounters'
import { blightDeck, valeEnemyKeyword, valeSpecific } from './vale-encounters'
import { nightAt, nightFor, nightForEnemy, registerDarkLocations } from './vale-time'
import { RESIDENTS } from './welcome'
import { CAVES, NEXT_PRELUDE } from './written-in-rock'

export const LOST_SISTER = 'hemlock-vale-lost-sister'

export const SISTER = {
  reference: '10569',
  intoTheCaves: '10570',
  darknessClosesIn: '10571',
  theMissingSibling: '10572',
  onTheTrail: '10573',
  faceToCarapace: '10574',
  akwan: '10575',
  suspendedGraveyard: '10576',
  hiddenCove: '10577',
  weedChokedBeach: '10578',
  rockyShoreline: '10579',
  undergroundPools: '10580',
  openCave: '10581',
  fungalCave: '10582',
  limulusLight: '10583a',
  limulusDark: '10583b',
  crustaceanLight: '10584a',
  crustaceanDark: '10584b',
  cavernMoss: '10585',
  reclaimedByNature: '10586',
  luminousGrowth: '10587',
  blackAmanita: '10738',
  corpseLichen: '10739',
  psychotropicSpores: '10740',
  suddenMutation: '10741',
  unnaturalGrowth: '10742',
  helenPeters: '10703',
} as const

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.lostSister.${key}.title`,
  body: `story.hemlockVale.lostSister.${key}.body`,
})
const read = (state: GameState, key: string): Message[] =>
  state.interactive ? [{ type: 'Story', entry: entry(key) }] : []

const meta = (state: GameState, key: string) => Number(state.scenarioMeta?.[key] ?? 0)
const setMeta = (key: string, value: number | string): Message => ({
  type: 'SetScenarioMeta',
  key,
  value,
})
const withMeta = (state: GameState, values: Record<string, number | string>): GameState => ({
  ...state,
  scenarioMeta: { ...state.scenarioMeta, ...values },
})
const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const isHard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''
const dayOf = (state: GameState) => valleyTime(state.campaignLog)?.day ?? 1
const players = (state: GameState) => activeInvestigators(state).length

// ---------------------------------------------------------------------------
// Lugares: Akwan y el mazo de Cavernas (p. 24)
// ---------------------------------------------------------------------------

/** Akwan está en la fila de arriba; las Cavernas crecen hacia los lados y hacia abajo. */
const AKWAN_AT: [number, number] = [6, 6]
const FIRST_CAVERNS: [number, number][] = [
  [5, 6],
  [6, 7],
  [7, 6],
]

const cavern = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  extra: Partial<LocationCard> = {},
): LocationCard => ({
  id,
  name,
  unrevealedName: 'Cavern',
  shroud,
  clueValue,
  cluesPerInvestigator: true,
  connections: [],
  ...extra,
})

const akwan: LocationCard = {
  id: SISTER.akwan,
  name: 'Akwan',
  shroud: 3,
  clueValue: 0,
  cluesPerInvestigator: false,
  connections: [],
  position: AKWAN_AT,
}
/** Lugares de La hermana perdida que van al mazo de Cavernas. */
const SISTER_CAVERNS: LocationCard[] = [
  cavern(SISTER.suspendedGraveyard, 'Suspended Graveyard', 4, 1),
  cavern(`${SISTER.suspendedGraveyard}~2`, 'Suspended Graveyard', 4, 1),
  cavern(SISTER.hiddenCove, 'Hidden Cove', 3, 1),
  cavern(SISTER.weedChokedBeach, 'Weed-Choked Beach', 3, 1),
  cavern(SISTER.rockyShoreline, 'Rocky Shoreline', 3, 1),
  cavern(SISTER.undergroundPools, 'Underground Pools', 3, 1),
  cavern(SISTER.openCave, 'Open Cave', 3, 1),
  cavern(`${SISTER.openCave}~2`, 'Open Cave', 3, 1),
]
const fungalCave = cavern(SISTER.fungalCave, 'Fungal Cave', 4, 2, { enterCost: 2, victory: 1 })

/** Rasgos del lado revelado; el lado sin revelar («Caverna») es Cueva y Oscuro. */
const REVEALED_TRAITS: Record<string, string[]> = {
  [SISTER.akwan]: ['Coastal'],
  [SISTER.suspendedGraveyard]: ['Cave', 'Coastal'],
  [SISTER.hiddenCove]: ['Coastal'],
  [SISTER.weedChokedBeach]: ['Coastal', 'Cave'],
  [SISTER.rockyShoreline]: ['Coastal'],
  [SISTER.undergroundPools]: ['Cave', 'Dark'],
  [SISTER.openCave]: ['Cave', 'Dark'],
  [SISTER.fungalCave]: ['Cave', 'Lair', 'Dark'],
}
export function traitsOf(state: GameState, location: LocationId): string[] {
  const l = state.locations[location]
  if (!l) return []
  if (!l.revealed) return ['Cave', 'Dark']
  // Las Cuevas de Horrores en la roca son Cueva y Oscuro por los dos lados.
  return REVEALED_TRAITS[printedCode(location)] ?? ['Cave', 'Dark']
}
const hasTrait = (state: GameState, location: LocationId, trait: string) =>
  traitsOf(state, location).includes(trait)

const luminousAt = (state: GameState, location: LocationId) =>
  Object.values(state.treacheries).some(
    (t) =>
      t.code === SISTER.luminousGrowth &&
      t.placement.type === 'location' &&
      t.placement.location === location,
  )

/** Oscuro: por sus rasgos, salvo con Crecimiento luminoso o la Cueva abierta iluminada. */
export const isDark = (state: GameState, location: LocationId) =>
  hasTrait(state, location, 'Dark') &&
  !luminousAt(state, location) &&
  !meta(state, `lit:${location}`)

registerDarkLocations(LOST_SISTER, isDark)

/** Mazo de Cavernas (ids de Lugares apartados, de arriba abajo). */
export const cavernsDeck = (state: GameState): LocationId[] => {
  const raw = String(state.scenarioMeta?.caverns ?? '')
  return raw ? raw.split(',') : []
}
const setCaverns = (state: GameState, deck: LocationId[]): GameState =>
  withMeta(state, { caverns: deck.join(',') })

/** Pon la carta superior del mazo de Cavernas en juego, adyacente a `location`. */
function placeCavern(state: GameState, location: LocationId): GameState {
  const [top, ...rest] = cavernsDeck(state)
  const positions = emptyAdjacentPositions(state, location)
  if (!top || !positions.length) return state
  const put = (position: [number, number]): Message[] => [
    { type: 'PutLocationIntoPlay', location: top, position },
  ]
  const next = setCaverns(state, rest)
  return push(
    next,
    ...(positions.length === 1
      ? put(positions[0]!)
      : [
          ask(
            lead(next),
            'prompt.hemlockVale.cavernPosition',
            positions.map((p) => ({
              label: 'choice.hemlockVale.gridPosition',
              params: { column: p[0], row: p[1] },
              then: put(p),
            })),
          ),
        ]),
  )
}

const atLocation = (state: GameState, investigator: InvestigatorId, location: LocationId) =>
  getInvestigator(state, investigator).location === location

/** Gastad n pistas por investigador en grupo, entre los investigadores de `location`. */
function groupCost(state: GameState, location: LocationId | null, n = 1): Message[] | null {
  const amount = n * players(state)
  const group = activeInvestigators(state).filter(
    (i) => location === null || i.location === location,
  )
  if (group.reduce((s, i) => s + i.clues, 0) < amount) return null
  return [{ type: 'PayGroupClues', amount, from: group.map((i) => i.id) }]
}

registerLocation({
  code: SISTER.akwan,
  abilities: (state, self, investigator) => {
    if (!atLocation(state, investigator, self.id)) return []
    return [
      {
        key: `${self.id}:resign`,
        label: 'ability.hemlockVale.giveUpTheSearch',
        actions: 1,
        provokes: false,
        target: { type: 'location', id: self.id },
        then: [{ type: 'Resign', investigator }],
      },
      // Días 1 y 2: [acción] Negociar: mira las 3 cartas superiores del mazo de Cavernas.
      ...(dayOf(state) < 3 && cavernsDeck(state).length
        ? [
            {
              key: `${self.id}:parley`,
              label: 'ability.hemlockVale.askAroundAkwan',
              actions: 1,
              provokes: true,
              parley: true,
              target: { type: 'location' as const, id: self.id },
              then: [
                {
                  type: 'ScenarioSpecific',
                  key: 'orderCaverns',
                  data: { investigator, placed: '' },
                } as Message,
              ],
            },
          ]
        : []),
    ]
  },
})

registerLocation({
  code: SISTER.suspendedGraveyard,
  // [acción] Recibe 1 horror: pon la carta superior del mazo de Cavernas adyacente
  // (límite de grupo: una vez por partida).
  abilities: (state, self, investigator) =>
    self.revealed &&
    atLocation(state, investigator, self.id) &&
    cavernsDeck(state).length &&
    emptyAdjacentPositions(state, self.id).length &&
    !meta(state, `graveyard:${self.id}`)
      ? [
          {
            key: `${self.id}:dig`,
            label: 'ability.hemlockVale.digThroughMoss',
            actions: 1,
            provokes: true,
            costs: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
            target: { type: 'location', id: self.id },
            then: [
              setMeta(`graveyard:${self.id}`, 1),
              { type: 'ScenarioSpecific', key: 'placeCavern', data: { location: self.id } },
            ],
          },
        ]
      : [],
})

const rememberAbility =
  (code: string, note: string, label: string) =>
  (state: GameState, self: { id: LocationId; revealed: boolean }, investigator: InvestigatorId) => {
    if (!self.revealed || !atLocation(state, investigator, self.id) || meta(state, note)) return []
    const cost = groupCost(state, self.id, 2)
    return cost
      ? [
          {
            key: `${code}:remember`,
            label,
            actions: 1,
            provokes: true,
            target: { type: 'location' as const, id: self.id },
            then: [...cost, setMeta(note, 1)],
          },
        ]
      : []
  }

registerLocation({
  code: SISTER.hiddenCove,
  abilities: rememberAbility(SISTER.hiddenCove, 'foundLeash', 'ability.hemlockVale.findLeash'),
  // Obligado – Después de fallar una prueba al atacar aquí: recibe 1 daño.
  forced: (_state, trigger, self) =>
    self.revealed &&
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'fight' &&
    !trigger.succeeded &&
    trigger.location === self.id
      ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 1, horror: 0 }]
      : [],
})

registerLocation({
  code: SISTER.undergroundPools,
  abilities: rememberAbility(
    SISTER.undergroundPools,
    'foundFootprints',
    'ability.hemlockVale.findFootprints',
  ),
  // Obligado – Después de fallar una prueba al investigar aquí: recibe 1 horror.
  forced: (_state, trigger, self) =>
    self.revealed &&
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'investigate' &&
    !trigger.succeeded &&
    trigger.location === self.id
      ? [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 0, horror: 1 }]
      : [],
})

registerLocation({
  code: SISTER.weedChokedBeach,
  // Obligado – Después de fallar una prueba al evitar aquí: pierdes 1 acción. (Salir: `beforeMove`.)
  forced: (_state, trigger, self) =>
    self.revealed &&
    trigger.type === 'afterSkillTest' &&
    trigger.kind === 'evade' &&
    !trigger.succeeded &&
    trigger.location === self.id
      ? [{ type: 'LoseActions', investigator: trigger.investigator, amount: 1 }]
      : [],
})

registerLocation({
  code: SISTER.rockyShoreline,
  // Obligado – Después de revelarlo: aparece un Híbrido crustáceo apartado (A la luz) aquí.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterRevealLocation' && trigger.location === self.id
      ? [{ type: 'ScenarioSpecific', key: 'spawnCrustacean', data: { location: self.id } }]
      : [],
})

registerLocation({
  code: SISTER.openCave,
  // [rápida] Durante tu turno: [agility] (2 + Enemigos preparados aquí); si superas la
  // prueba, pierde Oscuro hasta la siguiente fase de Investigación (límite de grupo por ronda).
  abilities: (state, self, investigator) =>
    self.revealed &&
    atLocation(state, investigator, self.id) &&
    state.activeTurn === investigator &&
    !meta(state, `lit:${self.id}`)
      ? [
          {
            key: `${self.id}:light`,
            label: 'ability.hemlockVale.lightTheCave',
            actions: 0,
            provokes: false,
            limit: { per: 'round', group: true },
            target: { type: 'location', id: self.id },
            then: [
              effectTest(
                investigator,
                'Open Cave',
                'agility',
                2 +
                  Object.values(state.enemies).filter((e) => e.location === self.id && !e.exhausted)
                    .length,
                { onSuccess: [setMeta(`lit:${self.id}`, 1)] },
              ),
            ],
          },
        ]
      : [],
  // Al empezar la fase de Investigación vuelve a ser Oscuro.
  forced: (state, trigger, self) =>
    trigger.type === 'investigationPhaseBegins' && meta(state, `lit:${self.id}`)
      ? [setMeta(`lit:${self.id}`, 0)]
      : [],
})

registerLocation({
  code: SISTER.fungalCave,
  // Obligado – Al final de la ronda: cada Enemigo aquí se cura 2 daños.
  forced: (state, trigger, self) =>
    trigger.type === 'roundEnds'
      ? Object.values(state.enemies)
          .filter((e) => e.location === self.id && e.damageTaken > 0)
          .map((e): Message => ({ type: 'HealEnemy', enemy: e.id, amount: 2 }))
      : [],
})

// ---------------------------------------------------------------------------
// Enemigos de doble cara (Híbridos) y demás encuentros
// ---------------------------------------------------------------------------

const hybrid = (
  code: string,
  name: string,
  fight: number,
  evade: number,
  damage: number,
  horror: number,
  keywords: EnemyKeyword[],
  extra: Partial<EnemyCard> = {},
): EnemyCard =>
  enemy({
    code,
    name,
    traits: code.startsWith(SISTER.limulusLight.slice(0, 5))
      ? ['Monster', 'Abomination', 'Elite']
      : ['Creature', 'Abomination', 'Elite'],
    fight,
    health: code.startsWith('10583') ? 5 : 3,
    evade,
    damage,
    horror,
    keywords,
    victory: code.startsWith('10583') ? 2 : 0,
    ...extra,
  })
export const limulusLight = hybrid(
  SISTER.limulusLight,
  'Limulus Hybrid',
  3,
  4,
  1,
  2,
  ['elusive', 'massive'],
  {
    noOpportunityAttacks: true,
  },
)
export const limulusDark = hybrid(SISTER.limulusDark, 'Limulus Hybrid', 4, 3, 2, 1, [
  'hunter',
  'massive',
  'retaliate',
])
export const crustaceanLight = hybrid(SISTER.crustaceanLight, 'Crustacean Hybrid', 3, 4, 1, 1, [
  'elusive',
  'hunter',
])
export const crustaceanDark = hybrid(SISTER.crustaceanDark, 'Crustacean Hybrid', 4, 3, 1, 1, [
  'hunter',
])
/** Lado que corresponde a cada cara: (Día) a la luz, (Noche) en la oscuridad. */
const HYBRID_SIDES: Record<string, { light: EnemyCard; dark: EnemyCard }> = {
  [SISTER.limulusLight]: { light: limulusLight, dark: limulusDark },
  [SISTER.limulusDark]: { light: limulusLight, dark: limulusDark },
  [SISTER.crustaceanLight]: { light: crustaceanLight, dark: crustaceanDark },
  [SISTER.crustaceanDark]: { light: crustaceanLight, dark: crustaceanDark },
}
const isLimulus = (code: string) => code.startsWith('10583')

export const cavernMoss = enemy({
  code: SISTER.cavernMoss,
  name: 'Cavern Moss',
  traits: ['Flora', 'Mutated'],
  fight: 2,
  health: 3,
  evade: 1,
  damage: 1,
  horror: 0,
  keywords: ['aloof', 'hunter'],
})
export const blackAmanita = enemy({
  code: SISTER.blackAmanita,
  name: 'Black Amanita',
  traits: ['Flora', 'Mutated'],
  fight: 2,
  health: 2,
  evade: 3,
  damage: 0,
  horror: 1,
  keywords: [],
})
export const corpseLichen = enemy({
  code: SISTER.corpseLichen,
  name: 'Corpse Lichen',
  traits: ['Humanoid', 'Monster', 'Flora', 'Mutated'],
  fight: 4,
  health: 4,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: [],
})

const t = (code: string, name: string, traits: string[]): TreacheryCard =>
  treachery({ code, name, traits, keywords: [] })
const reclaimedByNature = t(SISTER.reclaimedByNature, 'Reclaimed by Nature', ['Hazard'])
const luminousGrowth = t(SISTER.luminousGrowth, 'Luminous Growth', ['Hazard', 'Flora'])
const psychotropicSpores = t(SISTER.psychotropicSpores, 'Psychotropic Spores', ['Hazard', 'Flora'])
const suddenMutation = t(SISTER.suddenMutation, 'Sudden Mutation', ['Power', 'Colour'])
const unnaturalGrowth = t(SISTER.unnaturalGrowth, 'Unnatural Growth', ['Curse'])

/** Mutaciones y Micónidos (conjuntos compartidos del Valle). */
export const mutationsDeck: EncounterCard[] = [
  ...copies(suddenMutation, 2),
  ...copies(unnaturalGrowth, 2),
]
export const myconidsDeck: EncounterCard[] = [
  ...copies(blackAmanita, 2),
  corpseLichen,
  ...copies(psychotropicSpores, 2),
]
export const sisterEncounterDeck: EncounterCard[] = [
  ...copies(cavernMoss, 3),
  ...copies(reclaimedByNature, 3),
  ...copies(luminousGrowth, 3),
]

for (const code of [SISTER.limulusLight, SISTER.limulusDark])
  registerEnemy({
    code,
    healthModifier: (state) => 3 * players(state),
    ...(code === SISTER.limulusDark
      ? {
          // (En la oscuridad) Tras atacarlo con éxito con una carta Cuerpo a cuerpo: 1 daño.
          damageTaken: (state, _self, amount, source) => ({
            amount,
            then:
              source.attack && source.traits?.includes('Melee') && state.skillTest
                ? [
                    {
                      type: 'TakeDamage',
                      investigator: state.skillTest.investigator,
                      damage: 1,
                      horror: 0,
                    },
                  ]
                : [],
          }),
        }
      : {}),
  })
for (const code of [SISTER.crustaceanLight, SISTER.crustaceanDark])
  registerEnemy({
    code,
    healthModifier: (state) => dayOf(state),
    // (A la luz) Cuando fuera a recibir daño de un ataque: redúcelo a 1.
    ...(code === SISTER.crustaceanLight
      ? {
          damageTaken: (_state, _self, amount, source) => ({
            amount: source.attack ? Math.min(amount, 1) : amount,
          }),
        }
      : {}),
  })

// Musgo cavernario: Indiferente y Cazador.
registerEnemy({ code: SISTER.cavernMoss })

// Amanita negra: (Día) Indiferente, (Noche) Masiva. Tras descubrir una pista en su Lugar o
// en uno conectado, si está preparada: 1 horror directo.
registerEnemy({
  code: SISTER.blackAmanita,
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterDiscoverClues' || self.exhausted) return []
    const near =
      trigger.location === self.location ||
      !!state.locations[self.location]?.connections.includes(trigger.location)
    return near
      ? [
          {
            type: 'TakeDamage',
            investigator: trigger.investigator,
            damage: 0,
            horror: 1,
            direct: true,
          },
        ]
      : []
  },
})
// Liquen cadavérico: (Noche) Cazador y Alerta; tras atacar, se cura 1.
registerEnemy({
  code: SISTER.corpseLichen,
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [{ type: 'HealEnemy', enemy: self.id, amount: 1 }]
      : [],
})

/** Enemigo más cercano a un investigador que cumple `matches`. */
function nearestEnemies(
  state: GameState,
  investigator: InvestigatorId,
  matches: (e: Enemy) => boolean,
): Enemy[] {
  const from = getInvestigator(state, investigator).location
  if (from === null) return []
  const distances = distancesFrom(state, from)
  const found = Object.values(state.enemies).filter(
    (e) => matches(e) && e.location && distances.has(e.location),
  )
  const best = Math.min(...found.map((e) => distances.get(e.location)!))
  return found.filter((e) => distances.get(e.location) === best)
}

const chooseEnemy = (
  investigator: InvestigatorId,
  enemies: Enemy[],
  then: (e: Enemy) => Message[],
) =>
  ask(
    investigator,
    'prompt.chooseEnemy',
    enemies.map((e) => ({
      label: 'choice.enemy',
      params: { enemy: e.name },
      target: { type: 'enemy', id: e.id },
      then: then(e),
    })),
  )

// Recuperado por la naturaleza: (Día) [combat] (3); si fallas, 2 daños o te ataca el Enemigo
// más cercano. (Noche) [willpower] (3); si fallas, 2 horror o los Enemigos de tu Lugar y de
// los conectados se curan 1.
registerTreachery({
  code: SISTER.reclaimedByNature,
  revelation: (state, investigator) =>
    nightFor(state, investigator)
      ? [
          effectTest(investigator, 'Reclaimed by Nature', 'willpower', 3, {
            onFail: [{ type: 'ScenarioSpecific', key: 'reclaimedNight', data: { investigator } }],
          }),
        ]
      : [
          effectTest(investigator, 'Reclaimed by Nature', 'combat', 3, {
            onFail: [{ type: 'ScenarioSpecific', key: 'reclaimedDay', data: { investigator } }],
          }),
        ],
})

// Crecimiento luminoso: se vincula al Lugar Oscuro revelado más cercano sin otro; ese Lugar
// pierde Oscuro y sus Enemigos tienen +1 combate y +1 daño. [acción] [agility] (3): descártalo.
registerTreachery({
  code: SISTER.luminousGrowth,
  revelation: (state, investigator, self) => {
    const from = getInvestigator(state, investigator).location
    if (from === null) return []
    const distances = distancesFrom(state, from)
    const options = Object.values(state.locations).filter(
      (l) => l.revealed && distances.has(l.id) && isDark(state, l.id) && !luminousAt(state, l.id),
    )
    const best = Math.min(...options.map((l) => distances.get(l.id)!))
    const nearest = options.filter((l) => distances.get(l.id) === best)
    const attach = (location: LocationId): Message => ({
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'location', location },
    })
    if (nearest.length <= 1) return nearest[0] ? [attach(nearest[0].id)] : []
    return [
      ask(
        investigator,
        'prompt.chooseLocation',
        nearest.map((l) => ({
          label: 'choice.location',
          params: { location: l.name },
          target: { type: 'location', id: l.id },
          then: [attach(l.id)],
        })),
      ),
    ]
  },
  abilities: (state, self, investigator) =>
    self.placement.type === 'location' && atLocation(state, investigator, self.placement.location)
      ? [
          {
            key: `${self.id}:clear`,
            label: 'ability.hemlockVale.clearGrowth',
            actions: 1,
            provokes: true,
            target: { type: 'treachery', id: self.id },
            then: [
              effectTest(investigator, 'Luminous Growth', 'agility', 3, {
                onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
              }),
            ],
          },
        ]
      : [],
})

// Esporas psicotrópicas: en tu zona de amenaza (límite 1). La primera vez que robas cartas de
// tu mazo cada ronda: 1 horror directo. [acción] [intellect] (3) (o 1 horror directo para
// superarla): descártalas.
registerTreachery({
  code: SISTER.psychotropicSpores,
  revelation: (state, investigator, self) =>
    Object.values(state.treacheries).some(
      (o) =>
        o.id !== self.id &&
        o.code === self.code &&
        o.placement.type === 'threatArea' &&
        o.placement.investigator === investigator,
    )
      ? []
      : [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'threatArea', investigator },
          },
        ],
  forced: (state, trigger, self) =>
    self.placement.type === 'threatArea' &&
    trigger.type === 'afterCardsDrawn' &&
    trigger.investigator === self.placement.investigator &&
    meta(state, `spores:${self.id}`) !== state.round
      ? [
          setMeta(`spores:${self.id}`, state.round),
          {
            type: 'TakeDamage',
            investigator: trigger.investigator,
            damage: 0,
            horror: 1,
            direct: true,
          },
        ]
      : [],
  abilities: (_state, self, investigator) =>
    self.placement.type === 'threatArea' && self.placement.investigator === investigator
      ? [
          {
            key: `${self.id}:clear`,
            label: 'ability.hemlockVale.clearSpores',
            actions: 1,
            provokes: true,
            target: { type: 'treachery', id: self.id },
            then: [
              ask(investigator, 'prompt.chooseEffect', [
                {
                  label: 'choice.test.intellect',
                  params: { difficulty: 3 },
                  then: [
                    effectTest(investigator, 'Psychotropic Spores', 'intellect', 3, {
                      onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                    }),
                  ],
                },
                {
                  label: 'choice.hemlockVale.directHorrorToSucceed',
                  then: [
                    { type: 'TakeDamage', investigator, damage: 0, horror: 1, direct: true },
                    { type: 'DiscardTreachery', treachery: self.id },
                  ],
                },
              ]),
            ],
          },
        ]
      : [],
})

// Mutación repentina: se vincula al Enemigo no Élite más cercano; si no puedes, busca un
// Enemigo Mutado en el mazo y la pila de descartes y róbalo. Cuando su Enemigo es derrotado,
// descarta cartas hasta un Enemigo y hazlo aparecer en ese Lugar.
registerTreachery({
  code: SISTER.suddenMutation,
  revelation: (state, investigator, self) => {
    const targets = nearestEnemies(state, investigator, (e) => !e.traits?.includes('Elite'))
    if (!targets.length)
      return [{ type: 'ScenarioSpecific', key: 'drawMutated', data: { investigator } }]
    return [
      chooseEnemy(investigator, targets, (e) => [
        { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'enemy', enemy: e.id } },
      ]),
    ]
  },
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyDefeated' &&
    self.placement.type === 'enemy' &&
    self.placement.enemy === trigger.enemy.id
      ? [
          {
            type: 'ScenarioSpecific',
            key: 'mutationSpawn',
            data: { location: trigger.enemy.location },
          },
        ]
      : [],
})

// Crecimiento antinatural: 1 perdición en el Enemigo más cercano sin perdición; si no se
// coloca, descarta 2 cartas al azar.
registerTreachery({
  code: SISTER.unnaturalGrowth,
  revelation: (state, investigator) => {
    const targets = nearestEnemies(state, investigator, (e) => !(e.doom ?? 0))
    return targets.length
      ? [
          chooseEnemy(investigator, targets, (e) => [
            { type: 'PlaceDoomOnEnemy', enemy: e.id, amount: 1 },
          ]),
        ]
      : [{ type: 'DiscardRandomFromHand', investigator, amount: 2 }]
  },
})

// ---------------------------------------------------------------------------
// Helen Peters (habitante sin ficha) y habitantes bajo control
// ---------------------------------------------------------------------------

registerPlayerCards([
  {
    code: SISTER.helenPeters,
    name: 'Helen Peters',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    cost: 3,
    slots: ['ally'],
    traits: ['Ally', 'Hunter'],
    health: 3,
    sanity: 2,
  },
])

const controls = (state: GameState, investigator: InvestigatorId, code: string) =>
  Object.values(state.assets).some((a) => a.owner === investigator && a.code === code)
const controlledAsset = (state: GameState, code: string) =>
  Object.values(state.assets).find((a) => a.code === code)
/** Lugar de un habitante: el de quien lo controla, o donde está colocado. */
function assetLocation(state: GameState, code: string): LocationId | null {
  const owned = controlledAsset(state, code)
  if (owned) return getInvestigator(state, owned.owner).location
  const placed = Object.values(state.placedAssets ?? {}).find((a) => a.code === code)
  return placed?.placement.type === 'location' ? placed.placement.location : null
}

/** Pon un Apoyo de historia en juego bajo el control de un investigador (elige el jefe). */
function giveControl(state: GameState, code: string): Message[] {
  const list = activeInvestigators(state)
  const put = (investigator: InvestigatorId): Message => ({
    type: 'PutAssetIntoPlay',
    investigator,
    code,
    noSlot: true,
  })
  if (list.length <= 1) return list[0] ? [put(list[0].id)] : []
  return [
    ask(
      lead(state),
      'prompt.hemlockVale.takeControl',
      list.map((i) => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [put(i.id)],
      })),
    ),
  ]
}

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

/** Lugares Costeros más cercanos al mayor número de investigadores. */
function nearestToMostCoastal(state: GameState): LocationId[] {
  const counts = new Map<LocationId, number>()
  for (const i of activeInvestigators(state)) {
    if (i.location === null) continue
    let best = Infinity
    let found: LocationId[] = []
    for (const [l, d] of distancesFrom(state, i.location)) {
      if (!state.locations[l] || !hasTrait(state, l, 'Coastal')) continue
      if (d < best) [best, found] = [d, [l]]
      else if (d === best) found.push(l)
    }
    for (const l of found) counts.set(l, (counts.get(l) ?? 0) + 1)
  }
  const most = Math.max(0, ...counts.values())
  return [...counts].filter(([, n]) => n === most && most > 0).map(([l]) => l)
}

registerAgenda({
  code: SISTER.intoTheCaves,
  // Reverso: un Híbrido crustáceo en el Costero más cercano a más investigadores; cada
  // investigador en un Lugar Oscuro descarta 1 carta al azar; perdición en el plan 2 = día.
  onAdvance: (state) => [
    { type: 'ScenarioSpecific', key: 'spawnCrustacean', data: { location: '' } },
    ...activeInvestigators(state)
      .filter((i) => i.location !== null && isDark(state, i.location))
      .map((i): Message => ({ type: 'DiscardRandomFromHand', investigator: i.id, amount: 1 })),
    { type: 'ScenarioSpecific', key: 'agendaTwoDoom' },
  ],
})

registerAgenda({
  code: SISTER.darknessClosesIn,
  // Reverso: cada investigador superviviente que no haya desistido: 1 trauma mental y derrota.
  onAdvance: (state) =>
    activeInvestigators(state).flatMap((i): Message[] => [
      { type: 'SufferTrauma', mental: 1, investigator: i.id },
      { type: 'DefeatInvestigator', investigator: i.id },
    ]),
})

registerAct({
  code: SISTER.theMissingSibling,
  // Obligado – Después de descubrir la última pista de un Lugar Cueva: carta de Cavernas
  // adyacente. Objetivo: con la correa y las huellas, avanza de inmediato.
  forced: (state, trigger) => {
    if (
      trigger.type === 'afterDiscoverClues' &&
      trigger.last &&
      state.locations[trigger.location] &&
      hasTrait(state, trigger.location, 'Cave')
    )
      return [
        { type: 'ScenarioSpecific', key: 'placeCavern', data: { location: trigger.location } },
      ]
    return meta(state, 'foundLeash') && meta(state, 'foundFootprints') && !meta(state, 'act1Done')
      ? [setMeta('act1Done', 1), { type: 'AdvanceAct' }]
      : []
  },
  onAdvance: () => [{ type: 'ScenarioSpecific', key: 'fungalCave' }],
})

/** [acción] de los actos 2 y 3: Enemigo de un Lugar Oscuro conectado se mueve a tu Lugar. */
function lureAbility(state: GameState, investigator: InvestigatorId, groupWide: boolean) {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const connected = state.locations[here]?.connections ?? []
  const enemies = Object.values(state.enemies).filter(
    (e) => connected.includes(e.location) && isDark(state, e.location),
  )
  const cost = groupWide
    ? groupCost(state, null)
    : getInvestigator(state, investigator).clues >= players(state)
      ? [{ type: 'SpendClues', investigator, amount: players(state) } as Message]
      : null
  if (!enemies.length || !cost) return []
  return [
    {
      key: 'sister:lure',
      label: 'ability.hemlockVale.lureEnemy',
      actions: 1,
      provokes: true,
      then: [
        ...cost,
        chooseEnemy(investigator, enemies, (e) => [
          { type: 'MoveEnemy', enemy: e.id, location: here },
        ]),
      ],
    },
  ]
}

registerAct({
  code: SISTER.onTheTrail,
  abilities: (state, _self, investigator) => lureAbility(state, investigator, true),
  // Objetivo: cuando un investigador entra en la Cueva fúngica, avanza de inmediato.
  forced: (state, trigger) =>
    trigger.type === 'afterMove' &&
    getInvestigator(state, trigger.investigator).location === SISTER.fungalCave &&
    !meta(state, 'act2Done')
      ? [setMeta('act2Done', 1), { type: 'AdvanceAct' }]
      : [],
  // Reverso: el Híbrido límulo aparece en la Cueva fúngica; Helen se retira de la partida y,
  // si alguien controla a Theo, códice Σ.
  onAdvance: (state) => {
    const helen = controlledAsset(state, SISTER.helenPeters)
    const theo = controlledAsset(state, RESIDENTS.theoPeters.code)
    return [
      { type: 'SpawnEnemy', card: limulusLight, location: SISTER.fungalCave, engageWith: null },
      ...(helen ? [{ type: 'RemoveAssetFromGame', asset: helen.id } as Message] : []),
      ...(theo ? [{ type: 'ScenarioSpecific', key: 'lobstrosity' } as Message] : []),
    ]
  },
})

registerAct({
  code: SISTER.faceToCarapace,
  abilities: (state, _self, investigator) => lureAbility(state, investigator, false),
  // Objetivo: si el Híbrido límulo es derrotado, avanza de inmediato (→R1).
  forced: (_state, trigger) =>
    trigger.type === 'enemyDefeated' && isLimulus(trigger.enemy.code)
      ? [{ type: 'AdvanceAct' }]
      : [],
  onAdvance: (state) => resolutionMessages(state, 1),
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia y preparación
// ---------------------------------------------------------------------------

const revealedCaves = (state: GameState) =>
  Object.values(state.locations).filter((l) => l.revealed && hasTrait(state, l.id, 'Cave')).length

function tokenEffect(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = isHard(state)
  const here = getInvestigator(state, investigator).location
  const heal: Message[] = [{ type: 'Heal', investigator, damage: 0, horror: 1 }]
  switch (token) {
    case 'skull': {
      const n = revealedCaves(state)
      return { modifier: -(hard ? n : Math.ceil(n / 2)) }
    }
    case 'cultist':
      // Difícil: cura 1 horror si superas la prueba por 2 o más.
      return hard
        ? {
            modifier: -1,
            onSuccess: [setMeta('cultistPass', 1)],
            onSuccessBelow: { margin: 2, then: [setMeta('cultistShort', 1)] },
            after: [{ type: 'ScenarioSpecific', key: 'cultistHard', data: { investigator } }],
          }
        : { modifier: -1, onSuccess: heal }
    case 'tablet': {
      const cave = here !== null && hasTrait(state, here, 'Cave')
      return { modifier: hard ? (cave ? -6 : -4) : cave ? -4 : -2 }
    }
    case 'elderThing': {
      const abomination = Object.values(state.enemies).some(
        (e) => e.location === here && e.traits?.includes('Abomination'),
      )
      return hard
        ? { modifier: -3, ...(abomination ? { autoFail: true } : {}) }
        : { modifier: -2, ...(abomination ? { revealAnother: true } : {}) }
    }
  }
  return { modifier: 0 }
}

/** Mazo de Encuentros: La hermana perdida, Plaga, Horrores en la roca, Mutaciones, Micónidos. */
export function sisterEncounters(day: 1 | 2 | 3): EncounterCard[] {
  return [
    ...sisterEncounterDeck,
    ...blightDeck,
    ...horrorsInTheRockDeck,
    ...mutationsDeck,
    ...myconidsDeck,
    ...daySetDeck(day),
  ]
}

/** Habitantes (p. 24): de día Helen, Theo (Días 1–2), Gideon (Días 2–3) y William (Día 3). */
function residentSetup(context: ScenarioContext, day: 1 | 2 | 3, night: boolean): Message[] {
  const available = (r: ValleyResident) => residentAvailable(context.log, r)
  const control = (code: string): Message => ({
    type: 'ScenarioSpecific',
    key: 'giveControl',
    data: { code },
  })
  if (night) return [control(SISTER.helenPeters)]
  return [
    control(SISTER.helenPeters),
    ...(day < 3 && available('theoPeters') ? [control(RESIDENTS.theoPeters.code)] : []),
    ...(day > 1 && available('gideonMizrah') ? [control(RESIDENTS.gideonMizrah.code)] : []),
    ...(day === 3 && available('williamHemlock')
      ? [
          {
            type: 'PlaceAsset',
            code: RESIDENTS.williamHemlock.code,
            name: RESIDENTS.williamHemlock.name,
            placement: { type: 'location', location: SISTER.akwan },
          } as Message,
        ]
      : []),
  ]
}

export function lostSister(
  context: ScenarioContext,
  encounterDeck?: EncounterCard[],
): ScenarioDefinition {
  const time = context.log.valley ?? { day: 1 as const, time: 'day' as const }
  const day = time.day
  const rng = seedRng(context.seed)
  // Se retiran 2 Cuevas al azar de Horrores en la roca; el resto va al mazo de Cavernas.
  const [caves, rng2] = shuffle(CAVES, rng)
  const [deck] = shuffle([...SISTER_CAVERNS, ...caves.slice(2)], rng2)
  const first = deck.slice(0, 3).map((l, i) => ({ ...l, position: FIRST_CAVERNS[i]! }))
  const rest = deck.slice(3)
  return {
    id: LOST_SISTER,
    intro: entry('intro1'),
    setupInstructions: entry('setup'),
    grid: true,
    locations: [akwan, ...first],
    setAsideLocations: [fungalCave, ...rest],
    startingLocation: SISTER.akwan,
    agendas: [
      { code: SISTER.intoTheCaves, name: 'Into the Caves', doomThreshold: 4 },
      { code: SISTER.darknessClosesIn, name: 'Darkness Closes In', doomThreshold: 12 },
    ],
    acts: [
      {
        code: SISTER.theMissingSibling,
        name: 'The Missing Sibling',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: SISTER.onTheTrail,
        name: 'On the Trail',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: SISTER.faceToCarapace,
        name: 'Face to Carapace',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: encounterDeck ?? sisterEncounters(day),
    setAside: [limulusLight, crystalParasite, crystalParasite, crustaceanLight, crustaceanLight],
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day, time: time.time },
      // Introducción según el día (de noche, la 5) y las reglas de la p. 24.
      { type: 'Story', entry: entry(time.time === 'night' ? 'intro5' : `intro${day + 1}`) },
      { type: 'Story', entry: entry('darkLocations') },
      setMeta('caverns', rest.map((l) => l.id).join(',')),
      ...residentSetup(context, day, time.time === 'night'),
    ],
  }
}

// ---------------------------------------------------------------------------
// Códice (p. 25) y resoluciones (p. 26)
// ---------------------------------------------------------------------------

const raise = (resident: ValleyResident): Message[] => [
  { type: 'ChangeRelationship', resident },
  { type: 'EarnExperience', amount: 1 },
]

function sisterCodex(state: GameState, n: number, investigator: InvestigatorId): Message[] {
  const done = setMeta(`codex:${n}`, 1)
  if (n === RESIDENTS.williamHemlock.codex)
    return [done, ...read(state, 'codex4'), ...raise('williamHemlock')]
  if (n === RESIDENTS.gideonMizrah.codex)
    return [done, ...read(state, 'codex6'), setMeta('gideonSearching', 1)]
  if (n === RESIDENTS.theoPeters.codex) {
    const theo = assetLocation(state, RESIDENTS.theoPeters.code)
    const together = theo !== null && theo === assetLocation(state, SISTER.helenPeters)
    // La primera vez discuten; luego, con Theo y Helen juntos, se puede intentar reconciliarlos.
    if (!meta(state, 'theoArguing') || !together)
      return meta(state, 'theoArguing')
        ? []
        : [...read(state, 'codex8Arguing'), setMeta('theoArguing', 1)]
    const here = activeInvestigators(state).filter((i) => i.location === theo)
    const test = (who: InvestigatorId): Message =>
      effectTest(who, 'Theo Peters', 'willpower', 4, {
        onSuccess: [
          done,
          ...read(state, 'codex8Reconciled'),
          {
            type: 'RecordResidentNote',
            resident: 'theoPeters',
            note: 'theoReconciledWithHelen',
          },
          ...raise('theoPeters'),
        ],
      })
    return [
      ...read(state, 'codex8Tension'),
      here.length <= 1
        ? test(here[0]?.id ?? investigator)
        : ask(
            lead(state),
            'prompt.hemlockVale.chooseInvestigator',
            here.map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [test(i.id)],
            })),
          ),
    ]
  }
  return []
}

const theoReconciled = (state: GameState) =>
  !!state.campaignLog?.valley?.residents?.theoPeters?.notes?.includes('theoReconciledWithHelen')

/** Resolución `r` (1) seguida de las siguientes; 0 = sin resolución. */
export function resolutionMessages(state: GameState, r: number): Message[] {
  const time = valleyTime(state.campaignLog)
  const next = time ? NEXT_PRELUDE[time.time + ':' + time.day] : undefined
  const clues = state.investigators.reduce((n, i) => n + i.clues, 0)
  const gideon = meta(state, 'gideonSearching') && clues >= 2
  const reunited = theoReconciled(state)
  return [
    ...(r
      ? [
          ...read(state, 'resolution1'),
          ...read(state, reunited ? 'resolution2' : 'resolution3'),
          { type: 'EarnExperience', amount: 2 } as Message,
          {
            type: 'RecordNote',
            note: reunited ? 'hemlockValePetersFamilyReunited' : 'hemlockValeElizabethPetersSaved',
          } as Message,
        ]
      : [...read(state, 'noResolution'), { type: 'EarnExperience', amount: 1 } as Message]),
    ...read(state, 'resolution4'),
    ...(gideon
      ? [
          ...raise('gideonMizrah'),
          {
            type: 'RecordResidentNote',
            resident: 'gideonMizrah',
            note: 'gideonFoundHisTreasure',
          } as Message,
        ]
      : []),
    { type: 'EarnExperience', amount: 0, victory: true },
    { type: 'SurveyArea', area: 'akwanShoreline' },
    ...(next ? [{ type: 'ChooseValleyRoute', scenario: next } as Message] : []),
    {
      type: 'EndScenario',
      outcome: r ? { type: 'resolution', resolution: reunited ? 2 : 3 } : { type: 'noResolution' },
      told: true,
    },
  ]
}

/** Algún Híbrido está por el lado que no corresponde a su Lugar. */
const misSided = (state: GameState) =>
  Object.values(state.enemies).some((e) => {
    const sides = HYBRID_SIDES[e.code]
    if (!sides || !e.location) return false
    return (nightAt(state, e.location) ? sides.dark : sides.light).code !== e.code
  })

registerScenario({
  id: LOST_SISTER,
  // Helen: (Día) +1 [combat]; (Noche) +1 [agility]. No ocupa espacio de aliado.
  skillModifier: (state, test) => {
    if (!controls(state, test.investigator, SISTER.helenPeters)) return 0
    const night = nightFor(state, test.investigator)
    return test.skill === (night ? 'agility' : 'combat') ? 1 : 0
  },
  enemyStat: (state, e, stat) =>
    stat === 'fight' ? (luminousAt(state, e.location) ? 1 : 0) + crystalParasiteFight(state, e) : 0,
  enemyDamageModifier: (state, e) => (luminousAt(state, e.location) ? 1 : 0),
  enemyKeyword: (state, e, keyword) => {
    const night = nightForEnemy(state, e)
    if (e.code === SISTER.blackAmanita) {
      if (keyword === 'aloof') return !night
      if (keyword === 'massive') return night
    }
    if (e.code === SISTER.corpseLichen && (keyword === 'hunter' || keyword === 'alert'))
      return night
    return valeEnemyKeyword(state, e, keyword)
  },
  // Liquen cadavérico: (Día) no puede moverse.
  cannotMoveEnemy: (state, e) => e.code === SISTER.corpseLichen && !nightForEnemy(state, e),
  // Playa ahogada en algas: al ir a salir, revela una ficha; con calavera, tablilla,
  // Primigenio o fallo automático, cancela el movimiento o descarta un Apoyo Objeto.
  beforeMove: (state, move) => {
    const from = getInvestigator(state, move.investigator).location
    if (from === null || printedCode(from) !== SISTER.weedChokedBeach) return null
    if (!state.locations[from]?.revealed || from === move.location) return null
    return [
      {
        type: 'ScenarioSpecific',
        key: 'weedChoked',
        data: { investigator: move.investigator, location: move.location },
      },
    ]
  },
  tokenEffect,
  forced: (state) => (misSided(state) ? [{ type: 'ScenarioSpecific', key: 'syncHybrids' }] : []),
  reactions: (state, trigger) => {
    // Cueva fúngica: tras descubrir pistas aquí, cura 1 daño (límite de grupo por ronda).
    if (
      trigger.type === 'afterDiscoverClues' &&
      trigger.location === SISTER.fungalCave &&
      meta(state, 'fungalHeal') !== state.round &&
      getInvestigator(state, trigger.investigator).damage > 0
    )
      return [
        {
          key: 'sister:fungalHeal',
          investigator: trigger.investigator,
          label: 'ability.hemlockVale.fungalHeal',
          then: [
            setMeta('fungalHeal', state.round),
            { type: 'Heal', investigator: trigger.investigator, damage: 1, horror: 0 },
          ],
        },
      ]
    // Helen: después de entrar en un Lugar, agótala y hazle 1 daño: evita automáticamente a un
    // Enemigo no Élite de tu Lugar.
    if (trigger.type === 'afterMove') {
      const helen = Object.values(state.assets).find(
        (a) => a.code === SISTER.helenPeters && a.owner === trigger.investigator && !a.exhausted,
      )
      const here = getInvestigator(state, trigger.investigator).location
      const enemies = Object.values(state.enemies).filter(
        (e) => e.location === here && !e.traits?.includes('Elite'),
      )
      if (!helen || !enemies.length) return []
      return [
        {
          key: 'sister:helen',
          investigator: trigger.investigator,
          label: 'ability.hemlockVale.helenEvades',
          then: [
            { type: 'ExhaustAsset', asset: helen.id },
            { type: 'DamageAsset', asset: helen.id, damage: 1, horror: 0 },
            chooseEnemy(trigger.investigator, enemies, (e) => [
              { type: 'EvadeEnemy', enemy: e.id, by: trigger.investigator },
            ]),
          ],
        },
      ]
    }
    return []
  },
  onAllInvestigatorsEliminated: (state) => resolutionMessages(state, 0),
  specific: (state, key, data) => {
    if (key === 'resolution') return push(state, ...resolutionMessages(state, Number(data.r ?? 0)))
    if (key === 'codex')
      return push(state, ...sisterCodex(state, Number(data.n), String(data.investigator)))
    return valeSpecific(state, key, data) ?? sisterSpecific(state, key, data)
  },
})

// ---------------------------------------------------------------------------
// Mensajes propios del escenario
// ---------------------------------------------------------------------------

/** Da la vuelta a los Híbridos al lado de su Lugar, conservando fichas y vinculadas. */
function syncHybrids(state: GameState): GameState {
  let next = state
  const effects: Message[] = []
  for (const e of Object.values(state.enemies)) {
    const sides = HYBRID_SIDES[e.code]
    if (!sides || !e.location) continue
    const target = nightAt(state, e.location) ? sides.dark : sides.light
    if (target.code === e.code) continue
    const { code, name, fight, evade, damage, horror, keywords, health, victory } = target
    next = {
      ...next,
      enemies: {
        ...next.enemies,
        [e.id]: {
          ...e,
          code,
          name,
          fight,
          evade,
          damage,
          horror,
          keywords: [...keywords],
          health,
          ...(victory !== undefined ? { victory } : {}),
          noOpportunityAttacks: !!target.noOpportunityAttacks,
        },
      },
    }
    // Obligado tras dar la vuelta: el límulo a la luz recibe 1 daño por investigador; el
    // crustáceo en la oscuridad hace 1 daño a cada investigador de su Lugar.
    if (code === SISTER.limulusLight)
      effects.push({ type: 'DamageEnemy', enemy: e.id, amount: players(state) })
    if (code === SISTER.crustaceanDark)
      for (const i of activeInvestigators(state).filter((i) => i.location === e.location))
        effects.push({ type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0 })
  }
  return effects.length ? push(next, ...effects) : next
}

/** Saca una ficha de la bolsa de caos sin prueba (Playa ahogada en algas). */
function drawToken(state: GameState): [ChaosToken | undefined, GameState] {
  if (!state.chaosBag.length) return [undefined, state]
  const [index, rng] = nextInt(state.rng, state.chaosBag.length)
  return [state.chaosBag[index], { ...state, rng }]
}

/** Reverso del acto 1: Cueva fúngica junto a un Costero y Cavernas hasta 4 conexiones. */
function placeFungalCave(state: GameState): GameState {
  const coastal = Object.keys(state.locations).filter(
    (l) => hasTrait(state, l, 'Coastal') && emptyAdjacentPositions(state, l).length,
  )
  const empty = coastal.filter((l) => !activeInvestigators(state).some((i) => i.location === l))
  const options = empty.length ? empty : coastal
  const choose = (location: LocationId): Message => ({
    type: 'ScenarioSpecific',
    key: 'fungalCaveAt',
    data: { location },
  })
  if (options.length <= 1) return options[0] ? push(state, choose(options[0])) : state
  return push(
    state,
    ask(
      lead(state),
      'prompt.chooseLocation',
      options.map((l) => ({
        label: 'choice.location',
        params: { location: state.locations[l]!.name },
        target: { type: 'location', id: l },
        then: [choose(l)],
      })),
    ),
  )
}

function fungalCaveAt(state: GameState, location: LocationId): GameState {
  const [position] = emptyAdjacentPositions(state, location)
  if (!position) return state
  const occupied = (p: [number, number]) =>
    Object.values(state.locations).some((l) => l.position?.[0] === p[0] && l.position[1] === p[1])
  const around: [number, number][] = [
    [position[0], position[1] - 1],
    [position[0] + 1, position[1]],
    [position[0], position[1] + 1],
    [position[0] - 1, position[1]],
  ]
  const neighbours = around.filter(
    (p) => occupied(p) || (p[0] === position[0] && p[1] === position[1]),
  ).length
  const free = around.filter((p) => !occupied(p))
  const deck = cavernsDeck(state)
  const fill = free.slice(0, Math.max(0, 4 - neighbours)).slice(0, deck.length)
  return push(
    setCaverns(state, deck.slice(fill.length)),
    { type: 'PutLocationIntoPlay', location: SISTER.fungalCave, position },
    ...fill.map((p, i): Message => ({
      type: 'PutLocationIntoPlay',
      location: deck[i]!,
      position: p,
    })),
  )
}

export function sisterSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'cultistHard': {
      const heal = meta(state, 'cultistPass') && !meta(state, 'cultistShort')
      return push(
        withMeta(state, { cultistPass: 0, cultistShort: 0 }),
        ...(heal ? [{ type: 'Heal', investigator, damage: 0, horror: 1 } as Message] : []),
      )
    }
    case 'syncHybrids':
      return syncHybrids(state)
    case 'placeCavern':
      return placeCavern(state, String(data.location))
    case 'giveControl':
      return push(state, ...giveControl(state, String(data.code)))
    case 'fungalCave':
      return placeFungalCave(state)
    case 'fungalCaveAt':
      return fungalCaveAt(state, String(data.location))
    case 'agendaTwoDoom':
      return push(state, { type: 'PlaceDoom', amount: dayOf(state) })
    case 'spawnCrustacean': {
      const index = state.setAside.findIndex((c) => c.code === SISTER.crustaceanLight)
      if (index < 0) return state
      const options = data.location ? [String(data.location)] : nearestToMostCoastal(state)
      if (!options.length) return state
      const next = { ...state, setAside: state.setAside.filter((_, n) => n !== index) }
      const spawn = (location: LocationId): Message => ({
        type: 'SpawnEnemy',
        card: crustaceanLight,
        location,
        engageWith: null,
      })
      return push(
        next,
        options.length === 1
          ? spawn(options[0]!)
          : ask(
              lead(next),
              'prompt.chooseLocation',
              options.map((l) => ({
                label: 'choice.location',
                params: { location: next.locations[l]!.name },
                target: { type: 'location', id: l },
                then: [spawn(l)],
              })),
            ),
      )
    }
    case 'orderCaverns': {
      // Mira las 3 cartas superiores y devuélvelas en el orden elegido (de arriba abajo).
      const placed = String(data.placed ?? '')
        .split(',')
        .filter(Boolean)
      const deck = cavernsDeck(state)
      const top = deck.slice(0, 3)
      const remaining = top.filter((id) => !placed.includes(id))
      if (remaining.length <= 1)
        return setCaverns(state, [...placed, ...remaining, ...deck.slice(3)])
      return push(
        state,
        ask(
          investigator,
          'prompt.hemlockVale.cavernOrder',
          remaining.map((id) => ({
            label: 'choice.card',
            params: { card: state.setAsideLocations[id]?.name ?? id },
            then: [
              {
                type: 'ScenarioSpecific',
                key: 'orderCaverns',
                data: { investigator, placed: [...placed, id].join(',') },
              },
            ],
          })),
        ),
      )
    }
    case 'reclaimedDay': {
      const enemies = nearestEnemies(state, investigator, () => true)
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeDamage',
            params: { n: 2 },
            then: [{ type: 'TakeDamage', investigator, damage: 2, horror: 0 }],
          },
          ...(enemies.length
            ? [
                {
                  label: 'choice.hemlockVale.nearestEnemyAttacks',
                  then: [
                    chooseEnemy(investigator, enemies, (e) => [
                      {
                        type: 'EnemyAttack',
                        enemy: e.id,
                        investigator,
                        exhaustAfter: false,
                        evenIfExhausted: true,
                      },
                    ]),
                  ],
                },
              ]
            : []),
        ]),
      )
    }
    case 'reclaimedNight': {
      const here = getInvestigator(state, investigator).location
      const area = here === null ? [] : [here, ...(state.locations[here]?.connections ?? [])]
      const hurt = Object.values(state.enemies).filter((e) => area.includes(e.location))
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeHorror',
            params: { n: 2 },
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
          },
          ...(hurt.length
            ? [
                {
                  label: 'choice.hemlockVale.enemiesHeal',
                  then: hurt.map((e): Message => ({ type: 'HealEnemy', enemy: e.id, amount: 1 })),
                },
              ]
            : []),
        ]),
      )
    }
    case 'drawMutated': {
      const isMutated = (c: EncounterCard) => c.kind === 'enemy' && !!c.traits?.includes('Mutated')
      const inDeck = state.encounterDeck.findIndex(isMutated)
      const inDiscard = state.encounterDiscard.findIndex(isMutated)
      const card = inDeck >= 0 ? state.encounterDeck[inDeck] : state.encounterDiscard[inDiscard]
      if (!card) return state
      const [deck, rng] = shuffle(
        inDeck >= 0 ? state.encounterDeck.filter((_, n) => n !== inDeck) : state.encounterDeck,
        state.rng,
      )
      return push(
        {
          ...state,
          rng,
          encounterDeck: deck,
          encounterDiscard:
            inDeck >= 0
              ? state.encounterDiscard
              : state.encounterDiscard.filter((_, n) => n !== inDiscard),
        },
        { type: 'ResolveEncounterCard', investigator, card },
      )
    }
    case 'mutationSpawn': {
      const location = String(data.location)
      const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy')
      const discarded = state.encounterDeck.slice(0, index < 0 ? undefined : index)
      const card = index < 0 ? undefined : state.encounterDeck[index]
      return push(
        {
          ...state,
          encounterDeck: index < 0 ? [] : state.encounterDeck.slice(index + 1),
          encounterDiscard: [...state.encounterDiscard, ...discarded],
        },
        ...(card && card.kind === 'enemy' && state.locations[location]
          ? [{ type: 'SpawnEnemy', card, location, engageWith: null } as Message]
          : []),
      )
    }
    case 'weedChoked': {
      const [token, next] = drawToken(state)
      const move: Message = {
        type: 'MoveTo',
        investigator,
        location: String(data.location),
        checked: true,
      }
      const logged: Message = {
        type: 'Log',
        key: 'log.hemlockVale.weedChokedToken',
        params: { token: String(token ?? '') },
      }
      if (!token || !['skull', 'tablet', 'elderThing', 'autoFail'].includes(String(token)))
        return push(next, logged, move)
      const items = Object.values(next.assets).filter(
        (a) => a.owner === investigator && !!playerCardDef(a.code)?.traits?.includes('Item'),
      )
      return push(
        next,
        logged,
        ask(investigator, 'prompt.hemlockVale.weedChoked', [
          { label: 'choice.hemlockVale.cancelMove', then: [] },
          ...items.map((a) => ({
            label: 'choice.hemlockVale.discardItem',
            params: { card: playerCardDef(a.code)?.name ?? a.code },
            then: [{ type: 'DiscardAsset', asset: a.id } as Message, move],
          })),
        ]),
      )
    }
    case 'lobstrosity': {
      const theo = controlledAsset(state, RESIDENTS.theoPeters.code)
      if (!theo) return state
      if (theoReconciled(state)) {
        const limulus = Object.values(state.enemies).find((e) => isLimulus(e.code))
        return push(
          state,
          ...read(state, 'codexSigmaReconciled'),
          ...((theo.damage ?? 0) > 0 && limulus
            ? ([
                { type: 'HealAsset', asset: theo.id, damage: 1, horror: 0 },
                { type: 'DamageEnemy', enemy: limulus.id, amount: 1 },
              ] as Message[])
            : []),
        )
      }
      return push(state, ...read(state, 'codexSigma'), {
        type: 'RemoveAssetFromGame',
        asset: theo.id,
      })
    }
  }
  return state
}
