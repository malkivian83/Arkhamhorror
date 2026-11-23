/**
 * La fiesta del Valle de la Cicuta, Escenario: La hondonada retorcida (guía, pp. 34–38).
 * Noche 1. Nivel de oscuridad, zona de persecución (Enemigos fuera del juego que conservan sus
 * fichas), mazo de Bosque (al revelar un Lugar se colocan Lugares a su alrededor), Farol del
 * Valle encendido o apagado (su luz quita el rasgo Oscuro), Híbrido úrsido, Bertie Musgrave,
 * plan especial ¡De vuelta al Valle!, códice y resoluciones.
 */
import {
  activeInvestigators,
  distancesFrom,
  emptyAdjacentPositions,
  getInvestigator,
  printedCode,
  push,
  recomputeConnections,
  registerAct,
  registerAgenda,
  registerEnemy,
  registerLocation,
  registerPlayerCard,
  registerPlayerCards,
  registerScenario,
  registerTreachery,
  seedRng,
  shuffle,
  valleyTime,
  type Choice,
  type EncounterCard,
  type EnemyCard,
  type GameState,
  type InvestigatorId,
  type Location,
  type Trigger,
  type LocationCard,
  type LocationId,
  type Message,
  type ScenarioDefinition,
  type StoryEntry,
  type TokenEffect,
  type TreacheryCard,
} from '@lcg/engine'
import type { ScenarioContext } from '../campaign-definition'
import { copies, effectTest, enemy, treachery } from '../scenario-helpers'
import { hemlockValeChaosBag } from './chaos-bag'
import { TWISTED_HOLLOW } from './first-evening'
import { myconidsDeck } from './lost-sister'
import { daySetDeck } from './rock-encounters'
import { HEATH } from './silent-heath'
import { forestDeck } from './thing-in-the-depths'
import { valeEnemyKeyword, valeSpecific } from './vale-encounters'
import { registerDarkLocations } from './vale-time'
import { registerCodexGate, RESIDENTS } from './welcome'
import { NEXT_PRELUDE } from './written-in-rock'

export { TWISTED_HOLLOW }

export const HOLLOW = {
  reference: '10605',
  deepeningDark: '10606',
  desperateSearch: '10607a',
  ursineHybrid: '10607b',
  wheresBertie: '10608',
  backToTheVale: '10609',
  lanternBeacon: '10610a',
  lanternBeaconUnlit: '10610b',
  lanternFaint: '10611a',
  lanternFaintUnlit: '10611b',
  glimmeringWoods: '10612',
  blightedGlade: '10613',
  poisonedMarsh: '10614',
  fecundThicket: '10615',
  mushroomGrove: '10616',
  moonlitClearing: '10617',
  crookedPath: '10618',
  corpseGrove: '10619',
  bearDen: '10620',
  theTwistedHollow: '10621',
  deepShadows: '10622',
  lurkingFear: '10623',
  stolenLight: '10624',
  stalkingHybrid: '10625',
  bertieMusgrave: '10701',
} as const

const entry = (key: string): StoryEntry => ({
  title: `story.hemlockVale.twistedHollow.${key}.title`,
  body: `story.hemlockVale.twistedHollow.${key}.body`,
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
const specific = (key: string, data: Record<string, string | number> = {}): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})
const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})
const isHard = (state: GameState) => state.difficulty === 'hard' || state.difficulty === 'expert'
const lead = (state: GameState): InvestigatorId => activeInvestigators(state)[0]?.id ?? ''
const players = (state: GameState) => activeInvestigators(state).length
export const darkness = (state: GameState) => meta(state, 'darkness')

// ---------------------------------------------------------------------------
// Lugares Bosque oriental (lado sin revelar) y mazo de Bosque
// ---------------------------------------------------------------------------

/** El Lugar inicial va en [5, 5]; el Bosque crece en las cuatro direcciones. */
const ORIGIN: [number, number] = [5, 5]
const offset = (dx: number, dy: number): [number, number] => [ORIGIN[0] + dx, ORIGIN[1] + dy]

const woods = (
  id: string,
  name: string,
  shroud: number,
  clueValue: number,
  perInvestigator = true,
): LocationCard => ({
  id,
  name,
  unrevealedName: 'Western Woods',
  shroud,
  clueValue,
  cluesPerInvestigator: perInvestigator,
  connections: [],
})
const glimmeringWoods = woods(HOLLOW.glimmeringWoods, 'Glimmering Woods', 2, 0, false)
const theTwistedHollow = {
  ...woods(HOLLOW.theTwistedHollow, 'The Twisted Hollow', 4, 1),
  victory: 1,
}
/** Lugares Bosque oriental que se barajan en el mazo de Bosque. */
const WOODS: LocationCard[] = [
  woods(HOLLOW.blightedGlade, 'Blighted Glade', 2, 1),
  woods(`${HOLLOW.blightedGlade}~2`, 'Blighted Glade', 2, 1),
  woods(HOLLOW.poisonedMarsh, 'Poisoned Marsh', 3, 1),
  woods(`${HOLLOW.poisonedMarsh}~2`, 'Poisoned Marsh', 3, 1),
  woods(HOLLOW.fecundThicket, 'Fecund Thicket', 6, 1),
  woods(HOLLOW.mushroomGrove, 'Mushroom Grove', 2, 1),
  woods(`${HOLLOW.mushroomGrove}~2`, 'Mushroom Grove', 2, 1),
  woods(HOLLOW.moonlitClearing, 'Moonlit Clearing', 1, 1),
  woods(HOLLOW.crookedPath, 'Crooked Path', 0, 1, false),
  woods(`${HOLLOW.crookedPath}~2`, 'Crooked Path', 0, 1, false),
  woods(`${HOLLOW.crookedPath}~3`, 'Crooked Path', 0, 1, false),
  woods(HOLLOW.corpseGrove, 'Corpse Grove', 3, 1),
  woods(HOLLOW.bearDen, 'Bear Den', 3, 1),
]
const LAIRS = new Set<string>([HOLLOW.moonlitClearing, HOLLOW.corpseGrove, HOLLOW.bearDen])

export const woodsDeck = (state: GameState): LocationId[] => {
  const raw = String(state.scenarioMeta?.woods ?? '')
  return raw ? raw.split(',') : []
}
const setWoods = (state: GameState, deck: LocationId[]): GameState =>
  withMeta(state, { woods: deck.join(',') })

const ALL_WOODS: LocationCard[] = [glimmeringWoods, theTwistedHollow, ...WOODS]

/** Retira Lugares de la mesa y los devuelve, sin revelar, a las cartas apartadas. */
function returnToWoods(state: GameState, ids: LocationId[]): GameState {
  const locations = { ...state.locations }
  const setAsideLocations = { ...state.setAsideLocations }
  for (const id of ids) {
    const card = ALL_WOODS.find((c) => c.id === id)
    if (!card || !locations[id]) continue
    delete locations[id]
    setAsideLocations[id] = card
  }
  return recomputeConnections({ ...state, locations, setAsideLocations })
}

/** Coloca cartas del mazo de Bosque, sin revelar, en los espacios vacíos alrededor del Lugar. */
function surround(state: GameState, location: LocationId): GameState {
  const positions = emptyAdjacentPositions(state, location)
  const deck = woodsDeck(state)
  const placed = positions.slice(0, deck.length)
  if (!placed.length) return state
  return push(
    setWoods(state, deck.slice(placed.length)),
    ...placed.map((position, i): Message => ({
      type: 'PutLocationIntoPlay',
      location: deck[i]!,
      position,
    })),
  )
}

// ---------------------------------------------------------------------------
// Farol del Valle: su luz quita el rasgo Oscuro
// ---------------------------------------------------------------------------

