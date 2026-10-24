/**
 * Resto de cartas de jugador de los mazos iniciales de la caja de 2026:
 * aliados, talentos, objetos, eventos y habilidades con efectos de reacción,
 * de prueba o de búsqueda.
 */
import {
  assetVitals,
  engagedEnemies,
  getInvestigator,
  getLocation,
  shroudOf,
  playerCardDef,
  registerPlayerCard,
  type AbilityOption,
  type Asset,
  type GameState,
  type InvestigatorId,
  type Message,
  type ReactionOption,
  type SkillTest,
  type SkillType,
} from '@lcg/engine'
import { chooseEnemyHere, disengageAndMove } from './investigators'
import { code, hasUses, mayChoose, name, spendUse } from './player-cards'

export const exhaust = (asset: Asset): Message => ({ type: 'ExhaustAsset', asset: asset.id })
export const draw = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'DrawCards',
  investigator,
  amount,
})
export const gain = (investigator: InvestigatorId, amount = 1): Message => ({
  type: 'GainResources',
  investigator,
  amount,
})
const locationOf = (state: GameState, investigator: InvestigatorId) =>
  getInvestigator(state, investigator).location

/** Reacción de un apoyo: la decide su controlador. */
export function reaction(
  self: Asset,
  label: string,
  then: Message[],
  params: Record<string, string | number> = {},
  suffix = '',
): ReactionOption {
  return {
    key: `${self.id}:reaction${suffix}`,
    investigator: self.owner,
    label,
    params: { card: playerCardDef(self.code)?.name ?? self.code, ...params },
    then,
  }
}

/** Evento jugado como reacción desde la mano. */
export function playFromHand(
  investigator: InvestigatorId,
  position: number,
  effect: Message[],
): ReactionOption {
  return {
    key: `hand:${code(position)}`,
    investigator,
    label: 'ability.playCard',
    params: { card: name(position) },
    target: { type: 'hand', code: code(position) },
    then: [{ type: 'PlayCard', investigator, code: code(position), effect }],
  }
}

/** Bonificación constante a una habilidad (aliados). */
const skillBonus =
  (skill: SkillType, amount = 1) =>
  (_state: GameState, _self: Asset, test: SkillTest) =>
    test.skill === skill ? amount : 0

// ---------------------------------------------------------------------------
// Talentos "gasta 1 recurso: +1 a la prueba (+2 en ciertos casos)"
// ---------------------------------------------------------------------------

function pump(
  position: number,
  skills: [SkillType, SkillType],
  doubled: (t: SkillTest) => boolean,
) {
  registerPlayerCard({
    code: code(position),
    testOptions: (state, test, self) => {
      if (getInvestigator(state, self.owner).resources < 1) return []
      return skills
        .filter((skill) => test.skill === skill)
        .map((skill) => {
          const amount = doubled(test) ? 2 : 1
          return {
            key: `${self.id}:${skill}`,
            investigator: self.owner,
            label: 'ability.pump',
            params: { card: name(position), skill, amount },
            then: [
              { type: 'SpendResources', investigator: self.owner, amount: 1 },
              { type: 'BoostSkillTest', amount },
            ],
          }
        })
    },
  })
}

const kindIs =
  (...kinds: string[]) =>
  (t: SkillTest) =>
    kinds.includes(t.kind.type)
const tagged =
  (...tags: string[]) =>
  (t: SkillTest) =>
    (t.tags ?? []).some((x) => tags.includes(x))

pump(17, ['combat', 'agility'], kindIs('fight', 'evade')) // Endurance
pump(35, ['intellect', 'willpower'], (t) => kindIs('investigate')(t) || tagged('parley')(t)) // Sharp Rhetoric
pump(47, ['intellect', 'agility'], (t) => kindIs('evade')(t) || tagged('parley')(t)) // Silver Tongue
pump(63, ['willpower', 'combat'], tagged('spell', 'ritual')) // Spiritual Intuition
pump(76, ['willpower', 'agility'], tagged('scenario')) // Levelheaded

