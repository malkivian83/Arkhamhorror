export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface ViewTransform extends Point {
  scale: number
}

export const MIN_SCALE = 0.2
export const MAX_SCALE = 3
export const BOARD_VIEW_KEY = Symbol('board-view')

export const clampScale = (scale: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))

/** Conserva bajo el cursor (o entre los dedos) el mismo punto del mapa. */
export function zoomAt(
  view: ViewTransform,
  scale: number,
  anchor: Point,
  destination: Point = anchor,
): ViewTransform {
  const next = clampScale(scale)
  const ratio = next / view.scale
  return {
    scale: next,
    x: destination.x - (anchor.x - view.x) * ratio,
    y: destination.y - (anchor.y - view.y) * ratio,
  }
}

export function fitView(content: Size, viewport: Size): ViewTransform {
  const scale = clampScale(
    Math.min(1, viewport.width / content.width, viewport.height / content.height),
  )
  return {
    scale,
    x: (viewport.width - content.width * scale) / 2,
    y: (viewport.height - content.height * scale) / 2,
  }
}

/** Permite explorar libremente, sin perder el mapa por completo fuera de la vista. */
export function constrainView(view: ViewTransform, content: Size, viewport: Size): ViewTransform {
  const width = content.width * view.scale
  const height = content.height * view.scale
  const marginX = Math.min(64, width / 2, viewport.width / 2)
  const marginY = Math.min(64, height / 2, viewport.height / 2)
  return {
    ...view,
    x: Math.max(marginX - width, Math.min(viewport.width - marginX, view.x)),
    y: Math.max(marginY - height, Math.min(viewport.height - marginY, view.y)),
  }
}
