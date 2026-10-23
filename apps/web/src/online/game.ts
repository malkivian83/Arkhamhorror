import { ref } from 'vue'
import type {
  OnlineCommand,
  OnlineGame,
  OnlineProgressCommand,
  OnlineProgressAction,
} from '@lcg/shared'
import { api, ApiError } from '../account/api'

export function gameClient(room: string, request: typeof api = api) {
  const state = ref<OnlineGame | null>(null),
    busy = ref(false),
    error = ref('')
  const retry = ref<OnlineCommand | OnlineProgressCommand | null>(null)
  let generation = 0
  function reset() {
    generation++
    state.value = null
    busy.value = false
    retry.value = null
    error.value = ''
  }
  async function send(command?: OnlineCommand | OnlineProgressCommand) {
    if (busy.value) return
    const epoch = generation
    busy.value = true
    try {
      const result = await request<OnlineGame>(
        `/online/lobbies/${room}/game${command ? ('action' in command ? '/progress' : '/decisions') : ''}`,
        command ? 'POST' : 'GET',
        command,
      )
      if (epoch !== generation) return
      if (!state.value || result.revision >= state.value.revision) state.value = result
      if (command) retry.value = null
      if (!retry.value) error.value = ''
    } catch (e) {
      if (epoch !== generation) return
      error.value = e instanceof ApiError ? e.code : 'network'
      // Keep the exact command on an ambiguous network failure; never invent a new retry.
      if (command && e instanceof ApiError && e.status >= 400 && e.status < 500) retry.value = null
    } finally {
      if (epoch === generation) busy.value = false
    }
  }
  async function choose(choice: number) {
    if (busy.value || retry.value || !state.value?.pending?.choices[choice]) return
    retry.value = {
      commandId: crypto.randomUUID(),
      revision: state.value.revision,
      questionId: state.value.pending.id,
      choice,
    }
    await send(retry.value)
  }
  async function progress(action: OnlineProgressAction) {
    if (busy.value || retry.value || !state.value) return
    retry.value = { ...action, commandId: crypto.randomUUID(), revision: state.value.revision }
    await send(retry.value)
  }
  return {
    state,
    busy,
    error,
    retry,
    reset,
    refresh: () => send(),
    choose,
    progress,
    resend: () => (retry.value ? send(retry.value) : Promise.resolve()),
  }
}
