// Textos oficiales de la guía aportada, contrastados con sus pp. 3–6.
// Solo añade las claves de Carcosa; conserva las otras campañas.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const target = 'apps/web/public/local-assets/story'
const paragraphs = (html) =>
  [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
    .map(([, text]) =>
      text
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\u00ad/g, '')
        .trim(),
    )
    .filter(Boolean)
    .map((text) => `_${text.replace(/_/g, '')}_`)
    .join('\n\n')

for (const locale of ['en', 'es']) {
  const source = join(reference, 'frontend/src/locales', locale, 'thePathToCarcosa')
  const base = JSON.parse(readFileSync(join(source, 'base.json'), 'utf8'))
  const scenario = JSON.parse(readFileSync(join(source, 'scenarios/curtainCall.json'), 'utf8'))
  const path = join(target, `${locale}.json`)
  const texts = JSON.parse(readFileSync(path, 'utf8'))
  texts['story.carcosa.prologue'] = paragraphs(base.prologue.body)
  texts['story.carcosa.lolaPrologue'] = paragraphs(base.prologue.lola)
  texts['story.curtainCall.intro'] = paragraphs(scenario.intro.body)
  for (const key of ['noResolution', 'resolution1', 'resolution2'])
    texts[`story.curtainCall.${key}`] = paragraphs(scenario.resolutions[key].body)
  writeFileSync(path, JSON.stringify(texts, null, 2) + '\n')
  console.log(`${locale}: seis relatos importados; las instrucciones se presentan como efectos.`)
}
