#!/usr/bin/env node
/**
 * Copia las imágenes de fichas (bolsa del caos, recursos, pistas, daño, horror,
 * perdición) y los reversos de carta desde la copia local del proyecto de referencia a
 * apps/web/public/local-assets/.
 *
 * Son material de Fantasy Flight Games. El repositorio es privado y de uso
 * personal, así que van incluidas; el script sirve para actualizarlas. Si
 * faltan, la mesa dibuja las fichas por su cuenta.
 *
 * Uso: node scripts/copy-reference-tokens.mjs [ruta-del-proyecto-de-referencia]
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const reference = process.argv[2] ?? 'E:/referencia/ArkhamHorror'
const source = join(reference, 'frontend/public/img/arkham')
const target = fileURLToPath(new URL('../apps/web/public/local-assets/', import.meta.url))

if (!existsSync(source)) {
  console.error(`No se encuentra ${source}`)
  process.exit(1)
}

/** destino → origen (relativo a img/arkham). */
const files = {
  'chaos/plus1.png': 'chaos-tokens/ct-plus1.png',
  'chaos/0.png': 'chaos-tokens/ct-0.png',
  ...Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8].map((n) => [`chaos/minus${n}.png`, `chaos-tokens/ct-minus${n}.png`]),
  ),
  'chaos/skull.png': 'chaos-tokens/ct-skull.png',
  'chaos/cultist.png': 'chaos-tokens/ct-cultist.png',
  'chaos/tablet.png': 'chaos-tokens/ct-tablet.png',
  'chaos/elderThing.png': 'chaos-tokens/ct-elderthing.png',
  'chaos/elderSign.png': 'chaos-tokens/ct-eldersign.png',
  'chaos/autoFail.png': 'chaos-tokens/ct-autofail.png',
  'chaos/bless.png': 'chaos-tokens/ct-bless.png',
  'chaos/curse.png': 'chaos-tokens/ct-curse.png',
  'chaos/frost.png': 'chaos-tokens/ct-frost.png',
  'tokens/resource.png': 'tokens/resource.png',
  'tokens/clue.png': 'tokens/clue.png',
  'tokens/damage.png': 'tokens/damage-token.png',
  'tokens/horror.png': 'tokens/horror-token.png',
  'tokens/doom.png': 'tokens/doom.png',
  'backs/encounter.jpg': 'backs/back_encounter.jpg',
  'backs/player.jpg': 'backs/back_player.jpg',
}

let copied = 0
for (const [to, from] of Object.entries(files)) {
  const src = join(source, from)
  if (!existsSync(src)) {
    console.warn(`Falta ${from}`)
    continue
  }
  const dest = join(target, to)
  mkdirSync(join(dest, '..'), { recursive: true })
  copyFileSync(src, dest)
  copied++
}
console.log(`${copied} imágenes copiadas en ${target}`)
