/**
 * Decide cuándo avisar «Es tu turno»: cuando la decisión pasa de otro
 * investigador al propio. Las preguntas seguidas del mismo investigador no
 * repiten el aviso y en solitario no se muestra.
 */
export function turnNotice() {
  let last: string | null = null
  return (decider: string | null | undefined, own: string | undefined, players: number) => {
    if (!decider || decider === last) return false
    last = decider
    return decider === own && players > 1
  }
}