const LIT = new Set<string>([HOLLOW.lanternBeacon, HOLLOW.lanternFaint])
const UNLIT: Record<string, string> = {
  [HOLLOW.lanternBeacon]: HOLLOW.lanternBeaconUnlit,
  [HOLLOW.lanternFaint]: HOLLOW.lanternFaintUnlit,
}
const LIT_SIDE: Record<string, string> = {
  [HOLLOW.lanternBeaconUnlit]: HOLLOW.lanternBeacon,
  [HOLLOW.lanternFaintUnlit]: HOLLOW.lanternFaint,
}

export const litLantern = (state: GameState) =>
  Object.values(state.assets).find((a) => LIT.has(a.code))
const unlitLantern = (state: GameState) =>
  Object.values(state.placedAssets ?? {}).find((a) => !!LIT_SIDE[a.code])

/** Lugares iluminados por el Farol encendido. */
function litLocations(state: GameState): LocationId[] {
  const lantern = litLantern(state)
  if (!lantern) return []
  const here = getInvestigator(state, lantern.owner).location
  if (here === null) return []
  return lantern.code === HOLLOW.lanternBeacon
    ? [here, ...(state.locations[here]?.connections ?? [])]
    : [here]
}
/** Todos los Lugares del Bosque son Oscuros salvo los iluminados por el Farol. */
export const isDark = (state: GameState, location: LocationId) =>
  !!state.locations[location] && !litLocations(state).includes(location)

registerDarkLocations(TWISTED_HOLLOW, isDark)

/** El Farol se apaga y queda colocado en un Lugar. */
function dropLantern(state: GameState, location: LocationId | null): Message[] {
  const lantern = litLantern(state)
  if (!lantern || !location) return []
  return [
    { type: 'RemoveAssetFromGame', asset: lantern.id, leavingResolved: true },
    {
      type: 'PlaceAsset',
      code: UNLIT[lantern.code]!,
      name: 'Vale Lantern',
      placement: { type: 'location', location },
    },
  ]
}

registerPlayerCards([
  ...[
    HOLLOW.lanternBeacon,
    HOLLOW.lanternFaint,
    HOLLOW.lanternBeaconUnlit,
    HOLLOW.lanternFaintUnlit,
  ].map((code) => ({
    code,
    name: 'Vale Lantern',
    story: true,
    unique: true,
    type: 'asset' as const,
    class: 'neutral',
    slots: ['hand' as const],
    traits: ['Item', 'Tool'],
  })),
  {
    code: HOLLOW.bertieMusgrave,
    name: 'Bertie Musgrave',
    story: true,
    unique: true,
    type: 'asset',
    class: 'neutral',
    slots: ['ally'],
    traits: ['Ally', 'Miskatonic', 'Assistant'],
    health: 2,
    sanity: 2,
  },
])

for (const code of Object.keys(LIT_SIDE))
  registerPlayerCard({
    code,
    // Apagado: [acción] (Rayo de esperanza) o [rápida] (Débil esperanza): toma el control y
    // enciéndelo. Cualquier investigador en su Lugar.
    placedAbilities: (state, self, investigator) =>
      self.placement.type === 'location' &&
      getInvestigator(state, investigator).location === self.placement.location
        ? [
            {
              key: `${self.id}:light`,
              label: 'ability.hemlockVale.lightLantern',
              actions: code === HOLLOW.lanternBeaconUnlit ? 1 : 0,
              provokes: code === HOLLOW.lanternBeaconUnlit,
              target: { type: 'placed', id: self.id },
              then: [
                { type: 'RemovePlacedAsset', placed: self.id },
                {
                  type: 'PutAssetIntoPlay',
                  investigator,
                  code: LIT_SIDE[code]!,
                  noSlot: players(state) === 1,
                },
              ],
            },
          ]
        : [],
  })

// Débil esperanza encendido: [acción] Agótalo: mira el lado revelado de un Lugar conectado;
// puedes moverte a él ignorando sus efectos Obligado.
registerPlayerCard({
  code: HOLLOW.lanternFaint,
  abilities: (state, self, investigator) => {
    if (self.owner !== investigator || self.exhausted) return []
    const here = getInvestigator(state, investigator).location
    const options = (here === null ? [] : (state.locations[here]?.connections ?? [])).filter(
      (l) => !state.locations[l]?.revealed,
    )
    return options.length
      ? [
          {
            key: `${self.id}:peek`,
            label: 'ability.hemlockVale.lanternPeek',
            actions: 1,
            provokes: true,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: [specific('peek', { investigator, options: options.join(',') })],
          },
        ]
      : []
  },
})

// ---------------------------------------------------------------------------
// Zona de persecución
// ---------------------------------------------------------------------------

interface Pursuer {
  card: EnemyCard
  damage: number
  doom: number
}
export const pursuit = (state: GameState): Pursuer[] => {
  const raw = state.scenarioMeta?.pursuit
  return raw ? (JSON.parse(String(raw)) as Pursuer[]) : []
}
const setPursuit = (state: GameState, list: Pursuer[]): GameState =>
  withMeta(state, { pursuit: JSON.stringify(list) })

/** Un Enemigo en juego pasa a la zona de persecución, conservando sus fichas. */
function toPursuit(state: GameState, enemyId: string): GameState {
  const e = state.enemies[enemyId]
  if (!e) return state
  const {
    id: _id,
    location: _location,
    engagedWith: _engaged,
    exhausted: _exhausted,
    damageTaken,
    doom,
    maxHealth: _max,
    ...card
  } = e
  const { [enemyId]: _drop, ...enemies } = state.enemies
  return setPursuit({ ...state, enemies }, [
    ...pursuit(state),
    { card: card as EnemyCard, damage: damageTaken, doom: doom ?? 0 },
  ])
}

/** Hace aparecer un Enemigo de la persecución en un Lugar (enfrentado si se indica). */
function fromPursuit(
  state: GameState,
  index: number,
  location: LocationId,
  engageWith: InvestigatorId | null,
): GameState {
  const list = pursuit(state)
  const p = list[index]
  if (!p || !state.locations[location]) return state
  return push(
    setPursuit(
      state,
      list.filter((_, n) => n !== index),
    ),
    {
      type: 'SpawnEnemy',
      card: p.card,
      location,
      engageWith,
      ...(p.damage ? { initialDamage: p.damage } : {}),
    },
  )
}

/** Índices de la persecución con el mayor o menor valor de `stat`. */
function pursuers(
  state: GameState,
  stat: 'fight' | 'evade' | 'health',
  best: 'max' | 'min',
): number[] {
  const list = pursuit(state)
  if (!list.length) return []
  const values = list.map((p) => p.card[stat])
  const target = best === 'max' ? Math.max(...values) : Math.min(...values)
  return list.flatMap((p, i) => (p.card[stat] === target ? [i] : []))
}

/** Elige uno de los Enemigos de la persecución y hazlo aparecer. */
function choosePursuer(
  state: GameState,
  investigator: InvestigatorId,
  options: number[],
  location: LocationId,
  engage: boolean,
): Message[] {
  const spawn = (index: number): Message =>
    specific('fromPursuit', {
      index,
      location,
      engage: engage ? investigator : '',
    })
  if (options.length <= 1) return options.length ? [spawn(options[0]!)] : []
  const list = pursuit(state)
  // Los índices cambian al sacar uno; se resuelve en el momento con el nombre elegido.
  return [
    ask(
      investigator,
      'prompt.chooseEnemy',
      options.map((i) => ({
        label: 'choice.enemy',
        params: { enemy: list[i]!.card.name },
        then: [spawn(i)],
      })),
    ),
  ]
}

