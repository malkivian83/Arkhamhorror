// Current phase-two verification; preserves the original audit snapshot.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const engine = await server.ssrLoadModule('/packages/engine/src/index.ts')
  const testing = await server.ssrLoadModule('/packages/engine/src/testing.ts')
  const gala = await server.ssrLoadModule('/packages/cards/src/midwinter-gala/gala.ts')
  const defs = await server.ssrLoadModule('/packages/cards/src/midwinter-gala/cards.ts')
  const { session, decodeSession } = await server.ssrLoadModule('/apps/web/src/game/session.ts')
  const { markOf } = await server.ssrLoadModule('/apps/web/src/game/undo.ts')
  const factions = defs.FACTIONS
  const difficulties = ['easy', 'standard', 'hard', 'expert']
  const keys = ['joe', 'trish', 'daniela', 'dexter']
  const hash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
  function setup(faction, players = 1, difficulty = 'standard', seed = 1) {
    let state = engine.createGame({
      seed,
      difficulty,
      scenario: gala.midwinterGala({ seed, players, difficulty }),
      investigators: keys.slice(0, players).map((key) => cards.starterInvestigator(key)),
    })
    state = testing.choose(state, `story.midwinterGala.contactChoice.${faction}`)
    if (state.pending?.question.prompt === 'prompt.chooseNextInvestigator')
      state = engine.applyInput(state, { investigator: state.pending.investigator, choice: 0 })
    return state
  }
  const pairSeeds = []
  for (const ally of factions) {
    const found = new Map()
    for (let seed = 1; seed <= 128 && found.size < 4; seed++) {
      const state = setup(ally, 1, 'standard', seed)
      if (!found.has(state.scenarioMeta.rival)) found.set(state.scenarioMeta.rival, seed)
    }
    for (const [rival, seed] of found) pairSeeds.push({ ally, rival, seed })
  }
  if (pairSeeds.length !== 20) throw new Error('Missing ordered faction pairs')
  let setupCases = 0
  for (const pair of pairSeeds)
    for (const difficulty of difficulties)
      for (const players of [1, 2, 3, 4]) {
        const state = setup(pair.ally, players, difficulty, pair.seed)
        const placed = Object.values(state.placedAssets ?? {}).filter((a) => defs.isGuest(a.code))
        const leader = Object.values(state.assets).filter((a) => defs.isLeader(a.code))
        const valid =
          state.scenarioMeta.rival === pair.rival &&
          placed.length === 6 &&
          leader.length === 1 &&
          state.scenarioDecks.guests.length === 6 &&
          state.encounterDeck.length === 23 &&
          state.chaosBag.length === gala.CHAOS_BAGS[difficulty].length &&
          defs.GROUND_FLOOR.every(
            (room) => placed.filter((a) => a.placement.location === room).length === 2,
          )
        if (!valid)
          throw new Error(`Setup mismatch ${JSON.stringify({ pair, difficulty, players })}`)
        setupCases++
      }
  const games = []
  // Deliberate passive policy: verifies terminal defeat paths, not victory or balance.
  for (const faction of factions)
    for (const difficulty of difficulties)
      for (const players of [1, 2]) {
        const seed = 40 + games.length
        const campaign = cards.newCampaign(
          defs.MIDWINTER_GALA,
          keys.slice(0, players),
          difficulty,
          seed,
        )
        let state = cards.startScenario(campaign, seed)
        const base = state
        const inputs = []
        const marks = [markOf(base)]
        for (let n = 0; n < 2000 && state.pending && !state.outcome; n++) {
          const q = state.pending.question
          let choice = q.choices.findIndex(
            (c) => c.label === `story.midwinterGala.contactChoice.${faction}`,
          )
          if (choice < 0 && q.prompt === 'prompt.chooseAction')
            choice = q.choices.findIndex((c) => c.label === 'action.endTurn')
          if (choice < 0 && q.prompt === 'prompt.commitCards')
            choice = q.choices.findIndex((c) => c.label === 'choice.revealToken')
          if (choice < 0)
            choice = q.choices.findIndex(
              (c) => c.label === 'choice.keepHand' || c.label === 'choice.skip',
            )
          const input = { investigator: state.pending.investigator, choice: Math.max(0, choice) }
          state = engine.applyInput(state, input)
          inputs.push(input)
          marks.push(markOf(state))
        }
        if (!state.outcome) throw new Error(`Nonterminal game ${faction}/${difficulty}/${players}`)
        const data = session(state, { base, inputs, marks }, campaign)
        decodeSession(JSON.stringify(data))
        const replayed = inputs.reduce(engine.applyInput, base)
        if (hash(replayed) !== hash(state)) throw new Error('Replay mismatch')
        games.push({
          faction,
          difficulty,
          players,
          seed,
          inputs,
          outcome: state.outcome,
          score: gala.score(state),
          stateHash: hash(state),
          savedAndReplayed: true,
        })
      }
  let base = setup('foundation')
  const id = base.pending.investigator
  const location = base.investigators.find((i) => i.id === id).location
  const probes = []
  const observe = (id, observed, expected, confirmed) =>
    probes.push({ id, observed, expected, confirmed })
  // Directed state fixtures below isolate a rule; they are not legal playthroughs.
  let fight = testing.during(
    base,
    (s) => ({ ...s, agendaIndex: 1 }),
    { type: 'PutAssetIntoPlay', investigator: id, code: '71031' },
    { type: 'SpawnEnemy', card: defs.lanternClubMember, location, engageWith: id },
  )
  const nova = Object.values(fight.assets).find((a) => a.code === '71031')
  const option = engine.playerCardBehavior('71031').abilities(fight, nova, id)[0]
  fight = testing.choose(fight, option.label)
  observe(
    'G01',
    {
      provokes: option.provokes,
      firstPrompt: fight.pending?.question.prompt,
      exhaustedBeforeAttack: fight.assets[nova.id]?.exhausted,
    },
    'Combatir no provoca ataque de oportunidad; agotar Nova es coste previo',
    option.provokes && !fight.assets[nova.id]?.exhausted,
  )
  let chamber = testing.during(base, (s) => ({
    ...s,
    investigators: s.investigators.map((i) => ({ ...i, location: defs.CODES.lanternChamber })),
    encounterDeck: [{ kind: 'treachery', code: 'audit-chamber', name: 'Unlisted', keywords: [] }],
    locations: {
      ...s.locations,
      [defs.CODES.lanternChamber]: {
        ...s.locations[defs.CODES.lanternChamber],
        revealed: true,
        clues: 2,
      },
    },
  }))
  const chamberAbility = engine
    .availableAbilities(chamber, id)
    .find((a) => a.label === 'ability.gala.nameACard')
  chamber = testing.choose(chamber, 'ability.gala.nameACard')
  chamber = engine.applyInput(chamber, { investigator: id, choice: 0 })
  observe(
    'G02',
    {
      cluesDiscoveredOnWrongName: chamber.investigators.find((i) => i.id === id).clues,
      limit: chamberAbility.limit,
    },
    'Descubrir 1 pista también al errar el nombre; límite por turno',
    chamberAbility.limit.per === 'round',
  )
  const bedroom = engine.locationBehavior(defs.CODES.bedroom).abilities(
    {
      ...base,
      enemies: {
        test: {
          ...defs.lanternClubMember,
          id: 'test',
          location: defs.CODES.bedroom,
          engagedWith: id,
          exhausted: false,
          damageTaken: 0,
          maxHealth: 2,
        },
      },
    },
    { ...defs.LOCATIONS.bedroom, revealed: true, clues: 1 },
    id,
  )[0]
  observe(
    'G03',
    { limit: bedroom?.limit ?? null, provokes: bedroom?.provokes },
    'Combatir en dormitorio: sin ataque de oportunidad y una vez por turno',
    bedroom?.provokes && !bedroom.limit,
  )
  const cardsToInspect = Array.from({ length: 6 }, (_, n) => ({
    kind: 'treachery',
    code: `audit-${n}`,
    name: `Audit ${n + 1}`,
    traits: [],
    keywords: [],
  }))
  let prudence = testing.during(base, (s) => ({ ...s, encounterDeck: cardsToInspect }), {
    type: 'ScenarioSpecific',
    key: 'prudence',
    data: { investigator: id, left: 2 },
  })
  prudence = engine.applyInput(prudence, { investigator: id, choice: 0 })
  const shown = prudence.pending.question.choices.map((c) => c.params?.card).filter(Boolean)
  observe(
    'G04',
    { secondSelection: shown },
    'La segunda elección debe limitarse a las cuatro cartas originales; no incluir Audit 5',
    shown.includes('Audit 5'),
  )
  observe(
    'G05',
    {
      callahanReaction: !!engine.playerCardBehavior('71018').reactions,
      deloresAoOHook: !!engine.playerCardBehavior('71041').ignoresOpportunityAttacks,
      olneyTestOptions: !!engine.playerCardBehavior('71042').testOptions,
    },
    'Faltan reacción de Callahan, exención por Humanoide de Delores y compromiso de Olney',
    !engine.playerCardBehavior('71018').reactions &&
      !engine.playerCardBehavior('71042').testOptions,
  )
  observe(
    'G06',
    { rookieKeywords: defs.rookieCop.keywords, silentVictory: defs.bloodlessMan.victory ?? null },
    'Rookie Cop tiene Oleada; la cara silenciosa de El Exangüe no tiene Victoria impresa',
    !defs.rookieCop.keywords.includes('surge') && defs.bloodlessMan.victory === 1,
  )
  const duo = setup('foundation', 2)
  const owner = duo.pending.investigator
  const guest = Object.values(duo.placedAssets).find((a) => defs.isSingleSidedGuest(a.code))
  const eliminated = testing.during(
    duo,
    (s) => s,
    { type: 'TakeControlOfPlaced', investigator: owner, placed: guest.id },
    { type: 'DefeatInvestigator', investigator: owner },
  )
  observe(
    'G07',
    {
      guestCode: guest.code,
      controlledAfter: Object.values(eliminated.assets).some((a) => a.code === guest.code),
      spellboundAfter: Object.values(eliminated.placedAssets).some(
        (a) => a.code === guest.code && a.faceDown,
      ),
    },
    'Al eliminar al controlador, el Invitado que abandona el juego queda hechizado en su localización',
    !Object.values(eliminated.placedAssets).some((a) => a.code === guest.code && a.faceDown),
  )
  const repaired = new Set(
    Array.from({ length: 21 }, (_, n) => `G${String(n + 1).padStart(2, '0')}`).filter(
      (id) => !['G17', 'G18'].includes(id),
    ),
  )
  const fixedChecks = {
    G01:
      !option.provokes &&
      fight.pending?.question.prompt === 'prompt.commitCards' &&
      fight.assets[nova.id]?.exhausted,
    G02:
      chamberAbility.limit.per === 'turn' &&
      chamber.investigators.find((i) => i.id === id).clues === 1,
    G03: bedroom?.limit?.per === 'turn' && !bedroom.provokes,
    G04: !shown.includes('Audit 5'),
    G05:
      !!engine.playerCardBehavior('71018').reactions &&
      !!engine.playerCardBehavior('71041').ignoresOpportunityAttacks &&
      !!engine.playerCardBehavior('71042').testOptions,
    G06: defs.rookieCop.keywords.includes('surge') && defs.bloodlessMan.victory === undefined,
    G07:
      !Object.values(eliminated.assets).some((a) => a.code === guest.code) &&
      Object.values(eliminated.placedAssets).some((a) => a.code === guest.code && a.faceDown),
  }
  for (const probe of probes) {
    probe.defectPresent = probe.confirmed
    probe.status = repaired.has(probe.id) ? 'fixed' : 'pending'
    if (repaired.has(probe.id) ? !fixedChecks[probe.id] : !probe.confirmed)
      throw new Error(`Audit result changed unexpectedly: ${probe.id}`)
    delete probe.confirmed
  }
  const referencePaths = [
    'Scenario/Scenarios/TheMidwinterGala.hs',
    'Location/Cards/TheMidwinterGala/LanternChamber.hs',
    'Location/Cards/TheMidwinterGala/BedroomTheMidwinterGala.hs',
    'Enemy/CardDefs/TheMidwinterGala.hs',
    'Asset/Assets/PrudenceDouglas.hs',
    'Asset/Assets/SpecialAgentCallahan.hs',
    'Asset/Assets/DeloresGadling.hs',
    'Asset/Assets/ThomasOlney.hs',
    'Asset/Assets/ArchibaldHudson.hs',
    'Asset/Assets/LucasTetlow.hs',
    'Location/Cards/TheMidwinterGala/BallroomTheMidwinterGala.hs',
    'Story/Cards/TheMidwinterGala/TheSyndicateAllied.hs',
    'Treachery/Cards/ReturnToTheDunwichLegacy/SecretDoors/SecretDoor.hs',
    'Treachery/Cards/ReturnToTheDunwichLegacy/ErraticFear/ViolentCommands.hs',
  ]
  const reference = []
  for (const path of referencePaths) {
    const contents = await readFile(
      `D:/referencia/ArkhamHorror-main/backend/arkham-api/library/Arkham/${path}`,
      'utf8',
    )
    reference.push({ path, sha256: createHash('sha256').update(contents).digest('hex') })
  }
  const report = {
    date: '2026-10-18',
    baseline: '5a655e6fd36fec77a70d0c93c20f79706ead3fb6',
    stage: 'phase-two',
    scenarioRulesVersion: engine.scenarioBehavior(defs.MIDWINTER_GALA).rulesVersion,
    repaired: [...repaired],
    scope:
      'Auditoría local: preparación, derrota pasiva, guardado/replay y sondas dirigidas. Sin certificación de victorias.',
    setupCases,
    pairSeeds,
    legalGames: games,
    probes,
    reference,
  }
  await mkdir('docs-proyecto/evidencias', { recursive: true })
  await writeFile(
    'docs-proyecto/evidencias/gala-fase-2.json',
    JSON.stringify(report, null, 2) + '\n',
  )
  const inventory = new Map()
  const put = (code, name, type) => inventory.set(code, { code, name, type })
  put(defs.CODES.scenario, 'The Midwinter Gala', 'referencia')
  const definition = gala.midwinterGala({ players: 1 })
  definition.agendas.forEach((c) => put(c.code, c.name, 'plan'))
  definition.acts.forEach((c) => put(c.code, c.name, 'acto'))
  Object.values(defs.LOCATIONS).forEach((c) => put(c.id, c.name, 'lugar'))
  defs.GUEST_DEFS.forEach((c) => put(c.code, c.name, 'invitado/líder'))
  Object.values(defs.FACTION_CARDS).forEach((c) =>
    put(c.story, c.storyName, 'historia (Aliado/Rival)'),
  )
  ;[...definition.encounterDeck, ...definition.setAside].forEach((c) => {
    if (/^\d{5}$/.test(c.code)) put(c.code, c.name, c.kind)
  })
  put(defs.CODES.bloodlessMan, 'The Bloodless Man', 'enemigo (dos caras)')
  put(defs.CODES.paleLantern, 'The Pale Lantern', 'apoyo (dos caras)')
  const findings = {
    71008: 'G02;G08;G19',
    71010: 'G09',
    71012: 'G03',
    71017: 'G10;G15;G16',
    71018: 'G01;G05',
    71020: 'G06',
    71024: 'G11',
    71031: 'G01',
    71035: 'G04',
    71036: 'G01',
    71041: 'G05',
    71042: 'G05;G19',
    71045: 'G06',
    71047: 'G12',
    71048: 'G12',
    71050: 'G13',
    71055: 'G13',
    71059: 'G16',
    71060: 'G14',
    71062: 'G21',
    71027: 'G15;G20',
    71052: 'G07;G16',
    71046: 'G07',
    71015: 'G17',
    71021: 'G17',
    71033: 'G17',
    71039: 'G17',
  }
  const quote = (v) => `"${String(v).replaceAll('"', '""')}"`
  const rows = [['codigo', 'nombre', 'tipo', 'estado', 'hallazgos', 'aceptacion_pendiente']]
  for (const card of [...inventory.values()].sort((a, b) => a.code.localeCompare(b.code))) {
    const issues = findings[card.code] ?? ''
    const pending = issues.split(';').filter((id) => id && !repaired.has(id))
    const fixed = issues.split(';').filter((id) => repaired.has(id))
    rows.push([
      card.code,
      card.name,
      card.type,
      pending.length
        ? `Pendiente: ${pending.join(';')}; corregido: ${fixed.join(';') || '—'}`
        : fixed.length
          ? 'Correcciones de fases 1–2 verificadas; pendiente contrato completo'
          : 'Presente; sin contrato individual de cierre',
      issues,
      'Contrato individual EN/ES, efectos y guardado/reanudación; ver auditoría 18',
    ])
  }
  if (inventory.size !== 62) throw new Error(`Incomplete inventory: ${inventory.size}`)
  await writeFile(
    'docs-proyecto/18-matriz-la-gala.csv',
    rows.map((row) => row.map(quote).join(',')).join('\n') + '\n',
  )
  console.log(
    JSON.stringify({
      setupCases,
      games: games.length,
      decisions: games.reduce((n, g) => n + g.inputs.length, 0),
      resolutions: [...new Set(games.map((g) => JSON.stringify(g.outcome)))],
      probes,
    }),
  )
} finally {
  await server.close()
}
