// Relatos de El encuentro. ES: guía revisada aportada, pp. 1–3; EN: copia externa.
// Solo narración: se omiten instrucciones, encabezados y recompensas.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const reference = process.argv[2] ?? 'D:/referencia/ArkhamHorror-main'
const spanish = {
  'story.zealot.prologue': `Viernes, 18 de septiembre de 1925. Arkham, Massachusetts. Es el final de un largo y anormalmente caluroso verano. Las primeras señales del otoño empiezan a aparecer, pero persiste un sofocante e implacable calor. Una ira silenciosa e impalpable atenaza la ciudad. El mal genio está a flor de piel, y sólo en la última semana ha habido numerosas discusiones entre habitantes de la ciudad que han acabado en violentas peleas por simples malentendidos.

Y ahora ha llamado James Hankerson. Afirma haber encontrado un cuerpo desmembrado en su granero.

Sería demasiado fácil echarle la culpa al tiempo. A esta ciudad le pasa algo, y este viejo adivino poco puede hacer para detener su caída. Mis augurios indican que un pequeño grupo de investigadores se reunirá para arreglar las cosas. Estaré observando sus progresos... pero no tengo muchas esperanzas.`,
  'story.theGathering.intro': `Tus compañeros y tú habéis estado investigando los extraños sucesos que están teniendo lugar en vuestra ciudad natal de Arkham, en Massachusetts. Durante las últimas semanas, varios habitantes de la ciudad han desaparecido misteriosamente. Y hace poco aparecieron sus cadáveres en el bosque, medio devorados y salvajemente mutilados. La policía y los periódicos han dicho que ha sido obra de animales, pero creéis que hay algo más en marcha. Os habéis reunido en casa del investigador jefe para deliberar sobre estos misteriosos acontecimientos.`,
  'story.theGathering.noResolution': `Apenas lográis escapar con vida de tu casa. La mujer de la salita os sigue por la puerta delantera y la cierra de un portazo.

—¡Necios! ¿Veis lo que habéis hecho? —dice mientras apoya una silla contra la puerta y la mete bajo el picaporte—. Debemos salir de aquí. Venid conmigo y os diré lo que sé. Somos los únicos que podemos evitar que desaten contra la ciudad la amenaza que acecha bajo ella.

No estáis en condiciones de replicar, así que asentís y seguís a la mujer mientras sale corriendo del porche delantero en dirección al Barrio Fluvial, bajo la lluvia.`,
  'story.theGathering.resolution1': `Asientes y permites que la mujer pelirroja prenda fuego a las paredes y suelos de tu casa. Las llamas se extienden rápidamente, y salís corriendo por la puerta delantera para evitar quedar atrapados en ese infierno. Desde la acera, observáis cómo el fuego consume todo lo que posees.

—Venid conmigo —dice la mujer—. Debéis conocer la amenaza que acecha debajo. Si no colaboramos, estamos perdidos sin remedio... pero juntos podremos detenerla.`,
  'story.theGathering.resolution2': `Te niegas a seguir la orden de la fanática y la echas de tu casa por miedo a que le prenda fuego sin tu permiso.

—¡Necios! ¡Estáis cometiendo un funesto error! —os advierte—. No entendéis la amenaza que acecha debajo... ¡ni el grave peligro que corremos todos!

Aún conmocionados por los acontecimientos de la noche, decidís escuchar a la mujer. Quizás pueda arrojar algo de luz sobre estos extraños sucesos... pero no parece confiar demasiado en vosotros.`,
  'story.theGathering.resolution3': `Corréis al pasillo para tratar de encontrar una forma de huir de la casa, pero la ardiente barrera sigue bloqueando vuestro camino. Estáis atrapados, y la horda de salvajes criaturas que han invadido tu casa se acerca, sin que tengáis posibilidad de huir.`,
}
const paragraphs = (html) =>
  (/<p\b/i.test(html)
    ? [...html.matchAll(/<p\b[^>]*>([\s\S]*?)(?:<\/p>|(?=<p\b)|$)/g)]
    : [[null, html]]
  )
    .map(([, text]) =>
      text
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/^_?(?:Resolution \d+|(?:If )?no resolution[^:]*):_?\s*/i, '')
        .replace(/[_*]/g, '')
        .trim(),
    )
    .filter(Boolean)
    .map((text) => `_${text}_`)
    .join('\n\n')
const base = JSON.parse(
  readFileSync(join(reference, 'frontend/src/locales/en/nightOfTheZealot/base.json'), 'utf8'),
)
const scenario = JSON.parse(
  readFileSync(
    join(reference, 'frontend/src/locales/en/nightOfTheZealot/scenarios/theGathering.json'),
    'utf8',
  ),
)
const english = {
  'story.zealot.prologue': paragraphs(base.prologue),
  'story.theGathering.intro': paragraphs(scenario.intro.body),
}
for (const key of ['noResolution', 'resolution1', 'resolution2', 'resolution3'])
  english[`story.theGathering.${key}`] = paragraphs(scenario.resolutions[key].body)
for (const [locale, entries] of [
  [
    'es',
    Object.fromEntries(
      Object.entries(spanish).map(([key, text]) => [
        key,
        text
          .split('\n\n')
          .map((p) => `_${p}_`)
          .join('\n\n'),
      ]),
    ),
  ],
  ['en', english],
]) {
  const path = `apps/web/public/local-assets/story/${locale}.json`
  const texts = JSON.parse(readFileSync(path, 'utf8'))
  for (const [key, text] of Object.entries(entries)) {
    if (!text || /<[^>]+>|\{\w+\}/.test(text)) throw new Error(`Invalid narrative ${locale}/${key}`)
    texts[key] = text
  }
  writeFileSync(path, JSON.stringify(texts, null, 2) + '\n')
}
