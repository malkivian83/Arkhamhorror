/** Asesinato en el hotel Excelsior: enemigos y traiciones de los seis conjuntos. */
import {
  activeInvestigators,
  distancesFrom,
  getInvestigator,
  push,
  registerEnemy,
  registerTreachery,
  type AbilityOption,
  type Choice,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type SkillType,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { CODES } from './cards'
import {
  addForced,
  addReactions,
  ask,
  enemiesWith,
  hasTrait,
  inVictory,
  investigatorsHere,
  isCrimeScene,
  isSymbol,
  leadId,
  locationTraits,
  log,
  nearestEnemies,
  nearestLocations,
  onSpecific,
  revealedToken,
  revealToken,
  specific,
  tokenText,
} from './helpers'

const fromEncounter = { encounter: true }

/** El enemigo tiene vinculada Llevado a la locura (no se puede negociar con él). */
const maddened = (state: GameState, enemy: Enemy) =>
  Object.values(state.treacheries).some(
    (t) =>
      t.code === CODES.drivenToMadness &&
      t.placement.type === 'enemy' &&
      t.placement.enemy === enemy.id,
  )

/** Negociar con un enemigo de tu Lugar: prueba (3) de una de estas habilidades. */
function parley(
  state: GameState,
  self: Enemy,
  investigator: InvestigatorId,
  skills: SkillType[],
  onSuccess: Message[],
): AbilityOption[] {
  if (maddened(state, self)) return []
  return skills.map((skill) => ({
    key: `${self.id}:parley:${skill}`,
    label: 'ability.excelsior.parley',
    params: { enemy: self.name, skill },
    actions: 1,
    provokes: false,
    parley: true,
    then: [
      {
        type: 'BeginSkillTest',
        investigator,
        skill,
        difficulty: 3,
        tags: ['parley'],
        kind: { type: 'effect', source: self.name, onSuccess, onFail: [], onFailEach: [] },
      },
    ],
  }))
}

const isEmpty = (state: GameState, location: LocationId) =>
  investigatorsHere(state, location).length === 0 &&
  !Object.values(state.enemies).some((e) => e.location === location)

const here = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location

const nearestTo = (
  state: GameState,
  investigator: InvestigatorId,
  matches: (location: LocationId) => boolean,
) => {
  const from = here(state, investigator)
  return from ? nearestLocations(state, from, matches) : []
}

// ---------------------------------------------------------------------------
// Asesinato en el hotel Excelsior
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.arkhamOfficer,
  // Errante (Lugar más cercano con pistas).
  patrol: (state) =>
    Object.values(state.locations)
      .filter((l) => l.clues > 0)
      .map((l) => l.id),
  // Al final de la fase de Enemigos: 1 pista de su Lugar pasa a ser perdición sobre él.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemyPhaseEnds') return []
    if ((state.locations[self.location]?.clues ?? 0) === 0) return []
    return [
      {
        type: 'MoveClues',
        from: { type: 'location', id: self.location },
        to: { type: 'pool' },
        amount: 1,
      },
      { type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 },
    ]
  },
  // [acción] Negociar. [willpower] (3): evítalo automáticamente, o da la vuelta a una de
  // sus perdiciones y toma esa pista.
  abilities: (state, self, investigator) =>
    parley(
      state,
      self,
      investigator,
      ['willpower'],
      [specific('officerParley', { investigator, enemy: self.id })],
    ),
})

onSpecific('officerParley', (state, data) => {
  const investigator = String(data.investigator)
  const enemy = state.enemies[String(data.enemy)]
  if (!enemy) return state
  const choices: Choice[] = [
    ...(!enemy.exhausted
      ? [
          {
            label: 'choice.excelsior.evadeOfficer',
            then: [{ type: 'EvadeEnemy', enemy: enemy.id, by: investigator } as Message],
          },
        ]
      : []),
    ...(enemy.doom
      ? [
          {
            label: 'choice.excelsior.flipDoom',
            then: [
              { type: 'RemoveDoom', target: { type: 'enemy', id: enemy.id }, amount: 1 },
              { type: 'GainClues', investigator, amount: 1 },
            ] as Message[],
          },
        ]
      : []),
  ]
  return choices.length
    ? push(state, ask(investigator, 'prompt.excelsior.officerParley', choices))
    : state
})

