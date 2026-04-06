import { randomBytes } from 'node:crypto'

export type SessionUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  email?: string
  bio?: string
}

export type SessionData = {
  user: SessionUser
  createdAt: number
  expiresAt: number
}

export type SessionStore = {
  create: (user: SessionUser) => string
  get: (sessionId: string) => SessionData | null
  destroy: (sessionId: string) => void
}

export function createSessionStore(ttlMs: number): SessionStore {
  const sessions = new Map<string, SessionData>()

  const cleanupExpired = () => {
    const now = Date.now()
    for (const [id, data] of sessions.entries()) {
      if (data.expiresAt <= now) {
        sessions.delete(id)
      }
    }
  }

  const create = (user: SessionUser) => {
    cleanupExpired()
    const sessionId = randomBytes(32).toString('hex')
    const now = Date.now()
    sessions.set(sessionId, {
      user,
      createdAt: now,
      expiresAt: now + ttlMs,
    })
    return sessionId
  }

  const get = (sessionId: string) => {
    cleanupExpired()
    const session = sessions.get(sessionId)
    if (!session) return null
    return session
  }

  const destroy = (sessionId: string) => {
    sessions.delete(sessionId)
  }

  return { create, get, destroy }
}
