import { ref, watch } from 'vue'

/**
 * Tapetes de juego: solo cambian colores; la textura, la viñeta, las costuras
 * y el sigilo son comunes y se dibujan en CSS (ver App.vue).
 */
export interface Playmat {
  id: string
  /** Tela del tapete (centro iluminado y bordes). */
  felt: string
  feltEdge: string
  /** Costuras, sigilo y rótulos de las zonas. */
  trim: string
}

export const PLAYMATS: Playmat[] = [
  { id: 'arkham', felt: '#2a4a3a', feltEdge: '#0f1d17', trim: '#c9a227' },
  { id: 'ritual', felt: '#5a1f24', feltEdge: '#1e0a0c', trim: '#d9a066' },
  { id: 'abyss', felt: '#163a52', feltEdge: '#07131d', trim: '#7fc8c0' },
  { id: 'library', felt: '#4d3621', feltEdge: '#1a110a', trim: '#e0c48a' },
  { id: 'veil', felt: '#3a2657', feltEdge: '#120a1e', trim: '#c7a6f0' },
  { id: 'ash', felt: '#3a3a3c', feltEdge: '#121213', trim: '#e07b3c' },
]

/**
 * Texturas del tapete como variables CSS. Se importan desde aquí para que Vite
 * resuelva sus rutas (en el CSS de los .vue no siempre las reescribe).
 */
const TEXTURES = {
  felt: new URL('../assets/felt.svg', import.meta.url).href,
  'arkham-map': new URL('../assets/arkham-map.svg', import.meta.url).href,
  sigil: new URL('../assets/sigil.svg', import.meta.url).href,
  wood: new URL('../assets/wood.svg', import.meta.url).href,
}
for (const [name, href] of Object.entries(TEXTURES)) {
  document.documentElement.style.setProperty(`--tex-${name}`, `url("${href}")`)
}

function stored(): string {
  try {
    return localStorage.getItem('playmat') ?? PLAYMATS[0]!.id
  } catch {
    return PLAYMATS[0]!.id
  }
}

export const playmat = ref(stored())

watch(
  playmat,
  (id) => {
    const mat = PLAYMATS.find((m) => m.id === id) ?? PLAYMATS[0]!
    const root = document.documentElement.style
    root.setProperty('--felt', mat.felt)
    root.setProperty('--felt-edge', mat.feltEdge)
    root.setProperty('--trim', mat.trim)
    try {
      localStorage.setItem('playmat', mat.id)
    } catch {
      // Sin almacenamiento: el tapete solo dura esta sesión.
    }
  },
  { immediate: true },
)