registerEnemy({
  code: CODES.mrTrombly,
  // Tras entrar en juego: resuelve Cazador y Errante de los demás Enemigos Personal.
  forced: (state, trigger, self) =>
    trigger.type === 'enemySpawned' && trigger.enemy === self.id
      ? [
          {
            type: 'HuntersMove',
            enemies: enemiesWith(state, 'Staff')
              .filter((e) => e.id !== self.id)
              .map((e) => e.id),
          },
        ]
      : [],
})

registerEnemy({
  code: CODES.conspicuousStaff,
  // Aparición: Lugar Escena del crimen más cercano.
  spawn: (state, investigator) => nearestTo(state, investigator, (l) => isCrimeScene(state, l)),
})

const managerInPlay = (state: GameState) =>
  Object.values(state.enemies).some((e) => e.code === CODES.hotelManager)

registerEnemy({
  code: CODES.hotelGuest,
  // Aparición: Lugar Pasillo más cercano.
  spawn: (state, investigator) =>
    nearestTo(state, investigator, (l) => locationTraits(state, l).includes('Hall')),
  // Errante (Escena del crimen más cercana); con el Director del hotel lo pierde.
  patrol: (state) =>
    managerInPlay(state)
      ? null
      : Object.keys(state.locations).filter((l) => isCrimeScene(state, l)),
  // Con el Director del hotel en juego obtiene Oleada.
  surge: managerInPlay,
  // Al final de la fase de Enemigos, si está en una Escena del crimen: 1 perdición.
  forced: (state, trigger, self) =>
    trigger.type === 'enemyPhaseEnds' && isCrimeScene(state, self.location)
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 1 }]
      : [],
  // [acción] Negociar. [willpower] o [intellect] (3): descarta a la Clienta.
  abilities: (state, self, investigator) =>
    parley(
      state,
      self,
      investigator,
      ['willpower', 'intellect'],
      [{ type: 'DiscardEnemy', enemy: self.id }],
    ),
})

// ---------------------------------------------------------------------------
// Interferencia alienígena, Dirección del Excelsior, Rituales oscuros, Pecados del pasado
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.otherworldlyMeddler,
  // Cuando fuese a recibir daño de un ataque: retira 1 perdición y reduce el daño en 1.
  damageTaken: (_state, self, amount, source) =>
    source.attack && (self.doom ?? 0) > 0
      ? {
          amount: amount - 1,
          then: [{ type: 'RemoveDoom', target: { type: 'enemy', id: self.id }, amount: 1 }],
        }
      : { amount },
  // Después de que un investigador sea derrotado: 3 perdiciones sobre él.
  forced: (_state, trigger, self) =>
    trigger.type === 'investigatorDefeated'
      ? [{ type: 'PlaceDoomOnEnemy', enemy: self.id, amount: 3 }]
      : [],
})

registerEnemy({
  code: CODES.hotelManager,
  // Al comienzo de la fase de Enemigos: se come a un Cliente de su Lugar (2 perdiciones)
  // y los demás Clientes se acercan un Lugar.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemyPhaseBegins' || enemiesWith(state, 'Guest').length === 0) return []
    return [specific('feast', { enemy: self.id })]
  },
})

onSpecific('feast', (state, data) => {
  const manager = state.enemies[String(data.enemy)]
  if (!manager) return state
  const guests = enemiesWith(state, 'Guest')
  const edible = guests.filter((g) => g.location === manager.location)
  const others = guests.filter((g) => g.location !== manager.location)
  const eat = (g: Enemy): Message[] => [
    { type: 'EnemyToVictory', enemy: g.id },
    { type: 'PlaceDoomOnEnemy', enemy: manager.id, amount: 2 },
  ]
  const [only] = edible
  const first: Message[] = !only
    ? []
    : edible.length === 1
      ? eat(only)
      : [
          ask(
            leadId(state),
            'prompt.excelsior.feast',
            edible.map((g): Choice => ({
              label: 'choice.enemy',
              params: { enemy: g.name },
              target: { type: 'enemy', id: g.id },
              then: eat(g),
            })),
          ),
        ]
  return push(
    state,
    ...first,
    ...others.map((g): Message => ({
      type: 'HuntOnce',
      enemy: g.id,
      toward: manager.location,
      attack: false,
    })),
  )
})

