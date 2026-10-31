/**
 * Cartas de nivel 1–5 de la caja básica de 2026: las que se compran con
 * experiencia durante la campaña. Los efectos se describen con palabras propias.
 */
import {
  getInvestigator,
  effectiveVitals,
  playerCardDef,
  registerPlayerCard,
  shroudOf,
  type Asset,
  type GameState,
  type InvestigatorId,
  type Message,
} from '@lcg/engine'
import { draw, evadeEvent, exhaust, gain, hasEngaged, playFromHand, reaction } from './cards'
import { chooseEnemyHere } from './investigators'
import {
  attackable,
  code,
  fightAbility,
  hasUses,
  investigateAbility,
  mayChoose,
  name,
  spendUse,
} from './player-cards'

const heal = (investigator: InvestigatorId, horror: number): Message => ({
  type: 'Heal',
  investigator,
  damage: 0,
  horror,
})
const horror = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'TakeDamage',
  investigator,
  damage: 0,
  horror: amount,
})

/** Las opciones de un apoyo con un ataque por enemigo, construidas para ese enemigo. */
const perEnemy =
  (build: (enemyId: string) => ReturnType<typeof fightAbility>) =>
  (state: GameState, self: Asset, investigator: InvestigatorId) =>
    attackable(state, investigator).flatMap((enemy) =>
      build(enemy.id)(state, self, investigator).filter(
        (a) => a.target?.type === 'enemy' && a.target.id === enemy.id,
      ),
    )

/** Evento "Luchar": elige un enemigo de tu localización y lo ataca. */
function fightEvent(
  state: GameState,
  investigator: InvestigatorId,
  build: (enemy: { id: string; fight: number }) => Message,
): Message[] {
  const enemies = attackable(state, investigator)
  if (enemies.length === 1) return [build(enemies[0]!)]
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEnemy',
        choices: enemies.map((e) => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy' as const, id: e.id },
          then: [build(e)],
        })),
      },
    },
  ]
}

// ---------------------------------------------------------------------------
// Guardián
// ---------------------------------------------------------------------------

// Counterattack (1): rápido, cuando un enemigo ataca a un investigador de tu
// localización: cancela ese ataque y haz 1 daño a ese enemigo.
registerPlayerCard({
  code: code(26),
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenEnemyAttacks') return []
    const me = getInvestigator(state, investigator)
    const attacked = getInvestigator(state, trigger.investigator)
    const cost = playerCardDef(code(26))?.cost ?? 0
    if (me.location === null || me.location !== attacked.location || me.resources < cost) return []
    return [
      playFromHand(investigator, 26, [
        { type: 'CancelEnemyAttack', enemy: trigger.enemy },
        { type: 'DamageEnemy', enemy: trigger.enemy, amount: 1, by: investigator },
      ]),
    ]
  },
})

// Bodyguard (2): puede recibir el daño de otros investigadores de tu localización.
// [reacción] al ser derrotado: haz 2 daño a un enemigo de tu localización.
registerPlayerCard({
  code: code(27),
  soaksForOthers: true,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'assetDefeated' || trigger.asset.id !== self.id) return []
    const hit = chooseEnemyHere(state, self.owner, 'prompt.chooseEnemy', (e) => [
      { type: 'DamageEnemy', enemy: e.id, amount: 2, by: self.owner },
    ])
    return hit.length ? [reaction(self, 'ability.damageEnemyHere', hit)] : []
  },
})

// Sledgehammer (3): Luchar con +1 daño; o, por 2 acciones, Luchar +3 [combat] y,
// si aciertas, puedes agotarlo para +2 daño.
registerPlayerCard({
  code: code(28),
  abilities: (state, self, investigator) => [
    ...fightAbility(28, { extraDamage: () => 1 })(state, self, investigator),
    ...perEnemy((enemyId) =>
      fightAbility(28, {
        actions: 2,
        key: ':heavy',
        modifier: 3,
        onSuccess: (asset) =>
          asset.exhausted
            ? []
            : [
                mayChoose(investigator, 'choice.exhaustForDamage', { card: name(28), n: 2 }, [
                  exhaust(asset),
                  { type: 'DamageEnemy', enemy: enemyId, amount: 2, by: investigator },
                ]),
              ],
      }),
    )(state, self, investigator),
  ],
})

