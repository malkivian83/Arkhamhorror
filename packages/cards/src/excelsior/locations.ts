/** Asesinato en el hotel Excelsior: capacidades de las localizaciones. */
import {
  canAffordEntry,
  canEnter,
  getInvestigator,
  push,
  registerLocation,
  type AbilityOption,
  type Choice,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { resignAbility } from '../scenario-helpers'
import { CODES } from './cards'
import {
  addReactions,
  ask,
  hasTrait,
  isSymbol,
  leadAsset,
  log,
  onSpecific,
  perInv,
  remember,
  remembered,
  revealRandomToken,
  specific,
  tokenText,
} from './helpers'

/** Prueba exigida por una capacidad (lleva `then` en caso de éxito). */
const test = (
  investigator: InvestigatorId,
  source: string,
  skill: SkillType,
  difficulty: number,
  onSuccess: Message[],
  extra: { onSuccessEach?: Message[]; commitRule?: 'discardTop' } = {},
): Message => ({
  type: 'BeginSkillTest',
  investigator,
  skill,
  difficulty,
  ...(extra.commitRule ? { commitRule: extra.commitRule } : {}),
  kind: {
    type: 'effect',
    source,
    onSuccess,
    onFail: [],
    onFailEach: [],
    ...(extra.onSuccessEach ? { onSuccessEach: extra.onSuccessEach } : {}),
  },
})

/** "Mueve a X cualquier cantidad de pistas…": se resuelve en `transferClues`. */
const transfer = (
  investigator: InvestigatorId,
  location: LocationId,
  target: string,
  max?: number,
): Message =>
  specific('transferClues', {
    chooser: investigator,
    location,
    target,
    ...(max === undefined ? {} : { max }),
  })

/** Una capacidad [acción] de prueba en este Lugar. */
const action = (
  key: string,
  label: string,
  then: Message[],
  params?: Record<string, string | number>,
  provokes = true,
): AbilityOption => ({
  key,
  label,
  ...(params ? { params } : {}),
  actions: 1,
  provokes,
  then,
})

// ---------------------------------------------------------------------------
// Habitación 225: la escena del crimen
// ---------------------------------------------------------------------------

const COVER_UP: { key: string; skill: SkillType }[] = [
  { key: 'cleanedUpTheBlood', skill: 'willpower' },
  { key: 'hidTheBody', skill: 'combat' },
  { key: 'tidiedUpTheRoom', skill: 'intellect' },
]

registerLocation({
  code: CODES.room225,
  abilities: (state, self, investigator) =>
    COVER_UP.filter((c) => !remembered(state, c.key)).map((c) =>
      action(`${self.id}:${c.key}`, `ability.excelsior.${c.key}`, [
        test(investigator, 'Room 225', c.skill, 3, [remember(c.key), log(c.key)]),
      ]),
    ),
})

// ---------------------------------------------------------------------------
// Balcón de la suite
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.suiteBalcony,
  // Elige un Humanoide de aquí: [combat] o [agility] (4). Sin ataques de oportunidad.
  abilities: (state, self, investigator) =>
    Object.values(state.enemies)
      .filter((e) => e.location === self.id && hasTrait(e, 'Humanoid'))
      .flatMap((e) =>
        (['combat', 'agility'] as const).map((skill) => ({
          ...action(
            `${self.id}:push`,
            'ability.excelsior.pushOffBalcony',
            [
              test(investigator, 'Suite Balcony', skill, 4, [
                specific('balcony', { investigator, enemy: e.id }),
              ]),
            ],
            { enemy: e.name, skill },
            false,
          ),
          target: { type: 'enemy' as const, id: e.id },
        })),
      ),
})