// ---------------------------------------------------------------------------
// Aliados
// ---------------------------------------------------------------------------

// Bodyguard: puede recibir el daño de otros investigadores de tu localización.
// [reacción] al ser derrotado: haz 1 daño a un enemigo de tu localización.
registerPlayerCard({
  code: code(16),
  soaksForOthers: true,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'assetDefeated' || trigger.asset.id !== self.id) return []
    const hit = chooseEnemyHere(state, self.owner, 'prompt.chooseEnemy', (e) => [
      { type: 'DamageEnemy', enemy: e.id, amount: 1, by: self.owner },
    ])
    return hit.length ? [reaction(self, 'ability.damageEnemyHere', hit)] : []
  },
})

// Logan Hastings: +1 [combat]. [reacción] después de derrotar a un enemigo, agótalo: +1 recurso.
registerPlayerCard({
  code: code(18),
  skillModifier: skillBonus('combat'),
  reactions: (_state, trigger, self) =>
    trigger.type === 'enemyDefeated' && trigger.by === self.owner && !self.exhausted
      ? [reaction(self, 'ability.gainResource', [exhaust(self), gain(self.owner)])]
      : [],
})

// Dorothy Simmons: +1 [intellect]. [reacción] después de investigar con éxito por
// exactamente 1 o 3, agótala: +1 recurso.
registerPlayerCard({
  code: code(30),
  skillModifier: skillBonus('intellect'),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.owner &&
    trigger.kind === 'investigate' &&
    trigger.succeeded &&
    (trigger.margin === 1 || trigger.margin === 3) &&
    !self.exhausted
      ? [reaction(self, 'ability.gainResource', [exhaust(self), gain(self.owner)])]
      : [],
})

// Laboratory Assistant: +2 al tamaño de mano. [reacción] al entrar en juego: roba 2.
registerPlayerCard({
  code: code(32),
  handSize: 2,
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterAssetEntersPlay' && trigger.asset === self.id
      ? [reaction(self, 'ability.drawCards', [draw(self.owner, 2)], { n: 2 })]
      : [],
})

// Olivier Bishop: +1 [agility]. [rápida] durante tu turno, agótalo: muévete a una
// localización conectada.
registerPlayerCard({
  code: code(46),
  skillModifier: skillBonus('agility'),
  abilities: (state, self, investigator) => {
    const here = locationOf(state, investigator)
    if (self.exhausted || here === null || state.activeTurn !== investigator) return []
    return getLocation(state, here)
      .connections.filter((to) => state.locations[to])
      .map((to) => ({
        key: `${self.id}:move`,
        label: 'ability.moveWith',
        params: { card: name(46), location: getLocation(state, to).name },
        target: { type: 'location', id: to },
        actions: 0,
        provokes: false,
        then: [exhaust(self), { type: 'MoveTo', investigator, location: to }],
      }))
  },
})

// Jim Culver: +1 [willpower]. [reacción] después de recibir daño u horror, agótalo: roba 1.
registerPlayerCard({
  code: code(60),
  skillModifier: skillBonus('willpower'),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterTakeDamage' && trigger.investigator === self.owner && !self.exhausted
      ? [reaction(self, 'ability.drawCards', [exhaust(self), draw(self.owner)], { n: 1 })]
      : [],
})

// Aleksey Saburov: [reacción] al empezar tu turno, cura 1 daño o 1 horror de Aleksey.
registerPlayerCard({
  code: code(72),
  reactions: (_state, trigger, self) => {
    if (trigger.type !== 'turnBegins' || trigger.investigator !== self.owner) return []
    return [
      ...(self.damage > 0
        ? [
            reaction(
              self,
              'ability.healAsset',
              [{ type: 'HealAsset', asset: self.id, damage: 1, horror: 0 } as Message],
              { kind: 'damage' },
              ':damage',
            ),
          ]
        : []),
      ...(self.horror > 0
        ? [
            reaction(
              self,
              'ability.healAsset',
              [{ type: 'HealAsset', asset: self.id, damage: 0, horror: 1 } as Message],
              { kind: 'horror' },
              ':horror',
            ),
          ]
        : []),
    ]
  },
})

