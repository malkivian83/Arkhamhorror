import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
})
try {
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const { applyInput, skillTestValue } = await server.ssrLoadModule('/packages/engine/src/index.ts')
  for (
    let seed = Number(process.argv[2] ?? 1);
    seed < Number(process.argv[2] ?? 1) + Number(process.argv[4] ?? 1);
    seed++
  ) {
    const team = (process.env.TEAM ?? 'joe').split(',')
    const members = process.env.OPTIMIZED
      ? team.map((key) => {
          if (key === 'daniela') {
            const chosen = [20, 18, 21, 17, 72, 16, 89, 92, 90, 94, 93, 91, 88, 22, 77]
            return {
              investigator: '12001',
              cards: [
                ...chosen.flatMap((n) => Array(2).fill(`12${String(n).padStart(3, '0')}`)),
                '12002',
                '12003',
                '12101',
              ],
            }
          }
          if (key !== 'joe') return key
          const chosen = [19, 20, 31, 34, 30, 16, 89, 39, 93, 92, 91, 90, 94, 38, 22]
          return {
            investigator: '12004',
            cards: [
              ...chosen.flatMap((n) => Array(2).fill(`12${String(n).padStart(3, '0')}`)),
              '12005',
              '12006',
              '12101',
            ],
          }
        })
      : team
    let campaign = {
      ...cards.newCampaign('brethren-of-ash', members, process.env.DIFFICULTY ?? 'easy'),
      scenarioIndex: Number(process.argv[3] ?? 0),
    }
    if (process.argv[5]) {
      const previous = JSON.parse(await readFile(process.argv[5], 'utf8'))
      const finished = previous.inputs.reduce(
        (s, input) => applyInput(s, input),
        cards.startScenario(previous.campaign, previous.seed),
      )
      campaign = cards.finishScenario(previous.campaign, finished)
    }
    const purchases = []
    if (process.env.UPGRADE) {
      for (const m of campaign.investigators) {
        for (const code of process.env.UPGRADE.split(',')) {
          const option = cards.purchaseOptions(campaign, m.id).find((o) => o.code === code)
          if (!option) continue
          const remove = option.needsRemoval
            ? cards.removableCards(campaign, m.id).at(-1)
            : undefined
          const options = option.replaces ? { upgrade: true } : remove ? { remove } : {}
          campaign = cards.purchase(campaign, m.id, code, options)
          purchases.push({ investigator: m.id, code, options })
        }
      }
    }
    let state = cards.startScenario(campaign, seed)
    const inputs = []
    const transcript = []
    for (let n = 0; n < 2000 && state.pending && !state.outcome; n++) {
      const p = state.pending
      const who = state.investigators.find((i) => i.id === p.investigator)
      const choices = p.question.choices
      let choice = 0
      if (p.question.prompt === 'prompt.mulligan')
        choice = choices.findIndex((c) => c.label === 'choice.keepHand')
      if (p.question.prompt === 'prompt.reaction') {
        const codex = choices.findIndex((c) => c.label === 'ability.codex')
        const heavy = choices.findIndex((c) => c.label === 'ability.heavyFightWith')
        const weapon = choices.findIndex((c) => c.label === 'ability.fightWith')
        if (codex >= 0) choice = codex
        else if (heavy >= 0) choice = heavy
        else if (weapon >= 0) choice = weapon
      }
      if (p.question.prompt === 'prompt.chooseEnemy' && process.env.ENDING === 'fight') {
        const elokoss = choices.findIndex((c) => c.params?.enemy === 'Elokoss')
        if (elokoss >= 0) choice = elokoss
      }
      if (['prompt.assignDamage', 'prompt.assignHorror'].includes(p.question.prompt))
        choice = choices.findIndex((c) => c.label === 'choice.assignToAsset')
      if (p.question.prompt === 'prompt.chooseSkill')
        choice = choices
          .map((c, index) => ({ index, value: who.skills[c.label.split('.').at(-1)] ?? 0 }))
          .sort((a, b) => b.value - a.value)[0].index
      if (p.question.prompt === 'prompt.commitCards') {
        const value = skillTestValue(state).total
        choice =
          value < state.skillTest.difficulty + 2
            ? choices.findIndex((c) => c.label === 'choice.commit')
            : choices.findIndex((c) => c.label === 'choice.revealToken')
        if (choice < 0) choice = choices.findIndex((c) => c.label === 'choice.revealToken')
        if (
          state.skillTest.kind.type === 'investigate' &&
          state.locations[who.location].clues > 1
        ) {
          const deduction = choices.findIndex(
            (c) => c.label === 'choice.commit' && c.params.card === 'Deduction',
          )
          if (deduction >= 0) choice = deduction
        }
        if (choices[choice]?.label === 'choice.commit') {
          const skill = choices.findIndex(
            (c) =>
              c.label === 'choice.commit' &&
              cards.playerCards.find((d) => d.name === c.params.card)?.type === 'skill',
          )
          if (skill >= 0) choice = skill
        }
      }
      if (p.question.prompt === 'prompt.chooseAction') {
        if (!process.env.QUIET)
          console.log(
            JSON.stringify({
              n,
              round: state.round,
              act: state.actIndex,
              doom: state.doom,
              at: who.location,
              clues: who.clues,
              hp: [who.damage, who.horror],
              choices: choices.map((c) => [c.label, c.params]),
            }),
          )
        let goal = state.actIndex === 1 || state.actIndex === 3 ? '12116' : '12120'
        function distance(from, to, seen = new Set()) {
          if (from === to) return 0
          if (seen.has(from)) return 99
          seen.add(from)
          return Math.min(
            99,
            ...(state.locations[from]?.connections ?? []).map(
              (l) => 1 + distance(l, to, new Set(seen)),
            ),
          )
        }
        if (
          state.actIndex === 2 &&
          state.investigators.reduce((n, i) => n + i.clues, 0) < 3 * state.startingInvestigatorCount
        )
          goal =
            Object.values(state.locations)
              .filter((l) => l.id !== '12117' && (l.clues > 0 || (!l.revealed && l.clueValue > 0)))
              .sort(
                (a, b) =>
                  distance(who.location, a.id) - distance(who.location, b.id) ||
                  a.shroud - b.shroud,
              )[0]?.id ?? goal
        const queen = state.scenarioId === 'queen-of-ash'
        const smoke = state.scenarioId === 'smoke-and-mirrors'
        const flood = process.env.ENDING === 'flood'
        const fightQueen = process.env.ENDING === 'fight'
        const players = state.startingInvestigatorCount
        const groupClues = state.investigators.reduce((sum, i) => sum + i.clues, 0)
        const clueGoal = (minimum) =>
          Object.values(state.locations)
            .filter((l) => l.id !== '12174' && (l.clues > 0 || (!l.revealed && l.clueValue > 0)))
            .sort(
              (a, b) =>
                distance(who.location, a.id) +
                a.shroud / 3 -
                (distance(who.location, b.id) + b.shroud / 3),
            )[0]?.id ?? minimum
        if (smoke) {
          const local = Object.values(state.enemies).filter((e) => e.location === who.location)
          const unresolved = Object.values(state.locations).filter((l) => l.beneath?.length)
          goal =
            groupClues < 2 * players && unresolved.length
              ? clueGoal(who.location)
              : (unresolved.sort(
                  (a, b) => distance(who.location, a.id) - distance(who.location, b.id),
                )[0]?.id ??
                Object.values(state.enemies).find((e) => e.traits?.includes('Elite'))?.location ??
                who.location)
          if (local.some((e) => e.traits?.includes('Elite'))) goal = who.location
        }
        if (queen) {
          goal = '12174'
          if (groupClues < (flood ? 4 : 3) * players && state.actIndex === 0)
            goal =
              Object.values(state.locations)
                .filter(
                  (l) => l.id !== '12174' && (l.clues > 0 || (!l.revealed && l.clueValue > 0)),
                )
                .sort(
                  (a, b) =>
                    distance(who.location, a.id) +
                      (a.id === '12183' ? 5 : 0) -
                      distance(who.location, b.id) -
                      (b.id === '12183' ? 5 : 0) || a.shroud - b.shroud,
                )[0]?.id ?? goal
          if (flood && state.actIndex > 0 && groupClues > 0) goal = '12175'
        }
        const engaged = Object.values(state.enemies).some(
          (e) => e.engagedWith === who.id && !e.exhausted,
        )
        const hasGun = Object.values(state.assets).some(
          (a) => a.owner === who.id && a.code === '12019',
        )
        function score(c) {
          if (smoke && process.env.RETREAT && c.label === 'ability.resign') return 1000
          if (
            !queen &&
            !smoke &&
            state.actIndex === 1 &&
            who.location === '12116' &&
            c.label === 'action.endTurn'
          )
            return 200
          const local = Object.values(state.enemies).filter((e) => e.location === who.location)
          const elite = local.find((e) => e.traits?.includes('Elite'))
          if (
            c.label === 'ability.discardTreachery' &&
            !engaged &&
            c.params?.card === 'Mark of Elokoss'
          )
            return 140
          const fireHere = Object.values(state.treacheries).some(
            (t) =>
              t.name === 'Fire!' &&
              t.placement.type === 'location' &&
              t.placement.location === who.location,
          )
          if (
            queen &&
            fightQueen &&
            c.label === 'action.play' &&
            ['Bodyguard', 'Resilience', 'Endurance'].includes(c.params?.card) &&
            !Object.values(state.assets).some(
              (a) =>
                a.owner === who.id &&
                cards.playerCards.find((d) => d.code === a.code)?.name === c.params.card,
            )
          )
            return 129
          if (
            queen &&
            fightQueen &&
            (c.label === 'ability.fightWith' || c.label === 'ability.heavyFightWith') &&
            c.params?.enemy === 'Elokoss' &&
            !fireHere
          )
            return c.label === 'ability.heavyFightWith' ? 121 : 118
          if (
            queen &&
            fightQueen &&
            state.actIndex > 0 &&
            fireHere &&
            who.clues < players &&
            (c.label === 'action.investigate' || c.label === 'ability.investigateWith')
          )
            return 135
          if (smoke) {
            if (c.label === 'ability.hospitalHeal' && who.damage >= 2) return 130
            if (
              engaged &&
              local.some((e) => e.engagedWith === who.id && !e.traits?.includes('Elite')) &&
              (c.label === 'ability.fightWith' || c.label === 'action.fight')
            )
              return 125
            if (c.label === 'ability.drawBeneath') return 115
            if (c.label === 'ability.parleyPay' || c.label === 'ability.parleyTest') return 112
            if (c.label === 'ability.evadeWith' && elite?.code === '12140') return 110
            if (c.label === 'action.evade' && elite?.code === '12140') return 104
            if (
              (elite?.code === '12139' || elite?.code === '12144') &&
              (c.label === 'action.investigate' || c.label === 'ability.investigateWith')
            )
              return 109
            if (c.label === 'ability.resign') return -200
          }
          if (
            queen &&
            state.actIndex === 0 &&
            groupClues < (flood ? 4 : 3) * players &&
            c.label === 'action.move' &&
            c.target.id === '12174'
          )
            return -100
          if (c.label === 'action.advanceAct' || c.label === 'ability.blazeDamage') return 100
          if (queen && !flood && !fightQueen && c.label === 'ability.weakenElokoss') return 110
          if (queen && fightQueen && c.label === 'ability.extinguish') return 120
          if (queen && flood && c.label === 'ability.openSluice') return 110
          if (queen && flood && state.actIndex > 0 && who.clues > 0 && c.label === 'action.move')
            return 105 - distance(c.target.id, goal)
          if (
            queen &&
            c.label === 'action.play' &&
            ['Fingerprint Kit', 'Dr. Henry Armitage', 'Dorothy Simmons'].includes(c.params?.card) &&
            !Object.values(state.assets).some(
              (a) => cards.playerCards.find((d) => d.code === a.code)?.name === c.params.card,
            )
          )
            return 92
          if (
            queen &&
            c.label === 'ability.investigateWith' &&
            state.locations[who.location]?.clues > 0
          )
            return 90
          if (
            queen &&
            c.label === 'action.investigate' &&
            state.locations[who.location]?.clues > 0 &&
            groupClues < (state.actIndex > 0 && !flood && !fightQueen ? 5 : 4) * players
          )
            return 80
          if (
            c.label === 'action.playFast' &&
            ((c.params?.card === 'Working a Hunch' && state.locations[who.location].clues > 0) ||
              c.params?.card === 'Magnifying Glass')
          )
            return 100
          if (
            c.label === 'action.play' &&
            c.params?.card === 'Bodyguard' &&
            who.damage >= 3 &&
            !Object.values(state.assets).some((a) => a.code === '12016')
          )
            return 86
          if (c.label === 'action.play' && c.params?.card === 'M1911' && !hasGun) return 90
          if (
            c.label === 'action.play' &&
            [
              "Daniela's Wrench",
              "Isabelle's Twin .45s",
              'M1903 Hammerless',
              "Thieves' Kit",
              'Cosmic Flame',
              'Second Sight',
              'Meat Cleaver',
              'Logan Hastings',
              'Aleksey Saburov',
              'Winchester Model 12',
              'Machete',
              'Sledgehammer',
              'Fingerprint Kit',
              'Magnifying Glass',
              'Emergency Cache',
              'Laboratory Assistant',
              'Dorothy Simmons',
              'Old Compass',
              'Hand-Crank Flashlight',
              'Resilience',
              'Endurance',
            ].includes(c.params?.card)
          ) {
            const def = cards.playerCards.find((d) => d.name === c.params.card)
            if (
              def?.type === 'event' ||
              !Object.values(state.assets).some((a) => a.owner === who.id && a.code === def?.code)
            )
              return 94
          }
          if ((smoke || queen) && c.label === 'ability.localMap') return 105
          if (!queen && c.label === 'action.move' && state.actIndex === 1)
            return 95 - distance(c.target.id, goal)
          if (
            (c.label === 'ability.fightWith' || c.label === 'ability.heavyFightWith') &&
            (engaged || (queen && fightQueen && local.length))
          )
            return 108
          if (c.label === 'action.fight' && engaged) return 75
          if (!queen && !smoke && c.label === 'ability.investigateWith')
            return state.locations[who.location]?.clues > 0 &&
              (state.actIndex === 0 || (state.actIndex === 2 && groupClues < 3 * players))
              ? 82 + (who.skills[c.params?.skill] ?? 0)
              : -10
          if (smoke && (c.label === 'action.investigate' || c.label === 'ability.investigateWith'))
            return state.locations[who.location]?.clues > 0 && groupClues < 2 * players ? 90 : -10
          if (c.label === 'action.investigate')
            return state.locations[who.location]?.clues > 0 &&
              (state.actIndex === 0 ||
                (state.actIndex === 2 &&
                  state.investigators.reduce((n, i) => n + i.clues, 0) <
                    3 * state.startingInvestigatorCount))
              ? 80
              : -10
          if (!smoke && !queen && who.location === goal && c.label === 'action.endTurn') return 65
          if (c.label === 'action.move') return 60 - distance(c.target.id, goal)
          if (c.label === 'ability.quadMove') return 70 - distance(c.target.id, goal)
          if (c.label === 'ability.heal' && who.damage >= 2) return 88
          if ((smoke || queen) && c.label === 'action.resource' && who.resources < 5) return 20
          if ((smoke || queen) && c.label === 'action.draw') return 15
          if (queen && fightQueen && c.label === 'action.fight' && local.length) return 78
          if (c.label === 'action.endTurn') return 0
          return -5
        }
        choice = choices
          .map((c, index) => ({ index, score: score(c) }))
          .sort((a, b) => b.score - a.score)[0].index
      }
      if (choice < 0) choice = 0
      inputs.push({ investigator: p.investigator, choice })
      transcript.push({
        prompt: p.question.prompt,
        label: choices[choice].label,
        params: choices[choice].params ?? null,
      })
      try {
        state = applyInput(state, inputs.at(-1))
      } catch (error) {
        await mkdir('docs-proyecto/evidencias', { recursive: true })
        await writeFile(
          `docs-proyecto/evidencias/error-${seed}.json`,
          JSON.stringify({ campaign, seed, inputs, transcript, error: error.message }, null, 2),
        )
        console.log({
          seed,
          n,
          prompt: p.question.prompt,
          choice: choices[choice],
          resources: who.resources,
        })
        throw error
      }
    }
    if (
      !process.env.QUIET ||
      process.env.RESULTS ||
      state.outcome?.type === 'resolution' ||
      seed % 100 === 0
    )
      console.log(
        JSON.stringify({
          seed,
          outcome: state.outcome,
          round: state.round,
          act: state.actIndex,
          size: inputs.length,
          resolved: [...state.victoryDisplay, ...(state.underAct ?? [])].filter(
            (c) => Number(c) >= 12138 && Number(c) <= 12144,
          ),
          beneath: Object.values(state.locations).filter((l) => l.beneath?.length).length,
        }),
      )
    if (
      (state.outcome?.type === 'resolution' &&
        (!process.env.WANT_RESOLUTION ||
          state.outcome.resolution === Number(process.env.WANT_RESOLUTION))) ||
      (process.env.SAVE_ANY && state.outcome)
    ) {
      await mkdir('docs-proyecto/evidencias', { recursive: true })
      await writeFile(
        `docs-proyecto/evidencias/${process.env.RECORD_PREFIX ?? ''}${state.scenarioId}-${seed}.json`,
        JSON.stringify(
          {
            scope:
              campaign.results.length === campaign.scenarioIndex
                ? 'campaign'
                : process.argv[5]
                  ? 'isolated-continuation'
                  : 'isolated-scenario',
            campaign,
            seed,
            purchases,
            inputs,
            transcript,
            outcome: state.outcome,
            log: state.campaignLog,
          },
          null,
          2,
        ),
      )
      break
    }
  }
} finally {
  await server.close()
}
