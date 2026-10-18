import { newCampaign, startScenario } from '@lcg/cards'
import { applyInput, type PlayerInput } from '@lcg/engine'
import { describe, expect, it } from 'vitest'
import {
  BACKUP_KEY,
  RECOVERY_KEY,
  decodeSession,
  readSession,
  replay,
  SESSION_KEY,
  session,
  writeSession,
  reproduceDiagnostic,
  type Session,
  type StoragePort,
} from './session'
import { markOf, undoTarget, type UndoKind } from './undo'

class MemoryStorage implements StoragePort {
  values = new Map<string, string>()
  fail = false
  getItem(key: string) {
    return this.values.get(key) ?? null
  }
  setItem(key: string, value: string) {
    if (this.fail) throw new Error('quota')
    this.values.set(key, value)
  }
}
function initial(): Session {
  const campaign = newCampaign('brethren-of-ash', ['joe', 'trish'], 'standard')
  const state = startScenario(campaign, 123)
  return session(state, { base: state, inputs: [], marks: [markOf(state)] }, campaign)
}
const encode = (data: Session) => JSON.stringify(data)

describe('guardado de campaña y mesa', () => {
  it('rechaza una Gala anterior al cambio de reglas y conserva intacto el archivo original', () => {
    const campaign = newCampaign('the-midwinter-gala', ['joe'], 'standard')
    const state = startScenario(campaign, 3)
    expect(state.scenarioRulesVersion).toBe(2)
    const current = session(state, { base: state, inputs: [], marks: [markOf(state)] }, campaign)
    expect(decodeSession(encode(current))).toEqual(current)
    const old = JSON.parse(encode(current)) as Session
    delete old.state!.scenarioRulesVersion
    delete old.history!.base.scenarioRulesVersion
    const raw = encode(old)
    expect(() => decodeSession(raw)).toThrow('incompatible')
    const storage = new MemoryStorage()
    storage.setItem(SESSION_KEY, raw)
    expect(readSession(storage).issue).toBe('incompatible')
    expect(storage.getItem(SESSION_KEY)).toBe(raw)
  })
  it('el cambio de reglas de Gala no impone una versión nueva a Brethren', () => {
    const data = initial()
    expect(data.state?.scenarioRulesVersion).toBeUndefined()
    expect(decodeSession(encode(data))).toEqual(data)
  })
  it('acepta la resolución 6 de La Gala y rechaza resoluciones fuera de su contenido', () => {
    const campaign = newCampaign('the-midwinter-gala', ['joe'], 'standard')
    const state = {
      ...startScenario(campaign, 3),
      pending: null,
      queue: [],
      outcome: { type: 'resolution' as const, resolution: 6 },
    }
    const data = session(state, { base: state, inputs: [], marks: [markOf(state)] }, campaign)
    expect(decodeSession(encode(data))).toEqual(data)
    data.state!.outcome = { type: 'resolution', resolution: 7 }
    expect(() => decodeSession(encode(data))).toThrow()
  })
  it('guarda y restaura La Gala con sus cartas de Historia, Invitados e historial', () => {
    const campaign = newCampaign('the-midwinter-gala', ['joe'], 'standard')
    const base = startScenario(campaign, 3)
    const inputs: PlayerInput[] = []
    const marks = [markOf(base)]
    let state = base
    for (let step = 0; step < 10 && !Object.keys(state.placedAssets ?? {}).length; step++) {
      const input = { investigator: state.pending!.investigator, choice: 0 }
      inputs.push(input)
      state = applyInput(state, input)
      marks.push(markOf(state))
    }
    const data = session(state, { base, inputs, marks }, campaign)
    expect(Object.keys(state.placedAssets ?? {}).length).toBeGreaterThan(0)
    const storage = new MemoryStorage()
    writeSession(storage, data)
    expect(readSession(storage)).toEqual({ data })
  })
  it('un diagnóstico reproduce una entrada fallida sin acceder a servicios externos', () => {
    const data = initial()
    const result = reproduceDiagnostic(
      JSON.stringify({
        format: 'lcg-diagnostic',
        version: 1,
        session: data,
        error: 'Opción no válida',
        failedInput: { investigator: data.state!.pending!.investigator, choice: 9999 },
      }),
    )
    expect(result.reproducedError).toBe('Opción no válida')
    expect(result.data).toEqual(data)
    expect(result.after).toEqual(data.state)
  })
  it('exporta/importa partida, campaña, semilla e historial en una sola unidad', () => {
    const data = initial()
    expect(decodeSession(encode(data))).toEqual(data)
    const storage = new MemoryStorage()
    writeSession(storage, data)
    expect(readSession(storage)).toEqual({ data })
  })
  it('migra los tres guardados antiguos sin borrarlos', () => {
    const storage = new MemoryStorage()
    const data = initial()
    storage.setItem('lcg:game', JSON.stringify(data.state))
    storage.setItem('lcg:history', JSON.stringify(data.history))
    storage.setItem('lcg:campaign', JSON.stringify(data.campaign))
    expect(readSession(storage)).toEqual({ data })
    expect(storage.getItem('lcg:game')).not.toBeNull()
  })
  it('recupera una mesa antigua con historial incoherente y lo comunica', () => {
    const storage = new MemoryStorage()
    const data = initial()
    storage.setItem('lcg:game', JSON.stringify(data.state))
    storage.setItem('lcg:history', '{')
    const read = readSession(storage)
    expect(read.issue).toBe('historyReset')
    expect(read.data.state).toEqual(data.state)
    expect(read.data.history?.inputs).toEqual([])
  })
  it.each(['{', 'null', '[]', '{"format":"lcg-session","version":99}', '{"__proto__":{}}'])(
    'rechaza datos dañados: %s',
    (raw) => {
      expect(() => decodeSession(raw)).toThrow()
    },
  )
  it('rechaza versiones futuras y discrepancias entre mesa y decisiones', () => {
    const data = initial()
    expect(() => decodeSession(encode({ ...data, content: 'future' }))).toThrow('incompatible')
    const bad = JSON.parse(encode(data)) as Session
    bad.state!.doom++
    expect(() => decodeSession(encode(bad))).toThrow('invalid')
    bad.history!.base.engineVersion++
    expect(() => decodeSession(encode(bad))).toThrow()
  })
  it('no importa una simulación sin ventanas interactivas como si fuera una mesa jugable', () => {
    const data = initial()
    data.state!.interactive = false
    expect(() => decodeSession(encode(data))).toThrow('incompatible')
  })
  it('rechaza un estado parcial incluso cuando también se falsifica la base', () => {
    const data = initial()
    Reflect.deleteProperty(data.state!.investigators[0]!, 'hand')
    expect(() => decodeSession(encode(data))).toThrow('invalid')
  })
  it('rechaza un registro de campaña truncado dentro de una mesa', () => {
    const data = initial()
    Reflect.set(data.state!.campaignLog!, 'investigators', null)
    expect(() => decodeSession(encode(data))).toThrow('invalid')
  })
  it('no mezcla una campaña diferente con la mesa actual', () => {
    const data = initial()
    data.campaign!.scenarioIndex = 1
    data.campaign!.results = [
      { scenario: 'spreading-flames', outcome: { type: 'noResolution' }, xp: {} },
    ]
    expect(() => decodeSession(encode(data))).toThrow('invalid')
  })
  it('recupera la copia anterior al encontrar un archivo principal corrupto', () => {
    const storage = new MemoryStorage()
    const data = initial()
    writeSession(storage, data)
    writeSession(storage, session(null, null, data.campaign))
    storage.setItem(SESSION_KEY, '{')
    expect(readSession(storage)).toEqual({ data, issue: 'recovered' })
    expect(storage.getItem(SESSION_KEY)).toBe('{')
  })
  it('un fallo de cuota no destruye el principal ni su copia', () => {
    const storage = new MemoryStorage()
    const data = initial()
    writeSession(storage, data)
    storage.fail = true
    expect(() => writeSession(storage, session(null, null, null))).toThrow('unavailable')
    expect(decodeSession(storage.getItem(SESSION_KEY)!)).toEqual(data)
  })
  it('un fallo de escritura principal después de guardar la copia conserva ambas versiones legibles', () => {
    const storage = new MemoryStorage()
    const data = initial()
    writeSession(storage, data)
    const failing: StoragePort = {
      getItem: (key) => storage.getItem(key),
      setItem: (key, value) => {
        if (key === SESSION_KEY) throw new Error('quota')
        storage.setItem(key, value)
      },
    }
    expect(() => writeSession(failing, session(null, null, data.campaign))).toThrow('unavailable')
    expect(decodeSession(storage.getItem(SESSION_KEY)!)).toEqual(data)
    expect(decodeSession(storage.getItem(BACKUP_KEY)!)).toEqual(data)
  })
  it('un nuevo estado inválido no reemplaza un guardado legible ni su copia', () => {
    const storage = new MemoryStorage()
    const data = initial()
    writeSession(storage, data)
    const broken = JSON.parse(encode(data)) as Session
    broken.state!.doom++
    expect(() => writeSession(storage, broken)).toThrow('invalid')
    expect(storage.getItem(SESSION_KEY)).toBe(encode(data))
    expect(storage.getItem(BACKUP_KEY)).toBeNull()
  })
  it('no reemplaza una copia legible con el principal corrupto', () => {
    const storage = new MemoryStorage()
    const data = initial()
    storage.setItem(BACKUP_KEY, encode(data))
    storage.setItem(SESSION_KEY, '{')
    writeSession(storage, data)
    expect(storage.getItem(BACKUP_KEY)).toBe(encode(data))
    expect(storage.getItem(RECOVERY_KEY)).toBe('{')
  })
  it('comunica el almacenamiento bloqueado', () => {
    const storage = {
      getItem() {
        throw new Error('denied')
      },
      setItem() {
        throw new Error('denied')
      },
    }
    expect(readSession(storage).issue).toBe('unavailable')
    expect(() => writeSession(storage, initial())).toThrow('unavailable')
  })
})

describe('deshacer reproduce el estado completo después de recargar', () => {
  const kinds: UndoKind[] = ['step', 'action', 'turn', 'round']
  for (const kind of kinds)
    it(kind, () => {
      const data = initial()
      const states = [data.state!]
      const inputs: PlayerInput[] = []
      let state = data.state!
      for (let n = 0; n < 100 && state.pending && !state.outcome; n++) {
        const choices = state.pending.question.choices
        let choice = choices.findIndex((c) => c.label === 'action.endTurn')
        if (choice < 0) choice = 0
        const input = { investigator: state.pending.investigator, choice }
        inputs.push(input)
        state = applyInput(state, input)
        states.push(state)
      }
      const h = replay(data.state!, inputs).history
      const restored = decodeSession(encode(session(state, h, data.campaign)))
      const target = undoTarget(restored.history!.marks, kind)
      expect(target).not.toBeNull()
      const undone = replay(restored.history!.base, restored.history!.inputs.slice(0, target!))
      expect(undone.state).toEqual(states[target!]!)
      const redo = replay(undone.state, inputs.slice(target!))
      expect(redo.state).toEqual(state)
    })
})