// ---------------------------------------------------------------------------
// Objetos y talentos con reacciones
// ---------------------------------------------------------------------------

// Local Map: gasta 1 secreto: Investigar una localización conectada revelada
// (+1 [intellect]); si aciertas, puedes agotarlo para moverte allí.
registerPlayerCard({
  code: code(33),
  abilities: (state, self, investigator): AbilityOption[] => {
    const here = locationOf(state, investigator)
    if (here === null || !hasUses(self)) return []
    return getLocation(state, here)
      .connections.filter((to) => state.locations[to]?.revealed)
      .map((to) => ({
        key: `${self.id}:investigate`,
        label: 'ability.investigateConnecting',
        params: { card: name(33), location: getLocation(state, to).name },
        target: { type: 'location', id: to },
        actions: 1,
        provokes: true,
        costs: [spendUse(self)],
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'intellect',
            difficulty: shroudOf(state, to),
            modifier: 1,
            source: self.id,
            kind: {
              type: 'investigate',
              location: to,
              onSuccess: self.exhausted
                ? []
                : [
                    mayChoose(investigator, 'choice.exhaustToMove', { card: name(33) }, [
                      exhaust(self),
                      { type: 'MoveTo', investigator, location: to },
                    ]),
                  ],
            },
          },
        ],
      }))
  },
})

// Lucky Cigarette Case: [reacción] después de superar una prueba por 2 o más, agótala: roba 1.
registerPlayerCard({
  code: code(44),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === self.owner &&
    trigger.succeeded &&
    trigger.margin >= 2 &&
    !self.exhausted
      ? [reaction(self, 'ability.drawCards', [exhaust(self), draw(self.owner)], { n: 1 })]
      : [],
})

// Sticky Fingers: [reacción] después de evitar con éxito a un enemigo, agótalo: +1 recurso.
registerPlayerCard({
  code: code(48),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterEvade' && trigger.investigator === self.owner && !self.exhausted
      ? [reaction(self, 'ability.gainResource', [exhaust(self), gain(self.owner)])]
      : [],
})

// Covert Ops (Trish): [reacción] después de evitar a un enemigo, agótalo: roba 1
// o muévete a una localización conectada.
registerPlayerCard({
  code: code(8),
  reactions: (_state, trigger, self) =>
    trigger.type === 'afterEvade' && trigger.investigator === self.owner && !self.exhausted
      ? [
          reaction(self, 'ability.drawCards', [exhaust(self), draw(self.owner)], { n: 1 }, ':draw'),
          reaction(
            self,
            'ability.moveConnecting',
            [exhaust(self), { type: 'ChooseMove', investigator: self.owner }],
            {},
            ':move',
          ),
        ]
      : [],
})

// Cloak of Resonance: [reacción] cuando recibe horror, agótala: 1 daño a un enemigo
// de tu localización.
registerPlayerCard({
  code: code(58),
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterAssetDamaged' || trigger.asset !== self.id) return []
    if (trigger.horror <= 0 || self.exhausted) return []
    const hit = chooseEnemyHere(state, self.owner, 'prompt.chooseEnemy', (e) => [
      { type: 'DamageEnemy', enemy: e.id, amount: 1, by: self.owner },
    ])
    return hit.length ? [reaction(self, 'ability.damageEnemyHere', [exhaust(self), ...hit])] : []
  },
})

