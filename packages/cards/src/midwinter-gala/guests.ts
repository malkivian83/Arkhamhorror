/**
 * Apoyos Invitado y Líderes (cuando los controla un investigador), La Lámpara
 * Mortecina y la Joya de Sarnath. Los efectos se describen con palabras propias.
 */
import {
  getInvestigator,
  investigatorsAt,
  playerCardDef,
  push,
  registerPlayerCard,
  shroudOf,
  shuffle,
  type AbilityOption,
  type Asset,
  type Choice,
  type GameState,
  type InvestigatorId,
  type Message,
  type PlacedAsset,
  type SkillType,
} from '@lcg/engine'
import { CODES, isGuest } from './cards'
import { extendGala } from './gala'
import { bloodlessMan, guestCountAt, perInv, spellbound } from './helpers'

type Data = Record<string, string | number | boolean>

const exhaust = (a: Asset): Message => ({ type: 'ExhaustAsset', asset: a.id })
const plus =
  (skill: SkillType, n = 1) =>
  (_s: GameState, _a: Asset, test: { skill: SkillType }) =>
    test.skill === skill ? n : 0

const ask = (investigator: InvestigatorId, prompt: string, choices: Choice[]): Message => ({
  type: 'Ask',
  investigator,
  question: { kind: 'chooseOne', prompt, choices },
})

/** Combatir contra un enemigo de tu localización con una prueba propia. */
function fightAt(
  state: GameState,
  investigator: InvestigatorId,
  key: string,
  label: string,
  build: (enemyId: string, fight: number) => Message[],
  extraCost: Message[] = [],
): AbilityOption[] {
  const here = getInvestigator(state, investigator).location
  return Object.values(state.enemies)
    .filter((e) => e.location === here && (e.engagedWith !== null || !e.keywords.includes('aloof')))
    .map((e) => ({
      key,
      label,
      params: { enemy: e.name },
      actions: 1,
      provokes: false,
      target: { type: 'enemy', id: e.id },
      costs: extraCost,
      then: build(e.id, e.fight),
    }))
}

/** Bonificación a la siguiente prueba de este investigador esta ronda (Valeriya, Miranda). */
const nextTestBonus = (investigator: InvestigatorId, amount: number): Message => ({
  type: 'ScenarioSpecific',
  key: 'nextTestBonus',
  data: { investigator, amount },
})

// ---------------------------------------------------------------------------
// La Fundación
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: '71016',
  // Valeriya Antonova: +1 [combat]. Agótala: prepara otro Invitado de tu localización y +1 a tu
  // siguiente prueba esta ronda por cada Invitado de tu localización.
  skillModifier: plus('combat'),
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.exhausted || !here) return []
    const others = Object.values(state.assets).filter(
      (a) =>
        a.id !== self.id &&
        isGuest(a.code) &&
        a.exhausted &&
        getInvestigator(state, a.owner).location === here,
    )
    const bonus = guestCountAt(state, here)
    const targets = others.length ? others : [null]
    return targets.map((other) => ({
      key: `${self.id}:rally`,
      label: other ? 'ability.gala.rallyGuest' : 'ability.gala.rally',
      params: { card: other ? (playerCardDef(other.code)?.name ?? other.code) : '', n: bonus },
      actions: 1,
      provokes: true,
      then: [
        exhaust(self),
        ...(other
          ? [{ type: 'ScenarioSpecific', key: 'readyAsset', data: { asset: other.id } } as Message]
          : []),
        nextTestBonus(investigator, bonus),
      ],
    }))
  },
})

