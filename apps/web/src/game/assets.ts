import type { ChaosToken } from '@lcg/engine'
import { ref } from 'vue'

/**
 * Recursos visuales opcionales que no están en el repositorio:
 * - Imágenes de fichas en public/local-assets/ (scripts/copy-reference-tokens.mjs).
 * - Fuente de símbolos de ArkhamDB, servida a través del proxy /ext/arkhamdb.
 * Si faltan, la mesa usa sus propias fichas y letras.
 */
export const tokenImagesAvailable = ref(false)
export const iconFontAvailable = ref(false)
export const backImagesAvailable = ref(false)

const LOCAL = '/local-assets'

export function detectAssets(): void {
  const probe = new Image()
  probe.onload = () => (tokenImagesAvailable.value = true)
  probe.src = `${LOCAL}/chaos/skull.png`

  const back = new Image()
  back.onload = () => (backImagesAvailable.value = true)
  back.src = `${LOCAL}/backs/encounter.jpg`

  if ('fonts' in document) {
    document.fonts
      .load('16px "arkham-icons"', 'p')
      .then((faces) => {
        iconFontAvailable.value = faces.length > 0
        document.documentElement.classList.toggle('icons-ok', faces.length > 0)
      })
      .catch(() => (iconFontAvailable.value = false))
  }
}

export function chaosTokenImage(token: ChaosToken): string | null {
  if (!tokenImagesAvailable.value) return null
  if (typeof token === 'number') {
    if (token === 0) return `${LOCAL}/chaos/0.png`
    if (token === 1) return `${LOCAL}/chaos/plus1.png`
    if (token < 0 && token >= -8) return `${LOCAL}/chaos/minus${-token}.png`
    return null
  }
  return `${LOCAL}/chaos/${token}.png`
}

/** Reverso oficial de las cartas de encuentro o de jugador, si está copiado en local. */
export function cardBackImage(kind: 'encounter' | 'player'): string | null {
  return backImagesAvailable.value ? `${LOCAL}/backs/${kind}.jpg` : null
}

export type TokenKind = 'resource' | 'clue' | 'damage' | 'horror' | 'doom'

export function tokenImage(kind: TokenKind): string | null {
  return tokenImagesAvailable.value ? `${LOCAL}/tokens/${kind}.png` : null
}

/** Glifo de la fuente de símbolos para cada icono. */
export const ICON_GLYPHS: Record<string, string> = {
  willpower: 'p',
  intellect: 'b',
  combat: 'c',
  agility: 'a',
  wild: '?',
  action: 'i',
  reaction: '!',
  fast: 'j',
  free: 'j',
  skull: 'k',
  cultist: 'l',
  tablet: 'q',
  elder_thing: 'n',
  elderThing: 'n',
  elder_sign: 'o',
  elderSign: 'o',
  auto_fail: 'm',
  autoFail: 'm',
  bless: 'v',
  curse: 'w',
  frost: 'x',
}