registerEnemy({
  code: CODES.hotelSecurity,
  // Aparición: Lugar vacío más cercano.
  spawn: (state, investigator) => nearestTo(state, investigator, (l) => isEmpty(state, l)),
  // Con algún Cliente en juego pierde Cazador y gana Errante (Lugar con un Cliente).
  losesHunter: (state) => enemiesWith(state, 'Guest').length > 0,
  patrol: (state) => {
    const guests = enemiesWith(state, 'Guest')
    return guests.length ? [...new Set(guests.map((g) => g.location))] : null
  },
})

registerEnemy({
  code: CODES.dimensionalShambler,
  // Después de infligirte daño con su ataque: revela una ficha; con [auto_fail], te
  // arrebata de esta dimensión.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterTakeDamage' && trigger.enemy === self.id && trigger.damage > 0
      ? [specific('snatch', { enemy: self.id, investigator: trigger.investigator })]
      : [],
})

onSpecific('snatch', (state, data) =>
  push(state, revealToken(String(data.investigator), 'snatchToken', data)),
)
onSpecific('snatchToken', (state, data) => {
  const investigator = String(data.investigator)
  const token = revealedToken(data)
  const name = getInvestigator(state, investigator).name
  return push(
    state,
    log('tokenRevealed', { name, token: tokenText(token) }),
    ...(token === 'autoFail'
      ? [
          log('snatched', { name }),
          { type: 'RemoveEnemyFromGame', enemy: String(data.enemy) } as Message,
          { type: 'DefeatInvestigator', investigator } as Message,
        ]
      : []),
  )
})

registerEnemy({
  code: CODES.cultistOfTheEnclave,
  // Después de que ataque: revela una ficha; con un símbolo, 1 perdición en el plan.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEnemyAttack' && trigger.enemy === self.id
      ? [specific('enclaveToken', { investigator: trigger.investigator })]
      : [],
})

onSpecific('enclaveToken', (state, data) =>
  push(state, revealToken(String(data.investigator), 'enclaveTokenRevealed', data)),
)
onSpecific('enclaveTokenRevealed', (state, data) => {
  const token = revealedToken(data)
  return push(
    state,
    log('tokenRevealed', {
      name: getInvestigator(state, String(data.investigator)).name,
      token: tokenText(token),
    }),
    ...(isSymbol(token)
      ? [{ type: 'PlaceDoom', amount: 1 } as Message, { type: 'CheckAgenda' } as Message]
      : []),
  )
})

const WARDING = ['Spell', 'Relic', 'Charm']

registerEnemy({
  code: CODES.vengefulSpecter,
  // Errante (Habitación 245).
  patrol: () => [CODES.room245],
  // Reduce a 1 el daño salvo el de Hechizos, Reliquias, Amuletos o cartas de Encuentro.
  damageTaken: (_state, _self, amount, source) =>
    source.encounter || (source.traits ?? []).some((t) => WARDING.includes(t))
      ? { amount }
      : { amount: Math.min(amount, 1) },
})

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

registerTreachery({
  code: CODES.noxiousFumes,
  // Cada investigador de tu Lugar, en orden, elige: huir ([agility] 3) o aguantar la
  // respiración ([combat] 3).
  revelation: (state, investigator) => {
    const location = here(state, investigator)
    if (!location) return []
    return investigatorsHere(state, location).map((i) =>
      ask(i.id, 'prompt.excelsior.fumes', [
        {
          label: 'choice.excelsior.fumesFlee',
          then: [
            effectTest(i.id, 'Noxious Fumes', 'agility', 3, {
              onSuccess: [specific('flee', { investigator: i.id })],
              onFail: [{ type: 'TakeDamage', investigator: i.id, damage: 2, horror: 0 }],
            }),
          ],
        },
        {
          label: 'choice.excelsior.fumesHold',
          then: [
            effectTest(i.id, 'Noxious Fumes', 'combat', 3, {
              onFailEach: [{ type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0 }],
            }),
          ],
        },
      ]),
    )
  },
})

