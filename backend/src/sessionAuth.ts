import type { Request } from 'express'
import type { SessionStore } from './sessionStore.js'

const SESSION_COOKIE = 'westside_sid'
const SESSION_HEADER = 'x-westside-sid'

export function getSessionIdFromRequest(req: Request): string | undefined {
  const cookieSid = req.cookies?.[SESSION_COOKIE]
  if (typeof cookieSid === 'string' && cookieSid.trim()) return cookieSid

  const headerSid = req.header(SESSION_HEADER)
  if (typeof headerSid === 'string' && headerSid.trim()) return headerSid.trim()

  return undefined
}

export function getSessionFromRequest(req: Request, sessionStore: SessionStore) {
  const sessionId = getSessionIdFromRequest(req)
  if (!sessionId) return undefined
  const session = sessionStore.get(sessionId)
  if (!session) return undefined
  return { sessionId, session }
}
