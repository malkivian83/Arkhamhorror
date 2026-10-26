/**
 * Cartas de Encuentro del conjunto Fortuna e insensatez: Abarran, los enemigos Casino con
 * Errante y las traiciones que suben el nivel de alarma.
 */
import {
  distancesFrom,
  getInvestigator,
  registerEnemy,
  registerTreachery,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { adjustAlarmMessage, halfAlarm } from './check'
import {
  AVARICE,
  CODES,
  DEALERS,
  GAMBLERS,
  GAZES,
  GUARDS,
  isCasino,
  PATROL,
  PATROLS,
  BUSY_PUBLIC_RING,
  PUBLIC_RING,
  QUESTIONING,
  RESTRICTED_RING,
  SPOTLIGHTS,
  UNIQUE_ENEMIES,
} from './cards'
import { REVERSE } from './roles'

const specific = (key: string, data: Record<string, string | number | boolean>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

/** Grupos de Lugares para Errante, en el sentido de las agujas del reloj. */
export const RINGS: string[][] = [PUBLIC_RING, BUSY_PUBLIC_RING, RESTRICTED_RING]

/** El enemigo que lleva la Entrega de paquete (parte II): va hacia la Puerta de la cámara. */
export const PACKAGE = 'fof:package'

/**
 * Siguiente Lugar en el sentido del Errante del enemigo (o el contrario, El ladrón). En el
 * acto 3 (La salida) los Casino pierden Errante: null.
 */
export function patrolTarget(state: GameState, enemy: Enemy): LocationId[] | null {
  if (state.scenarioMeta?.[PACKAGE] === enemy.id) return [CODES.vaultDoor]
  if (state.acts[state.actIndex]?.code === CODES.theExit && isCasino(enemy.traits)) return null
  const ring = RINGS.find((r) => r.includes(enemy.location))
  const printed = PATROL[enemy.code]
  if (!ring || !printed) return []
  const reversed = state.scenarioMeta?.[`${REVERSE}${enemy.id}`] === `${state.round}:${state.phase}`
  const clockwise = (printed === 'clockwise') !== reversed
  const inPlay = ring.filter((l) => state.locations[l])
  const at = inPlay.indexOf(enemy.location)
  const step = clockwise ? 1 : inPlay.length - 1
  return [inPlay[(at + step) % inPlay.length]!]
}

/** Lugares de la lista más cercanos al investigador (los que estén en juego). */
export function nearestOf(
  state: GameState,
  investigator: InvestigatorId,
  candidates: LocationId[],
): LocationId[] {
  const inPlay = candidates.filter((l) => state.locations[l])
  const here = getInvestigator(state, investigator).location
  if (here === null || inPlay.length <= 1) return inPlay
  const distances = distancesFrom(state, here)
  const d = (l: LocationId) => distances.get(l) ?? Infinity
  const best = Math.min(...inPlay.map(d))
  return inPlay.filter((l) => d(l) === best)
}

export const nonUniqueCasino = (state: GameState) =>
  Object.values(state.enemies).filter((e) => isCasino(e.traits) && !UNIQUE_ENEMIES.includes(e.code))

// ---------------------------------------------------------------------------
// Enemigos
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.abarran,
  patrol: (state, self) => patrolTarget(state, self),
  // Al enfrentarte a él, el plan avanza de inmediato.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterEngage' && trigger.enemy === self.id ? [{ type: 'AdvanceAgenda' }] : [],
  // [action] Prueba [agility] (3): si fallas, +1 alarma; si tienes éxito, comprueba 1 icono y,
  // si es rojo, recuerda que «robaste las llaves de Abarran».
  abilities: (_state, self, investigator) => [
    {
      key: `${self.id}:keys`,
      label: 'ability.fof.abarranKeys',
      actions: 1,
      provokes: true,
      target: { type: 'enemy', id: self.id },
      then: [
        effectTest(investigator, CODES.abarran, 'agility', 3, {
          onSuccess: [specific('fofAbarranKeys', { investigator })],
          onFail: [adjustAlarmMessage(investigator, 1)],
        }),
      ],
    },
  ],
})

