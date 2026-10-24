/**
 * Cartas de jugador de El juramento inconfesable: Daniel Chesterfield (03182a), que se
 * toma durante el escenario, y Coraje, la carta superior del mazo que la Información de
 * Constance pone boca abajo en juego.
 */
import {
  activeInvestigators,
  getInvestigator,
  registerPlayerCard,
  registerPlayerCards,
} from '@lcg/engine'

export const DANIEL_ALLY = '03182a'
/** Carta boca abajo tratada como apoyo Coraje (coste 0, sin iconos, 2 de cordura). */
export const COURAGE = 'courage'
/** Carta real bajo el Coraje de cada investigador, para descartarla cuando lo abandone. */
export const COURAGE_CARD = 'carcosa:courage:'

registerPlayerCards([
  {
    code: DANIEL_ALLY,
    name: 'Daniel Chesterfield',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Lunatic'],
    unique: true,
    story: true,
    slots: ['ally'],
    health: 1,
    sanity: 3,
  },
  {
    code: COURAGE,
    name: 'Courage',
    type: 'asset',
    class: 'neutral',
    traits: [],
    cost: 0,
    story: true,
    sanity: 2,
  },
])

registerPlayerCard({
  code: DANIEL_ALLY,
  // [fast] Agótalo: da su control a otro investigador de tu Lugar.
  abilities: (state, self, investigator) => {
    if (self.exhausted) return []
    const here = getInvestigator(state, investigator).location
    return activeInvestigators(state)
      .filter((i) => i.id !== investigator && i.location === here)
      .map((i) => ({
        key: `${self.id}:give`,
        label: 'ability.oath.giveDaniel',
        params: { name: i.name },
        actions: 0,
        provokes: false,
        target: { type: 'investigator', id: i.id },
        costs: [{ type: 'ExhaustAsset', asset: self.id }],
        then: [
          {
            type: 'ScenarioSpecific',
            key: 'oathGiveDaniel',
            data: { asset: self.id, investigator: i.id },
          },
        ],
      }))
  },
})