// Winchester Model 12 (5): gasta 1 munición: Luchar +3 [combat]; si aciertas, +1 daño
// por cada punto de éxito (máx. +4). Si fallas contra un enemigo enfrentado con
// otro, ese investigador recibe 1 daño por cada punto de fallo (máx. 5).
registerPlayerCard({
  code: code(29),
  abilities: fightAbility(29, {
    modifier: 3,
    available: hasUses,
    cost: [{ type: 'SpendUses', asset: '', amount: 1 }],
    attack: () => ({ bonusPerSuccess: 4, failDamagePerPoint: 5 }),
  }),
})

// ---------------------------------------------------------------------------
// Buscador
// ---------------------------------------------------------------------------

// Mysterious Grimoire (2): [rápida] durante tu turno, gasta 1 o 2 secretos y agótalo:
// busca una carta entre las 3 (o 6) primeras de tu mazo y róbala; las debilidades
// buscadas también se roban. Baraja tu mazo.
registerPlayerCard({
  code: code(40),
  abilities: (state, self, investigator) => {
    if (self.exhausted || state.activeTurn !== investigator) return []
    return [1, 2]
      .filter((spent) => self.uses >= spent)
      .map((spent) => ({
        key: `${self.id}:search${spent}`,
        label: 'ability.searchTop',
        params: { card: name(40), n: spent === 2 ? 6 : 3 },
        actions: 0,
        provokes: false,
        then: [
          { type: 'SpendUses', asset: self.id, amount: spent },
          exhaust(self),
          {
            type: 'SearchDeck',
            investigator,
            top: spent === 2 ? 6 : 3,
            traits: [],
            to: 'hand',
            anyCard: true,
            drawWeaknesses: true,
          },
        ],
      }))
  },
})

// Through the Cracks (2): Evitar ([agility]) +2 por cada pista tuya (máx. +6); si
// aciertas, puedes desenfrentarte y moverte a una localización conectada revelada.
registerPlayerCard({
  code: code(41),
  evadeAction: true,
  canPlay: hasEngaged,
  play: (state, investigator) =>
    evadeEvent(state, investigator, (enemy) => ({
      type: 'BeginSkillTest',
      investigator,
      skill: 'agility',
      difficulty: enemy.evade,
      modifier: Math.min(6, 2 * getInvestigator(state, investigator).clues),
      kind: {
        type: 'evade',
        enemy: enemy.id,
        onSuccess: [
          mayChoose(investigator, 'choice.disengageAndMove', {}, [
            { type: 'DisengageAll', investigator },
            { type: 'ChooseMove', investigator, revealedOnly: true },
          ]),
        ],
      },
    })),
})

// Studious (3): permanente. Empiezas cada partida con 1 carta más en la mano inicial.
registerPlayerCard({ code: code(42), permanent: { openingHand: 1 } })

// Unbridled Knowledge (5): mira las 5 primeras cartas de tu mazo (8 si controlas
// 2 o más pistas) y roba 3; el resto lo colocas arriba o abajo del mazo, en el orden que quieras.
registerPlayerCard({
  code: code(43),
  play: (state, investigator) => [
    {
      type: 'ChooseFromTop',
      investigator,
      top: getInvestigator(state, investigator).clues >= 2 ? 8 : 5,
      picks: 3,
      arrange: true,
    },
  ],
})

// ---------------------------------------------------------------------------
// Rebelde
// ---------------------------------------------------------------------------

// Sticky Fingers (2): [reacción] después de evitar con éxito a un enemigo, agótalo: +1 recurso.
registerPlayerCard({
  code: code(54),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterEvade' && trigger.investigator === self.owner && !self.exhausted
      ? [reaction(self, 'ability.gainResource', [exhaust(self), gain(self.owner)])]
      : [],
})

// Decisive Strike (2): Luchar +2 [combat] y +1 daño; si el ataque derrota al
// enemigo, ganas 5 recursos.
registerPlayerCard({
  code: code(55),
  // Es una acción de Luchar: no provoca ataques de oportunidad.
  noAttacksOfOpportunity: true,
  canPlay: (state, investigator) => attackable(state, investigator).length > 0,
  play: (state, investigator) =>
    fightEvent(state, investigator, (enemy) => ({
      type: 'BeginSkillTest',
      investigator,
      skill: 'combat',
      difficulty: enemy.fight,
      modifier: 2,
      kind: {
        type: 'fight',
        enemy: enemy.id,
        extraDamage: 1,
        onDefeat: [gain(investigator, 5)],
      },
    })),
})

