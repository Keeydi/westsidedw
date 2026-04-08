/** Vite injects empty string when CI vars are unset; treat that like missing. */
function envString(v: string | undefined): string | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? undefined : s
}

const rawBase = envString(import.meta.env.VITE_BACKEND_BASE_URL)
const normalizedBackendBase = rawBase ? rawBase.replace(/\/+$/, '') : ''
export const backendEnabled = normalizedBackendBase.length > 0

export const backendBaseUrl = normalizedBackendBase

function buildLoginUrl(): string {
  if (!backendEnabled) return '#'
  const fallback = `${backendBaseUrl}/auth/discord/login`
  const configured = envString(import.meta.env.VITE_DISCORD_AUTH_URL)
  if (!configured) return fallback

  try {
    const backend = new URL(backendBaseUrl)
    const login = new URL(configured)
    // Keep login and API on the same origin to avoid split-session auth issues.
    if (backend.origin !== login.origin) return fallback
    return login.toString()
  } catch {
    return fallback
  }
}

export const discordAuthUrl = buildLoginUrl()