// ---------------------------------------------------------------------------
// Lugares (revelados)
// ---------------------------------------------------------------------------

const atLocation = (state: GameState, investigator: InvestigatorId, location: LocationId) =>
  getInvestigator(state, investigator).location === location
/** Se ignoran los Obligado de este Lugar al revelarlo (Farol, códice Θ). */
const ignoresReveal = (state: GameState, location: LocationId) =>
  !!meta(state, `ignoreReveal:${location}`)

const revealForced =
  (effect: (state: GameState, investigator: InvestigatorId, location: LocationId) => Message[]) =>
  (state: GameState, trigger: Trigger, self: Location): Message[] =>
    trigger.type === 'afterRevealLocation' &&
    trigger.location === self.id &&
    trigger.investigator &&
    !ignoresReveal(state, self.id)
      ? effect(state, trigger.investigator, self.id)
      : []

registerLocation({
  code: HOLLOW.glimmeringWoods,
  abilities: (state, self, investigator) =>
    self.revealed && atLocation(state, investigator, self.id)
      ? [
          {
            key: `${self.id}:resign`,
            label: 'ability.hemlockVale.bertiesFine',
            actions: 1,
            provokes: false,
            target: { type: 'location', id: self.id },
            then: [{ type: 'Resign', investigator }],
          },
          ...(getInvestigator(state, investigator).horror > 0
            ? [
                {
                  key: `${self.id}:heal`,
                  label: 'ability.hemlockVale.healHorror',
                  actions: 1,
                  provokes: true,
                  limit: { per: 'round' as const },
                  target: { type: 'location' as const, id: self.id },
                  then: [{ type: 'Heal', investigator, damage: 0, horror: 1 } as Message],
                },
              ]
            : []),
        ]
      : [],
})
// Claro arruinado: aparece aquí el Enemigo de la persecución con menos combate.
registerLocation({
  code: HOLLOW.blightedGlade,
  forced: revealForced((state, investigator, location) =>
    choosePursuer(state, investigator, pursuers(state, 'fight', 'min'), location, false),
  ),
})
// Marisma envenenada: 1 daño directo o 1 daño a cada Aliado que controles.
registerLocation({
  code: HOLLOW.poisonedMarsh,
  forced: revealForced((state, investigator) => [
    ask(investigator, 'prompt.chooseEffect', [
      {
        label: 'choice.hemlockVale.directDamage',
        then: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0, direct: true }],
      },
      {
        label: 'choice.hemlockVale.alliesTakeDamage',
        then: Object.values(state.assets)
          .filter((a) => a.owner === investigator && a.code !== HOLLOW.lanternBeacon)
          .map((a): Message => ({ type: 'DamageAsset', asset: a.id, damage: 1, horror: 0 })),
      },
    ]),
  ]),
})
// Matorral fecundo: [agility] (oscuridad); si fallas, el de más salud aparece aquí.
registerLocation({
  code: HOLLOW.fecundThicket,
  forced: revealForced((state, investigator, location) => [
    effectTest(investigator, 'Fecund Thicket', 'agility', darkness(state), {
      onFail: [specific('pursuerAt', { stat: 'health', location, engage: '' })],
    }),
  ]),
})
// Arboleda de setas: [intellect] (oscuridad); si fallas, el de más evasión te ataca.
registerLocation({
  code: HOLLOW.mushroomGrove,
  forced: revealForced((state, investigator, location) => [
    effectTest(investigator, 'Mushroom Grove', 'intellect', darkness(state), {
      onFail: [specific('pursuerAt', { stat: 'evade', location, engage: investigator })],
    }),
  ]),
})
// Claro iluminado por la luna: [willpower] (oscuridad); si fallas, el de más combate aparece.
registerLocation({
  code: HOLLOW.moonlitClearing,
  forced: revealForced((state, investigator, location) => [
    effectTest(investigator, 'Moonlit Clearing', 'willpower', darkness(state), {
      onFail: [specific('pursuerAt', { stat: 'fight', location, engage: '' })],
    }),
  ]),
})
// Arboleda de cadáveres: 1 horror al revelarla y al investigarla con éxito.
registerLocation({
  code: HOLLOW.corpseGrove,
  forced: (state, trigger, self) => {
    if (
      trigger.type === 'afterSkillTest' &&
      trigger.kind === 'investigate' &&
      trigger.succeeded &&
      trigger.location === self.id
    )
      return [{ type: 'TakeDamage', investigator: trigger.investigator, damage: 0, horror: 1 }]
    return revealForced((_s, investigator) => [
      { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
    ])(state, trigger, self)
  },
})
// Guarida del oso: el de más combate aparece enfrentado contigo; si no hay, roba un Encuentro.
registerLocation({
  code: HOLLOW.bearDen,
  forced: revealForced((state, investigator, location) => {
    const options = pursuers(state, 'fight', 'max')
    return options.length
      ? choosePursuer(state, investigator, options, location, true)
      : [{ type: 'DrawEncounterCard', investigator }]
  }),
})
// Senda torcida: [reacción] después de descubrir una pista aquí, mira un Lugar conectado.
registerLocation({ code: HOLLOW.crookedPath })
registerLocation({ code: HOLLOW.theTwistedHollow })

// ---------------------------------------------------------------------------
// Encuentros de La hondonada retorcida
// ---------------------------------------------------------------------------

export const ursineHybrid: EnemyCard = enemy({
  code: HOLLOW.ursineHybrid,
  name: 'Ursine Hybrid',
  traits: ['Creature', 'Monster', 'Mutated', 'Elite'],
  fight: 5,
  health: 5,
  evade: 3,
  damage: 3,
  horror: 2,
  keywords: ['hunter', 'retaliate'],
  victory: 2,
})
export const stalkingHybrid: EnemyCard = enemy({
  code: HOLLOW.stalkingHybrid,
  name: 'Stalking Hybrid',
  traits: ['Creature', 'Monster', 'Mutated'],
  fight: 3,
  health: 0,
  evade: 3,
  damage: 1,
  horror: 1,
  keywords: ['hunter', 'alert'],
})
const t = (
  code: string,
  name: string,
  traits: string[],
  keywords: TreacheryCard['keywords'] = [],
) => treachery({ code, name, traits, keywords })
export const hollowEncounterDeck: EncounterCard[] = [
  ...copies(t(HOLLOW.deepShadows, 'Deep Shadows', ['Hazard']), 2),
  ...copies(t(HOLLOW.lurkingFear, 'Lurking Fear', ['Terror']), 2),
  t(HOLLOW.stolenLight, 'Stolen Light', ['Scheme'], ['peril']),
  ...copies(stalkingHybrid, 4),
]

registerEnemy({
  code: HOLLOW.ursineHybrid,
  healthModifier: (state) => 2 * players(state),
  // En el acto 2, cuando fuera a ser derrotado: se cura y pasa a la persecución.
  wouldBeDefeated: (state, self) =>
    state.acts[state.actIndex]?.code === HOLLOW.wheresBertie
      ? [specific('toPursuit', { enemy: self.id, heal: 1 })]
      : null,
})
registerEnemy({
  code: HOLLOW.stalkingHybrid,
  // Salud X = nivel de oscuridad. Presa: solo quien controla el Farol del Valle.
  healthModifier: (state) => darkness(state),
  // Tras atacarte, si controlas el Farol: se apaga y queda en tu Lugar.
  forced: (state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' &&
    trigger.enemy === self.id &&
    litLantern(state)?.owner === trigger.investigator
      ? dropLantern(state, getInvestigator(state, trigger.investigator).location)
      : [],
})

const darkPenalty = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  return here !== null && isDark(state, here) ? 2 : 0
}
// Sombras profundas: [willpower] (3, +2 en lo Oscuro); si fallas, 2 horror o el Farol se
// apaga y queda en un Lugar conectado.
registerTreachery({
  code: HOLLOW.deepShadows,
  revelation: (state, investigator) => [
    effectTest(investigator, 'Deep Shadows', 'willpower', 3 + darkPenalty(state, investigator), {
      onFail: [specific('deepShadows', { investigator })],
    }),
  ],
})
// Miedo acechante: [agility] (3, +2 en lo Oscuro); si fallas, 2 daños o el de más combate
// de la persecución aparece enfrentado contigo.
registerTreachery({
  code: HOLLOW.lurkingFear,
  revelation: (state, investigator) => [
    effectTest(investigator, 'Lurking Fear', 'agility', 3 + darkPenalty(state, investigator), {
      onFail: [specific('lurkingFear', { investigator })],
    }),
  ],
})
// Luz robada (Peligro): 1 perdición en el plan, o el Farol se apaga en el Lugar vacío más
// lejano de todos los investigadores.
registerTreachery({
  code: HOLLOW.stolenLight,
  revelation: (state, investigator) => [
    ask(investigator, 'prompt.chooseEffect', [
      { label: 'choice.hemlockVale.doomOnAgenda', then: [{ type: 'PlaceDoom', amount: 1 }] },
      ...(litLantern(state)
        ? [{ label: 'choice.hemlockVale.stealLight', then: [specific('stolenLight')] }]
        : []),
    ]),
  ],
})

// ---------------------------------------------------------------------------
// Planes y actos
// ---------------------------------------------------------------------------

const actIs = (state: GameState, code: string) => state.acts[state.actIndex]?.code === code

/** Reverso de los planes: la oscuridad crece; con 6 o más, todos son derrotados. */
function deepeningDark(state: GameState): Message[] {
  const level = darkness(state) + 1
  if (level >= 6)
    return [
      setMeta('darkness', level),
      ...activeInvestigators(state).flatMap((i): Message[] => [
        { type: 'SufferTrauma', physical: 1, investigator: i.id },
        { type: 'DefeatInvestigator', investigator: i.id },
      ]),
    ]
  return [setMeta('darkness', level), specific('gatheringDarkness')]
}

registerAgenda({
  code: HOLLOW.deepeningDark,
  repeats: true,
  forced: (state, trigger) => {
    // Al revelar un Lugar, se colocan cartas del mazo de Bosque a su alrededor.
    if (trigger.type === 'afterRevealLocation' && woodsDeck(state).length)
      return [specific('surround', { location: trigger.location })]
    // Al terminar la fase de Investigación, cada investigador en un Lugar Oscuro roba el de
    // más evasión de la persecución o recibe 1 horror.
    if (trigger.type === 'investigationPhaseEnds')
      return activeInvestigators(state)
        .filter((i) => i.location !== null && isDark(state, i.location))
        .map((i) => specific('darkInvestigationEnd', { investigator: i.id }))
    return []
  },
  onAdvance: (state) => deepeningDark(state),
})

registerAgenda({
  code: HOLLOW.backToTheVale,
  repeats: true,
  // [rápida] Agota el Farol o gastad 1 pista por investigador: mira un Lugar conectado sin
  // revelar; puedes moverte a él.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const options = (here === null ? [] : (state.locations[here]?.connections ?? [])).filter(
      (l) => !state.locations[l]?.revealed,
    )
    if (!options.length) return []
    const lantern = litLantern(state)
    const group = activeInvestigators(state)
    const canPay = group.reduce((n, i) => n + i.clues, 0) >= players(state)
    const costs: Choice[] = [
      ...(lantern && !lantern.exhausted
        ? [
            {
              label: 'choice.hemlockVale.exhaustLantern',
              then: [{ type: 'ExhaustAsset', asset: lantern.id } as Message],
            },
          ]
        : []),
      ...(canPay
        ? [
            {
              label: 'choice.hemlockVale.spendGroupClues',
              params: { n: players(state) },
              then: [
                {
                  type: 'PayGroupClues',
                  amount: players(state),
                  from: group.map((i) => i.id),
                } as Message,
              ],
            },
          ]
        : []),
    ]
    if (!costs.length) return []
    return [
      {
        key: 'hollow:backToTheVale',
        label: 'ability.hemlockVale.findTheWay',
        actions: 0,
        provokes: false,
        then: [
          ask(
            investigator,
            'prompt.hemlockVale.chooseCost',
            costs.map((c) => ({
              ...c,
              then: [...c.then, specific('peek', { investigator, options: options.join(',') })],
            })),
          ),
        ],
      },
    ]
  },
  onAdvance: (state) => {
    const level = darkness(state) + 1
    if (level >= 6)
      return [
        setMeta('darkness', level),
        ...activeInvestigators(state).flatMap((i): Message[] => [
          { type: 'SufferTrauma', physical: 1, investigator: i.id },
          { type: 'DefeatInvestigator', investigator: i.id },
        ]),
        specific('resolution', { r: 2 }),
      ]
    return [setMeta('darkness', level), specific('hungeringForest')]
  },
})