/** Muévete a un Lugar conectado (sin poder quedarte). */
onSpecific('flee', (state, data) => {
  const investigator = String(data.investigator)
  const location = here(state, investigator)
  if (!location) return state
  const options = state.locations[location]!.connections.filter((l) => state.locations[l])
  if (options.length === 0) return state
  return push(
    state,
    ask(
      investigator,
      'prompt.chooseMove',
      options.map((to): Choice => ({
        label: 'action.move',
        params: { location: state.locations[to]!.name },
        target: { type: 'location', id: to },
        then: [{ type: 'MoveTo', investigator, location: to }],
      })),
    ),
  )
})

registerTreachery({
  code: CODES.drivenToMadness,
  // Sin Humanoides en juego, oleada; si no, se vincula al Humanoide más cercano.
  revelation: (state, investigator, self) => {
    const humanoids = enemiesWith(state, 'Humanoid')
    if (humanoids.length === 0) return [{ type: 'GainSurge' }]
    const location = here(state, investigator)
    const nearest = location ? nearestEnemies(state, location, (e) => hasTrait(e, 'Humanoid')) : []
    const options = nearest.length ? nearest : humanoids
    const attach = (e: Enemy): Message[] => [
      { type: 'PlaceTreachery', treachery: self.id, placement: { type: 'enemy', enemy: e.id } },
      { type: 'CheckEngagement', location: e.location },
    ]
    if (options.length === 1) return attach(options[0]!)
    return [
      ask(
        investigator,
        'prompt.chooseEnemy',
        options.map((e): Choice => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: attach(e),
        })),
      ),
    ]
  },
  // +1 combate, +1 salud y +1 evitar; pierde Indiferente.
  attachedEnemy: { fight: 1, evade: 1, health: 1, loses: ['aloof'] },
  // Después de que el enemigo vinculado sea evitado: descártala.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEvade' &&
    self.placement.type === 'enemy' &&
    trigger.enemy === self.placement.enemy
      ? [
          { type: 'DiscardTreachery', treachery: self.id },
          { type: 'CheckEnemyDefeat', enemy: trigger.enemy },
        ]
      : [],
})

registerTreachery({
  code: CODES.bloodOnYourHands,
  // [willpower] (2 + 1 por cada Inocente en la zona de victoria). Si fallas, 2 horrores
  // (y, en una Escena del crimen, descarta una carta de tu mano).
  revelation: (state, investigator) => {
    const location = here(state, investigator)
    return [
      effectTest(
        investigator,
        'Blood on Your Hands',
        'willpower',
        2 + inVictory(state, 'Innocent'),
        {
          onFail: [
            { type: 'TakeDamage', investigator, damage: 0, horror: 2 },
            ...(location && isCrimeScene(state, location)
              ? [{ type: 'ChooseDiscardFromHand', investigator, amount: 1 } as Message]
              : []),
          ],
        },
      ),
    ]
  },
})

registerTreachery({
  code: CODES.incriminatingEvidence,
  // Se vincula al Lugar más cercano que no sea Escena del crimen.
  revelation: (state, investigator, self) => {
    const options = nearestTo(state, investigator, (l) => !isCrimeScene(state, l))
    const attach = (l: LocationId): Message => ({
      type: 'PlaceTreachery',
      treachery: self.id,
      placement: { type: 'location', location: l },
    })
    if (options.length <= 1) return options.map(attach)
    return [
      ask(
        investigator,
        'prompt.excelsior.placeNearestNotCrimeScene',
        options.map((l): Choice => ({
          label: 'choice.location',
          params: { location: state.locations[l]!.name },
          target: { type: 'location', id: l },
          then: [attach(l)],
        })),
        { card: self.name },
      ),
    ]
  },
  // +2 al velo (y el rasgo Escena del crimen, en helpers.ts).
  shroudModifier: 2,
})

// [reacción] Cuando investigues con éxito el Lugar vinculado: en lugar de descubrir
// pistas, descarta las Pruebas incriminatorias.
addReactions((state, trigger) => {
  if (trigger.type !== 'afterSkillTest' || trigger.kind !== 'investigate' || !trigger.succeeded)
    return []
  const evidence = Object.values(state.treacheries).find(
    (t) =>
      t.code === CODES.incriminatingEvidence &&
      t.placement.type === 'location' &&
      t.placement.location === trigger.location,
  )
  if (!evidence) return []
  return [
    {
      key: `${evidence.id}:destroy`,
      investigator: trigger.investigator,
      label: 'ability.excelsior.destroyEvidence',
      target: { type: 'treachery', id: evidence.id },
      then: [
        { type: 'ModifySkillTest', replaceClue: true },
        { type: 'DiscardTreachery', treachery: evidence.id },
      ],
    },
  ]
})