/** Recibe 1 horror directo y derrota al enemigo (2 daños si es Élite). */
onSpecific('balcony', (state, data) => {
  const investigator = String(data.investigator)
  const enemy = state.enemies[String(data.enemy)]
  const horror: Message = { type: 'TakeDamage', investigator, damage: 0, horror: 1, direct: true }
  if (!enemy) return push(state, horror)
  return push(
    state,
    horror,
    hasTrait(enemy, 'Elite')
      ? {
          type: 'DamageEnemy',
          enemy: enemy.id,
          amount: 2,
          by: investigator,
          source: { encounter: true },
        }
      : { type: 'DefeatEnemy', enemy: enemy.id, by: investigator },
  )
})

// ---------------------------------------------------------------------------
// Pasillo del segundo piso
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.secondFloorHall,
  // Habitación 212 (sin revelar): [action] [agility] (4) para forzar la cerradura.
  abilities: (state, self, investigator) => {
    const room = state.locations[CODES.room212]
    if (!room || room.revealed) return []
    return [
      {
        ...action(
          `${self.id}:pickLock`,
          'ability.excelsior.pickLock',
          [
            test(investigator, 'Room 212', 'agility', 4, [
              { type: 'RevealLocation', location: CODES.room212 },
              { type: 'MoveTo', investigator, location: CODES.room212 },
            ]),
          ],
          { location: room.name },
        ),
        target: { type: 'location', id: CODES.room212 },
      },
    ]
  },
})

// [reacción] Después de que entres aquí: puedes moverte a un Lugar conectado; si lo
// haces, revela una ficha al azar y, si es un símbolo, roba un encuentro.
addReactions((state, trigger) => {
  if (trigger.type !== 'afterMove') return []
  const investigator = getInvestigator(state, trigger.investigator)
  if (investigator.location !== CODES.secondFloorHall || investigator.eliminated) return []
  if (exits(state, investigator.id).length === 0) return []
  return [
    {
      key: `${CODES.secondFloorHall}:slip:${state.log.length}`,
      investigator: investigator.id,
      label: 'ability.excelsior.keepMoving',
      target: { type: 'location', id: CODES.secondFloorHall },
      then: [specific('keepMoving', { investigator: investigator.id })],
    },
  ]
})

const exits = (state: GameState, investigator: InvestigatorId) => {
  const here = getInvestigator(state, investigator).location
  if (!here) return []
  return state.locations[here]!.connections.filter(
    (to) => state.locations[to] && canAffordEntry(state, to) && canEnter(state, investigator, to),
  )
}

onSpecific('keepMoving', (state, data) => {
  const investigator = String(data.investigator)
  return push(
    state,
    ask(
      investigator,
      'prompt.chooseMove',
      exits(state, investigator).map((to): Choice => ({
        label: 'action.move',
        params: { location: state.locations[to]!.name },
        target: { type: 'location', id: to },
        then: [
          { type: 'MoveTo', investigator, location: to },
          specific('hallToken', { investigator }),
        ],
      })),
    ),
  )
})

onSpecific('hallToken', (state, data) => {
  const investigator = String(data.investigator)
  const [token, next] = revealRandomToken(state)
  if (token === undefined) return state
  return push(
    next,
    log('tokenRevealed', {
      name: getInvestigator(state, investigator).name,
      token: tokenText(token),
    }),
    ...(isSymbol(token) ? [{ type: 'DrawEncounterCard', investigator } as Message] : []),
  )
})

// ---------------------------------------------------------------------------
// Vestíbulo (la prueba al salir está en excelsior.ts)
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.foyer,
  // [acción] Retirarse: huyes de la escena del crimen.
  abilities: (_state, self, investigator) => [resignAbility(investigator, `${self.id}:resign`)],
})