// Second Sight: Investigar ([willpower]); si aciertas, puedes gastar 1 carga para
// descubrir 1 pista más. Si revelas un sectario, retira 1 carga (si no puedes,
// 1 horror y descártala).
registerPlayerCard({
  code: code(62),
  abilities: (state, self, investigator): AbilityOption[] => {
    const here = locationOf(state, investigator)
    if (here === null) return []
    return [
      {
        key: `${self.id}:investigate`,
        label: 'ability.investigateWith',
        params: { card: name(62), skill: 'willpower' },
        target: { type: 'location', id: here },
        actions: 1,
        provokes: true,
        then: [
          {
            type: 'BeginSkillTest',
            investigator,
            skill: 'willpower',
            difficulty: shroudOf(state, here),
            source: self.id,
            tags: ['spell'],
            kind: {
              type: 'investigate',
              location: here,
              onSuccess:
                self.uses > 0
                  ? [
                      mayChoose(investigator, 'choice.spendChargeForClue', {}, [
                        spendUse(self),
                        { type: 'DiscoverClues', investigator, amount: 1, location: here },
                      ]),
                    ]
                  : [],
            },
          },
        ],
      },
    ]
  },
  onTokenRevealed: (_state, token, self) =>
    token !== 'cultist'
      ? []
      : self.uses > 0
        ? [spendUse(self)]
        : [
            { type: 'TakeDamage', investigator: self.owner, damage: 0, horror: 1, direct: true },
            { type: 'DiscardAsset', asset: self.id },
          ],
})

// Lucky Charm: [rápida] gasta 1 carga y agótalo: mueve 1 daño u horror de una carta
// de tu localización a una carta tuya.
registerPlayerCard({
  code: code(61),
  abilities: (state, self, investigator): AbilityOption[] => {
    const here = locationOf(state, investigator)
    if (here === null || self.exhausted || !hasUses(self)) return []
    type Holder = { holder: { type: 'investigator' | 'asset'; id: string }; name: string }
    const sources: (Holder & { damage: number; horror: number })[] = [
      ...state.investigators
        .filter((i) => !i.eliminated && i.location === here)
        .map((i) => ({
          holder: { type: 'investigator' as const, id: i.id },
          name: i.name,
          damage: i.damage,
          horror: i.horror,
        })),
      ...Object.values(state.assets)
        .filter((a) => getInvestigator(state, a.owner).location === here)
        .map((a) => ({
          holder: { type: 'asset' as const, id: a.id },
          name: playerCardDef(a.code)?.name ?? a.code,
          damage: a.damage,
          horror: a.horror,
        })),
    ]
    const me = getInvestigator(state, investigator)
    const targets = (kind: 'damage' | 'horror'): Holder[] => [
      { holder: { type: 'investigator', id: investigator }, name: me.name },
      ...Object.values(state.assets)
        .filter((a) => {
          if (a.owner !== investigator) return false
          const def = assetVitals(a)
          return kind === 'damage'
            ? def?.health !== undefined && a.damage < def.health
            : def?.sanity !== undefined && a.horror < def.sanity
        })
        .map((a) => ({
          holder: { type: 'asset' as const, id: a.id },
          name: playerCardDef(a.code)?.name ?? a.code,
        })),
    ]
    return sources.flatMap((source) =>
      (['damage', 'horror'] as const)
        .filter((kind) => source[kind] > 0)
        .map((kind) => {
          const to = targets(kind).filter(
            (t) => !(t.holder.type === source.holder.type && t.holder.id === source.holder.id),
          )
          return { source, kind, to }
        })
        .filter(({ to }) => to.length > 0)
        .map(({ source, kind, to }) => ({
          key: `${self.id}:move`,
          label: 'ability.luckyCharm',
          params: { from: source.name, kind },
          actions: 0,
          provokes: false,
          then: [
            spendUse(self),
            exhaust(self),
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.moveDamageTo',
                choices: to.map((t) => ({
                  label: 'choice.moveDamageTo',
                  params: { card: t.name },
                  then: [
                    { type: 'MoveDamage', from: source.holder, to: t.holder, kind } as Message,
                  ],
                })),
              },
            },
          ],
        })),
    )
  },
})

