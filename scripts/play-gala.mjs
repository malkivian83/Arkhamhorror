// Legal input-only acceptance runner. Never mutates a game state or its RNG.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { writeFile, mkdir } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const engine = await server.ssrLoadModule('/packages/engine/src/index.ts')
  const faction = process.argv[2] ?? 'miskatonic'
  const firstSeed = Number(process.argv[3] ?? 1)
  const attempts = Number(process.argv[4] ?? 1)
  const members = (process.argv[5] ?? 'trish').split(',')
  function pick(s) {
    const q = s.pending.question,
      choices = q.choices
    const me = s.investigators.find((i) => i.id === s.pending.investigator)
    const find = (label) => choices.findIndex((c) => c.label === label)
    const mine = Object.values(s.assets).filter((a) => a.owner === me?.id)
    const jewel = mine.some((a) => a.code === '71052')
    const total = s.investigators.reduce((n, i) => n + i.clues, 0)
    const chooseBestSkill = () =>
      choices.reduce(
        (best, c, n) =>
          (me?.skills[c.params?.skill ?? c.label.split('.').at(-1)] ?? -1) >
          (me?.skills[choices[best]?.params?.skill ?? choices[best]?.label.split('.').at(-1)] ?? -1)
            ? n
            : best,
        0,
      )
    if (q.prompt === 'prompt.chooseAction') {
      const here = s.locations[me.location]
      const ownGuest = mine.some((a) => /^710(1[6-9]|2[2-5]|[34][0-9])$/.test(a.code))
      const enemies = Object.values(s.enemies).filter(
        (e) => e.location === me.location && !e.exhausted && e.engagedWith === me.id,
      )
      const weapon = choices.findIndex(
        (c) =>
          c.label === 'action.play' &&
          ['Machete', '.45 Automatic', 'Broken Bottle'].includes(c.params?.card),
      )
      if (
        (faction === 'foundation' || faction === 'kingsport') &&
        !mine.some((a) => engine.playerCardDef(a.code)?.traits.includes('Weapon')) &&
        weapon >= 0
      )
        return weapon
      const priority = [
        'choice.gala.completeObjective',
        'action.advanceAct',
        'ability.gala.convinceDeclan',
        'ability.gala.drawMystery',
        'ability.gala.takeJewel',
        'ability.gala.purgeJewel',
      ]
      for (const label of priority) {
        const n = find(label)
        if (n >= 0) return n
      }
      if (s.actIndex > 0 && (faction === 'foundation' || faction === 'kingsport')) {
        const target = Object.values(s.enemies).find((e) =>
          faction === 'foundation' ? e.code.startsWith('71045') : e.code === '71051',
        )
        if (target?.location === me.location) {
          const ability = choices.findIndex(
            (c) =>
              c.target?.id === target.id &&
              [
                'ability.fightWith',
                'ability.gala.callahanFight',
                'ability.gala.novaFight',
                'ability.gala.sarahFight',
              ].includes(c.label),
          )
          if (ability >= 0) return ability
          const n = choices.findIndex(
            (c) => c.label === 'action.fight' && c.target?.id === target.id,
          )
          if (n >= 0) return n
          const engage = choices.findIndex(
            (c) => c.label === 'action.engage' && c.target?.id === target.id,
          )
          if (engage >= 0) return engage
        }
      }
      if (enemies.length && find('action.evade') >= 0) return find('action.evade')
      if (s.actIndex > 0 && faction === 'lodge' && !jewel && find('ability.gala.senseJewel') >= 0)
        return find('ability.gala.senseJewel')
      if (!ownGuest && find('ability.gala.parleyGuest') >= 0) {
        const options = choices
          .map((c, n) => ({ c, n }))
          .filter((x) => x.c.label === 'ability.gala.parleyGuest')
        return options.sort((a, b) => me.skills[b.c.params.skill] - me.skills[a.c.params.skill])[0]
          .n
      }
      const needed =
        s.actIndex === 0
          ? 7 * s.investigators.length
          : faction === 'miskatonic'
            ? 3 * s.investigators.length
            : { foundation: 2, syndicate: 4, lodge: 5, kingsport: 3 }[faction] *
              s.investigators.length
      const glass = choices.findIndex(
        (c) => c.label === 'action.playFast' && c.params?.card === 'Magnifying Glass',
      )
      if (glass >= 0) return glass
      if (total < needed && here.clues > 0) {
        if (find('ability.gala.nameACard') >= 0) return find('ability.gala.nameACard')
        if (find('action.investigate') >= 0) return find('action.investigate')
      }
      const targets = []
      if (s.actIndex > 0 && !jewel && (faction === 'foundation' || faction === 'kingsport')) {
        const target = Object.values(s.enemies).find((e) =>
          faction === 'foundation' ? e.code.startsWith('71045') : e.code === '71051',
        )
        targets.push(target?.location ?? '71008')
        const placed = Object.values(s.placedAssets ?? {}).find((p) => p.code === '71052')
        if (placed?.placement.type === 'location') targets.unshift(placed.placement.location)
      }
      if (s.actIndex > 0 && !jewel && faction === 'miskatonic') {
        const d = Object.values(s.enemies).find((e) => e.code === '71051')
        if (d && total >= needed) targets.push(d.location)
      }
      if (s.actIndex > 0 && !jewel && faction === 'syndicate')
        targets.push(
          ...Object.values(s.locations)
            .filter((l) => (l.beneath?.length ?? 0) > 0)
            .map((l) => l.id),
        )
      if (!ownGuest)
        for (const p of Object.values(s.placedAssets ?? {}))
          if (p.placement.type === 'location' && !p.faceDown && engine.playerCardDef(p.code)?.icons)
            targets.push(p.placement.location)
      if (total < needed)
        targets.push(
          ...Object.values(s.locations)
            .filter((l) => l.clues > 0 || !l.revealed)
            .sort((a, b) => a.shroud - b.shroud)
            .map((l) => l.id),
        )
      if (jewel && faction === 'syndicate') targets.unshift('71007')
      const moves = choices.map((c, n) => ({ c, n })).filter((x) => x.c.label === 'action.move')
      for (const target of targets) {
        if (target === me.location) continue
        const queue = [[me.location, []]],
          seen = new Set()
        while (queue.length) {
          const [at, path] = queue.shift()
          if (seen.has(at)) continue
          seen.add(at)
          if (at === target) {
            const move = moves.find((x) => x.c.target.id === path[0])
            if (move) return move.n
            break
          }
          for (const next of s.locations[at]?.connections ?? [])
            if (s.locations[next]) queue.push([next, [...path, next]])
        }
      }
      if (find('ability.gala.parleyGuest') >= 0 && mine.length < 4) {
        const n = choices.findIndex(
          (c) => c.label === 'ability.gala.parleyGuest' && me.skills[c.params.skill] >= 4,
        )
        if (n >= 0) return n
      }
      return Math.max(0, find('action.endTurn'))
    }
    if (q.prompt === 'prompt.chooseSkill') return chooseBestSkill()
    if (q.prompt === 'prompt.gala.takeJewel' && faction === 'kingsport') {
      const p = Object.values(s.placedAssets ?? {}).find((a) => a.code === '71052')
      return find(p && (p.damage > 0 || p.doom > 0) ? 'choice.skip' : 'choice.gala.takeJewel')
    }
    if (q.prompt === 'prompt.assignHorror' || q.prompt === 'prompt.assignDamage') {
      const n = choices.findIndex((c) => c.target?.type === 'asset')
      if (n >= 0) return n
    }
    if (q.prompt === 'prompt.commitCards') {
      const test = s.skillTest
      const committed = (test?.committed ?? []).reduce(
        (n, c) => n + (typeof c === 'object' ? (c.icons ?? 0) : 0),
        0,
      )
      if (test && committed < 3) {
        const n = choices.findIndex((c) => c.label === 'choice.commit' && c.params?.icons >= 2)
        if (n >= 0) return n
      }
      return Math.max(0, find('choice.revealToken'))
    }
    if (q.prompt === 'prompt.gala.sensed') {
      if (q.promptParams?.card === 'Jewel of Sarnath') return find('choice.gala.drawIt')
      return find('choice.gala.leaveDiscarded')
    }
    const priorities = [
      `story.midwinterGala.contactChoice.${faction}`,
      'choice.gala.completeObjective',
      'choice.keepHand',
      'choice.applyResults',
      'choice.revealToken',
      'choice.skip',
    ]
    for (const label of priorities) {
      const n = find(label)
      if (n >= 0) return n
    }
    return 0
  }
  for (let seed = firstSeed; seed < firstSeed + attempts; seed++) {
    const campaign = cards.newCampaign('the-midwinter-gala', members, 'standard', seed)
    let state = cards.startScenario(campaign, seed)
    const inputs = [],
      transcript = []
    for (let n = 0; state.pending && !state.outcome && n < 1500; n++) {
      const choice = pick(state),
        q = state.pending.question,
        c = q.choices[choice]
      const input = { investigator: state.pending.investigator, choice }
      if (process.env.GALA_TRACE && n < 100)
        console.log(
          JSON.stringify({
            n,
            round: state.round,
            at: state.investigators[0].location,
            prompt: q.prompt,
            choices: q.choices.map((c) => ({ label: c.label, params: c.params, target: c.target })),
            choice,
          }),
        )
      transcript.push({ prompt: q.prompt, label: c.label, params: c.params ?? null })
      inputs.push(input)
      state = engine.applyInput(state, input)
    }
    console.log(
      JSON.stringify({
        seed,
        faction,
        members,
        decisions: inputs.length,
        outcome: state.outcome,
        act: state.actIndex,
        round: state.round,
        investigators: state.investigators.map((i) => ({
          id: i.id,
          clues: i.clues,
          damage: i.damage,
          horror: i.horror,
        })),
        last: transcript.slice(-8),
      }),
    )
    if (state.outcome?.type === 'resolution') {
      await mkdir('docs-proyecto/evidencias', { recursive: true })
      await writeFile(
        `docs-proyecto/evidencias/gala-${faction}-${seed}.json`,
        JSON.stringify(
          {
            scope: 'full-scenario',
            campaign,
            seed,
            inputs,
            transcript,
            outcome: state.outcome,
            log: state.campaignLog,
          },
          null,
          2,
        ) + '\n',
      )
      break
    }
  }
} finally {
  await server.close()
}