for (const code of GUARDS)
  registerEnemy({
    code,
    patrol: (state, self) => patrolTarget(state, self),
    // Aparición: Mesa de apuestas altas o Sala de guardias (la más cercana).
    spawn: (state, investigator) =>
      nearestOf(state, investigator, [
        CODES.highRollersTable,
        CODES.highRollersTableBusy,
        CODES.guardRoom,
      ]),
  })

for (const code of DEALERS)
  registerEnemy({ code, patrol: (state, self) => patrolTarget(state, self) })

for (const code of PATROLS)
  registerEnemy({
    code,
    patrol: (state, self) => patrolTarget(state, self),
    // Aparición: Bar del casino u Oficina de seguridad (la más cercana).
    spawn: (state, investigator) =>
      nearestOf(state, investigator, [
        CODES.casinoLounge,
        CODES.casinoLoungeBusy,
        CODES.securityOffice,
      ]),
    // Después de moverse a tu Lugar durante la fase de Enemigos: +1 alarma.
    forced: (state, trigger, self) =>
      trigger.type === 'enemyEntersLocation' && trigger.enemy === self.id && state.phase === 'enemy'
        ? state.investigators
            .filter((i) => !i.eliminated && i.location === trigger.location)
            .map((i) => adjustAlarmMessage(i.id, 1))
        : [],
  })

// ---------------------------------------------------------------------------
// Traiciones
// ---------------------------------------------------------------------------

for (const code of QUESTIONING)
  registerTreachery({
    code,
    // Sin enemigos Casino no únicos, gana Oleada. Si no, el más cercano se mueve una vez
    // hacia ti y pruebas [intellect] (3): si fallas, +1 alarma y los Casino no únicos de tu
    // Lugar pierden Indiferente hasta el final de la ronda.
    revelation: (state, investigator) => {
      const casino = nonUniqueCasino(state)
      if (!casino.length) return [{ type: 'GainSurge' }]
      const here = getInvestigator(state, investigator).location
      const distances = here === null ? new Map() : distancesFrom(state, here)
      const d = (e: Enemy) => distances.get(e.location) ?? Infinity
      const nearest = [...casino].sort((a, b) => d(a) - d(b))[0]!
      return [
        ...(here === null
          ? []
          : [{ type: 'HuntOnce', enemy: nearest.id, toward: here, attack: false } as Message]),
        effectTest(investigator, code, 'intellect', 3, {
          onFail: [adjustAlarmMessage(investigator, 1), specific('fofNoAloof', { investigator })],
        }),
      ]
    },
  })

for (const code of SPOTLIGHTS)
  registerTreachery({
    code,
    // Se vincula al Lugar más cercano sin otra copia.
    revelation: (state, investigator, self) => {
      const taken = new Set(
        Object.values(state.treacheries)
          .filter((t) => SPOTLIGHTS.includes(t.code) && t.placement.type === 'location')
          .map((t) => (t.placement as { location: LocationId }).location),
      )
      const [where] = nearestOf(
        state,
        investigator,
        Object.keys(state.locations).filter((l) => !taken.has(l)),
      )
      return where
        ? [
            {
              type: 'PlaceTreachery',
              treachery: self.id,
              placement: { type: 'location', location: where },
            },
          ]
        : []
    },
    forced: (state, trigger, self) => {
      if (self.placement.type !== 'location') return []
      const where = self.placement.location
      // Después de entrar en el Lugar: +1 alarma.
      if (
        trigger.type === 'afterMove' &&
        getInvestigator(state, trigger.investigator).location === where &&
        trigger.from !== where
      )
        return [adjustAlarmMessage(trigger.investigator, 1)]
      // Al final de la ronda: +1 alarma a cada investigador del Lugar; se descarta.
      if (trigger.type === 'roundEnds')
        return [
          ...state.investigators
            .filter((i) => !i.eliminated && i.location === where)
            .map((i) => adjustAlarmMessage(i.id, 1)),
          { type: 'DiscardTreachery', treachery: self.id },
        ]
      return []
    },
  })

