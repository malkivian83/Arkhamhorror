/** Textos oficiales de una carta en un catálogo sin conexión. */
export interface CatalogCard {
  name: string
  typeCode?: string
  subname?: string
  traits?: string
  text?: string
  backName?: string
  backText?: string
  /** Icono de juego (palo y valor) de las cartas de Fortuna e insensatez: "♣Q". */
  gameIcon?: string
  /** Texto narrativo de cada cara (Fortuna e insensatez). */
  flavor?: string
  backFlavor?: string
}

/** Narración oficial de planes y actos de los catálogos implementados. */
export type CardNarrative = Pick<CatalogCard, 'typeCode' | 'flavor' | 'backFlavor'> & {
  group: string
}
