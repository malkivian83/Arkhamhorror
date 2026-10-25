/**
 * Roles de Fortuna e insensatez (88028–88031, cara Inexperto; «b», Experimentado). El
 * estafador se resuelve al comprobar iconos en un Lugar Juego (games.ts).
 */
import {
  distancesFrom,
  getInvestigator,
  registerPlayerCard,
  type Asset,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { chooseSkillTest } from '../scenario-helpers'
import { adjustAlarmMessage } from './check'
import { CODES, isCasino, PATROL, practiced } from './cards'

export const REVERSE = 'fof:reverse:'

/** Enemigos Casino a `max` Lugares o menos (0: solo en tu Lugar). */
export function casinoEnemiesWithin(
  state: GameState,
  investigator: InvestigatorId,
  max: number,
  min = 0,
): Enemy[] {
  const here = getInvestigator(state, investigator).location
  if (here === null) return []
  const distances = distancesFrom(state, here)
  return Object.values(state.enemies).filter((e) => {
    const d = distances.get(e.location)
    return isCasino(e.traits) && d !== undefined && d >= min && d <= max
  })
}

const specific = (key: string, data: Record<string, string | number | boolean>): Message => ({
  type: 'ScenarioSpecific',
  key,
  data,
})

// La cara: [action] Negociar. Prueba [willpower] o [intellect] (3) eligiendo un enemigo Casino
// de tu Lugar (experimentado: o de uno conectado, dificultad 2). Si tienes éxito, agótala
// para reducir en 1 el nivel de alarma de cualquier investigador.
for (const code of [CODES.theFace, practiced(CODES.theFace)]) {
  const skilled = code !== CODES.theFace
  registerPlayerCard({
    code,
    abilities: (state, self, investigator) => {
      if (self.exhausted) return []
      const targets = casinoEnemiesWithin(state, investigator, skilled ? 1 : 0)
      if (!targets.length) return []
      const calm: Message = {
        type: 'Ask',
        investigator,
        question: {
          kind: 'chooseOne',
          prompt: 'prompt.fof.calmWho',
          choices: state.investigators
            .filter((i) => !i.eliminated)
            .map((i) => ({
              label: 'choice.investigator',
              params: { name: i.name },
              then: [adjustAlarmMessage(i.id, -1)],
            })),
        },
      }
      const test = chooseSkillTest(
        investigator,
        code,
        ['willpower', 'intellect'],
        skilled ? 2 : 3,
        {
          onSuccess: [{ type: 'ExhaustAsset', asset: self.id }, calm],
        },
      )
      return targets.map((e) => ({
        key: `${self.id}:parley`,
        label: 'ability.fof.face',
        params: { enemy: e.name },
        actions: 1,
        provokes: false,
        parley: true,
        target: { type: 'enemy' as const, id: e.id },
        then: [test],
      }))
    },
  })
}

// El músculo: después de derrotar a un enemigo Casino, agótalo: reduce en 1 tu nivel de
// alarma (2 si no hay otros enemigos Casino en tu Lugar ni en uno conectado; experimentado:
// solo en tu Lugar).
for (const code of [CODES.theMuscle, practiced(CODES.theMuscle)]) {
  const skilled = code !== CODES.theMuscle
  registerPlayerCard({
    code,
    reactions: (state, trigger, self: Asset) => {
      if (
        self.exhausted ||
        trigger.type !== 'enemyDefeated' ||
        trigger.by !== self.owner ||
        !isCasino(trigger.enemy.traits)
      )
        return []
      const others = casinoEnemiesWithin(state, self.owner, skilled ? 0 : 1).filter(
        (e) => e.id !== trigger.enemy.id,
      )
      return [
        {
          key: `${self.id}:muscle`,
          investigator: self.owner,
          label: 'ability.fof.muscle',
          params: { amount: others.length ? 1 : 2 },
          then: [
            { type: 'ExhaustAsset', asset: self.id },
            adjustAlarmMessage(self.owner, others.length ? -1 : -2),
          ],
        },
      ]
    },
  })
}

// El ladrón: cuando un enemigo Casino de un Lugar conectado (experimentado: a 2 Lugares o
// menos) va a resolver Errante, agótalo para invertir su sentido en este movimiento. Se
// ofrece al empezar la fase de Enemigos, antes de que se muevan.
for (const code of [CODES.theThief, practiced(CODES.theThief)]) {
  const skilled = code !== CODES.theThief
  registerPlayerCard({
    code,
    reactions: (state, trigger, self) => {
      if (self.exhausted || trigger.type !== 'enemyPhaseBegins') return []
      return casinoEnemiesWithin(state, self.owner, skilled ? 2 : 1, 1)
        .filter((e) => PATROL[e.code] && !e.exhausted && e.engagedWith === null)
        .map((e) => ({
          key: `${self.id}:thief:${e.id}`,
          investigator: self.owner,
          label: 'ability.fof.thief',
          params: { enemy: e.name },
          target: { type: 'enemy' as const, id: e.id },
          then: [specific('fofThief', { asset: self.id, enemy: e.id })],
        }))
    },
  })
}
