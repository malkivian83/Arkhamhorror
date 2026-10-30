import type { GameState } from '@lcg/engine'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowRef } from 'vue'
import { useEnemyArrival } from './enemyArrival'

const hooks = vi.hoisted(() => ({
  update: undefined as undefined | ((next: GameState, previous: GameState) => Promise<void>),
  dispose: undefined as undefined | (() => void),
}))
vi.mock('vue', async (original) => ({
  ...(await original<typeof import('vue')>()),
  watch: (_source: unknown, callback: typeof hooks.update) => {
    hooks.update = callback
  },
  onBeforeUnmount: (callback: () => void) => {
    hooks.dispose = callback
  },
}))
vi.mock('../stores/game', () => ({ useGameStore: () => ({ advanceReview: [] }) }))

function rect(left: number, top: number, width: number) {
  return { left, top, width, height: width * 1.4 } as DOMRect
}

function card(threat: boolean, bounds: DOMRect) {
  let finish!: () => void
  const animation = {
    cancel: vi.fn(),
    finished: new Promise<void>((resolve) => {
      finish = resolve
    }),
  }
  const flying = {
    style: {},
    setAttribute: vi.fn(),
    remove: vi.fn(),
    animate: vi.fn(() => animation),
  }
  const element = {
    style: {
      visibility: '',
      removeProperty: vi.fn(() => {
        element.style.visibility = ''
      }),
    },
    isConnected: true,
    closest: () => threat,
    getBoundingClientRect: () => bounds,
    cloneNode: () => flying,
    animate: vi.fn(),
  }
  return { element, flying, animation, finish }
}

function state(engaged: boolean, length: number, encounter = false) {
  return {
    scenarioId: 'test',
    enemies: {
      ghoul: { id: 'ghoul', code: '01160', location: 'A', engagedWith: engaged ? 'a' : undefined },
    },
    log: Array.from({ length }, (_, n) => ({
      key: encounter && n === length - 1 ? 'log.encounter' : 'log.engaged',
      params: encounter ? { code: '01160' } : {},
    })),
  } as unknown as GameState
}

describe('enemy arrival presentation', () => {
  let current: ReturnType<typeof card>
  let append: ReturnType<typeof vi.fn>
  beforeEach(() => {
    current = card(false, rect(100, 100, 62))
    append = vi.fn()
    vi.stubGlobal('CSS', { escape: (value: string) => value })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) })
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      querySelector: () => current.element,
      body: { append },
    })
  })
  afterEach(() => {
    hooks.dispose?.()
    vi.unstubAllGlobals()
  })

  it('flies from the previous map position and reveals the destination on completion', async () => {
    useEnemyArrival(shallowRef(null))
    const update = hooks.update!(state(true, 2), state(false, 1))
    current = card(true, rect(400, 600, 42))
    await update
    expect(current.element.style.visibility).toBe('hidden')
    expect(append).toHaveBeenCalledWith(current.flying)
    expect(current.flying.animate.mock.calls[0]).toEqual([
      expect.arrayContaining([
        expect.objectContaining({
          transform: `translate(-300px, -500px) scale(${62 / 42}, ${(62 * 1.4) / (42 * 1.4)})`,
        }),
      ]),
      expect.objectContaining({ duration: 520 }),
    ])
    current.finish()
    await Promise.resolve()
    expect(current.element.style.visibility).toBe('')
    expect(current.flying.remove).toHaveBeenCalled()
  })

  it('waits until the matching encounter spotlight is dismissed', async () => {
    const { finishDraw } = useEnemyArrival(shallowRef(null))
    const update = hooks.update!(state(true, 2, true), { ...state(false, 1), enemies: {} })
    current = card(true, rect(400, 600, 42))
    await update
    expect(current.element.style.visibility).toBe('hidden')
    expect(append).not.toHaveBeenCalled()
    finishDraw('other', rect(200, 200, 280))
    expect(append).not.toHaveBeenCalled()
    finishDraw('01160', rect(200, 200, 280))
    expect(append).toHaveBeenCalledOnce()
    hooks.dispose!()
    expect(current.element.style.visibility).toBe('')
    expect(current.animation.cancel).toHaveBeenCalled()
  })

  it('restores hidden cards on undo and does not animate historical engagements', async () => {
    useEnemyArrival(shallowRef(null))
    const update = hooks.update!(state(true, 2, true), { ...state(false, 1), enemies: {} })
    current = card(true, rect(400, 600, 42))
    await update
    await hooks.update!(state(true, 1), state(false, 2))
    expect(current.element.style.visibility).toBe('')
    expect(append).not.toHaveBeenCalled()
  })

  it('places immediately when reduced motion is requested', async () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    useEnemyArrival(shallowRef(null))
    await hooks.update!(state(true, 2), state(false, 1))
    expect(append).not.toHaveBeenCalled()
    expect(current.element.style.visibility).toBe('')
  })
  it('waits for dismissal before flying a directly entering asset to its exact target', () => {
    const { finishDraw } = useEnemyArrival(shallowRef(null))
    expect(append).not.toHaveBeenCalled()
    finishDraw(
      { code: 'ally', name: 'Ally', reason: 'enter', target: 'asset:second-copy' },
      rect(200, 200, 280),
    )
    expect(append).toHaveBeenCalledOnce()
    expect(current.element.style.visibility).toBe('hidden')
    current.finish()
  })
})