registerTreachery({
  code: CODES.violentOutburst,
  // Sin Humanoides en juego: busca uno en el mazo y los descartes de Encuentros y róbalo.
  // Si no, el Humanoide más cercano se prepara, viene hasta ti, se enfrenta y ataca.
  revelation: (state, investigator) => {
    const humanoids = enemiesWith(state, 'Humanoid')
    if (humanoids.length === 0)
      return [{ type: 'SearchEncounterForTrait', investigator, trait: 'Humanoid' }]
    const location = here(state, investigator)
    const nearest = location ? nearestEnemies(state, location, (e) => hasTrait(e, 'Humanoid')) : []
    const options = nearest.length ? nearest : humanoids
    const outburst = (e: Enemy) => specific('outburst', { investigator, enemy: e.id })
    if (options.length === 1) return [outburst(options[0]!)]
    return [
      ask(
        investigator,
        'prompt.chooseEnemy',
        options.map((e): Choice => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy', id: e.id },
          then: [outburst(e)],
        })),
      ),
    ]
  },
})

onSpecific('outburst', (state, data) =>
  push(
    state,
    { type: 'ReadyEnemy', enemy: String(data.enemy) },
    specific('pursue', { ...data, steps: 0 }),
  ),
)

/** El enemigo se mueve de Lugar en Lugar hasta el tuyo, se enfrenta a ti y ataca. */
onSpecific('pursue', (state, data) => {
  const investigator = String(data.investigator)
  const enemy = state.enemies[String(data.enemy)]
  const target = here(state, investigator)
  if (!enemy || !target) return state
  if (enemy.location === target) {
    return push(
      state,
      { type: 'EngageEnemy', enemy: enemy.id, investigator },
      { type: 'EnemyAttack', enemy: enemy.id, investigator, exhaustAfter: false },
    )
  }
  if (!distancesFrom(state, enemy.location, enemy).has(target)) return state
  if (Number(data.steps) >= Object.keys(state.locations).length) return state
  return push(
    state,
    { type: 'HuntOnce', enemy: enemy.id, toward: target, attack: false },
    specific('pursue', { ...data, steps: Number(data.steps) + 1 }),
  )
})

registerTreachery({
  code: CODES.encephalonSignal,
  // Peligro. 1 perdición sobre el Entrometido sobrenatural (si está en juego) y
  // [willpower] (4). Si fallas: 2 horrores o 2 daños a un investigador o Humanoide de tu Lugar.
  revelation: (state, investigator) => {
    const meddler = Object.values(state.enemies).find((e) => e.code === CODES.otherworldlyMeddler)
    return [
      ...(meddler ? [{ type: 'PlaceDoomOnEnemy', enemy: meddler.id, amount: 1 } as Message] : []),
      // Peligro: nadie más puede comprometer cartas a esta prueba.
      {
        ...(effectTest(investigator, 'Encephalon Signal', 'willpower', 4, {
          onFail: [specific('signal', { investigator })],
        }) as Extract<Message, { type: 'BeginSkillTest' }>),
        tags: ['scenario', 'peril'],
      },
    ]
  },
})

onSpecific('signal', (state, data) => {
  const investigator = String(data.investigator)
  const location = here(state, investigator)
  if (!location) return state
  const victims: Choice[] = [
    ...investigatorsHere(state, location).map((i): Choice => ({
      label: 'choice.excelsior.damageInvestigator',
      params: { name: i.name },
      target: { type: 'investigator', id: i.id },
      then: [{ type: 'TakeDamage', investigator: i.id, damage: 2, horror: 0 }],
    })),
    ...Object.values(state.enemies)
      .filter((e) => e.location === location && hasTrait(e, 'Humanoid'))
      .map((e): Choice => ({
        label: 'choice.excelsior.damageEnemy',
        params: { enemy: e.name },
        target: { type: 'enemy', id: e.id },
        then: [
          {
            type: 'DamageEnemy',
            enemy: e.id,
            amount: 2,
            by: investigator,
            source: fromEncounter,
          },
        ],
      })),
  ]
  return push(
    state,
    ask(investigator, 'prompt.excelsior.signal', [
      {
        label: 'choice.excelsior.takeHorror',
        params: { n: 2 },
        then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
      },
      {
        label: 'choice.excelsior.dealDamage',
        then: [ask(investigator, 'prompt.excelsior.signalTarget', victims)],
      },
    ]),
  )
})