registerPlayerCard({
  code: '71017',
  // Archibald Hudson: durante tu turno, agótalo: busca un enemigo entre las 9 primeras cartas de
  // encuentros, róbalo, barájalas; agota a ese enemigo y gana 3 recursos.
  abilities: (state, self, investigator) => {
    const options: AbilityOption[] = []
    if (!self.exhausted && state.activeTurn === investigator) {
      options.push({
        key: `${self.id}:hunt`,
        label: 'ability.gala.archibaldHunt',
        actions: 0,
        provokes: false,
        then: [
          exhaust(self),
          { type: 'ScenarioSpecific', key: 'archibald', data: { investigator } },
        ],
      })
    }
    // Gasta 1 recurso: mueve 1 daño de un apoyo de tu localización a un enemigo no Élite de aquí.
    const me = getInvestigator(state, investigator)
    if (me.resources >= 1 && me.location) {
      const hurt = Object.values(state.assets).filter(
        (a) => a.damage > 0 && getInvestigator(state, a.owner).location === me.location,
      )
      const enemies = Object.values(state.enemies).filter(
        (e) => e.location === me.location && !(e.traits ?? []).includes('Elite'),
      )
      for (const a of hurt) {
        for (const e of enemies) {
          options.push({
            key: `${self.id}:transfer`,
            label: 'ability.gala.moveDamage',
            params: { card: playerCardDef(a.code)?.name ?? a.code, enemy: e.name },
            actions: 1,
            provokes: true,
            target: { type: 'enemy', id: e.id },
            costs: [{ type: 'SpendResources', investigator, amount: 1 }],
            then: [
              { type: 'HealAsset', asset: a.id, damage: 1, horror: 0 },
              { type: 'DamageEnemy', enemy: e.id, amount: 1, by: investigator },
            ],
          })
        }
      }
    }
    return options
  },
})

registerPlayerCard({
  code: '71018',
  // Special Agent Callahan: Combatir; la dificultad baja en 1.
  abilities: (state, self, investigator) =>
    fightAt(
      state,
      investigator,
      `${self.id}:fight`,
      'ability.gala.callahanFight',
      (enemy, fight) => [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'combat',
          difficulty: Math.max(0, fight - 1),
          source: self.id,
          kind: { type: 'fight', enemy },
        },
      ],
    ),
})

