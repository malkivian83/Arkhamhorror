import { shuffle, type RngState } from './rng'
import type {
  CampaignLog,
  ChaosToken,
  ValleyArea,
  ValleyDay,
  ValleyFatigue,
  ValleyResident,
  ValleyResidentRecord,
  ValleyState,
  ValleyTime,
} from './types'

// La fiesta del Valle de la Cicuta: estado del registro de campaña (guía, pp. 3 y 70–71).

/** Casillas de relación impresas en el registro (p. 71). */
export const valleyResidents: Record<ValleyResident, { boxes: number }> = {
  motherRachel: { boxes: 6 },
  leahAtwood: { boxes: 6 },
  simeonAtwood: { boxes: 6 },
  williamHemlock: { boxes: 6 },
  riverHawthorne: { boxes: 6 },
  gideonMizrah: { boxes: 6 },
  judithPark: { boxes: 7 },
  theoPeters: { boxes: 7 },
}

export const valleyAreas: readonly ValleyArea[] = [
  'northPointMine',
  'hemlockHarbor',
  'pearlRidge',
  'akwanShoreline',
  'eastwickBog',
  'westernWoods',
  'southernFields',
]

/** Valor numérico más bajo de la bolsa: una ficha −8 no se puede rebajar. */
export const LOWEST_CHAOS_VALUE = -8

export function newValley(): ValleyState {
  const residents = {} as Record<ValleyResident, ValleyResidentRecord>
  for (const resident of Object.keys(valleyResidents) as ValleyResident[])
    residents[resident] = { level: 0, notes: [] }
  return { day: 1, time: 'day', residents, areasSurveyed: [], codexChosen: [], fatigue: [] }
}

/** Día 1 → Noche 1 → Día 2 → … → Noche 3, donde se detiene. */
export function advanceValleyTime(valley: ValleyState): ValleyState {
  if (valley.time === 'day') return { ...valley, time: 'night' }
  if (valley.day === 3) return valley
  return { ...valley, day: (valley.day + 1) as ValleyDay, time: 'day' }
}

function updateResident(
  valley: ValleyState,
  resident: ValleyResident,
  update: (record: ValleyResidentRecord) => ValleyResidentRecord,
): ValleyState {
  const record = valley.residents[resident]
  const next = update(record)
  return next === record
    ? valley
    : { ...valley, residents: { ...valley.residents, [resident]: next } }
}

/** Marca o borra casillas de una en una, entre 0 y las impresas; `reset` las borra todas. */
export function changeRelationship(
  valley: ValleyState,
  resident: ValleyResident,
  amount = 1,
  reset = false,
): ValleyState {
  return updateResident(valley, resident, (record) => {
    const level = reset
      ? 0
      : Math.max(0, Math.min(valleyResidents[resident].boxes, record.level + amount))
    return level === record.level ? record : { ...record, level }
  })
}

/** Anota una nota (sin repetirla) y suma sus marcas. */
export function recordResidentNote(
  valley: ValleyState,
  resident: ValleyResident,
  note: string,
  marks = 0,
): ValleyState {
  return updateResident(valley, resident, (record) => {
    const notes = record.notes.includes(note) ? record.notes : [...record.notes, note]
    if (!marks) return notes === record.notes ? record : { ...record, notes }
    const total = (record.marks?.[note] ?? 0) + marks
    return { ...record, notes, marks: { ...record.marks, [note]: total } }
  })
}

export function crossOutResident(valley: ValleyState, resident: ValleyResident): ValleyState {
  return updateResident(valley, resident, (record) =>
    record.crossedOut ? record : { ...record, crossedOut: true },
  )
}

/** Un habitante tachado no puede entrar en juego (p. 3). */
export function residentAvailable(log: CampaignLog | undefined, resident: ValleyResident): boolean {
  return !log?.valley?.residents[resident].crossedOut
}

