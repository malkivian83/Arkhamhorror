/**
 * Cartas de jugador de Ecos del pasado: Sr. Peabody (03141), que se toma durante el
 * escenario, y las recompensas Broche de ónice negro (03142, Debilidad) y El Manto
 * Andrajoso (03143).
 */
import {
  effectiveVitals,
  getInvestigator,
  registerPlayerCard,
  registerPlayerCards,
  type SkillType,
} from '@lcg/engine'

export const MR_PEABODY = '03141'
export const CLASP_OF_BLACK_ONYX = '03142'
export const THE_TATTERED_CLOAK = '03143'

/** Lugar elegido por el Sr. Peabody (mientras siga agotado). */
export const PEABODY_LOCATION = 'carcosa:peabody'

registerPlayerCards([
  {
    code: MR_PEABODY,
    name: 'Mr. Peabody',
    type: 'asset',
    class: 'neutral',
    traits: ['Ally', 'Historical Society'],
    unique: true,
    story: true,
    slots: ['ally'],
    health: 2,
    sanity: 2,
  },
  {
    code: CLASP_OF_BLACK_ONYX,
    name: 'Clasp of Black Onyx',
    type: 'asset',
    class: 'neutral',
    traits: ['Item', 'Relic'],
    cost: 1,
    story: true,
    weakness: 'Clasp of Black Onyx',
  },
  {
    code: THE_TATTERED_CLOAK,
    name: 'The Tattered Cloak',
    type: 'asset',
    class: 'neutral',
    traits: ['Item', 'Clothing'],
    cost: 2,
    story: true,
    slots: ['body'],
    health: 1,
    icons: { willpower: 1, combat: 1, agility: 1 },
  },
])

registerPlayerCard({
  code: MR_PEABODY,
  // [action] Agótalo: elige un Lugar. Hasta que se prepare, ese Lugar tiene -1 velo y el
  // rasgo Pasadizo (lo resuelve Ecos del pasado).
  abilities: (state, self, investigator) =>
    self.exhausted
      ? []
      : [
          {
            key: `${self.id}:passage`,
            label: 'ability.echoes.peabody',
            actions: 1,
            provokes: true,
            then: [
              { type: 'ExhaustAsset', asset: self.id },
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.chooseLocation',
                  choices: Object.values(state.locations).map((l) => ({
                    label: 'choice.location',
                    params: { location: l.revealed ? l.name : (l.unrevealedName ?? l.name) },
                    target: { type: 'location', id: l.id },
                    then: [
                      { type: 'SetScenarioMeta', key: PEABODY_LOCATION, value: l.id },
                      { type: 'ScenarioSpecific', key: 'echoesConnections' },
                    ],
                  })),
                },
              },
            ],
          },
        ],
})

registerPlayerCard({
  code: CLASP_OF_BLACK_ONYX,
  // En tu mano, cada otra carta de tu mano cuesta 1 recurso más.
  handCostModifier: 1,
})

const CLOAK_SKILLS: SkillType[] = ['willpower', 'combat', 'agility']

registerPlayerCard({
  code: THE_TATTERED_CLOAK,
  // -1 de cordura; +1 [willpower], [combat] y [agility] con 3 o menos de cordura restante.
  ownerVitals: { sanity: -1 },
  skillModifier: (state, self, test) => {
    if (!CLOAK_SKILLS.includes(test.skill) || test.investigator !== self.owner) return 0
    const me = getInvestigator(state, self.owner)
    return effectiveVitals(state, me).sanity - me.horror <= 3 ? 1 : 0
  },
})