for (const code of AVARICE)
  registerTreachery({
    code,
    // Peligro. Recibe 2 horror o prueba [willpower] (la mitad de tu alarma): con éxito ganas
    // 2 recursos; si fallas, 2 horror y +1 alarma.
    revelation: (state, investigator) => [
      {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.avarice',
          choices: [
            {
              label: 'choice.fof.takeHorror',
              params: { amount: 2 },
              then: [{ type: 'TakeDamage', investigator, damage: 0, horror: 2 }],
            },
            {
              label: 'choice.test.willpower',
              params: { difficulty: halfAlarm(state, investigator) },
              then: [
                effectTest(investigator, code, 'willpower', halfAlarm(state, investigator), {
                  onSuccess: [{ type: 'GainResources', investigator, amount: 2 }],
                  onFail: [
                    { type: 'TakeDamage', investigator, damage: 0, horror: 2 },
                    adjustAlarmMessage(investigator, 1),
                  ],
                }),
              ],
            },
          ],
        },
      },
    ],
  })

for (const code of GAZES)
  registerTreachery({
    code,
    // Prueba [agility] (3). Si fallas: daño igual a la mitad de tu alarma, o +1 alarma.
    revelation: (state, investigator) => [
      effectTest(investigator, code, 'agility', 3, {
        onFail: [
          {
            type: 'Ask',
            investigator,
            question: {
              kind: 'chooseOne',
              prompt: 'prompt.fof.gaze',
              choices: [
                {
                  label: 'choice.fof.takeDamage',
                  params: { amount: halfAlarm(state, investigator) },
                  then: [
                    {
                      type: 'TakeDamage',
                      investigator,
                      damage: halfAlarm(state, investigator),
                      horror: 0,
                    },
                  ],
                },
                {
                  label: 'choice.fof.raiseAlarm',
                  then: [adjustAlarmMessage(investigator, 1)],
                },
              ],
            },
          },
        ],
      }),
    ],
  })

export const GAINED = 'fof:gained:'

for (const code of GAMBLERS)
  registerTreachery({
    code,
    // En tu zona de amenaza (límite 1 por investigador).
    revelation: (state, investigator, self) =>
      Object.values(state.treacheries).some(
        (t) =>
          GAMBLERS.includes(t.code) &&
          t.placement.type === 'threatArea' &&
          t.placement.investigator === investigator,
      )
        ? []
        : [
            {
              type: 'PlaceTreachery',
              treachery: self.id,
              placement: { type: 'threatArea', investigator },
            },
          ],
    // Al final de tu turno: 1 horror si no has ganado recursos este turno. Prueba
    // [willpower] (3): si tienes éxito, se descarta.
    forced: (state, trigger, self) => {
      if (
        trigger.type !== 'turnEnds' ||
        self.placement.type !== 'threatArea' ||
        self.placement.investigator !== trigger.investigator
      )
        return []
      const who = trigger.investigator
      return [
        ...(gainedThisTurn(state, who)
          ? []
          : [{ type: 'TakeDamage', investigator: who, damage: 0, horror: 1 } as Message]),
        effectTest(who, code, 'willpower', 3, {
          onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
        }),
      ]
    },
  })

/**
 * Si el investigador ha ganado recursos en este turno: por efectos de cartas (marca) o por
 * la acción básica (recursos actuales más los gastados frente a los del inicio del turno).
 */
export function gainedThisTurn(state: GameState, investigator: InvestigatorId): boolean {
  const [flag, start, spent] = String(state.scenarioMeta?.[`${GAINED}${investigator}`] ?? '0:0:0')
    .split(':')
    .map(Number)
  const now = getInvestigator(state, investigator).resources
  return flag === 1 || now + (spent ?? 0) > (start ?? now)
}