// Bandages: [reacción] después de que un investigador o un aliado de tu localización
// reciba daño, gasta 1 suministro: cura 1 daño de esa carta. Sin suministros, se descarta.
registerPlayerCard({
  code: code(73),
  discardWhenEmpty: true,
  reactions: (state, trigger, self) => {
    if (!hasUses(self)) return []
    const here = locationOf(state, self.owner)
    if (trigger.type === 'afterTakeDamage' && trigger.damage > 0) {
      const hurt = getInvestigator(state, trigger.investigator)
      if (hurt.location !== here || hurt.damage <= 0) return []
      return [
        reaction(
          self,
          'ability.bandages',
          [spendUse(self), { type: 'Heal', investigator: hurt.id, damage: 1, horror: 0 }],
          { target: hurt.name },
        ),
      ]
    }
    if (trigger.type === 'afterAssetDamaged' && trigger.damage > 0) {
      const ally = state.assets[trigger.asset]
      if (!ally || !(playerCardDef(ally.code)?.slots ?? []).includes('ally')) return []
      if (getInvestigator(state, ally.owner).location !== here) return []
      return [
        reaction(
          self,
          'ability.bandages',
          [spendUse(self), { type: 'HealAsset', asset: ally.id, damage: 1, horror: 0 }],
          { target: playerCardDef(ally.code)?.name ?? ally.code },
        ),
      ]
    }
    return []
  },
})

// Hunter's Instinct: [reacción] después de enfrentarte a un enemigo, gasta 1
// suministro y agótalo: añade a tu mano un evento de nivel 0 de tu pila de descartes.
registerPlayerCard({
  code: code(74),
  discardWhenEmpty: true,
  reactions: (state, trigger, self) => {
    if (trigger.type !== 'afterEngage' || trigger.investigator !== self.owner) return []
    if (self.exhausted || !hasUses(self)) return []
    const events = [...new Set(getInvestigator(state, self.owner).discard)].filter((c) => {
      const def = playerCardDef(c)
      return def?.type === 'event' && (def.xp ?? 0) === 0 && !def.weakness
    })
    return events.map((c) =>
      reaction(
        self,
        'ability.returnFromDiscard',
        [
          exhaust(self),
          spendUse(self),
          { type: 'DiscardToHand', investigator: self.owner, code: c },
        ],
        { target: playerCardDef(c)?.name ?? c },
        `:${c}`,
      ),
    )
  },
})

// Jumpsuit: [rápida] durante tu turno, descártalo: añade a tu mano un apoyo
// Herramienta o Arma de tu pila de descartes.
registerPlayerCard({
  code: code(75),
  abilities: (state, self, investigator): AbilityOption[] => {
    if (state.activeTurn !== investigator) return []
    return [...new Set(getInvestigator(state, investigator).discard)]
      .filter((c) => {
        const def = playerCardDef(c)
        return def?.type === 'asset' && def.traits.some((t) => t === 'Tool' || t === 'Weapon')
      })
      .map((c) => ({
        key: `${self.id}:recover`,
        label: 'ability.jumpsuit',
        params: { card: playerCardDef(c)?.name ?? c },
        actions: 0,
        provokes: false,
        then: [
          { type: 'DiscardAsset', asset: self.id },
          { type: 'DiscardToHand', investigator, code: c },
        ],
      }))
  },
})

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