// Another Day, Another Dollar (3): permanente. Empiezas cada partida con 2 recursos más.
registerPlayerCard({ code: code(56), permanent: { resources: 2 } })

// Out of Sight (3): si la prueba se supera por 1 o más, quien la hace puede
// desenfrentarse y moverse a una localización revelada a 2 conexiones o menos.
registerPlayerCard({
  code: code(57),
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && (test.modifiedSkill ?? 0) - test.difficulty >= 1
      ? [
          mayChoose(test.investigator, 'choice.disengageAndMove', {}, [
            { type: 'DisengageAll', investigator: test.investigator },
            { type: 'ChooseMove', investigator: test.investigator, revealedOnly: true, range: 2 },
          ]),
        ]
      : [],
})

// ---------------------------------------------------------------------------
// Místico
// ---------------------------------------------------------------------------

// Mask of Silenus (1): cuando vas a revelar una ficha del caos, gasta 1 carga:
// revela una más y elige cuál resolver; si resuelves una con símbolo, 1 horror.
registerPlayerCard({
  code: code(68),
  testOptions: (_state, test, self) =>
    self.uses > 0 && test.tokens.length === 0 && !test.chooseToken
      ? [
          {
            key: `${self.id}:mask`,
            investigator: self.owner,
            label: 'ability.revealExtraToken',
            params: { card: name(68) },
            then: [spendUse(self), { type: 'RevealExtraToken', investigator: self.owner }],
          },
        ]
      : [],
})

// Fearless (2): si la prueba tiene éxito, cura 1 horror (2 si se supera por 2 o más).
registerPlayerCard({
  code: code(69),
  afterCommittedTest: (_state, test, succeeded, by) =>
    succeeded ? [heal(by, (test.modifiedSkill ?? 0) - test.difficulty >= 2 ? 2 : 1)] : [],
})

// Augur of Elokoss (3): Investigar sumando tu [willpower] a tu [intellect]; si
// aciertas, 1 pista más; y si además se reveló una ficha con símbolo, puedes
// descartar una traición Terror o Hex de la zona de amenaza de un investigador.
registerPlayerCard({
  code: code(70),
  play: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    if (me.location === null) return []
    const cursed = Object.values(state.treacheries).filter(
      (t) =>
        t.placement.type === 'threatArea' &&
        (t.traits ?? []).some((trait) => trait === 'Terror' || trait === 'Hex'),
    )
    const cleanse: Message[] = cursed.length
      ? [
          {
            type: 'IfSymbolRevealed',
            then: [
              {
                type: 'Ask',
                investigator,
                question: {
                  kind: 'chooseOne',
                  prompt: 'prompt.optional',
                  choices: [
                    ...cursed.map((t) => ({
                      label: 'choice.discard',
                      params: { card: t.name },
                      target: { type: 'treachery' as const, id: t.id },
                      then: [{ type: 'DiscardTreachery', treachery: t.id } as Message],
                    })),
                    { label: 'choice.skip', then: [] },
                  ],
                },
              },
            ],
          },
        ]
      : []
    return [
      {
        type: 'BeginSkillTest',
        investigator,
        skill: 'intellect',
        difficulty: shroudOf(state, me.location),
        modifier: me.skills.willpower,
        tags: ['spell'],
        kind: { type: 'investigate', location: me.location, extraClues: 1, onSuccess: cleanse },
      },
    ]
  },
})

// Cosmic Flame (5): Luchar ([willpower]) +2 y +1 daño; si aciertas, puedes gastar
// 1 carga para hacer 1 daño a un enemigo de tu localización. Si revelas una
// calavera, retira 1 carga (si no puedes, 1 daño y descártala).
registerPlayerCard({
  code: code(71),
  abilities: fightAbility(71, {
    skill: 'willpower',
    tags: ['spell'],
    modifier: 2,
    extraDamage: () => 1,
    onSuccess: (asset) =>
      asset.uses > 0 ? chooseEnemyHereLater(asset.owner, [spendUse(asset)]) : [],
  }),
  onTokenRevealed: (_state, token, self) =>
    token !== 'skull'
      ? []
      : self.uses > 0
        ? [{ type: 'RemoveUses', asset: self.id, amount: 1 }]
        : [
            { type: 'TakeDamage', investigator: self.owner, damage: 1, horror: 0, direct: true },
            { type: 'DiscardAsset', asset: self.id },
          ],
})

