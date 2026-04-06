/** Vite injects empty string when CI vars are unset; treat that like missing. */
function envString(v: string | undefined): string | undefined {
  const s = typeof v === 'string' ? v.trim() : ''
  return s === '' ? undefined : s
}

const rawBase = envString(import.meta.env.VITE_BACKEND_BASE_URL)

export const backendBaseUrl = rawBase ?? 'http://localhost:4000'

export const discordAuthUrl =
  envString(import.meta.env.VITE_DISCORD_AUTH_URL) ??
  `${backendBaseUrl}/auth/discord/login`
