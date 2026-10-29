/**
 * Cartas de Encuentro de la parte II: Abarran desatado, Los elegidos de la fortuna y Plan al
 * garete (Vagabundo, Duplicador y Desplazador dimensionales y sus traiciones).
 */
import { nearestEnemyChoice, nearestLocationChoice } from '../nearest-choice'
import {
  getInvestigator,
  leadInvestigator,
  playerCardDef,
  registerEnemy,
  registerTreachery,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
} from '@lcg/engine'
import { effectTest } from '../scenario-helpers'
import { alarmOf } from './check'
import { CODES, PART_TWO_CODES } from './cards'
import { nearestOf, nonUniqueCasino, PACKAGE, patrolTarget } from './encounter'
import { iconOf } from './icons'

const specific = (key: string, data: Record<string, string | number | boolean>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

/** Copias del Duplicador dimensional en juego (cartas del mazo del investigador boca abajo). */
export const DUPLICATE = 'fof:duplicate:'
export const DUPLICATE_CODE = 'fof-dimensional-duplicate'
/** Daño adicional del ataque en curso de la Daga de la fortuna. */
export const DAGGER = 'fof:dagger:'

/**
 * Primer icono que saldría al comprobar 1 carta, sin descartarla todavía (las cartas sin
 * icono se saltan). Sin cartas con icono en el mazo, null.
 */
export function peekIcon(state: GameState) {
  for (const card of state.encounterDeck) {
    const icon = iconOf(card.code)
    if (icon) return icon
  }
  return null
}

const isDuplicate = (state: GameState, enemy: Enemy) =>
  enemy.code === DUPLICATE_CODE || !!state.scenarioMeta?.[`${DUPLICATE}${enemy.id}`]

registerEnemy({
  code: DUPLICATE_CODE,
  forced: (_state, trigger, self) =>
    trigger.type === 'enemyDisengaged' && trigger.enemy === self.id
      ? [{ type: 'DiscardEnemy', enemy: self.id }]
      : [],
})

/** Resolve the nearest-enemy choice when the failed test actually resolves. */
export function nearestExtradimensional(state: GameState, investigator: InvestigatorId): Message[] {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  return nearestEnemyChoice(
    state,
    investigator,
    Object.values(state.enemies).filter((e) => (e.traits ?? []).includes('Extradimensional')),
    (enemy) => [{ type: 'HuntOnce', enemy: enemy.id, toward: here, attack: false }],
    { chooser: investigator },
  )
}

// ---------------------------------------------------------------------------
// Abarran desatado
// ---------------------------------------------------------------------------

registerEnemy({
  code: CODES.abarranUnleashed,
  // Gana Cazador mientras algún investigador tenga alarma 5 o más (lo resuelve el escenario).
  // Cuando le infliges daño estando preparado: comprueba 1 icono; si es ♦, te ataca.
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDealDamage' && trigger.enemy === self.id && !self.exhausted
      ? [specific('fofAbarranStrikes', { investigator: trigger.investigator, enemy: self.id })]
      : [],
})

/** Abarran desatado tiene Cazador mientras alguien tenga alarma 5 o más. */
export const abarranHunts = (state: GameState) =>
  state.investigators.some((i) => !i.eliminated && alarmOf(state, i.id) >= 5)

// ---------------------------------------------------------------------------
// Los elegidos de la fortuna
// ---------------------------------------------------------------------------

for (const code of PART_TWO_CODES.fortunesShield)
  registerEnemy({
    code,
    patrol: (state, self) => patrolTarget(state, self),
    // Cuando le fueras a infligir daño: comprueba 1 icono; si es ♥, se cancela 1 de ese daño.
    damageTaken: (state, _self, amount) => {
      if (amount <= 0) return { amount }
      const icon = peekIcon(state)
      return {
        amount: icon?.suit === '♥' ? amount - 1 : amount,
        then: [specific('fofCheckOne', {})],
      }
    },
  })

for (const code of PART_TWO_CODES.fortunesDagger)
  registerEnemy({
    code,
    patrol: (state, self) => patrolTarget(state, self),
    // Cuando te ataca: comprueba 2 iconos; +1 daño por cada ♣.
    onAttack: (_state, self) => [specific('fofDagger', { enemy: self.id })],
  })

// ---------------------------------------------------------------------------
// Plan al garete
// ---------------------------------------------------------------------------

for (const code of PART_TWO_CODES.duplicators)
  registerEnemy({
    code,
    // Después de infligirle daño: la primera carta de tu mazo entra en juego boca abajo,
    // enfrentada contigo, como un enemigo Extradimensional 1/1/1 que hace 1 daño y 1 horror.
    forced: (state, trigger, self) =>
      trigger.type === 'afterDealDamage' && trigger.enemy === self.id && !isDuplicate(state, self)
        ? [specific('fofDuplicate', { investigator: trigger.investigator })]
        : [],
  })

/** Desplazador dimensional: Casino no únicos más cercanos sin carta de Encuentro vinculada. */
function displaceable(state: GameState) {
  return nonUniqueCasino(state).filter(
    (e) =>
      state.scenarioMeta?.[PACKAGE] !== e.id &&
      !Object.values(state.treacheries).some(
        (t) => t.placement.type === 'enemy' && t.placement.enemy === e.id,
      ),
  )
}

for (const code of PART_TWO_CODES.displacers)
  registerEnemy({
    code,
    // Aparición: donde esté el Casino no único más cercano sin carta vinculada (que se
    // descarta). Si no hay ninguno, se descarta y gana Oleada.
    spawn: (state, investigator) =>
      nearestOf(state, investigator, [...new Set(displaceable(state).map((e) => e.location))]),
    surge: (state) => displaceable(state).length === 0,
    forced: (state, trigger, self) => {
      if (trigger.type !== 'enemySpawned' || trigger.enemy !== self.id) return []
      const victims = displaceable(state).filter((e) => e.location === trigger.location)
      if (victims.length <= 1) return victims.map((e) => ({ type: 'DiscardEnemy', enemy: e.id }))
      const chooser = leadInvestigator(state)?.id
      if (!chooser) return []
      return [
        {
          type: 'Ask',
          investigator: chooser,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.chooseEnemy',
            choices: victims.map((e) => ({
              label: 'choice.enemy',
              params: { enemy: e.name },
              target: { type: 'enemy', id: e.id },
              then: [{ type: 'DiscardEnemy', enemy: e.id }],
            })),
          },
        },
      ]
    },
  })