// ---------------------------------------------------------------------------
// Restaurante
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.restaurant,
  abilities: (state, self, investigator) => {
    const options: AbilityOption[] = []
    // [acción] Gasta 2 recursos: al final de tu turno, si sigues aquí, puedes recibir
    // 1 horror para curar 3 daños. Límite de una vez por partida.
    if (getInvestigator(state, investigator).resources >= 2) {
      options.push({
        ...action(`${self.id}:order`, 'ability.excelsior.placeOrder', [
          { type: 'AtEndOfTurn', investigator, then: [specific('meal', { investigator })] },
        ]),
        costs: [{ type: 'SpendResources', investigator, amount: 2 }],
        limit: { per: 'game' },
      })
    }
    // [rápida] Si todos los Lugares están revelados y sin pistas: 1 pista por
    // investigador en el Restaurante.
    const all = Object.values(state.locations)
    if (all.every((l) => l.revealed && l.clues === 0)) {
      options.push({
        key: `${self.id}:moreClues`,
        label: 'ability.excelsior.restaurantClues',
        params: { n: perInv(state, 1) },
        actions: 0,
        provokes: false,
        then: [
          {
            type: 'PlaceCluesOnLocationFromPool',
            location: self.id,
            amount: perInv(state, 1),
          },
        ],
      })
    }
    return options
  },
})

onSpecific('meal', (state, data) => {
  const investigator = getInvestigator(state, String(data.investigator))
  if (investigator.location !== CODES.restaurant || investigator.eliminated) return state
  return push(
    state,
    ask(investigator.id, 'prompt.excelsior.meal', [
      {
        label: 'choice.excelsior.meal',
        then: [
          { type: 'TakeDamage', investigator: investigator.id, damage: 0, horror: 1 },
          { type: 'Heal', investigator: investigator.id, damage: 3, horror: 0 },
        ],
      },
      { label: 'choice.skip', then: [] },
    ]),
  )
})

// ---------------------------------------------------------------------------
// Tejado del hotel
// ---------------------------------------------------------------------------

const ROOMS = [CODES.room212, CODES.room225, CODES.room245]

registerLocation({
  code: CODES.hotelRoof,
  abilities: (state, self, investigator) => [
    // [acción] [agility] o [combat] (4): muévete a la Habitación 212, 225 o 245.
    ...(['agility', 'combat'] as const).map((skill) =>
      action(
        `${self.id}:climb:${skill}`,
        'ability.excelsior.climbDown',
        [test(investigator, 'Hotel Roof', skill, 4, [specific('climbDown', { investigator })])],
        { skill },
      ),
    ),
    // [acción] [willpower] (3): mueve pistas de aquí al Artefacto alienígena.
    ...(leadAsset(state, CODES.alienDevice)
      ? [
          action(
            `${self.id}:clues`,
            'ability.excelsior.moveCluesTo',
            [
              test(investigator, 'Hotel Roof', 'willpower', 3, [
                transfer(investigator, self.id, CODES.alienDevice),
              ]),
            ],
            { card: 'Alien Device', skill: 'willpower', difficulty: 3 },
          ),
        ]
      : []),
  ],
})

onSpecific('climbDown', (state, data) => {
  const investigator = String(data.investigator)
  const rooms = ROOMS.filter((r) => state.locations[r])
  return push(
    state,
    ask(
      investigator,
      'prompt.chooseMove',
      rooms.map((to): Choice => ({
        label: 'action.move',
        params: { location: state.locations[to]!.name },
        target: { type: 'location', id: to },
        then: [{ type: 'MoveTo', investigator, location: to }],
      })),
    ),
  )
})

// ---------------------------------------------------------------------------
// Habitación 212, Habitación 245, Despacho y Sótano
// ---------------------------------------------------------------------------

registerLocation({
  code: CODES.room212,
  // [acción] [intellect] (3): mueve pistas de aquí a la Solución siniestra.
  abilities: (state, self, investigator) =>
    leadAsset(state, CODES.sinisterSolution)
      ? [
          action(
            `${self.id}:clues`,
            'ability.excelsior.moveCluesTo',
            [
              test(investigator, 'Room 212', 'intellect', 3, [
                transfer(investigator, self.id, CODES.sinisterSolution),
              ]),
            ],
            { card: 'Sinister Solution', skill: 'intellect', difficulty: 3 },
          ),
        ]
      : [],
})