// Detective's Intuition (Joe): gana 2 recursos y cura 1 daño o 1 horror.
// [reacción] al robarla durante tu turno: revélala y roba 2 cartas más.
registerPlayerCard({
  code: code(5),
  play: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    const heals = [
      ...(me.damage > 0
        ? [
            {
              label: 'choice.healDamage',
              then: [{ type: 'Heal', investigator, damage: 1, horror: 0 } as Message],
            },
          ]
        : []),
      ...(me.horror > 0
        ? [
            {
              label: 'choice.healHorror',
              then: [{ type: 'Heal', investigator, damage: 0, horror: 1 } as Message],
            },
          ]
        : []),
    ]
    return [
      gain(investigator, 2),
      ...(heals.length
        ? [
            {
              type: 'Ask',
              investigator,
              question: { kind: 'chooseOne', prompt: 'prompt.chooseHeal', choices: heals },
            } as Message,
          ]
        : []),
    ]
  },
  handReactions: (state, trigger, investigator) =>
    trigger.type === 'afterDrawCard' &&
    trigger.investigator === investigator &&
    trigger.card === code(5) &&
    state.activeTurn === investigator
      ? [
          {
            key: `${code(5)}:reveal`,
            investigator,
            label: 'ability.revealToDraw',
            params: { card: name(5), n: 2 },
            then: [draw(investigator, 2)],
          },
        ]
      : [],
})

// "For my next trick..." (Dexter): busca en tu mazo un apoyo Hechizo u Objeto y
// juégalo con 2 de descuento. No provoca ataques de oportunidad.
registerPlayerCard({
  code: code(11),
  noAttacksOfOpportunity: true,
  play: (_state, investigator) => [
    { type: 'SearchDeck', investigator, traits: ['Spell', 'Item'], to: 'play', discount: 2 },
  ],
})

// Lesson Learned: rápida, después de que un enemigo te ataque: descubre 1 pista.
registerPlayerCard({
  code: code(22),
  handReactions: (_state, trigger, investigator) =>
    trigger.type === 'afterEnemyAttack' && trigger.investigator === investigator
      ? [playFromHand(investigator, 22, [{ type: 'DiscoverClues', investigator, amount: 1 }])]
      : [],
})

// Right Tool for the Job: busca entre las 9 primeras un apoyo Herramienta o Arma.
registerPlayerCard({
  code: code(23),
  play: (_state, investigator) => [
    { type: 'SearchDeck', investigator, top: 9, traits: ['Tool', 'Weapon'], to: 'hand' },
  ],
})

// Gather Intel: rápida, cuando un enemigo entra en tu localización: roba 2.
registerPlayerCard({
  code: code(36),
  handReactions: (state, trigger, investigator) =>
    trigger.type === 'enemyEntersLocation' && trigger.location === locationOf(state, investigator)
      ? [playFromHand(investigator, 36, [draw(investigator, 2)])]
      : [],
})

/** Evento de evitar contra un enemigo enfrentado contigo (pregunta cuál si hay varios). */
export function evadeEvent(
  state: GameState,
  investigator: InvestigatorId,
  build: (enemy: { id: string; evade: number }) => Message,
): Message[] {
  const engaged = engagedEnemies(state, investigator)
  if (engaged.length === 1) return [build(engaged[0]!)]
  return [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseEnemy',
        choices: engaged.map((e) => ({
          label: 'choice.enemy',
          params: { enemy: e.name },
          target: { type: 'enemy' as const, id: e.id },
          then: [build(e)],
        })),
      },
    },
  ]
}
export const hasEngaged = (state: GameState, investigator: InvestigatorId) =>
  engagedEnemies(state, investigator).length > 0

// Through the Cracks: Evitar ([agility]) +1 por cada pista tuya (máx. +3); si aciertas,
// puedes desenfrentarte y moverte a una localización conectada revelada.
registerPlayerCard({
  code: code(37),
  evadeAction: true,
  canPlay: hasEngaged,
  play: (state, investigator) =>
    evadeEvent(state, investigator, (enemy) => ({
      type: 'BeginSkillTest',
      investigator,
      skill: 'agility',
      difficulty: enemy.evade,
      modifier: Math.min(3, getInvestigator(state, investigator).clues),
      kind: { type: 'evade', enemy: enemy.id, onSuccess: [disengageAndMove(investigator, true)] },
    })),
})

