import en from './en.json'
import es from './es.json'

/** Textos de interfaz. Solo inglés y español. */
export const messages = { en, es } as const

export type MessageSchema = typeof en
