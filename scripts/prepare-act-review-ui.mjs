// Validated QA imports. They are imported through the normal UI, never injected into a browser store.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const folder = process.argv[2]
  if (!folder) throw new Error('Output directory required')
  await mkdir(folder, { recursive: true })
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const engine = await server.ssrLoadModule('/packages/engine/src/index.ts')
  const testing = await server.ssrLoadModule('/packages/engine/src/testing.ts')
  const saves = await server.ssrLoadModule('/apps/web/src/game/session.ts')
  const reviews = await server.ssrLoadModule('/apps/web/src/game/advanceReview.ts')
  const { markOf } = await server.ssrLoadModule('/apps/web/src/game/undo.ts')
  const record = JSON.parse(await readFile(`${folder}/ui-act.json`, 'utf8'))
  const examples = [
    {
      name: 'brethren',
      initial: record.initial,
      input: record.input,
      scope: `Legal prefix: ${record.source}, ${record.prefix} inputs`,
    },
  ]
  let state = testing.throughSetup(
    cards.startScenario(cards.newCampaign('the-midwinter-gala', ['joe'], 'standard'), 13),
  )
  state = testing.during(
    state,
    (s) => ({
      ...s,
      agendaIndex: 1,
      investigators: s.investigators.map((i) => ({ ...i, clues: 5 })),
    }),
    { type: 'PutAssetIntoPlay', investigator: '12004', code: '71017' },
  )
  examples.push({
    name: 'gala',
    initial: saves.session(state, { base: state, inputs: [], marks: [markOf(state)] }, null),
    input: {
      investigator: state.pending.investigator,
      choice: state.pending.question.choices.findIndex((c) => c.label === 'action.advanceAct'),
    },
    scope: 'Directed table with registered cards; not a legal campaign recording',
  })
  for (const example of examples) {
    saves.decodeSession(JSON.stringify(example.initial))
    const collector = reviews.createAdvanceReview(example.initial.state)
    const after = engine.applyInput(example.initial.state, example.input, collector.observe)
    const frames = collector.finish(after)
    await writeFile(
      `${folder}/review-${example.name}.json`,
      JSON.stringify({
        ...example,
        frames,
        resumeFrames: reviews.resumedAdvanceReview(example.initial.state),
        afterActIndex: after.actIndex,
        afterPrompt: after.pending?.question.prompt,
      }),
    )
    console.log(
      JSON.stringify({
        name: example.name,
        frames: frames.map((f) => f.stage),
        afterActIndex: after.actIndex,
      }),
    )
  }
} finally {
  await server.close()
}
