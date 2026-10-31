/**
 * Lugares de El legado de Dunwich con pistas fijas: el valor impreso no lleva el icono
 * «por investigador» (ArkhamDB `clues_fixed`). Los demás multiplican por jugadores.
 */
export const FIXED_CLUE_LOCATIONS: ReadonlySet<string> = new Set([
  // The Miskatonic Museum: Museum Entrance.
  '02126',
  // The Essex County Express: Sleeping Car.
  '02172',
  // Blood on the Altar: Bishop's Brook, Burned Ruins and Schoolhouse (both versions).
  '02202',
  '02203',
  '02204',
  '02205',
  '02212',
  '02213',
  // Undimensioned and Unseen.
  '02242',
  '02243',
  '02244',
  '02246',
  '02247',
  '02248',
  '02249',
  '02252',
])