registerAct({
  code: HOLLOW.desperateSearch,
  // Objetivo: al final de la ronda, con todos en el mismo Lugar Guarida que el jefe, gastad 3
  // pistas por investigador.
  forced: (state, trigger) => {
    if (trigger.type !== 'roundEnds') return []
    const list = activeInvestigators(state)
    const here = list[0]?.location
    if (!here || !LAIRS.has(printedCode(here)) || !state.locations[here]?.revealed) return []
    if (!list.every((i) => i.location === here)) return []
    const amount = 3 * list.length
    if (list.reduce((n, i) => n + i.clues, 0) < amount) return []
    return [
      ask(lead(state), 'prompt.hemlockVale.advanceAct', [
        {
          label: 'choice.hemlockVale.spendGroupClues',
          params: { n: amount },
          then: [
            { type: 'PayGroupClues', amount, from: list.map((i) => i.id) },
            { type: 'AdvanceAct' },
          ],
        },
        { label: 'choice.skip', then: [] },
      ]),
    ]
  },
  // Reverso: el Híbrido úrsido; el jefe elige quién activa el códice Σ.
  onAdvance: (state) => [
    ask(
      lead(state),
      'prompt.hemlockVale.chooseInvestigator',
      activeInvestigators(state).map((i) => ({
        label: 'choice.investigator',
        params: { name: i.name },
        then: [specific('theBear', { investigator: i.id })],
      })),
    ),
  ],
})

registerAct({
  code: HOLLOW.wheresBertie,
  // [rápida] Gasta 1 pista: mira el lado revelado de un Lugar conectado.
  abilities: (state, _self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const options = (here === null ? [] : (state.locations[here]?.connections ?? [])).filter(
      (l) => !state.locations[l]?.revealed,
    )
    return options.length && getInvestigator(state, investigator).clues
      ? [
          {
            key: 'hollow:look',
            label: 'ability.hemlockVale.lookAtLocation',
            actions: 0,
            provokes: false,
            costs: [{ type: 'SpendClues', investigator, amount: 1 }],
            then: [specific('look', { investigator, options: options.join(',') })],
          },
        ]
      : []
  },
  onAdvance: () => [specific('outOfTheFryingPan')],
})

// La hondonada retorcida: Objetivo – al final de la ronda, con todos allí, 2 pistas por
// investigador para avanzar al acto 2b.
registerAct({
  code: HOLLOW.backToTheVale,
  // Objetivo: si cada investigador no derrotado ha desistido, (→R1).
})

// ---------------------------------------------------------------------------
// Tarjeta de referencia
// ---------------------------------------------------------------------------

