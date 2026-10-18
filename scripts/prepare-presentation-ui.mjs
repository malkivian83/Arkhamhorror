// Builds local, validated imports. Does not drive a browser or alter user saves.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const engine = await server.ssrLoadModule('/packages/engine/src/index.ts')
  const { during } = await server.ssrLoadModule('/packages/engine/src/testing.ts')
  const { session, decodeSession } = await server.ssrLoadModule('/apps/web/src/game/session.ts')
  const { markOf } = await server.ssrLoadModule('/apps/web/src/game/undo.ts')
  const folder = process.argv[2]
  if (!folder) throw new Error('Output folder required')
  await mkdir(folder, { recursive: true })
  async function save(name, state, history, campaign, extra = {}) {
    const initial = session(state, history, campaign)
    decodeSession(JSON.stringify(initial))
    await writeFile(`${folder}/${name}.json`, JSON.stringify({ initial, ...extra }))
  }
  const found = new Set()
  for (const file of ['duo-normal-spreading-flames-286', 'equipo-normal-spreading-flames-278']) {
    const record = JSON.parse(await readFile(`docs-proyecto/evidencias/${file}.json`, 'utf8'))
    let state = cards.startScenario(record.campaign, record.seed)
    const base = state
    const inputs = []
    const marks = [markOf(base)]
    for (const input of record.inputs) {
      const next = engine.applyInput(state, input)
      const events = next.log.slice(state.log.length)
      for (const [name, key] of [
        ['ui-agenda', 'log.agendaAdvanced'],
        ['ui-act', 'log.actAdvanced'],
        ['ui-draw', 'log.encounter'],
        ['ui-secrets', 'log.encounter'],
      ]) {
        if (
          found.has(name) ||
          !events.some(
            (event) =>
              event.key === key && (name !== 'ui-secrets' || event.params?.code === '12126'),
          )
        )
          continue
        await save(name, state, { base, inputs: [...inputs], marks: [...marks] }, record.campaign, {
          source: file,
          prefix: inputs.length,
          input,
          choice: state.pending.question.choices[input.choice],
        })
        found.add(name)
      }
      inputs.push(input)
      marks.push(markOf(next))
      state = next
      if (found.size === 4) break
    }
    if (found.size === 4) break
  }
  const campaign = cards.newCampaign('brethren-of-ash', ['joe'], 'standard')
  let state = cards.startScenario(campaign, 8)
  while (state.pending && state.pending.question.prompt !== 'prompt.chooseAction') {
    const choices = state.pending.question.choices
    const keep = choices.findIndex(
      (c) => c.label === 'choice.keepHand' || c.label === 'choice.skip',
    )
    state = engine.applyInput(state, {
      investigator: state.pending.investigator,
      choice: Math.max(0, keep),
    })
  }
  const me = state.investigators[0]
  const enemy = state.encounterDeck.find((c) => c.kind === 'enemy' && !c.keywords.includes('aloof'))
  state = during(
    state,
    (s) => ({ ...s, investigators: s.investigators.map((i) => ({ ...i, resources: 5 })) }),
    { type: 'PutAssetIntoPlay', investigator: me.id, code: '12017' },
    { type: 'SpawnEnemy', card: enemy, location: me.location, engageWith: me.id },
  )
  const evade = state.pending.question.choices.findIndex((c) => c.label === 'action.evade')
  state = engine.applyInput(state, { investigator: me.id, choice: evade })
  await save('ui-endurance', state, { base: state, inputs: [], marks: [markOf(state)] }, null, {
    scope: 'directed-fixture',
    note: 'Mesa dirigida para probar Aguante. No es una partida de aceptación completa.',
  })
  console.log(JSON.stringify({ output: folder, fixtures: [...found, 'ui-endurance'] }))
} finally {
  await server.close()
}