registerTreachery({
  code: CODES.morbidAwareness,
  // [willpower] (6, -1 por cada Lugar de distancia a la Habitación 212). Si fallas: deja
  // 1 de tus pistas en tu Lugar o recibe 2 horrores.
  revelation: (state, investigator) => {
    const location = here(state, investigator)
    const distance =
      location && state.locations[CODES.room212]
        ? (distancesFrom(state, location).get(CODES.room212) ?? 0)
        : 0
    return [
      effectTest(investigator, 'Morbid Awareness', 'willpower', Math.max(0, 6 - distance), {
        onFail: [
          ask(investigator, 'prompt.excelsior.morbid', [
            {
              label: 'choice.excelsior.placeClue',
              requires: { type: 'hasClues', investigator },
              then: [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }],
            },
            {
              label: 'choice.excelsior.takeHorror',
              params: { n: 2 },
              then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
            },
          ]),
        ],
      }),
    ]
  },
})

registerTreachery({
  code: CODES.chillingPresence,
  // [willpower] (3): 1 horror por punto que falles; por cada punto de éxito, puedes
  // infligir 1 daño a un Geist de tu Lugar. Con [elder_sign], 2 daños a un Geist de
  // cualquier Lugar.
  revelation: (_state, investigator) => [
    effectTest(investigator, 'Chilling Presence', 'willpower', 3, {
      onFailEach: [{ type: 'TakeDamage', investigator, damage: 0, horror: 1 }],
      onSuccessEach: [specific('geistDamage', { investigator, amount: 1, anywhere: false })],
    }),
  ],
})

addForced((state, trigger) =>
  trigger.type === 'afterRevealChaosToken' &&
  trigger.token === 'elderSign' &&
  state.skillTest?.kind.type === 'effect' &&
  state.skillTest.kind.source === 'Chilling Presence'
    ? [specific('geistDamage', { investigator: trigger.investigator, amount: 2, anywhere: true })]
    : [],
)

onSpecific('geistDamage', (state, data) => {
  const investigator = String(data.investigator)
  const location = here(state, investigator)
  const geists = enemiesWith(state, 'Geist').filter((e) => data.anywhere || e.location === location)
  if (geists.length === 0) return state
  const amount = Number(data.amount)
  return push(
    state,
    ask(investigator, 'prompt.excelsior.geistDamage', [
      ...geists.map((e): Choice => ({
        label: 'choice.excelsior.damageEnemyN',
        params: { enemy: e.name, n: amount },
        target: { type: 'enemy', id: e.id },
        then: [
          { type: 'DamageEnemy', enemy: e.id, amount, by: investigator, source: fromEncounter },
        ],
      })),
      { label: 'choice.skip', then: [] },
    ]),
  )
})

registerTreachery({
  code: CODES.harvestedBrain,
  // Solo entra en juego por La verdad 7.
  revelation: () => [],
  // Al final de la fase de Investigación: 1 daño y 1 horror a cada investigador de su
  // Lugar; los demás eligen 1 daño o 1 horror.
  forced: (state, trigger, self) => {
    if (trigger.type !== 'investigationPhaseEnds' || self.placement.type !== 'location') return []
    const at = self.placement.location
    return activeInvestigators(state).map((i): Message =>
      i.location === at
        ? { type: 'TakeDamage', investigator: i.id, damage: 1, horror: 1 }
        : ask(i.id, 'prompt.excelsior.brain', [
            {
              label: 'choice.excelsior.takeDamage',
              params: { n: 1 },
              then: [{ type: 'TakeDamage', investigator: i.id, damage: 1, horror: 0 }],
            },
            {
              label: 'choice.excelsior.takeHorror',
              params: { n: 1 },
              then: [{ type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 }],
            },
          ]),
    )
  },
})
