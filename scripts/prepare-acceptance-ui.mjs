// Creates import files and the expected visible choices for a UI replay.
// It never drives the browser or changes the user's saved session.
import { createServer } from '../apps/web/node_modules/vite/dist/node/index.js'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
const require = createRequire(new URL('../apps/web/package.json', import.meta.url))
const { createI18n } = await import(pathToFileURL(require.resolve('vue-i18n')).href)
const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false },
})
try {
  const cards = await server.ssrLoadModule('/packages/cards/src/index.ts')
  const { applyInput } = await server.ssrLoadModule('/packages/engine/src/index.ts')
  const { session, decodeSession } = await server.ssrLoadModule('/apps/web/src/game/session.ts')
  const { markOf } = await server.ssrLoadModule('/apps/web/src/game/undo.ts')
  const { messages } = await server.ssrLoadModule('/packages/i18n/src/index.ts')
  const { t } = createI18n({ legacy: false, locale: 'en', messages }).global
  const folder = process.argv[2]
  if (!folder) throw new Error('Output folder required')
  await mkdir(folder, { recursive: true })
  const files = [
    'duo-normal-spreading-flames-286',
    'duo-normal-smoke-and-mirrors-1',
    'duo-normal-queen-of-ash-23',
  ]
  for (const [index, file] of files.entries()) {
    const record = JSON.parse(await readFile(`docs-proyecto/evidencias/${file}.json`, 'utf8'))
    let state = cards.startScenario(record.campaign, record.seed)
    const base = state
    const steps = []
    for (const input of record.inputs) {
      const q = state.pending.question
      const label = (c) => {
        const p = { ...c.params }
        if (p.skill) p.skill = t(`skill.${p.skill}`)
        if (p.phase) p.phase = t(`phase.${p.phase}`)
        if (p.scenario) p.scenario = t(`campaign.scenario.${p.scenario}`)
        if (p.kind === 'damage' || p.kind === 'horror') p.kind = t(`damageKind.${p.kind}`)
        return typeof p.n === 'number' ? t(c.label, p, p.n) : t(c.label, p)
      }
      steps.push({
        prompt: q.prompt,
        story: !!q.story,
        choice: input.choice,
        choices: q.choices.map((c) => ({ label: c.label, text: label(c), target: !!c.target })),
      })
      state = applyInput(state, input)
    }
    const initial = session(base, { base, inputs: [], marks: [markOf(base)] }, record.campaign)
    decodeSession(JSON.stringify(initial))
    await writeFile(
      `${folder}/normal-ui-${index}.json`,
      JSON.stringify({ initial, steps, outcome: state.outcome, log: state.campaignLog }),
    )
  }
} finally {
  await server.close()
}