/** Nivel de relación; un habitante tachado ya no cuenta para nada. */
export function relationshipLevel(log: CampaignLog | undefined, resident: ValleyResident): number {
  const record = log?.valley?.residents[resident]
  return record && !record.crossedOut ? record.level : 0
}

/** Notas vigentes: tachar el nombre anula todas sus notas. */
export function residentNotes(log: CampaignLog | undefined, resident: ValleyResident): string[] {
  const record = log?.valley?.residents[resident]
  return record && !record.crossedOut ? record.notes : []
}

export function residentHasNote(
  log: CampaignLog | undefined,
  resident: ValleyResident,
  note: string,
): boolean {
  return residentNotes(log, resident).includes(note)
}

export function residentMarks(
  log: CampaignLog | undefined,
  resident: ValleyResident,
  note: string,
): number {
  const record = log?.valley?.residents[resident]
  return record && !record.crossedOut ? (record.marks?.[note] ?? 0) : 0
}

export function surveyArea(valley: ValleyState, area: ValleyArea): ValleyState {
  return valley.areasSurveyed.includes(area)
    ? valley
    : { ...valley, areasSurveyed: [...valley.areasSurveyed, area] }
}

const lowerable = (token: ChaosToken): token is number =>
  typeof token === 'number' && token > LOWEST_CHAOS_VALUE

function replaceFirst(bag: ChaosToken[], { from, to }: ValleyFatigue): ChaosToken[] {
  const index = bag.indexOf(from)
  return index < 0 ? bag : bag.map((token, i) => (i === index ? to : token))
}

/** Aplica las sustituciones de fatiga anotadas a una bolsa. */
export function applyValleyFatigue(bag: ChaosToken[], fatigue: ValleyFatigue[]): ChaosToken[] {
  return fatigue.reduce(replaceFirst, [...bag])
}

/**
 * Fatiga (pp. 39 y 51): roba fichas al azar hasta tener 2 sin símbolo y sustitúyelas
 * por la de valor 1 menos; si una no se puede sustituir (−8), repite hasta sustituir 2.
 */
export function drawValleyFatigue(
  bag: ChaosToken[],
  rng: RngState,
): { fatigue: ValleyFatigue[]; bag: ChaosToken[]; rng: RngState } {
  const fatigue: ValleyFatigue[] = []
  let current = [...bag]
  let state = rng
  while (fatigue.length < 2 && current.some(lowerable)) {
    let order: ChaosToken[]
    ;[order, state] = shuffle(current, state)
    const drawn = order.filter((token) => typeof token === 'number').slice(0, 2 - fatigue.length)
    for (const token of drawn.filter(lowerable)) {
      const replacement = { from: token, to: token - 1 }
      fatigue.push(replacement)
      current = replaceFirst(current, replacement)
    }
  }
  return { fatigue, bag: current, rng: state }
}

/** Día y hora vigentes en la partida, si se juega esta campaña. */
export function valleyTime(
  log: CampaignLog | undefined,
): { day: ValleyDay; time: ValleyTime } | undefined {
  const valley = log?.valley
  return valley && { day: valley.day, time: valley.time }
}

// «(Día [day])» / «<b>(Night [night])</b>»: marca de efecto y su texto hasta la siguiente
// marca o el final de la línea (p. 3).
const TIME_MARK = /(?:<b>)?\((?:<b>)?[^()\n[]*?(?:<\/b>)?\s*\[(day|night)\]\)(?:<\/b>)?/g

/** Elimina del texto de una carta los efectos de la otra hora; el resto queda intacto. */
export function activeTimeText(text: string, time: ValleyTime): string {
  return text
    .split('\n')
    .map((line) => {
      const marks = [...line.matchAll(TIME_MARK)]
      if (!marks.length) return line
      let result = line.slice(0, marks[0]!.index)
      marks.forEach((mark, i) => {
        const end = marks[i + 1]?.index ?? line.length
        if (mark[1] === time) result += line.slice(mark.index, end)
      })
      return result.replace(/\s+$/, '').replace(/^\s+/, '')
    })
    .join('\n')
}