for (const code of PART_TWO_CODES.hypnosis)
  registerTreachery({
    code,
    // Se vincula al Lugar más cercano sin otra copia. Salir de él cuesta una prueba de
    // [willpower] (3) (lo resuelve el escenario en `beforeMove`).
    revelation: (state, investigator, self) => {
      const taken = new Set(
        Object.values(state.treacheries)
          .filter(
            (t) =>
              (PART_TWO_CODES.hypnosis as readonly string[]).includes(t.code) &&
              t.placement.type === 'location',
          )
          .map((t) => (t.placement as { location: LocationId }).location),
      )
      return nearestLocationChoice(
        state,
        investigator,
        nearestOf(
          state,
          investigator,
          Object.keys(state.locations).filter((l) => !taken.has(l)),
        ),
        (where) => [
          {
            type: 'PlaceTreachery',
            treachery: self.id,
            placement: { type: 'location', location: where },
          },
        ],
      )
    },
  })

export const MOVES = 'fof:moves:'

for (const code of PART_TWO_CODES.grips)
  registerTreachery({
    code,
    revelation: (_state, investigator, self) => [
      {
        type: 'PlaceTreachery',
        treachery: self.id,
        placement: { type: 'threatArea', investigator },
      },
    ],
    // Al final de tu turno: 2 daño, 1 menos por cada vez que te hayas movido este turno.
    forced: (state, trigger, self) => {
      if (
        trigger.type !== 'turnEnds' ||
        self.placement.type !== 'threatArea' ||
        self.placement.investigator !== trigger.investigator
      )
        return []
      const moves = Number(state.scenarioMeta?.[`${MOVES}${trigger.investigator}`] ?? 0)
      const damage = Math.max(0, 2 - moves)
      return [
        ...(damage
          ? [
              {
                type: 'TakeDamage',
                investigator: trigger.investigator,
                damage,
                horror: 0,
              } as Message,
            ]
          : []),
        { type: 'DiscardTreachery', treachery: self.id },
      ]
    },
  })

for (const code of PART_TWO_CODES.hungers)
  registerTreachery({
    code,
    // Peligro. Descarta un Aliado (cada otro investigador recibe 1 horror) o prueba
    // [agility] (3): si fallas, 1 daño directo y 1 horror directo.
    revelation: (state, investigator) => {
      const allies = Object.values(state.assets).filter(
        (a) => a.owner === investigator && (playerCardDef(a.code)?.traits ?? []).includes('Ally'),
      )
      const others: Message[] = state.investigators
        .filter((i) => i.id !== investigator && !i.eliminated)
        .map((i) => ({ type: 'TakeDamage', investigator: i.id, damage: 0, horror: 1 }))
      return [
        {
          type: 'Ask',
          investigator,
          question: {
            kind: 'chooseOne',
            prompt: 'prompt.fof.hunger',
            choices: [
              ...allies.map((a) => ({
                label: 'choice.fof.discardAlly',
                params: { card: a.code },
                target: { type: 'asset' as const, id: a.id },
                then: [{ type: 'DiscardAsset', asset: a.id } as Message, ...others],
              })),
              {
                label: 'choice.test.agility',
                params: { difficulty: 3 },
                then: [
                  effectTest(investigator, code, 'agility', 3, {
                    onFail: [
                      { type: 'TakeDamage', investigator, damage: 1, horror: 1, direct: true },
                    ],
                  }),
                ],
              },
            ],
          },
        },
      ]
    },
  })
