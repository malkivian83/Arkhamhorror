#!/usr/bin/env node
/**
 * Importa de ArkhamDB los datos numéricos de las cartas de jugador de la caja
 * básica de 2026 y los guarda en packages/cards/src/data/core-2026.json.
 *
 * Solo se guardan datos de juego (coste, iconos, ranuras, salud, cordura,
 * rasgos, nombre…). El texto de las cartas NO se guarda: las imágenes y el texto
 * se muestran en la web cargándolos de ArkhamDB al vuelo.
 *
 * Uso: node scripts/import-core-2026.mjs
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://arkhamdb.com/api/public/cards/core_2026.json'
const OUTPUT = fileURLToPath(new URL('../packages/cards/src/data/core-2026.json', import.meta.url))

const response = await fetch(SOURCE)
if (!response.ok) throw new Error(`ArkhamDB respondió ${response.status}`)
const cards = await response.json()

const split = (traits) =>
  (traits ?? '')
    .split('.')
    .map((t) => t.trim())
    .filter(Boolean)

const SLOT_NAMES = {
  Hand: 'hand',
  Arcane: 'arcane',
  Accessory: 'accessory',
  Body: 'body',
  Ally: 'ally',
  Head: 'head',
}
const slots = (slot) => {
  if (!slot) return []
  return slot.split('.').flatMap((part) => {
    const trimmed = part.trim()
    if (!trimmed) return []
    const [, double, name] = trimmed.match(/^(?:(Hand|Arcane) x2|(.+))$/) ?? []
    if (double) return [SLOT_NAMES[double], SLOT_NAMES[double]]
    return [SLOT_NAMES[name ?? trimmed]]
  })
}

/** Palabras clave derivadas del texto (se guarda el dato, no el texto). */
const keywords = (text = '') => {
  const result = {}
  // Palabra clave "Fast." (se juega sin gastar acción); no confundir con habilidades [fast].
  if (/^Fast\./m.test(text)) result.fast = true
  const uses = text.match(/Uses \((\d+) ([a-z]+)\)/i)
  if (uses) result.uses = { count: Number(uses[1]), type: uses[2].toLowerCase() }
  if (/Max 1 committed per skill test/i.test(text)) result.commitLimit = 1
  return result
}

const icons = (c) =>
  Object.fromEntries(
    [
      ['willpower', c.skill_willpower],
      ['intellect', c.skill_intellect],
      ['combat', c.skill_combat],
      ['agility', c.skill_agility],
      ['wild', c.skill_wild],
    ].filter(([, v]) => v),
  )

const player = cards
  .filter((c) => c.position < 105)
  .sort((a, b) => a.position - b.position)
  .map((c) => {
    const base = {
      code: c.code,
      position: c.position,
      name: c.name,
      ...(c.subname ? { subname: c.subname } : {}),
      type: c.type_code,
      class: c.faction_code,
      traits: split(c.real_traits),
      ...(c.is_unique ? { unique: true } : {}),
      ...(c.subtype_code ? { weakness: c.subtype_code } : {}),
    }
    if (c.type_code === 'investigator') {
      return {
        ...base,
        skills: {
          willpower: c.skill_willpower,
          intellect: c.skill_intellect,
          combat: c.skill_combat,
          agility: c.skill_agility,
        },
        health: c.health,
        sanity: c.sanity,
        // Solo el modificador numérico del efecto de signo arcano.
        elderSignModifier: Number(
          (c.real_text ?? '').match(/\[elder_sign\] effect: ([+-]\d+)/)?.[1] ?? 0,
        ),
      }
    }
    return {
      ...base,
      ...(c.cost !== undefined && c.cost !== null ? { cost: c.cost } : {}),
      xp: c.xp ?? 0,
      icons: icons(c),
      slots: slots(c.real_slot),
      ...(c.health ? { health: c.health } : {}),
      ...(c.sanity ? { sanity: c.sanity } : {}),
      ...keywords(c.real_text),
    }
  })

writeFileSync(OUTPUT, JSON.stringify(player, null, 2) + '\n')
console.log(`${player.length} cartas de jugador → ${OUTPUT}`)
