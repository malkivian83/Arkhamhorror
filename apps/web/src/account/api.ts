import { shallowRef } from 'vue'
import type { AuthStatus } from '@lcg/shared'

export const account = shallowRef<AuthStatus>({
  user: null,
  csrf: null,
  enabled: false,
  google: false,
})
export const accountOffline = shallowRef(false)
export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code)
  }
}
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      signal: AbortSignal.timeout(path === '/auth/me' || path === '/library' ? 4000 : 15000),
      headers: {
        ...(account.value.user ? { 'X-Account-Id': account.value.user.id } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(account.value.csrf ? { 'X-CSRF-Token': account.value.csrf } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new ApiError('network', 0)
  }
  let data
  try {
    data = await response.json()
  } catch {
    // A truncated acknowledgement must leave the durable operation pending for retry.
    throw new ApiError(response.ok ? 'network' : 'internal', response.ok ? 0 : response.status)
  }
  if (!response.ok)
    throw new ApiError(typeof data.code === 'string' ? data.code : 'internal', response.status)
  return data as T
}
export async function loadAccount() {
  try {
    account.value = await api<AuthStatus>('/auth/me')
    try {
      if (account.value.user)
        localStorage.setItem(
          'lcg:last-account',
          JSON.stringify({ user: account.value.user, google: account.value.google }),
        )
      else localStorage.removeItem('lcg:last-account')
    } catch {
      /* A valid server session does not depend on local storage availability. */
    }
  } catch {
    account.value = { user: null, csrf: null, enabled: false, google: false }
    try {
      const cached = JSON.parse(localStorage.getItem('lcg:last-account') ?? 'null')
      if (
        cached?.user?.verified === true &&
        typeof cached.user.id === 'string' &&
        typeof cached.user.name === 'string'
      ) {
        account.value = { user: cached.user, csrf: null, enabled: true, google: !!cached.google }
        accountOffline.value = true
      }
    } catch {
      /* Guest access remains available when storage is blocked. */
    }
  }
}
export async function recoverAccountSession() {
  if (!accountOffline.value && account.value.csrf) return
  const fresh = await api<AuthStatus>('/auth/me')
  if (!fresh.user || fresh.user.id !== account.value.user?.id)
    throw new ApiError('account_changed', 401)
  account.value = fresh
  accountOffline.value = false
}
