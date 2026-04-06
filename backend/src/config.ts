import { join } from 'node:path'
import 'dotenv/config'

function getRequired(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function getBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value.toLowerCase() === 'true'
}

function getNumber(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : fallback
}

export type AppConfig = {
  port: number
  frontendOrigin: string
  frontendSuccessUrl: string
  sessionSecret: string
  sessionTtlMs: number
  cookieSecure: boolean
  discordClientId: string
  discordClientSecret: string
  discordRedirectUri: string
  discordBotToken?: string
  approvalAdminDiscordId: string
  approvalRequestTimeoutMs: number
  /** Absolute or relative path to profiles JSON array file */
  profileDbPath: string
}

export function loadConfig(): AppConfig {
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  const frontendSuccessUrl =
    process.env.FRONTEND_SUCCESS_URL ?? `${frontendOrigin}/#/members`

  const profileDbPath =
    process.env.PROFILE_DB_PATH ?? join(process.cwd(), 'data', 'profiles.json')

  return {
    port: getNumber('PORT', 4000),
    frontendOrigin,
    frontendSuccessUrl,
    sessionSecret: getRequired('SESSION_SECRET'),
    sessionTtlMs: getNumber('SESSION_TTL_MS', 86_400_000),
    cookieSecure: getBoolean('COOKIE_SECURE', false),
    discordClientId: getRequired('DISCORD_CLIENT_ID'),
    discordClientSecret: getRequired('DISCORD_CLIENT_SECRET'),
    discordRedirectUri: getRequired('DISCORD_REDIRECT_URI'),
    discordBotToken: process.env.DISCORD_BOT_TOKEN,
    approvalAdminDiscordId: getRequired('APPROVAL_ADMIN_DISCORD_ID'),
    approvalRequestTimeoutMs: getNumber('APPROVAL_REQUEST_TIMEOUT_MS', 300_000),
    profileDbPath,
  }
}
