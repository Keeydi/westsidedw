const SESSION_STORAGE_KEY = 'dyiskumpadres_session_id'
const LEGACY_SESSION_STORAGE_KEY = 'westside_session_id'

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null
  let sid = window.localStorage.getItem(SESSION_STORAGE_KEY)
  if (!sid?.trim()) {
    const legacy = window.localStorage.getItem(LEGACY_SESSION_STORAGE_KEY)
    if (legacy?.trim()) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, legacy.trim())
      window.localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY)
      sid = legacy
    }
  }
  return sid?.trim() ? sid : null
}

export function setSessionId(sessionId: string | null): void {
  if (typeof window === 'undefined') return
  if (sessionId && sessionId.trim()) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, sessionId.trim())
    return
  }
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
}

function buildUrlWithHashAndSearch(
  searchParams: URLSearchParams,
  hash: string,
): string {
  const nextSearch = searchParams.toString()
  return `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`
}

/**
 * Reads sid from URL and stores it in localStorage.
 * Supports:
 * - hash route query: #/members?sid=...
 * - regular query: ?sid=...
 * Always removes sid from the URL after consuming it.
 */
export function consumeSidFromHashRoute(): string | null {
  if (typeof window === 'undefined') return null
  const searchParams = new URLSearchParams(window.location.search)
  const sidFromSearch = searchParams.get('sid')
  if (sidFromSearch?.trim()) {
    setSessionId(sidFromSearch)
    searchParams.delete('sid')
    const nextUrl = buildUrlWithHashAndSearch(searchParams, window.location.hash)
    window.history.replaceState(null, '', nextUrl)
    return sidFromSearch
  }

  const hash = window.location.hash
  if (!hash.startsWith('#')) return null

  const hashBody = hash.slice(1)
  const queryIndex = hashBody.indexOf('?')
  if (queryIndex < 0) return null

  const route = hashBody.slice(0, queryIndex)
  const query = hashBody.slice(queryIndex + 1)
  const params = new URLSearchParams(query)
  const sid = params.get('sid')
  if (!sid?.trim()) return null

  setSessionId(sid)
  params.delete('sid')
  const nextHash = params.toString() ? `#${route}?${params.toString()}` : `#${route}`
  const nextUrl = buildUrlWithHashAndSearch(searchParams, nextHash)
  window.history.replaceState(null, '', nextUrl)
  return sid
}

export function buildSessionHeaders(
  existing?: HeadersInit,
): HeadersInit | undefined {
  const sid = getSessionId()
  if (!sid) return existing

  if (!existing) {
    return { 'x-dyiskumpadres-sid': sid }
  }

  if (existing instanceof Headers) {
    const next = new Headers(existing)
    next.set('x-dyiskumpadres-sid', sid)
    return next
  }

  if (Array.isArray(existing)) {
    const next = [...existing]
    const idx = next.findIndex(([k]) => k.toLowerCase() === 'x-dyiskumpadres-sid')
    if (idx >= 0) next[idx] = ['x-dyiskumpadres-sid', sid]
    else next.push(['x-dyiskumpadres-sid', sid])
    return next
  }

  return {
    ...existing,
    'x-dyiskumpadres-sid': sid,
  }
}