registerPlayerCard({
  code: '71019',
  // Horacio Martinez: puede recibir el daño de otros investigadores de tu localización. Tras el
  // ataque de un enemigo no Élite, agótalo: agota al enemigo; no se prepara esta ronda.
  soaksForOthers: true,
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'afterEnemyAttack' ||
      trigger.investigator !== self.owner ||
      self.exhausted
    )
      return []
    const enemy = state.enemies[trigger.enemy]
    if (!enemy || (enemy.traits ?? []).includes('Elite')) return []
    return [
      {
        key: `${self.id}:stop`,
        investigator: self.owner,
        label: 'ability.gala.horacio',
        params: { enemy: enemy.name },
        then: [
          exhaust(self),
          { type: 'ExhaustEnemy', enemy: enemy.id },
          { type: 'EnemyStaysExhausted', enemy: enemy.id },
        ],
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Universidad Miskatonic
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: '71022',
  // Caldwell Philips: +1 [intellect]. Tras descubrir pistas, agótalo: roba tantas cartas (máx. 3).
  skillModifier: plus('intellect'),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterDiscoverClues' && trigger.investigator === self.owner && !self.exhausted
      ? [
          {
            key: `${self.id}:study`,
            investigator: self.owner,
            label: 'ability.drawCards',
            params: { n: Math.min(3, trigger.amount ?? 1) },
            then: [
              exhaust(self),
              {
                type: 'DrawCards',
                investigator: self.owner,
                amount: Math.min(3, trigger.amount ?? 1),
              },
            ],
          },
        ]
      : [],
})

registerPlayerCard({
  code: '71023',
  // Dr. Mya Badry: +2 al tamaño de mano. Agótala: Investigar con [intellect] base igual a tus cartas en mano.
  handSize: 2,
  abilities: (state, self, investigator) => {
    const me = getInvestigator(state, investigator)
    if (self.exhausted || !me.location) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.gala.myaInvestigate',
        params: { n: me.hand.length },
        actions: 1,
        provokes: true,
        target: { type: 'location', id: me.location },
        costs: [exhaust(self)],
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, me.location),
            source: self.id,
            modifier: me.hand.length - me.skills.intellect,
            kind: { type: 'investigate', location: me.location },
          },
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: '71024',
  // Lucas Tetlow: tras descubrirse la última pista de tu localización, agótalo: busca un apoyo
  // Objeto entre las 9 primeras de tu mazo y róbalo (Reliquia: +2 recursos; Herramienta:
  // descubre 1 pista en una localización conectada).
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterDiscoverClues' || !trigger.last || self.exhausted) return []
    if (getInvestigator(state, self.owner).location !== trigger.location) return []
    return [
      {
        key: `${self.id}:curate`,
        investigator: self.owner,
        label: 'ability.gala.lucas',
        then: [
          exhaust(self),
          { type: 'ScenarioSpecific', key: 'lucas', data: { investigator: self.owner } },
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: '71025',
  // Elizabeth Conrad: tras robar una carta durante tu turno, agótala: un investigador de tu
  // localización se mueve a una localización conectada.
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterDrawCard' || trigger.investigator !== self.owner || self.exhausted)
      return []
    if (state.activeTurn !== self.owner) return []
    const here = getInvestigator(state, self.owner).location
    return investigatorsAt(state, here ?? '').map((i) => ({
      key: `${self.id}:dance`,
      investigator: self.owner,
      label: 'ability.gala.elizabeth',
      params: { name: i.name },
      then: [exhaust(self), { type: 'ChooseMove', investigator: i.id }],
    }))
  },
})

// ---------------------------------------------------------------------------
// El Sindicato
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: '71028',
  // Johnny Valone: +1 [agility]. Tras ganar recursos por un efecto, agótalo: roba 1 y gana 1 recurso.
  skillModifier: plus('agility'),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterGainResources' && trigger.investigator === self.owner && !self.exhausted
      ? [
          {
            key: `${self.id}:deal`,
            investigator: self.owner,
            label: 'ability.gala.johnny',
            then: [
              exhaust(self),
              { type: 'DrawCards', investigator: self.owner, amount: 1 },
              { type: 'GainResources', investigator: self.owner, amount: 1, basic: true },
            ],
          },
        ]
      : [],
})

const antiquity = (state: GameState, location: string) =>
  Number(state.scenarioMeta?.[`antiquity:${location}`] ?? 0)

registerPlayerCard({
  code: '71029',
  // Miranda Keeper (3 suministros): gasta 1: pon 1 recurso en tu localización como antigüedad y +2 a
  // tu siguiente prueba esta ronda. Tras superar una prueba por 2 o más, quita una antigüedad de tu
  // localización: gana 2 recursos.
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    if (self.uses < 1 || !here) return []
    return [
      {
        key: `${self.id}:trade`,
        label: 'ability.gala.miranda',
        actions: 0,
        provokes: false,
        then: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'ScenarioSpecific', key: 'antiquity', data: { location: here, amount: 1 } },
          nextTestBonus(investigator, 2),
        ],
      },
    ]
  },
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterSkillTest' || trigger.investigator !== self.owner) return []
    const here = getInvestigator(state, self.owner).location
    if (!trigger.succeeded || trigger.margin < 2 || !here || antiquity(state, here) < 1) return []
    return [
      {
        key: `${self.id}:sell`,
        investigator: self.owner,
        label: 'ability.gala.sellAntiquity',
        then: [
          { type: 'ScenarioSpecific', key: 'antiquity', data: { location: here, amount: -1 } },
          { type: 'GainResources', investigator: self.owner, amount: 2 },
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: '71030',
  // Arsène Renard: pon 1 recurso en cada localización como antigüedad (una vez por partida, en
  // grupo). Con un enemigo agotado en tu localización, quita una antigüedad: roba 1 o gana 2 recursos.
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const options: AbilityOption[] = [
      {
        key: `${self.id}:plant`,
        label: 'ability.gala.arsenePlant',
        actions: 0,
        provokes: false,
        limit: { per: 'game', group: true },
        then: Object.keys(state.locations).map((location): Message => ({
          type: 'ScenarioSpecific',
          key: 'antiquity',
          data: { location, amount: 1 },
        })),
      },
    ]
    const exhaustedEnemy = Object.values(state.enemies).some(
      (e) => e.location === here && e.exhausted,
    )
    if (here && exhaustedEnemy && antiquity(state, here) > 0) {
      const take: Message = {
        type: 'ScenarioSpecific',
        key: 'antiquity',
        data: { location: here, amount: -1 },
      }
      options.push(
        {
          key: `${self.id}:steal`,
          label: 'ability.gala.arseneDraw',
          actions: 0,
          provokes: false,
          then: [take, { type: 'DrawCards', investigator, amount: 1 }],
        },
        {
          key: `${self.id}:steal`,
          label: 'ability.gala.arseneGain',
          actions: 0,
          provokes: false,
          then: [take, { type: 'GainResources', investigator, amount: 2 }],
        },
      )
    }
    return options
  },
})

