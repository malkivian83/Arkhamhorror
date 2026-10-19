/** Consultas comunes de La gala del ecuador del invierno. */
import {
  getInvestigator,
  placedLocation,
  type Asset,
  type Enemy,
  type GameState,
  type InvestigatorId,
  type LocationId,
  type Message,
  type PlacedAsset,
  type SkillType,
} from '@lcg/engine'
import { CODES, isGuest, isSingleSidedGuest, type Faction } from './cards'

export const ally = (state: GameState) => state.scenarioMeta?.ally as Faction | undefined
export const rival = (state: GameState) => state.scenarioMeta?.rival as Faction | undefined

/** Número del plan actual (1, 2 o 3). */
export const agendaNumber = (state: GameState) => state.agendaIndex + 1

export const perInv = (state: GameState, n: number) => n * state.startingInvestigatorCount

/** El Exangüe, por cualquiera de sus caras. */
export const bloodlessMan = (state: GameState): Enemy | undefined =>
  Object.values(state.enemies).find(
    (e) => e.code === CODES.bloodlessMan || e.code === CODES.bloodlessManUnleashed,
  )

export const silentLurker = (state: GameState): Enemy | undefined =>
  Object.values(state.enemies).find((e) => e.code === CODES.bloodlessMan)

export const declan = (state: GameState): Enemy | undefined =>
  Object.values(state.enemies).find((e) => e.code === CODES.declanPearce)

/** Apoyos Invitado controlados por investigadores en esa localización. */
export const controlledGuestsAt = (state: GameState, location: LocationId): Asset[] =>
  Object.values(state.assets).filter(
    (a) => isGuest(a.code) && getInvestigator(state, a.owner).location === location,
  )

/** Invitados boca arriba sin dueño en esa localización. */
export const placedGuestsAt = (state: GameState, location: LocationId): PlacedAsset[] =>
  Object.values(state.placedAssets ?? {}).filter(
    (p) => isGuest(p.code) && !p.faceDown && placedLocation(state, p) === location,
  )

/** Cuántos Apoyos Invitado hay en la localización (con dueño o sin él). */
export const guestCountAt = (state: GameState, location: LocationId) =>
  controlledGuestsAt(state, location).length + placedGuestsAt(state, location).length

export const guestsControlledBy = (state: GameState, investigator: InvestigatorId): Asset[] =>
  Object.values(state.assets).filter((a) => a.owner === investigator && isGuest(a.code))

/** Cartas hechizadas (boca abajo) en juego. */
export const spellbound = (state: GameState): PlacedAsset[] =>
  Object.values(state.placedAssets ?? {}).filter((p) => p.faceDown)

/** La Joya de Sarnath: controlada (apoyo) o colocada (localización o enemigo). */
export function jewel(state: GameState): { asset?: Asset; placed?: PlacedAsset } {
  const asset = Object.values(state.assets).find((a) => a.code === CODES.jewelOfSarnath)
  if (asset) return { asset }
  const placed = Object.values(state.placedAssets ?? {}).find(
    (p) => p.code === CODES.jewelOfSarnath,
  )
  return placed ? { placed } : {}
}

/** Los investigadores controlan la Joya. */
export const jewelControlled = (state: GameState) => !!jewel(state).asset

/** Localización de la Joya, esté donde esté. */
export function jewelLocation(state: GameState): LocationId | null {
  const { asset, placed } = jewel(state)
  if (asset) return getInvestigator(state, asset.owner).location
  return placed ? placedLocation(state, placed) : null
}

/** La Lámpara Mortecina: colocada (Resplandor hipnótico) o controlada (Aura seductora). */
export function lantern(state: GameState): { asset?: Asset; placed?: PlacedAsset } {
  const asset = Object.values(state.assets).find(
    (a) => a.code === CODES.paleLantern || a.code === CODES.paleLanternAura,
  )
  if (asset) return { asset }
  const placed = Object.values(state.placedAssets ?? {}).find(
    (p) => p.code === CODES.paleLantern || p.code === CODES.paleLanternAura,
  )
  return placed ? { placed } : {}
}

/** Mensaje para que un Invitado (controlado o colocado) quede hechizado. */
export const spellbind = (target: { asset: string } | { placed: string }): Message => ({
  type: 'ScenarioSpecific',
  key: 'spellbind',
  data: target,
})

export const canBeSpellbound = (code: string) => isSingleSidedGuest(code)

/** Iconos de habilidad de una carta (para negociar con un Invitado). */
export function skillIcons(icons: Partial<Record<SkillType, number>> | undefined): SkillType[] {
  return (['willpower', 'intellect', 'combat', 'agility'] as SkillType[]).filter(
    (s) => (icons?.[s] ?? 0) > 0,
  )
}