function tokenEffect(state: GameState, token: string, investigator: InvestigatorId): TokenEffect {
  const hard = isHard(state)
  const heal: Message[] = [{ type: 'Heal', investigator, damage: 1, horror: 0 }]
  const tablet: Message[] = [specific('tabletPursuer', { investigator })]
  const horror: Message[] = [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }]
  switch (token) {
    case 'skull':
      return { modifier: -(hard ? 2 * darkness(state) : darkness(state)) }
    case 'cultist':
      return hard ? { modifier: -3, onSuccess: heal } : { modifier: -1, immediate: heal }
    case 'tablet':
      return hard ? { modifier: -4, immediate: tablet } : { modifier: -3, onFail: tablet }
    case 'elderThing':
      return hard ? { modifier: -5, immediate: horror } : { modifier: -4, onFail: horror }
  }
  return { modifier: 0 }
}

// ---------------------------------------------------------------------------
// Preparación (pp. 34–35)
// ---------------------------------------------------------------------------

export function hollowEncounters(): EncounterCard[] {
  return [...hollowEncounterDeck, ...forestDeck, ...myconidsDeck, ...daySetDeck(1)]
}

export function twistedHollow(context: ScenarioContext): ScenarioDefinition {
  const notes = context.log.notes ?? []
  const showedTheWay = notes.includes('hemlockValeMotherRachelShowedTheWay')
  const n = context.investigators.length
  const rng = seedRng(context.seed)
  // Se retiran al azar 2 Lugares (1 o 2 investigadores) o 1 (3 o 4).
  const [shuffled, rng2] = shuffle(WOODS, rng)
  const kept = shuffled.slice(n >= 3 ? 1 : 2)
  let start: LocationCard
  let deck: LocationCard[]
  if (showedTheWay) {
    start = glimmeringWoods
    deck = kept
  } else {
    // Extraviados: un Lugar al azar (sin sus Obligado) y el Prado destelleante va al mazo.
    const [first, ...rest] = kept
    start = first!
    deck = shuffle([glimmeringWoods, ...rest], rng2)[0]
  }
  const around = deck.slice(0, 4).map((l, i) => ({
    ...l,
    position: [offset(0, -1), offset(1, 0), offset(0, 1), offset(-1, 0)][i]!,
  }))
  const residents = context.log.valley?.residents
  const lanternCode = showedTheWay ? HOLLOW.lanternBeacon : HOLLOW.lanternFaint
  return {
    id: TWISTED_HOLLOW,
    intro: entry('intro1'),
    // La verdad o la mentira se decide al final de La primera tarde (cambia la preparación).
    setupInstructions: entry('setup'),
    grid: true,
    locations: [{ ...start, position: ORIGIN }, ...around],
    setAsideLocations: [theTwistedHollow, ...deck.slice(4)],
    startingLocation: start.id,
    agendas: [
      { code: HOLLOW.deepeningDark, name: 'Deepening Dark', doomThreshold: 3 },
      { code: HOLLOW.backToTheVale, name: 'Back to the Vale!', doomThreshold: 3 },
    ],
    acts: [
      {
        code: HOLLOW.desperateSearch,
        name: 'Desperate Search',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: HOLLOW.wheresBertie,
        name: "Where's Bertie?",
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
      {
        code: HOLLOW.backToTheVale,
        name: 'Back to the Vale!',
        clueThreshold: 0,
        cluesPerInvestigator: false,
        advanceTiming: 'objective',
      },
    ],
    encounterDeck: hollowEncounters(),
    setAside: [],
    chaosBag: hemlockValeChaosBag(context),
    tokenValues: {},
    setup: [
      { type: 'SetValleyTime', day: 1, time: 'night' },
      { type: 'Story', entry: entry(showedTheWay ? 'intro2' : 'intro3') },
      setMeta('darkness', 1),
      setMeta(
        'woods',
        deck
          .slice(4)
          .map((l) => l.id)
          .join(','),
      ),
      ...(showedTheWay ? [] : [setMeta(`ignoreReveal:${start.id}`, 1)]),
      // Theo y Judith con relación 2 o más quedan apartados para el códice Σ.
      setMeta('theoAside', (residents?.theoPeters?.level ?? 0) >= 2 ? 1 : 0),
      setMeta('judithAside', (residents?.judithPark?.level ?? 0) >= 2 ? 1 : 0),
      specific('giveControl', { code: lanternCode }),
      specific('giveControl', { code: HEATH.drRosaMarquez }),
    ],
  }
}

// ---------------------------------------------------------------------------
// Códice (p. 37) y resoluciones (p. 38)
// ---------------------------------------------------------------------------

function giveControl(state: GameState, code: string): Message[] {
  const list = activeInvestigators(state)
  const noSlot = code === HEATH.drRosaMarquez || players(state) === 1
  const put = (investigator: InvestigatorId): Message => ({
    type: 'PutAssetIntoPlay',
    investigator,
    code,
    noSlot,
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

/** Códice Σ: El oso. Judith o Theo te salvan; si no, la madre Rachel interviene. */
function theBear(state: GameState, investigator: InvestigatorId): Message[] {
  const judith = !!meta(state, 'judithAside')
  const theo = !!meta(state, 'theoAside')
  const helper = (resident: 'judithPark' | 'theoPeters'): Message[] => [
    setMeta(resident === 'judithPark' ? 'judithAside' : 'theoAside', 0),
    {
      type: 'PutAssetIntoPlay',
      investigator,
      code: RESIDENTS[resident].code,
      noSlot: true,
    },
    ...read(state, resident === 'judithPark' ? 'codex7' : 'codex8'),
    specific('helperHurt', { resident }),
    {
      type: 'RecordResidentNote',
      resident,
      note: resident === 'judithPark' ? 'judithSavedTheInvestigators' : 'theoDistractedTheBear',
    },
  ]
  const choice: Message[] =
    judith && theo
      ? [
          ask(investigator, 'prompt.hemlockVale.whoHelps', [
            { label: 'choice.hemlockVale.judithPark', then: helper('judithPark') },
            { label: 'choice.hemlockVale.theoPeters', then: helper('theoPeters') },
          ]),
        ]
      : judith
        ? helper('judithPark')
        : theo
          ? helper('theoPeters')
          : [
              {
                type: 'RecordResidentNote',
                resident: 'motherRachel',
                note: 'motherRachelIntervened',
              },
              ...read(state, 'theBear2'),
              ask(investigator, 'prompt.hemlockVale.trauma', [
                {
                  label: 'choice.hemlockVale.physicalTrauma',
                  then: [
                    { type: 'SufferTrauma', physical: 1, investigator },
                    { type: 'TakeDamage', investigator, damage: 1, horror: 0, direct: true },
                  ],
                },
                {
                  label: 'choice.hemlockVale.mentalTrauma',
                  then: [
                    { type: 'SufferTrauma', mental: 1, investigator },
                    { type: 'TakeDamage', investigator, damage: 0, horror: 1, direct: true },
                  ],
                },
              ]),
            ]
  return [
    ...read(state, 'theBear1'),
    ...choice,
    ...read(state, 'theBear3'),
    specific('bearArrives', { investigator }),
  ]
}

/** Resolución `r` (1 o 2) seguida de la R3; 0 = sin resolución. */
export function resolutionMessages(state: GameState, r: number): Message[] {
  const time = valleyTime(state.campaignLog)
  const next = time ? NEXT_PRELUDE[time.time + ':' + time.day] : undefined
  const rescued = r === 1
  const bertieResigned = state.investigators.some(
    (i) =>
      i.resigned &&
      Object.values(state.assets).some((a) => a.owner === i.id && a.code === HOLLOW.bertieMusgrave),
  )
  return [
    ...read(state, r === 1 ? 'resolution1' : r === 2 ? 'resolution2' : 'noResolution'),
    {
      type: 'RecordNote',
      note: rescued ? 'hemlockValeBertieWasRescued' : 'hemlockValeBertieWasLost',
    },
    ...read(state, 'resolution3'),
    ...(state.victoryDisplay.includes(HOLLOW.ursineHybrid)
      ? [{ type: 'RecordNote', note: 'hemlockValeTheBearWasWounded' } as Message]
      : []),
    { type: 'EarnExperience', amount: 1 + (rescued && bertieResigned ? 1 : 0), victory: true },
    { type: 'SurveyArea', area: 'westernWoods' },
    ...(next ? [{ type: 'ChooseValleyRoute', scenario: next } as Message] : []),
    {
      type: 'EndScenario',
      outcome: r ? { type: 'resolution', resolution: r } : { type: 'noResolution' },
      told: true,
    },
  ]
}

// Aquí los códices 7 y 8 los lee el códice Σ, no el Negociar de Judith y Theo.
registerCodexGate(TWISTED_HOLLOW, () => false)

registerScenario({
  id: TWISTED_HOLLOW,
  shroudModifier: (state, location) => {
    const code = printedCode(location.id)
    if (!location.revealed) return 0
    if (code === HOLLOW.fecundThicket) return -darkness(state)
    if (code === HOLLOW.crookedPath) return darkness(state)
    if (code === HOLLOW.mushroomGrove && !isDark(state, location.id)) return 2
    return 0
  },
  // Claro iluminado por la luna: un Enemigo que se mueve está conectado a él.
  enemyConnections: (state) =>
    Object.keys(state.locations).filter(
      (l) => printedCode(l) === HOLLOW.moonlitClearing && state.locations[l]?.revealed,
    ),
  enemyPrey: (state, e) => {
    if (e.code !== HOLLOW.stalkingHybrid) return undefined
    const owner = litLantern(state)?.owner
    return owner ? ({ type: 'investigator', investigator: owner } as never) : undefined
  },
  enemyKeyword: (state, e, keyword) => valeEnemyKeyword(state, e, keyword),
  tokenEffect,
  forced: (state, trigger) => {
    // Acto 1: los Enemigos sin instrucciones de aparición robados del mazo van a la persecución.
    if (trigger.type === 'afterEncounterDrawn' && actIs(state, HOLLOW.desperateSearch)) {
      const draw = state.queue.find(
        (m): m is Extract<Message, { type: 'ResolveEncounterCard' }> =>
          m.type === 'ResolveEncounterCard' && m.draw?.id === trigger.draw,
      )
      const card = draw?.card
      if (card?.kind === 'enemy' && card.spawnAt === undefined)
        return [
          { type: 'CancelEncounterDraw', draw: trigger.draw, destination: 'discard' },
          specific('discardToPursuit', { code: card.code }),
        ]
    }
    // La hondonada retorcida: al final de la ronda, con todos allí, 2 pistas por investigador.
    if (trigger.type === 'roundEnds' && actIs(state, HOLLOW.wheresBertie)) {
      const hollow = state.locations[HOLLOW.theTwistedHollow]
      const list = activeInvestigators(state)
      const amount = 2 * list.length
      if (
        hollow?.revealed &&
        list.length &&
        list.every((i) => i.location === hollow.id) &&
        list.reduce((n, i) => n + i.clues, 0) >= amount
      )
        return [
          ask(lead(state), 'prompt.hemlockVale.advanceAct', [
            {
              label: 'choice.hemlockVale.spendGroupClues',
              params: { n: amount },
              then: [
                { type: 'PayGroupClues', amount, from: list.map((i) => i.id) },
                { type: 'AdvanceAct' },
              ],
            },
            { label: 'choice.skip', then: [] },
          ]),
        ]
    }
    return []
  },
  reactions: (state, trigger) => {
    if (trigger.type !== 'afterDiscoverClues') return []
    // Senda torcida: tras descubrir una pista aquí, mira un Lugar conectado; puedes moverte.
    if (printedCode(trigger.location) === HOLLOW.crookedPath) {
      const options = (state.locations[trigger.location]?.connections ?? []).filter(
        (l) => !state.locations[l]?.revealed,
      )
      if (options.length)
        return [
          {
            key: 'hollow:crookedPath',
            investigator: trigger.investigator,
            label: 'ability.hemlockVale.crookedPath',
            then: [
              specific('peek', { investigator: trigger.investigator, options: options.join(',') }),
            ],
          },
        ]
    }
    // Dra. Marquez: tras descubrir la última pista de tu Lugar, códice Θ.
    const marquez = Object.values(state.assets).find((a) => a.code === HEATH.drRosaMarquez)
    if (trigger.last && marquez?.owner === trigger.investigator && !meta(state, 'codex:theta'))
      return [
        {
          key: 'hollow:theta',
          investigator: trigger.investigator,
          label: 'ability.hemlockVale.codexTheta',
          then: [specific('codexTheta', { investigator: trigger.investigator })],
        },
      ]
    return []
  },
  onAllInvestigatorsEliminated: (state) =>
    // ¡De vuelta al Valle!: si todos los no derrotados han desistido, (→R1).
    state.agendas[state.agendaIndex]?.code === HOLLOW.backToTheVale &&
    state.investigators.some((i) => i.resigned)
      ? resolutionMessages(state, 1)
      : resolutionMessages(state, 0),
  specific: (state, key, data) => {
    if (key === 'resolution') return push(state, ...resolutionMessages(state, Number(data.r ?? 0)))
    return valeSpecific(state, key, data) ?? hollowSpecific(state, key, data)
  },
})

// Bertie: [rápida] Recibe 1 daño o 1 horror y agótalo: Negociar. Roba 1 carta (códice Ω).
registerPlayerCard({
  code: HOLLOW.bertieMusgrave,
  abilities: (state, self, investigator) =>
    self.owner === investigator && !self.exhausted && state.scenarioId === TWISTED_HOLLOW
      ? [
          {
            key: `${self.id}:parley`,
            label: 'ability.hemlockVale.bertieParley',
            actions: 0,
            provokes: false,
            parley: true,
            costs: [{ type: 'ExhaustAsset', asset: self.id }],
            then: [
              ask(investigator, 'prompt.chooseEffect', [
                {
                  label: 'choice.hemlockVale.takeDamage',
                  params: { n: 1 },
                  then: [{ type: 'TakeDamage', investigator, damage: 1, horror: 0 }],
                },
                {
                  label: 'choice.hemlockVale.takeHorror',
                  params: { n: 1 },
                  then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
                },
              ]),
              { type: 'DrawCards', investigator, amount: 1 },
              specific('codexOmega', { investigator }),
            ],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Mensajes propios del escenario
// ---------------------------------------------------------------------------

/** Lugar vacío más lejano de todos los investigadores (Luz robada). */
function farthestEmpty(state: GameState): LocationId[] {
  const occupied = new Set(activeInvestigators(state).map((i) => i.location))
  let best = -1
  let found: LocationId[] = []
  for (const l of Object.keys(state.locations)) {
    if (occupied.has(l)) continue
    const d = Math.min(
      ...activeInvestigators(state).map((i) =>
        i.location === null ? Infinity : (distancesFrom(state, i.location).get(l) ?? Infinity),
      ),
    )
    if (d > best) [best, found] = [d, [l]]
    else if (d === best) found.push(l)
  }
  return found
}

/** Lugares Oscuros más cercanos al Lugar dado (o él mismo, si es Oscuro). */
function nearestDark(state: GameState, from: LocationId | null): LocationId[] {
  if (from === null) return []
  if (isDark(state, from)) return [from]
  let best = Infinity
  let found: LocationId[] = []
  for (const [l, d] of distancesFrom(state, from)) {
    if (!isDark(state, l)) continue
    if (d < best) [best, found] = [d, [l]]
    else if (d === best) found.push(l)
  }
  return found
}

const chooseLocation = (
  state: GameState,
  investigator: InvestigatorId,
  options: LocationId[],
  then: (l: LocationId) => Message[],
): Message[] =>
  options.length <= 1
    ? options[0]
      ? then(options[0])
      : []
    : [
        ask(
          investigator,
          'prompt.chooseLocation',
          options.map((l) => ({
            label: 'choice.location',
            params: { location: state.locations[l]!.name },
            target: { type: 'location', id: l },
            then: then(l),
          })),
        ),
      ]

/** Reverso de Oscuridad creciente (con oscuridad menor que 6). */
function gatheringDarkness(state: GameState): GameState {
  let next = state
  // Cada Enemigo en un Lugar Oscuro y sin enfrentar pasa a la persecución.
  for (const e of Object.values(state.enemies))
    if (!e.engagedWith && isDark(state, e.location)) next = toPursuit(next, e.id)
  // Cada Lugar Oscuro sin revelar se baraja con las 2 cartas superiores del mazo de Bosque y
  // vuelve encima del mazo; cada Lugar Oscuro revelado y vacío vuelve a su lado sin revelar.
  const occupied = new Set([
    ...activeInvestigators(next).map((i) => i.location),
    ...Object.values(next.enemies).map((e) => e.location),
  ])
  const unrevealed = Object.values(next.locations).filter(
    (l) => !l.revealed && isDark(next, l.id) && !occupied.has(l.id),
  )
  const deck = woodsDeck(next)
  const [top, rng] = shuffle([...unrevealed.map((l) => l.id), ...deck.slice(0, 2)], next.rng)
  next = returnToWoods(
    setWoods({ ...next, rng }, [...top, ...deck.slice(2)]),
    unrevealed.map((l) => l.id),
  )
  const unreveal = Object.values(next.locations)
    .filter((l) => l.revealed && isDark(next, l.id) && !occupied.has(l.id))
    .map((l) => l.id)
  for (const l of unreveal) {
    const loc = next.locations[l]!
    next = { ...next, locations: { ...next.locations, [l]: { ...loc, revealed: false } } }
  }
  const owner = litLantern(next)?.owner
  return push(
    next,
    // Por cada Lugar con investigadores, cartas del mazo de Bosque a su alrededor.
    ...[...new Set(activeInvestigators(next).map((i) => i.location))]
      .filter((l): l is LocationId => !!l)
      .map((l) => specific('surround', { location: l })),
    // Quien controla el Farol: [willpower] (oscuridad); si falla, un Enemigo de la persecución
    // aparece enfrentado con él.
    ...(owner
      ? [
          effectTest(owner, 'Deepening Dark', 'willpower', darkness(next), {
            onFail: [specific('pursuerAt', { stat: 'any', location: '', engage: owner })],
          }),
        ]
      : []),
  )
}

/** Reverso de ¡De vuelta al Valle! (con oscuridad menor que 6). */
function hungeringForest(state: GameState): GameState {
  return push(
    state,
    ...activeInvestigators(state).map((i) => specific('hungerFor', { investigator: i.id })),
  )
}

export function hollowSpecific(
  state: GameState,
  key: string,
  data: Record<string, string | number | boolean>,
): GameState {
  const investigator = String(data.investigator ?? '')
  switch (key) {
    case 'surround':
      return surround(state, String(data.location))
    case 'giveControl':
      return push(state, ...giveControl(state, String(data.code)))
    case 'toPursuit': {
      const next = toPursuit(state, String(data.enemy))
      return data.heal
        ? setPursuit(
            next,
            pursuit(next).map((p) =>
              p.card.code === HOLLOW.ursineHybrid ? { ...p, damage: 0 } : p,
            ),
          )
        : next
    }
    case 'discardToPursuit': {
      const index = state.encounterDiscard.findLastIndex((c) => c.code === String(data.code))
      const card = state.encounterDiscard[index]
      if (!card || card.kind !== 'enemy') return state
      return setPursuit(
        { ...state, encounterDiscard: state.encounterDiscard.filter((_, n) => n !== index) },
        [...pursuit(state), { card, damage: 0, doom: 0 }],
      )
    }
    case 'fromPursuit':
      return fromPursuit(
        state,
        Number(data.index),
        String(data.location),
        data.engage ? String(data.engage) : null,
      )
    case 'pursuerAt': {
      const engage = String(data.engage ?? '')
      const stat = String(data.stat)
      const location =
        String(data.location) || (engage ? getInvestigator(state, engage).location : null)
      if (!location) return state
      const options =
        stat === 'any'
          ? pursuit(state).map((_, i) => i)
          : pursuers(state, stat as 'fight' | 'evade' | 'health', 'max')
      const chooser = engage || lead(state)
      return push(state, ...choosePursuer(state, chooser, options, location, !!engage))
    }
    case 'tabletPursuer': {
      const here = getInvestigator(state, investigator).location
      if (!here) return state
      return push(
        state,
        ...choosePursuer(state, investigator, pursuers(state, 'evade', 'max'), here, false),
      )
    }
    case 'darkInvestigationEnd': {
      const options = pursuers(state, 'evade', 'max')
      const here = getInvestigator(state, investigator).location
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeHorror',
            params: { n: 1 },
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
          },
          ...(options.length && here
            ? [
                {
                  label: 'choice.hemlockVale.drawPursuer',
                  then: choosePursuer(state, investigator, options, here, true),
                },
              ]
            : []),
        ]),
      )
    }
    case 'gatheringDarkness':
      return gatheringDarkness(state)
    case 'hungeringForest':
      return hungeringForest(state)
    case 'hungerFor': {
      const here = getInvestigator(state, investigator).location
      const targets = nearestDark(state, here)
      if (!targets.length) return state
      const list = pursuit(state)
      if (!list.length) {
        const index = state.encounterDeck.findIndex((c) => c.kind === 'enemy')
        const card = index < 0 ? undefined : state.encounterDeck[index]
        return push(
          {
            ...state,
            encounterDeck: index < 0 ? [] : state.encounterDeck.slice(index + 1),
            encounterDiscard: [
              ...state.encounterDiscard,
              ...state.encounterDeck.slice(0, index < 0 ? undefined : index),
            ],
          },
          ...(card && card.kind === 'enemy'
            ? chooseLocation(state, investigator, targets, (l) => [
                { type: 'SpawnEnemy', card, location: l, engageWith: null },
              ])
            : []),
        )
      }
      return push(
        state,
        ask(
          investigator,
          'prompt.chooseEnemy',
          list.map((p, i) => ({
            label: 'choice.enemy',
            params: { enemy: p.card.name },
            then: chooseLocation(state, investigator, targets, (l) => [
              specific('fromPursuit', { index: i, location: l, engage: '' }),
            ]),
          })),
        ),
      )
    }
    case 'look':
    case 'peek': {
      // Mira el lado revelado de un Lugar conectado; con `peek` puedes moverte a él ignorando
      // sus efectos Obligado.
      const options = String(data.options)
        .split(',')
        .filter((l) => state.locations[l])
      return push(
        state,
        ask(
          investigator,
          'prompt.hemlockVale.lookAtLocation',
          options.map((l) => ({
            label: 'choice.hemlockVale.revealedSide',
            params: { location: state.locations[l]!.name },
            target: { type: 'location', id: l },
            then:
              key === 'peek'
                ? [
                    ask(investigator, 'prompt.hemlockVale.moveThere', [
                      {
                        label: 'choice.hemlockVale.moveIgnoringForced',
                        params: { location: state.locations[l]!.name },
                        then: [
                          setMeta(`ignoreReveal:${l}`, 1),
                          { type: 'MoveTo', investigator, location: l },
                        ],
                      },
                      { label: 'choice.skip', then: [] },
                    ]),
                  ]
                : [],
          })),
        ),
      )
    }
    case 'deepShadows': {
      const lantern = litLantern(state)
      const here = lantern ? getInvestigator(state, lantern.owner).location : null
      const connecting = here ? (state.locations[here]?.connections ?? []) : []
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeHorror',
            params: { n: 2 },
            then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
          },
          ...(lantern && connecting.length
            ? [
                {
                  label: 'choice.hemlockVale.lanternGoesOut',
                  then: chooseLocation(state, lantern.owner, connecting, (l) =>
                    dropLantern(state, l),
                  ),
                },
              ]
            : []),
        ]),
      )
    }
    case 'lurkingFear': {
      const options = pursuers(state, 'fight', 'max')
      const here = getInvestigator(state, investigator).location
      return push(
        state,
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.takeDamage',
            params: { n: 2 },
            then: [{ type: 'TakeDamage', investigator, damage: 2, horror: 0 }],
          },
          ...(options.length && here
            ? [
                {
                  label: 'choice.hemlockVale.drawPursuer',
                  then: choosePursuer(state, investigator, options, here, true),
                },
              ]
            : []),
        ]),
      )
    }
    case 'stolenLight':
      return push(
        state,
        ...chooseLocation(state, lead(state), farthestEmpty(state), (l) => dropLantern(state, l)),
      )
    case 'theBear':
      return push(state, ...theBear(state, investigator))
    case 'helperHurt': {
      const code = RESIDENTS[String(data.resident) as 'judithPark' | 'theoPeters'].code
      const asset = Object.values(state.assets).find((a) => a.code === code)
      if (!asset) return state
      return push(state, {
        type: 'DamageAsset',
        asset: asset.id,
        damage: data.resident === 'judithPark' ? 2 : 0,
        horror: data.resident === 'judithPark' ? 0 : 2,
      })
    }
    case 'bearArrives': {
      // Los Enemigos sin enfrentar pasan a la persecución; el oso aparece agotado en tu Lugar.
      let next = state
      for (const e of Object.values(state.enemies)) if (!e.engagedWith) next = toPursuit(next, e.id)
      const here = getInvestigator(next, investigator).location
      // Las Ubicaciones Oscuras vacías vuelven al mazo de Bosque, con la Hondonada entre las 3
      // últimas cartas.
      const occupied = new Set([
        ...activeInvestigators(next).map((i) => i.location),
        ...Object.values(next.enemies).map((e) => e.location),
      ])
      const empty = Object.values(next.locations).filter(
        (l) => l.id !== here && !occupied.has(l.id) && isDark(next, l.id),
      )
      const [all, rng] = shuffle([...empty.map((l) => l.id), ...woodsDeck(next)], next.rng)
      const top = all.slice(0, Math.max(0, all.length - 3))
      const [bottom, rng2] = shuffle([HOLLOW.theTwistedHollow, ...all.slice(top.length)], rng)
      next = returnToWoods(
        setWoods({ ...next, rng: rng2 }, [...top, ...bottom]),
        empty.map((l) => l.id),
      )
      const unlit = unlitLantern(next)
      return push(
        next,
        ...(here
          ? [
              {
                type: 'SpawnEnemy',
                card: ursineHybrid,
                location: here,
                engageWith: null,
                entersExhausted: true,
                initialDamage: 1,
              } as Message,
            ]
          : []),
        ...(unlit
          ? [
              { type: 'RemovePlacedAsset', placed: unlit.id } as Message,
              ...giveControl(next, LIT_SIDE[unlit.code]!),
            ]
          : []),
        ...(here ? [specific('surround', { location: here })] : []),
      )
    }
    case 'outOfTheFryingPan': {
      // Bertie bajo control; los Enemigos sin enfrentar a la persecución; todo salvo la
      // Hondonada vuelve al mazo de Bosque y se coloca alrededor según el diagrama (p. 36).
      let next = state
      for (const e of Object.values(state.enemies)) if (!e.engagedWith) next = toPursuit(next, e.id)
      const others = Object.keys(next.locations).filter((l) => l !== HOLLOW.theTwistedHollow)
      const [deck, rng] = shuffle([...others, ...woodsDeck(next)], next.rng)
      const positions: [number, number][] = [
        offset(-1, 0),
        offset(1, 0),
        offset(-2, -1),
        offset(-1, -1),
        offset(0, -1),
        offset(1, -1),
        offset(2, -1),
        offset(-2, 1),
        offset(-1, 1),
        offset(0, 1),
        offset(1, 1),
        offset(2, 1),
        offset(0, 2),
      ]
      const placed = deck.slice(0, positions.length)
      next = returnToWoods(setWoods({ ...next, rng }, deck.slice(placed.length)), others)
      const bear = pursuit(next).findIndex((p) => p.card.code === HOLLOW.ursineHybrid)
      const inPlay = Object.values(next.enemies).find((e) => e.code === HOLLOW.ursineHybrid)
      return push(
        next,
        ...giveControl(next, HOLLOW.bertieMusgrave),
        { type: 'SlideLocation', location: HOLLOW.theTwistedHollow, position: ORIGIN },
        ...placed.map((l, i): Message => ({
          type: 'PutLocationIntoPlay',
          location: l,
          position: positions[i]!,
        })),
        // El oso se cura y queda en la Hondonada.
        ...(inPlay
          ? [{ type: 'MoveEnemy', enemy: inPlay.id, location: HOLLOW.theTwistedHollow } as Message]
          : []),
        ...(inPlay
          ? [{ type: 'HealEnemy', enemy: inPlay.id, amount: inPlay.damageTaken } as Message]
          : []),
        ...(bear >= 0
          ? [
              specific('fromPursuit', {
                index: bear,
                location: HOLLOW.theTwistedHollow,
                engage: '',
              }),
            ]
          : []),
        // Pasa al plan especial ¡De vuelta al Valle! con la misma perdición.
        { type: 'AgendaAdvanced', from: HOLLOW.deepeningDark },
      )
    }
    case 'codexTheta': {
      // Puedes revelar un Lugar sin revelar ignorando sus efectos Obligado.
      const options = Object.values(state.locations).filter((l) => !l.revealed)
      return push(
        withMeta(state, { 'codex:theta': 1 }),
        ...read(state, 'codexTheta'),
        ask(investigator, 'prompt.chooseLocation', [
          ...options.map((l) => ({
            label: 'choice.location',
            params: { location: l.name },
            target: { type: 'location' as const, id: l.id },
            then: [
              setMeta(`ignoreReveal:${l.id}`, 1),
              { type: 'RevealLocation', location: l.id, investigator } as Message,
            ],
          })),
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    case 'codexOmega': {
      if (meta(state, 'codex:omega')) return state
      const lantern = Object.values(state.assets).find((a) => LIT.has(a.code) && a.exhausted)
      return push(
        withMeta(state, { 'codex:omega': 1 }),
        ...read(state, 'codexOmega'),
        ask(investigator, 'prompt.chooseEffect', [
          {
            label: 'choice.hemlockVale.eachGainsClue',
            then: activeInvestigators(state).map((i): Message => ({
              type: 'GainClues',
              investigator: i.id,
              amount: 1,
            })),
          },
          ...(lantern
            ? [
                {
                  label: 'choice.hemlockVale.readyLantern',
                  then: [{ type: 'ReadyAsset', asset: lantern.id } as Message],
                },
              ]
            : []),
        ]),
      )
    }
  }
  return state
}

export type { Pursuer }
