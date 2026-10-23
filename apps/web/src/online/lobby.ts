import { ref } from 'vue'
import type { OnlineLobby } from '@lcg/shared'
import { api, ApiError } from '../account/api'

/** One in-flight operation; a detached account/route can never install an old response. */
export function lobbyClient(request: typeof api = api) {
  const lobby = ref<OnlineLobby | null>(null),
    busy = ref(false),
    error = ref('')
  let generation = 0
  function reset() {
    generation++
    lobby.value = null
    busy.value = false
    error.value = ''
  }
  async function run(path: string, method = 'GET', body?: unknown) {
    if (busy.value) return null
    const epoch = generation
    busy.value = true
    error.value = ''
    try {
      const result = await request<OnlineLobby>(`/online/lobbies${path}`, method, body)
      if (epoch !== generation) return null
      if (!lobby.value || result.id !== lobby.value.id || result.revision >= lobby.value.revision)
        lobby.value = result
      return result
    } catch (e) {
      if (epoch === generation) error.value = e instanceof ApiError ? e.code : 'network'
      return null
    } finally {
      if (epoch === generation) busy.value = false
    }
  }
  return { lobby, busy, error, reset, run }
}
