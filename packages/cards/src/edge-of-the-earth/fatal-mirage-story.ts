import type { Message } from '@lcg/engine'

export function readMirageBack(code: string): Message {
  const key = `story.edgeOfTheEarth.mirageBack${code}`
  return { type: 'Story', entry: { title: key + '.title', body: key + '.body' } }
}
