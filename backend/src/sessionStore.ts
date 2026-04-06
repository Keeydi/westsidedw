import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

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

type SessionTokenPayload = {
  u: SessionUser
  iat: number
  exp: number
  r: string
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(payloadBase64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.username === 'string' &&
    typeof v.displayName === 'string' &&
    (typeof v.avatarUrl === 'string' || v.avatarUrl === null)
  )
}

export function createSessionStore(ttlMs: number, secret: string): SessionStore {
  const create = (user: SessionUser) => {
    const now = Date.now()
    const payload: SessionTokenPayload = {
      u: user,
      iat: now,
      exp: now + ttlMs,
      // Randomness ensures unique token values even for same user/time window.
      r: randomBytes(8).toString('hex'),
    }
    const payloadBase64 = toBase64Url(JSON.stringify(payload))
    const signature = sign(payloadBase64, secret)
    return `${payloadBase64}.${signature}`
  }

  const get = (sessionId: string) => {
    const [payloadBase64, signature] = sessionId.split('.')
    if (!payloadBase64 || !signature) return null

    const expected = sign(payloadBase64, secret)
    if (!safeEq(signature, expected)) return null

    try {
      const raw = fromBase64Url(payloadBase64)
      const parsed = JSON.parse(raw) as Partial<SessionTokenPayload>
      if (!parsed || typeof parsed !== 'object') return null
      if (!isSessionUser(parsed.u)) return null
      if (
        typeof parsed.iat !== 'number' ||
        typeof parsed.exp !== 'number' ||
        !Number.isFinite(parsed.iat) ||
        !Number.isFinite(parsed.exp)
      ) {
        return null
      }
      const createdAt = parsed.iat
      const expiresAt = parsed.exp
      if (expiresAt <= Date.now()) return null
      return {
        user: parsed.u,
        createdAt,
        expiresAt,
      }
    } catch {
      return null
    }
  }

  const destroy = (sessionId: string) => {
    // Stateless token sessions cannot be server-revoked without a denylist.
    // Logout still clears cookie/client token and expires naturally by TTL.
    void sessionId
  }

  return { create, get, destroy }
}
