/**
 * Debilidades de la caja básica de 2026: las propias de cada investigador y las
 * básicas de los mazos iniciales. Las traiciones (y The Necronomicon) se
 * resuelven al robarlas; Black Chamber Operative aparece enfrentado.
 */
import {
  getInvestigator,
  registerEnemy,
  registerPlayerCard,
  registerTreachery,
  type AbilityOption,
  type Message,
  type Treachery,
} from '@lcg/engine'
import { code, name } from './player-cards'

/** "Pon esta carta en juego en tu zona de amenaza." */
const toThreatArea = (self: Treachery, investigator: string): Message => ({
  type: 'PlaceTreachery',
  treachery: self.id,
  placement: { type: 'threatArea', investigator },
})

/** "[acción][acción]: Descarta esta carta." */
const discardForTwoActions =
  (position: number) =>
  (_state: unknown, self: Treachery): AbilityOption[] => [
    {
      key: `${self.id}:discard`,
      label: 'ability.discardTreachery',
      params: { card: name(position) },
      target: { type: 'treachery', id: self.id },
      actions: 2,
      provokes: true,
      then: [{ type: 'DiscardTreachery', treachery: self.id }],
    },
  ]

const damage = (investigator: string, amount = 1, direct = false): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: amount,
  horror: 0,
  ...(direct ? { direct } : {}),
})

// In Harm's Way (Daniela): en tu zona de amenaza. Forzado: después de hacer daño a un
// enemigo, recibe 1 daño y pon 1 daño aquí; con 3 o más, descártala.
registerTreachery({
  code: code(3),
  revelation: (_state, investigator, self) => [toThreatArea(self, investigator)],
  forced: (_state, trigger, self) =>
    trigger.type === 'afterDealDamage' && trigger.investigator === self.owner
      ? [
          damage(trigger.investigator),
          { type: 'AddTreacheryTokens', treachery: self.id, amount: 1, discardAt: 3 },
        ]
      : [],
})

// Dead Ends (Joe): si al buscar en tu mazo está entre las cartas buscadas, la robas y
// la búsqueda se cancela (el resto de su texto afecta a la campaña).
registerPlayerCard({ code: code(6), cancelsSearch: true })

// Black Chamber Operative (Trish): enemigo, cazador, presa (solo Trish). Forzado:
// después de evitarlo, deja 1 de tus pistas en tu localización; si no puedes, se
// prepara, se enfrenta a ti y ataca.
registerPlayerCard({
  code: code(9),
  enemy: {
    kind: 'enemy',
    code: code(9),
    name: name(9),
    traits: ['Humanoid', 'Coterie'],
    fight: 4,
    health: 2,
    evade: 4,
    damage: 1,
    horror: 1,
    keywords: ['hunter'],
    prey: { type: 'only', investigator: code(7) },
  },
})
registerEnemy({
  code: code(9),
  forced: (state, trigger, self) => {
    if (trigger.type !== 'afterEvade' || trigger.enemy !== self.id) return []
    const investigator = trigger.investigator
    if (getInvestigator(state, investigator).clues > 0) {
      return [{ type: 'PlaceCluesOnLocation', investigator, amount: 1 }]
    }
    return [
      { type: 'ReadyEnemy', enemy: self.id },
      { type: 'EngageEnemy', enemy: self.id, investigator },
      { type: 'EnemyAttack', enemy: self.id, investigator, exhaustAfter: false },
    ]
  },
})

// The Necronomicon (Dexter): en tu zona de amenaza; no puedes jugar apoyos ni usar
// habilidades de tus otros apoyos. [acción]: prueba de [willpower] (5); si aciertas,
// descártalo; si fallas, barájalo en tu mazo y recibe 1 horror.
registerTreachery({
  code: code(12),
  blocksAssets: true,
  revelation: (_state, investigator, self) => [toThreatArea(self, investigator)],
  abilities: (_state, self, investigator) =>
    investigator !== self.owner
      ? []
      : [
          {
            key: `${self.id}:test`,
            label: 'ability.necronomicon',
            target: { type: 'treachery', id: self.id },
            actions: 1,
            provokes: true,
            then: [
              {
                type: 'BeginSkillTest',
                investigator,
                skill: 'willpower',
                difficulty: 5,
                tags: [],
                kind: {
                  type: 'effect',
                  source: name(12),
                  onSuccess: [{ type: 'DiscardTreachery', treachery: self.id }],
                  onFail: [
                    { type: 'ShuffleTreacheryIntoDeck', treachery: self.id },
                    { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
                  ],
                  onFailEach: [],
                },
              },
            ],
          },
        ],
})

// Breaking Point (Isabelle): 1 daño directo; después, si te quedan 6 o menos de
// cordura, otro; y si te quedan 3 o menos, otro más.
registerTreachery({
  code: code(15),
  revelation: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    const sanity = me.sanity - me.horror
    const amount = 1 + (sanity <= 6 ? 1 : 0) + (sanity <= 3 ? 1 : 0)
    return [damage(investigator, amount, true)]
  },
})

// Overzealous: roba la carta superior del mazo de encuentros; gana oleada (se roba otra).
registerTreachery({
  code: code(100),
  revelation: (_state, investigator) => [
    { type: 'DrawEncounterCard', investigator },
    { type: 'DrawEncounterCard', investigator },
  ],
})

// Paranoia: descarta todos tus recursos.
registerTreachery({
  code: code(101),
  revelation: (state, investigator) => [
    {
      type: 'LoseResources',
      investigator,
      amount: getInvestigator(state, investigator).resources,
    },
  ],
})

// Pursued: en tu zona de amenaza. Forzado: después de que un enemigo entre en tu
// localización, recibe 1 horror. [acción][acción]: descártala.
registerTreachery({
  code: code(102),
  revelation: (_state, investigator, self) => [toThreatArea(self, investigator)],
  forced: (state, trigger, self) => {
    if (trigger.type !== 'enemyEntersLocation' || !self.owner) return []
    if (getInvestigator(state, self.owner).location !== trigger.location) return []
    return [{ type: 'TakeDamage', investigator: self.owner, damage: 0, horror: 1 }]
  },
  abilities: discardForTwoActions(102),
})

// Syndicate Obligations: en tu zona de amenaza. Forzado: después de gastar recursos,
// recibe 1 daño. [acción][acción]: descártala.
registerTreachery({
  code: code(103),
  revelation: (_state, investigator, self) => [toThreatArea(self, investigator)],
  forced: (_state, trigger, self) =>
    trigger.type === 'afterSpendResources' && trigger.investigator === self.owner
      ? [damage(trigger.investigator)]
      : [],
  abilities: discardForTwoActions(103),
})

// Wounded: en tu zona de amenaza. Forzado: la primera vez que te mueves en cada turno,
// recibe 1 daño. [acción][acción]: descártala.
registerTreachery({
  code: code(104),
  revelation: (_state, investigator, self) => [toThreatArea(self, investigator)],
  forced: (_state, trigger, self) =>
    trigger.type === 'afterMove' && trigger.investigator === self.owner && trigger.first
      ? [damage(trigger.investigator)]
      : [],
  abilities: discardForTwoActions(104),
})