registerLocation({
  code: CODES.room245,
  // [acción] [intellect] (3), comprometiendo solo la carta superior de tu pila de
  // descartes (después va al fondo de tu mazo): pistas al Guardapelo desgastado.
  abilities: (state, self, investigator) =>
    leadAsset(state, CODES.timeWornLocket)
      ? [
          action(`${self.id}:clues`, 'ability.excelsior.room245', [
            test(
              investigator,
              'Room 245',
              'intellect',
              3,
              [transfer(investigator, self.id, CODES.timeWornLocket)],
              { commitRule: 'discardTop' },
            ),
          ]),
        ]
      : [],
})

registerLocation({
  code: CODES.office,
  // [acción] [intellect] (0): por cada punto de éxito, 1 pista de aquí a la Llave del director.
  abilities: (state, self, investigator) =>
    leadAsset(state, CODES.managersKey)
      ? [
          action(`${self.id}:clues`, 'ability.excelsior.office', [
            { type: 'SetScenarioMeta', key: 'margin', value: 0 },
            test(
              investigator,
              'Office',
              'intellect',
              0,
              [specific('officeClues', { investigator })],
              { onSuccessEach: [specific('countMargin')] },
            ),
          ]),
        ]
      : [],
})

onSpecific('officeClues', (state, data) => {
  const max = Number(state.scenarioMeta?.margin ?? 0)
  return push(
    { ...state, scenarioMeta: { ...(state.scenarioMeta ?? {}), margin: 0 } },
    transfer(String(data.investigator), CODES.office, CODES.managersKey, max),
  )
})

registerLocation({
  code: CODES.basement,
  abilities: (state, self, investigator) => {
    const options: AbilityOption[] = []
    // [acción] [intellect] (1): mueve un Humanoide una vez hacia el Sótano.
    options.push(
      action(`${self.id}:lure`, 'ability.excelsior.lure', [
        test(investigator, 'Basement', 'intellect', 1, [specific('lure', { investigator })]),
      ]),
    )
    // Despacho (sin revelar): [acción] [agility] (3) para forzar la cerradura.
    const office = state.locations[CODES.office]
    if (office && !office.revealed) {
      options.push({
        ...action(
          `${self.id}:pickLock`,
          'ability.excelsior.pickLock',
          [
            test(investigator, 'Office', 'agility', 3, [
              { type: 'RevealLocation', location: CODES.office },
              { type: 'MoveTo', investigator, location: CODES.office },
            ]),
          ],
          { location: office.name },
        ),
        target: { type: 'location', id: CODES.office },
      })
    }
    return options
  },
})

onSpecific('lure', (state, data) => {
  const humanoids = Object.values(state.enemies).filter(
    (e) => hasTrait(e, 'Humanoid') && e.location !== CODES.basement,
  )
  if (humanoids.length === 0) return state
  return push(
    state,
    ask(
      String(data.investigator),
      'prompt.chooseEnemy',
      humanoids.map((e): Choice => ({
        label: 'choice.enemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [{ type: 'HuntOnce', enemy: e.id, toward: CODES.basement, attack: false }],
      })),
    ),
  )
})

// [reacción] Después de que derrotes a un Enemigo en el Sótano: mueve pistas de los
// investigadores de aquí al Tomo de rituales.
addReactions((state, trigger) => {
  if (trigger.type !== 'enemyDefeated' || !trigger.by) return []
  if (trigger.enemy.location !== CODES.basement) return []
  if (!leadAsset(state, CODES.tomeOfRituals)) return []
  const someone = Object.values(state.investigators).some(
    (i) => !i.eliminated && i.location === CODES.basement && i.clues > 0,
  )
  if (!someone) return []
  return [
    {
      key: `${CODES.basement}:tome:${trigger.enemy.id}`,
      investigator: trigger.by,
      label: 'ability.excelsior.moveCluesTo',
      params: { card: 'Tome of Rituals' },
      target: { type: 'location', id: CODES.basement },
      then: [transfer(trigger.by, CODES.basement, CODES.tomeOfRituals)],
    },
  ]
})
