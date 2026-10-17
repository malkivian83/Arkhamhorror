import { describe, expect, it } from 'vitest'
import { constrainView, fitView, MAX_SCALE, MIN_SCALE, zoomAt } from './viewport'

describe('navegación del mapa', () => {
  it('mantiene el punto bajo el cursor al ampliar y al volver a alejar', () => {
    const view = { x: -80, y: 35, scale: 0.8 }
    const cursor = { x: 210, y: 150 }
    const enlarged = zoomAt(view, 1.6, cursor)
    expect((cursor.x - enlarged.x) / enlarged.scale).toBe((cursor.x - view.x) / view.scale)
    expect((cursor.y - enlarged.y) / enlarged.scale).toBe((cursor.y - view.y) / view.scale)
    expect(zoomAt(enlarged, 0.8, cursor)).toEqual(view)
  })

  it('combina el pellizco con el movimiento del punto medio de los dedos', () => {
    const view = { x: 20, y: 30, scale: 1 }
    const before = { x: 100, y: 120 }
    const after = { x: 140, y: 150 }
    const next = zoomAt(view, 2, before, after)
    expect(next).toEqual({ x: -20, y: -30, scale: 2 })
    expect((after.x - next.x) / next.scale).toBe((before.x - view.x) / view.scale)
    expect((after.y - next.y) / next.scale).toBe((before.y - view.y) / view.scale)
  })

  it('respeta los límites de zoom sin desplazar el punto de anclaje', () => {
    const anchor = { x: 80, y: 60 }
    expect(zoomAt({ x: 10, y: 10, scale: MAX_SCALE }, 20, anchor)).toEqual({
      x: 10,
      y: 10,
      scale: MAX_SCALE,
    })
    expect(zoomAt({ x: 10, y: 10, scale: MIN_SCALE }, 0, anchor)).toEqual({
      x: 10,
      y: 10,
      scale: MIN_SCALE,
    })
  })

  it('ajusta un mapa ancho a una pantalla móvil y lo centra', () => {
    const content = { width: 840, height: 830 }
    const viewport = { width: 320, height: 360 }
    const next = fitView(content, viewport)
    expect(content.width * next.scale).toBeLessThanOrEqual(viewport.width)
    expect(content.height * next.scale).toBeLessThanOrEqual(viewport.height)
    expect(next.x).toBeCloseTo(0)
    expect(next.y).toBeCloseTo((360 - 830 * next.scale) / 2)
  })

  it('no amplía automáticamente un mapa pequeño por encima del tamaño real', () => {
    expect(fitView({ width: 200, height: 200 }, { width: 1000, height: 600 })).toEqual({
      x: 400,
      y: 200,
      scale: 1,
    })
  })

  it('mantiene una parte del mapa visible después de un arrastre extremo', () => {
    const content = { width: 840, height: 830 }
    const viewport = { width: 320, height: 360 }
    const right = constrainView({ x: 10000, y: 10000, scale: 2 }, content, viewport)
    expect(right.x).toBe(256)
    expect(right.y).toBe(296)
    const left = constrainView({ x: -10000, y: -10000, scale: 2 }, content, viewport)
    expect(left.x + content.width * left.scale).toBe(64)
    expect(left.y + content.height * left.scale).toBe(64)
  })
})