// Breaking and Entering: Investigar sumando tu [agility]; si aciertas por 2 o más,
// puedes evitar automáticamente a un enemigo de la localización. No provoca ataques.
registerPlayerCard({
  code: code(50),
  noAttacksOfOpportunity: true,
  play: (state, investigator) => {
    const me = getInvestigator(state, investigator)
    if (me.location === null) return []
    return [
      {
        type: 'BeginSkillTest',
        investigator,
        skill: 'intellect',
        difficulty: shroudOf(state, me.location),
        modifier: me.skills.agility,
        kind: {
          type: 'investigate',
          location: me.location,
          onSuccessBy: {
            atLeast: 2,
            then: chooseEnemyHere(
              state,
              investigator,
              'prompt.autoEvade',
              (e) => [{ type: 'EvadeEnemy', enemy: e.id, by: investigator }],
              true,
            ),
          },
        },
      },
    ]
  },
})

// Paint the Town Red: Parlamento. Busca entre las 9 primeras del mazo de encuentros
// un enemigo no Élite, róbalo y gana recursos igual a su salud impresa.
registerPlayerCard({
  code: code(51),
  noAttacksOfOpportunity: true,
  play: (_state, investigator) => [{ type: 'SearchEncounterForEnemy', investigator, top: 9 }],
})

// Prestidigitation: rápida, solo durante tu turno: juega un apoyo Objeto de tu mano
// con 2 de descuento. Al final de tu turno, devuelve a tu mano un apoyo Objeto tuyo.
const itemsToPlay = (state: GameState, investigator: InvestigatorId, reserve = 0) => {
  const me = getInvestigator(state, investigator)
  return [...new Set(me.hand)].filter((c) => {
    const def = playerCardDef(c)
    return (
      def?.type === 'asset' &&
      def.traits.includes('Item') &&
      Math.max(0, (def.cost ?? 0) - 2) <= me.resources - reserve
    )
  })
}
registerPlayerCard({
  code: code(52),
  canPlay: (state, investigator) =>
    state.activeTurn === investigator &&
    itemsToPlay(state, investigator, playerCardDef(code(52))?.cost ?? 0).length > 0,
  play: (state, investigator) => [
    {
      type: 'Ask',
      investigator,
      question: {
        kind: 'chooseOne',
        prompt: 'prompt.chooseItem',
        choices: itemsToPlay(state, investigator).map((c) => ({
          label: 'action.play',
          params: { card: playerCardDef(c)?.name ?? c },
          target: { type: 'hand' as const, code: c },
          then: [{ type: 'PlayCard', investigator, code: c, discount: 2 } as Message],
        })),
      },
    },
    {
      type: 'AtEndOfTurn',
      investigator,
      then: [{ type: 'ReturnAssetWithTrait', investigator, trait: 'Item' }],
    },
  ],
})

// Premonition: rápida: entra en juego y sella una ficha al azar; la próxima ficha
// que se revele será esa, y después se descarta.
registerPlayerCard({
  code: code(64),
  canPlay: (state) => state.chaosBag.length > 0 && !state.skillTest,
  play: (_state, investigator) => [{ type: 'SealToken', investigator, code: code(64) }],
})

// Ward of Protection: rápida, cuando robas una traición que no es debilidad: cancela
// su efecto de revelación y recibe 1 horror.
registerPlayerCard({
  code: code(65),
  handReactions: (state, trigger, investigator) => {
    if (trigger.type !== 'whenTreacheryDrawn' || trigger.investigator !== investigator) return []
    const treachery = state.treacheries[trigger.treachery]
    if (!treachery || treachery.owner) return []
    return [
      playFromHand(investigator, 65, [
        { type: 'CancelRevelation', treachery: treachery.id },
        { type: 'TakeDamage', investigator, damage: 0, horror: 1 },
      ]),
    ]
  },
})

