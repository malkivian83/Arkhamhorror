// Textos oficiales de la guía aportada, contrastados con sus pp. 3–12, y de las cartas de
// Historia de El Último Rey. Solo añade las claves de Carcosa; conserva las otras campañas.
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
  // El Último Rey e Interludio I: solo la narración; las instrucciones son efectos.
  const lastKing = JSON.parse(readFileSync(join(source, 'scenarios/theLastKing.json'), 'utf8'))
  texts['story.theLastKing.intro'] = paragraphs(lastKing.intro.body)
  for (const n of [1, 2, 3])
    texts[`story.theLastKing.resolution${n}`] = paragraphs(
      lastKing.resolutions[`resolution${n}`].body,
    )
  for (const n of [1, 2, 3])
    texts[`story.theLastKing.lunacysReward${n}`] = paragraphs(base.interlude1[`lunacysReward${n}`])
  // Reversos de Historia de los Transeúntes y Realidades repulsivas: su texto de ambientación.
  const cards = new Map(
    JSON.parse(readFileSync(join(reference, `frontend/public/cards_${locale}.json`), 'utf8')).map(
      (card) => [card.code, card],
    ),
  )
  const VIPS = [
    ['Constance', '03076b', '03065'],
    ['Jordan', '03077b', '03066'],
    ['Haruko', '03078b', '03067'],
    ['Sebastien', '03079b', '03068'],
    ['Ashleigh', '03080b', '03069'],
  ]
  for (const [key, interview, sickening] of VIPS) {
    texts[`story.theLastKing.interview${key}`] = paragraphs(`<p>${cards.get(interview).flavor}</p>`)
    texts[`story.theLastKing.sickening${key}`] = paragraphs(`<p>${cards.get(sickening).flavor}</p>`)
  }
  // Ecos del pasado: introducción, Información de Sebastien y resoluciones.
  const echoes = JSON.parse(readFileSync(join(source, 'scenarios/echoesOfThePast.json'), 'utf8'))
  texts['story.echoes.intro'] = paragraphs(echoes.intro.body)
  texts['story.echoes.sebastien'] = paragraphs(echoes.intro.sebastiensInformation)
  // "Sin resolución" no lleva párrafos: es una sola frase dentro del bloque de resolución.
  texts['story.echoes.noResolution'] = paragraphs(
    `<p>${echoes.resolutions.noResolution.body.replace(/<\/?div[^>]*>/g, '')}</p>`,
  )
  for (const n of [1, 2, 3, 4])
    texts[`story.echoes.resolution${n}`] = paragraphs(echoes.resolutions[`resolution${n}`].body)
  writeFileSync(path, JSON.stringify(texts, null, 2) + '\n')
  console.log(`${locale}: relatos de los escenarios I a III importados.`)
}