/**
 * "Puedes hacer 1 daño a un enemigo de tu localización" decidido al resolverse
 * (el primer ataque puede haber derrotado al enemigo atacado).
 */
function chooseEnemyHereLater(investigator: InvestigatorId, cost: Message[]): Message[] {
  return [
    mayChoose(investigator, 'choice.spendChargeForDamage', {}, [
      ...cost,
      { type: 'ChooseEnemyToDamage', investigator, amount: 1 },
    ]),
  ]
}

// ---------------------------------------------------------------------------
// Superviviente
// ---------------------------------------------------------------------------

// Scrape By (1): rápido, cuando vas a fallar una prueba en la que se reveló una
// ficha que no es de fallo automático: la superas por 0. Si se reveló una ficha
// con símbolo, recibes 1 horror.
registerPlayerCard({
  code: code(82),
  playWhenFailing: true,
  play: (_state, investigator) => [
    { type: 'ForceSkillTestSuccess' },
    { type: 'IfSymbolRevealed', then: [horror(investigator)] },
  ],
})

// Old Compass (2): Investigar con −1 al velo. Si fallas, puedes agotarlo para
// repetir la prueba con −2 al velo.
registerPlayerCard({
  code: code(83),
  abilities: investigateAbility(83, { shroud: -1 }),
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'skillTestEnded' ||
      trigger.source !== self.id ||
      trigger.kind !== 'investigate' ||
      trigger.succeeded ||
      self.exhausted ||
      trigger.location === undefined
    ) {
      return []
    }
    return [
      reaction(self, 'ability.retryTest', [
        exhaust(self),
        {
          type: 'BeginSkillTest',
          investigator: self.owner,
          skill: 'intellect',
          difficulty: Math.max(0, shroudOf(state, trigger.location) - 2),
          source: self.id,
          kind: { type: 'investigate', location: trigger.location },
        },
      ]),
    ]
  },
})

// On the Brink (2): si la prueba falla, las demás cartas comprometidas vuelven a
// la mano de sus dueños y quien la comprometió roba 1 carta.
registerPlayerCard({
  code: code(84),
  afterCommittedTest: (_state, _test, succeeded, by) =>
    succeeded ? [] : [{ type: 'ReturnCommittedToHand', except: code(84) }, draw(by)],
})

// Meat Cleaver (3): Luchar +2 [combat] (+3 con 3 o menos de cordura restante); si
// derrota al enemigo, puedes curar 1 horror. Puedes recibir 1 horror al atacar
// para +1 daño.
const cleaverModifier = (state: GameState, investigator: InvestigatorId) => {
  const i = getInvestigator(state, investigator)
  return effectiveVitals(state, i).sanity - i.horror <= 3 ? 3 : 2
}
registerPlayerCard({
  code: code(85),
  abilities: (state, self, investigator) => {
    const healOnDefeat = () => ({
      onDefeat: [mayChoose(investigator, 'choice.healHorror', { n: 1 }, [heal(investigator, 1)])],
    })
    return [
      ...fightAbility(85, { modifier: cleaverModifier, attack: healOnDefeat })(
        state,
        self,
        investigator,
      ),
      // Recibir 1 horror al atacar: +1 daño.
      ...fightAbility(85, {
        key: ':horror',
        modifier: cleaverModifier,
        extraDamage: () => 1,
        attack: healOnDefeat,
      })(state, self, investigator).map((o) => ({
        ...o,
        label: 'ability.fightWithHorror',
        then: [horror(investigator), ...o.then],
      })),
    ]
  },
})

// ---------------------------------------------------------------------------
// Neutrales
// ---------------------------------------------------------------------------

// Charisma (3): permanente. Tienes 1 ranura de aliado más.
registerPlayerCard({ code: code(95), permanent: { slots: { ally: 1 } } })

// Relic Hunter (3): permanente. Tienes 1 ranura de accesorio más.
registerPlayerCard({ code: code(96), permanent: { slots: { accessory: 1 } } })