// Will of the Cosmos: pon 1 perdición en tu investigador; descubre 1 pista en tu
// localización y 1 en otra localización revelada.
registerPlayerCard({
  code: code(66),
  play: (state, investigator) => {
    const here = locationOf(state, investigator)
    const others = Object.values(state.locations).filter(
      (l) => l.id !== here && l.revealed && l.clues > 0,
    )
    return [
      { type: 'PlaceDoomOnInvestigator', investigator, amount: 1 },
      { type: 'DiscoverClues', investigator, amount: 1 },
      ...(others.length
        ? [
            {
              type: 'Ask',
              investigator,
              question: {
                kind: 'chooseOne',
                prompt: 'prompt.cardDiscoverElsewhere',
                promptParams: { card: code(66) },
                choices: others.map((l) => ({
                  label: 'choice.location',
                  params: { location: l.name },
                  target: { type: 'location' as const, id: l.id },
                  then: [
                    { type: 'DiscoverClues', investigator, amount: 1, location: l.id } as Message,
                  ],
                })),
              },
            } as Message,
          ]
        : []),
    ]
  },
})

// "Look what I found!": rápida, después de fallar por 2 o menos investigando:
// descubre 2 pistas en tu localización.
registerPlayerCard({
  code: code(78),
  handReactions: (_state, trigger, investigator) =>
    trigger.type === 'afterSkillTest' &&
    trigger.investigator === investigator &&
    trigger.kind === 'investigate' &&
    !trigger.succeeded &&
    trigger.margin >= -2
      ? [
          playFromHand(investigator, 78, [
            {
              type: 'DiscoverClues',
              investigator,
              amount: 2,
              ...(trigger.location ? { location: trigger.location } : {}),
            },
          ]),
        ]
      : [],
})

// "Shove off!": Evitar ([agility]); si aciertas, 1 daño al enemigo evitado; si fallas,
// vuelve a tu mano al final de tu turno.
registerPlayerCard({
  code: code(79),
  evadeAction: true,
  canPlay: hasEngaged,
  play: (state, investigator) =>
    evadeEvent(state, investigator, (enemy) => ({
      type: 'BeginSkillTest',
      investigator,
      skill: 'agility',
      difficulty: enemy.evade,
      kind: {
        type: 'evade',
        enemy: enemy.id,
        onSuccess: [{ type: 'DamageEnemy', enemy: enemy.id, amount: 1, by: investigator }],
        onFail: [
          {
            type: 'AtEndOfTurn',
            investigator,
            then: [{ type: 'DiscardToHand', investigator, code: code(79) }],
          },
        ],
      },
    })),
})

// ---------------------------------------------------------------------------
// Habilidades (cartas para comprometer)
// ---------------------------------------------------------------------------

// Out of Sight: si la prueba se supera por 2 o más, quien la hace puede
// desenfrentarse y moverse a una localización conectada revelada.
registerPlayerCard({
  code: code(53),
  afterCommittedTest: (_state, test, succeeded) =>
    succeeded && (test.modifiedSkill ?? 0) - test.difficulty >= 2
      ? [disengageAndMove(test.investigator, true)]
      : [],
})

// Soul Link: coste adicional al comprometerla: 1 horror.
registerPlayerCard({
  code: code(67),
  onCommit: (_state, by) => [{ type: 'TakeDamage', investigator: by, damage: 0, horror: 1 }],
})

// Slippery: si tienes éxito evitando a un enemigo no Élite, no se prepara en el
// próximo mantenimiento.
registerPlayerCard({
  code: code(80),
  afterCommittedTest: (state, test, succeeded) => {
    if (!succeeded || test.kind.type !== 'evade') return []
    const enemy = state.enemies[test.kind.enemy]
    if (!enemy || (enemy.traits ?? []).includes('Elite')) return []
    return [{ type: 'EnemyStaysExhausted', enemy: enemy.id }]
  },
})

// Timely Intervention: se puede comprometer después de revelar las fichas.
registerPlayerCard({ code: code(81), commitAfterReveal: true })
