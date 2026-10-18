import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true },
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
    let campaign = {
      ...cards.newCampaign('brethren-of-ash', ['joe'], 'easy'),
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
    let state = cards.startScenario(campaign, seed)
    const inputs = []
    const transcript = []
    for (let n = 0; n < 500 && state.pending && !state.outcome; n++) {
      const p = state.pending
      const who = state.investigators.find((i) => i.id === p.investigator)
      const choices = p.question.choices
      let choice = 0
      if (p.question.prompt === 'prompt.mulligan')
        choice = choices.findIndex((c) => c.label === 'choice.keepHand')
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
        if (state.actIndex === 2 && who.clues < 3)
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
        if (queen) {
          goal = '12174'
          if (who.clues < 3 && state.actIndex === 0)
            goal =
              Object.values(state.locations)
                .filter(
                  (l) => l.id !== '12174' && (l.clues > 0 || (!l.revealed && l.clueValue > 0)),
                )
                .sort(
                  (a, b) =>
                    distance(who.location, a.id) - distance(who.location, b.id) ||
                    a.shroud - b.shroud,
                )[0]?.id ?? goal
          if (flood && state.actIndex > 0 && who.clues > 0) goal = '12175'
        }
        const engaged = Object.values(state.enemies).some(
          (e) => e.engagedWith === who.id && !e.exhausted,
        )
        const hasGun = Object.values(state.assets).some(
          (a) => a.owner === who.id && a.code === '12019',
        )
        function score(c) {
          if (
            queen &&
            state.actIndex === 0 &&
            who.clues < 3 &&
            c.label === 'action.move' &&
            c.target.id === '12174'
          )
            return -100
          if (c.label === 'action.advanceAct' || c.label === 'ability.blazeDamage') return 100
          if (queen && !flood && c.label === 'ability.weakenElokoss') return 110
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
          if (smoke && c.label === 'ability.resign') return 110
          if (
            queen &&
            c.label === 'action.investigate' &&
            state.locations[who.location]?.clues > 0 &&
            who.clues < 8
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
          if (!queen && c.label === 'action.move' && state.actIndex === 1)
            return 95 - distance(c.target.id, goal)
          if (c.label === 'ability.fightWith' && engaged && state.actIndex !== 1) return 85
          if (c.label === 'action.fight' && engaged) return 75
          if (c.label === 'action.investigate')
            return state.locations[who.location]?.clues > 0 &&
              (state.actIndex === 0 || (state.actIndex === 2 && who.clues < 3))
              ? 80
              : -10
          if (who.location === goal && c.label === 'action.endTurn') return 65
          if (c.label === 'action.move') return 60 - distance(c.target.id, goal)
          if (c.label === 'ability.quadMove') return 70 - distance(c.target.id, goal)
          if (c.label === 'ability.heal' && who.damage >= 2) return 88
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
    if (!process.env.QUIET || state.outcome?.type === 'resolution' || seed % 100 === 0)
      console.log(
        JSON.stringify({
          seed,
          outcome: state.outcome,
          round: state.round,
          act: state.actIndex,
          size: inputs.length,
        }),
      )
    if (state.outcome?.type === 'resolution' || (process.env.SAVE_ANY && state.outcome)) {
      await mkdir('docs-proyecto/evidencias', { recursive: true })
      await writeFile(
        `docs-proyecto/evidencias/${state.scenarioId}-${seed}.json`,
        JSON.stringify(
          { campaign, seed, inputs, transcript, outcome: state.outcome, log: state.campaignLog },
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
