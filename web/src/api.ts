export type User = { id: string; email: string }

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = localStorage.getItem('logpulse.token')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(path, { ...init, headers })
  const body = (await response.json()) as { message?: string; error?: string } & T
  if (!response.ok) {
    throw new ApiError(body.message || body.error || `Request failed (${response.status})`, response.status)
  }
  return body
}

export function saveSession(token: string, user: User) {
  localStorage.setItem('logpulse.token', token)
  localStorage.setItem('logpulse.user', JSON.stringify(user))
}

export function clearSession() {
  localStorage.removeItem('logpulse.token')
  localStorage.removeItem('logpulse.user')
}

export function readStoredUser(): User | null {
  try {
    const stored = localStorage.getItem('logpulse.user')
    return stored ? (JSON.parse(stored) as User) : null
  } catch {
    localStorage.removeItem('logpulse.user')
    return null
  }
}