registerPlayerCard({
  code: '71031',
  // Nova Malone: agótala: Combatir con [combat] base igual a tus recursos (máx. 7), +1 daño.
  // Tras derrotar a un enemigo: gana 1 recurso (una vez por ronda).
  abilities: (state, self, investigator) => {
    if (self.exhausted) return []
    const me = getInvestigator(state, investigator)
    const base = Math.min(7, me.resources)
    return fightAt(
      state,
      investigator,
      `${self.id}:fight`,
      'ability.gala.novaFight',
      (enemy, fight) => [
        {
          type: 'BeginSkillTest',
          investigator,
          skill: 'combat',
          difficulty: fight,
          source: self.id,
          modifier: base - me.skills.combat,
          kind: { type: 'fight', enemy, extraDamage: 1 },
        },
      ],
      [exhaust(self)],
    )
  },
  reactions: (_state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.by === self.owner
      ? [
          {
            key: `${self.id}:cut`,
            investigator: self.owner,
            label: 'ability.gainResource',
            limit: { per: 'round' },
            then: [{ type: 'GainResources', investigator: self.owner, amount: 1 }],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// La Logia del Crepúsculo de Plata
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: '71034',
  // Carl Sanford: +1 [willpower] y 1 ranura arcana más. Tras cancelarse la Revelación de una
  // traición que no sea Debilidad, agótalo: esa traición va a la zona de victoria y robas 1.
  skillModifier: plus('willpower'),
  extraSlots: { arcane: 1 },
})

registerPlayerCard({
  code: '71035',
  // Prudence Douglas (3 presagios): durante tu turno, gasta 1 y agótala: mira las 4 primeras de
  // encuentros y descarta hasta 2 que no sean Élite.
  abilities: (state, self, investigator) =>
    self.uses < 1 || self.exhausted || state.activeTurn !== investigator
      ? []
      : [
          {
            key: `${self.id}:portent`,
            label: 'ability.gala.prudence',
            actions: 0,
            provokes: false,
            then: [
              { type: 'SpendUses', asset: self.id, amount: 1 },
              exhaust(self),
              { type: 'ScenarioSpecific', key: 'prudence', data: { investigator, left: 2 } },
            ],
          },
        ],
})

registerPlayerCard({
  code: '71036',
  // Sarah Van Shaw: gasta hasta 2 recursos y agótala: Combatir sumando tu [willpower]; +1 daño por recurso.
  abilities: (state, self, investigator) => {
    if (self.exhausted) return []
    const me = getInvestigator(state, investigator)
    return [0, 1, 2]
      .filter((n) => n <= me.resources)
      .flatMap((n) =>
        fightAt(
          state,
          investigator,
          `${self.id}:fight`,
          'ability.gala.sarahFight',
          (enemy, fight) => [
            {
              type: 'BeginSkillTest',
              investigator,
              skill: 'combat',
              difficulty: fight,
              source: self.id,
              modifier: me.skills.willpower,
              kind: { type: 'fight', enemy, extraDamage: n },
            },
          ],
          [
            exhaust(self),
            ...(n > 0 ? [{ type: 'SpendResources', investigator, amount: n } as Message] : []),
          ],
        ).map((o) => ({ ...o, params: { ...o.params, n } })),
      )
  },
})

registerPlayerCard({
  code: '71037',
  // Raymond Loggins (4 verdades): al robar una traición que no sea Debilidad, gasta 1: cancela su
  // Revelación y descártala; después recibes 1 horror.
  reactions: (state, trigger, self) => {
    if (
      trigger.type !== 'whenTreacheryDrawn' ||
      trigger.investigator !== self.owner ||
      self.uses < 1
    )
      return []
    const treachery = state.treacheries[trigger.treachery]
    if (!treachery || treachery.owner) return []
    return [
      {
        key: `${self.id}:truth`,
        investigator: self.owner,
        label: 'ability.gala.raymond',
        params: { card: treachery.name },
        then: [
          { type: 'SpendUses', asset: self.id, amount: 1 },
          { type: 'CancelRevelation', treachery: treachery.id },
          { type: 'TakeDamage', investigator: self.owner, damage: 0, horror: 1 },
          {
            type: 'ScenarioSpecific',
            key: 'carlSanford',
            data: { code: treachery.code, name: treachery.name },
          },
        ],
      },
    ]
  },
})

// ---------------------------------------------------------------------------
// Lugareños de Kingsport
// ---------------------------------------------------------------------------

registerPlayerCard({
  code: '71040',
  // William Bain: con cartas comprometidas a tu prueba, +1 a tus habilidades. Tras comprometer
  // cartas, gasta 1 recurso por investigador y agótalo: pon la carta superior del mazo de
  // Invitados en el Vestíbulo.
  skillModifier: (state, self, test) =>
    test.investigator === self.owner && test.committed.length > 0 ? 1 : 0,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterCommit' || trigger.by !== self.owner || self.exhausted) return []
    const cost = perInv(state, 1)
    if (getInvestigator(state, self.owner).resources < cost) return []
    if (!(state.scenarioDecks?.guests?.length ?? 0)) return []
    return [
      {
        key: `${self.id}:call`,
        investigator: self.owner,
        label: 'ability.gala.bain',
        params: { n: cost },
        then: [
          { type: 'SpendResources', investigator: self.owner, amount: cost },
          exhaust(self),
          { type: 'ScenarioSpecific', key: 'revealGuest', data: { location: CODES.lobby } },
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: '71041',
  // Delores Gadling: al investigar o negociar, +1 [intellect] por cada enemigo Humanoide de tu localización.
  skillModifier: (state, self, test) => {
    if (test.investigator !== self.owner || test.skill !== 'intellect') return 0
    if (test.kind.type !== 'investigate' && !(test.tags ?? []).includes('parley')) return 0
    const here = getInvestigator(state, self.owner).location
    return Object.values(state.enemies).filter(
      (e) => e.location === here && (e.traits ?? []).includes('Humanoid'),
    ).length
  },
})

registerPlayerCard({
  code: '71042',
  // Thomas Olney: nombra un rasgo y agótalo: descarta la carta superior de encuentros; si lo
  // tiene, gana 2 recursos.
  abilities: (state, self, investigator) => {
    if (self.exhausted || state.encounterDeck.length === 0) return []
    const traits = [
      ...new Set(
        [...state.encounterDeck, ...state.encounterDiscard].flatMap((c) => c.traits ?? []),
      ),
    ].sort()
    return [
      {
        key: `${self.id}:trait`,
        label: 'ability.gala.olney',
        actions: 0,
        provokes: false,
        then: [
          exhaust(self),
          ask(
            investigator,
            'prompt.gala.nameTrait',
            traits.map((trait) => ({
              label: 'choice.gala.trait',
              params: { trait },
              then: [{ type: 'ScenarioSpecific', key: 'olney', data: { investigator, trait } }],
            })),
          ),
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: '71043',
  // Claire Wilson: tras comprometer cartas a tu prueba, agótala: +1 a esta prueba.
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterCommit' &&
    trigger.tester === self.owner &&
    trigger.by === self.owner &&
    !self.exhausted
      ? [
          {
            key: `${self.id}:poise`,
            investigator: self.owner,
            label: 'ability.gala.claire',
            then: [exhaust(self), { type: 'BoostSkillTest', amount: 1 }],
          },
        ]
      : [],
})

// ---------------------------------------------------------------------------
// La Lámpara Mortecina y la Joya de Sarnath
// ---------------------------------------------------------------------------

const testCombatOrAgility = (
  investigator: InvestigatorId,
  source: string,
  difficulty: number,
  onSuccess: Message[],
): Message =>
  ask(
    investigator,
    'prompt.chooseSkill',
    (['combat', 'agility'] as SkillType[]).map((skill) => ({
      label: `choice.test.${skill}`,
      params: { difficulty },
      then: [
        {
          type: 'BeginSkillTest',
          investigator,
          skill,
          difficulty,
          kind: { type: 'effect', source, onSuccess, onFail: [], onFailEach: [] },
        },
      ],
    })),
  )

registerPlayerCard({
  code: CODES.paleLantern,
  // Resplandor hipnótico: si El Exangüe tiene daño o está en la zona de victoria, [combat] o
  // [agility] (3) para tomar La Lámpara y darle la vuelta.
  placedAbilities: (state, self: PlacedAsset, investigator) => {
    const man = bloodlessMan(state)
    const ready =
      (man && man.damageTaken > 0) ||
      state.victoryDisplay.includes(CODES.bloodlessMan) ||
      state.victoryDisplay.includes(CODES.bloodlessManUnleashed)
    if (!ready) return []
    return [
      {
        key: `${self.id}:take`,
        label: 'ability.gala.takeLantern',
        actions: 1,
        provokes: true,
        then: [
          testCombatOrAgility(investigator, 'The Pale Lantern', 3, [
            { type: 'ScenarioSpecific', key: 'takeLantern', data: { investigator } },
          ]),
        ],
      },
    ]
  },
})

registerPlayerCard({
  code: CODES.paleLanternAura,
  // Aura seductora: da la vuelta a una carta hechizada de tu localización. Agótala: [combat] o
  // [agility] (2) para ponerle 1 daño; con 3, va a la zona de victoria y se rompen los hechizos.
  abilities: (state, self, investigator) => {
    const here = getInvestigator(state, investigator).location
    const options: AbilityOption[] = []
    const local = spellbound(state).filter(
      (p) => p.placement.type === 'location' && p.placement.location === here,
    )
    for (const p of local) {
      options.push({
        key: `${self.id}:flip`,
        label: 'ability.gala.unspell',
        params: { card: p.name },
        actions: 1,
        provokes: true,
        target: { type: 'placed', id: p.id },
        then: [{ type: 'FlipPlacedAsset', placed: p.id }],
      })
    }
    if (!self.exhausted) {
      options.push({
        key: `${self.id}:break`,
        label: 'ability.gala.breakLantern',
        actions: 1,
        provokes: true,
        then: [
          exhaust(self),
          testCombatOrAgility(investigator, 'The Pale Lantern', 2, [
            { type: 'ScenarioSpecific', key: 'lanternDamage' },
          ]),
        ],
      })
    }
    return options
  },
})

registerPlayerCard({
  code: CODES.jewelOfSarnath,
  // Agótala: [willpower] o [agility] (1); si tienes éxito, mueve 1 ficha suya a un enemigo de tu localización.
  abilities: (state, self, investigator) =>
    self.exhausted || (self.damage === 0 && (self.doom ?? 0) === 0)
      ? []
      : [
          {
            key: `${self.id}:channel`,
            label: 'ability.gala.channelJewel',
            actions: 0,
            provokes: false,
            then: [
              exhaust(self),
              ask(
                investigator,
                'prompt.chooseSkill',
                (['willpower', 'agility'] as SkillType[]).map((skill) => ({
                  label: `choice.test.${skill}`,
                  params: { difficulty: 1 },
                  then: [
                    {
                      type: 'BeginSkillTest',
                      investigator,
                      skill,
                      difficulty: 1,
                      kind: {
                        type: 'effect',
                        source: 'Jewel of Sarnath',
                        onSuccess: [
                          {
                            type: 'ScenarioSpecific',
                            key: 'jewelMoveToken',
                            data: { investigator },
                          },
                        ],
                        onFail: [],
                        onFailEach: [],
                      },
                    },
                  ],
                })),
              ),
            ],
          },
        ],
})

// ---------------------------------------------------------------------------
// Mensajes propios de los Invitados
// ---------------------------------------------------------------------------

function specific(state: GameState, key: string, data: Data): GameState {
  const investigator = data.investigator as InvestigatorId
  switch (key) {
    case 'readyAsset': {
      const a = state.assets[data.asset as string]
      return a
        ? { ...state, assets: { ...state.assets, [a.id]: { ...a, exhausted: false } } }
        : state
    }
    case 'nextTestBonus': {
      const k = `bonus:${investigator}:${state.round}`
      return {
        ...state,
        scenarioMeta: {
          ...(state.scenarioMeta ?? {}),
          [k]: Number(state.scenarioMeta?.[k] ?? 0) + Number(data.amount),
        },
      }
    }
    case 'antiquity': {
      const k = `antiquity:${data.location as string}`
      const n = Math.max(0, Number(state.scenarioMeta?.[k] ?? 0) + Number(data.amount))
      return { ...state, scenarioMeta: { ...(state.scenarioMeta ?? {}), [k]: n } }
    }
    case 'archibald': {
      const top = state.encounterDeck.slice(0, 9)
      const index = top.findIndex((c) => c.kind === 'enemy')
      const found = top[index]
      const here = getInvestigator(state, investigator).location
      if (index < 0 || !here) return state
      if (!found || found.kind !== 'enemy') return state
      const card = found
      const deck = state.encounterDeck.filter((_, n) => n !== index)
      return push(
        { ...state, encounterDeck: deck },
        { type: 'ScenarioSpecific', key: 'shuffleEncounter' },
        { type: 'SpawnEnemy', card, location: here, engageWith: investigator },
        {
          type: 'ScenarioSpecific',
          key: 'exhaustSpawned',
          data: { code: card.code, location: here },
        },
        { type: 'GainResources', investigator, amount: 3 },
      )
    }
    case 'exhaustSpawned': {
      const e = Object.values(state.enemies).find(
        (x) => x.code === data.code && x.location === data.location && !x.exhausted,
      )
      return e
        ? { ...state, enemies: { ...state.enemies, [e.id]: { ...e, exhausted: true } } }
        : state
    }
    case 'lucas': {
      const me = getInvestigator(state, investigator)
      const top = me.deck.slice(0, 9)
      const index = top.findIndex((c) => {
        const def = playerCardDef(c)
        return def?.type === 'asset' && def.traits.includes('Item')
      })
      if (index < 0) return push(state, { type: 'ShuffleDeck', investigator })
      const code = top[index]!
      const traits = playerCardDef(code)?.traits ?? []
      const here = me.location
      const connected = here ? (state.locations[here]?.connections ?? []) : []
      return push(
        {
          ...state,
          investigators: state.investigators.map((i) =>
            i.id === investigator
              ? { ...i, deck: i.deck.filter((_, n) => n !== index), hand: [...i.hand, code] }
              : i,
          ),
        },
        ...(traits.includes('Relic')
          ? [{ type: 'GainResources', investigator, amount: 2 } as Message]
          : []),
        ...(traits.includes('Tool') && connected.length
          ? [
              ask(
                investigator,
                'prompt.gala.toolClue',
                connected.map((l) => ({
                  label: 'choice.location',
                  params: { location: state.locations[l]?.name ?? l },
                  target: { type: 'location', id: l },
                  then: [
                    { type: 'DiscoverClues', investigator, amount: 1, location: l } as Message,
                  ],
                })),
              ),
            ]
          : []),
        { type: 'ShuffleDeck', investigator },
      )
    }
    case 'prudence': {
      const left = Number(data.left)
      const top = state.encounterDeck.slice(0, 4).map((c, n) => ({ c, n }))
      const discardable = top.filter(({ c }) => !(c.traits ?? []).includes('Elite'))
      if (left <= 0 || discardable.length === 0) return state
      return push(
        state,
        ask(investigator, 'prompt.gala.prudence', [
          ...discardable.map(({ c, n }) => ({
            label: 'choice.discard',
            params: { card: c.name },
            then: [
              {
                type: 'ScenarioSpecific',
                key: 'prudenceDiscard',
                data: { investigator, index: n, left },
              } as Message,
            ],
          })),
          { label: 'choice.gala.keepRest', then: [] },
        ]),
      )
    }
    case 'prudenceDiscard': {
      const index = Number(data.index)
      const card = state.encounterDeck[index]
      if (!card) return state
      return push(
        {
          ...state,
          encounterDeck: state.encounterDeck.filter((_, n) => n !== index),
          encounterDiscard: [...state.encounterDiscard, card],
        },
        {
          type: 'ScenarioSpecific',
          key: 'prudence',
          data: { investigator, left: Number(data.left) - 1 },
        },
      )
    }
    case 'olney': {
      const [top, ...rest] = state.encounterDeck
      if (!top) return state
      const hit = (top.traits ?? []).includes(data.trait as string)
      return push(
        { ...state, encounterDeck: rest, encounterDiscard: [...state.encounterDiscard, top] },
        { type: 'Log', key: 'log.gala.olney', params: { card: top.name } },
        ...(hit ? [{ type: 'GainResources', investigator, amount: 2 } as Message] : []),
      )
    }
    // Carl Sanford: tras cancelarse una Revelación, puede llevarla a la zona de victoria y robar 1.
    case 'carlSanford': {
      const carl = Object.values(state.assets).find((a) => a.code === '71034' && !a.exhausted)
      if (!carl) return state
      return push(
        state,
        ask(carl.owner, 'prompt.reaction', [
          {
            label: 'ability.gala.carl',
            params: { card: data.name as string },
            then: [
              { type: 'ExhaustAsset', asset: carl.id },
              { type: 'ScenarioSpecific', key: 'toVictory', data: { code: data.code as string } },
              { type: 'DrawCards', investigator: carl.owner, amount: 1 },
            ],
          },
          { label: 'choice.skip', then: [] },
        ]),
      )
    }
    case 'toVictory': {
      const code = data.code as string
      const index = state.encounterDiscard.findIndex((c) => c.code === code)
      return {
        ...state,
        encounterDiscard:
          index < 0 ? state.encounterDiscard : state.encounterDiscard.filter((_, n) => n !== index),
        victoryDisplay: [...state.victoryDisplay, code],
      }
    }
    case 'shuffleEncounter': {
      const [encounterDeck, rng] = shuffle(state.encounterDeck, state.rng)
      return { ...state, encounterDeck, rng }
    }
    default:
      return state
  }
}

/** Bonificación a la siguiente prueba (Valeriya, Miranda): se consume al hacerla. */
function skillModifier(state: GameState, test: NonNullable<GameState['skillTest']>): number {
  return Number(state.scenarioMeta?.[`bonus:${test.investigator}:${state.round}`] ?? 0)
}

extendGala({ specific, skillModifier })
