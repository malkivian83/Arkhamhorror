/** A straight vertical edge would pass behind another location's card. */
export function verticalThreadBlocked(
  positions: ReadonlyMap<string, readonly [number, number]>,
  from: string,
  to: string,
): boolean {
  const a = positions.get(from),
    b = positions.get(to)
  if (!a || !b || a[0] !== b[0]) return false
  return [...positions].some(
    ([id, [column, row]]) =>
      id !== from &&
      id !== to &&
      column === a[0] &&
      row > Math.min(a[1], b[1]) &&
      row < Math.max(a[1], b[1]),
  )
}
