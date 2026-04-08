import { join } from 'node:path'
import 'dotenv/config'

const DEFAULT_REQUIRED_GUILD_ID = '1316272904639479891'

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

function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
}

export type AppConfig = {
  port: number
  frontendOrigins: string[]
  frontendOrigin: string
  frontendSuccessUrl: string
  profileDbMode: 'memory' | 'json' | 'postgres'
  databaseUrl?: string
  sessionSecret: string
  sessionTtlMs: number
  discordClientId: string
  discordClientSecret: string
  discordRedirectUri: string
  discordBotEnabled: boolean
  discordBotToken?: string
  discordGuildId?: string
  approvalAdminDiscordId: string
  approvalRequestTimeoutMs: number
  approvalAllowOnUnavailable: boolean
  /** Absolute or relative path to profiles JSON array file */
  profileDbPath: string
}

export function loadConfig(): AppConfig {
  const frontendOriginEnv = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  const frontendOrigins = parseCsv(frontendOriginEnv)
  const frontendOrigin = frontendOrigins[0] ?? 'http://localhost:5173'
  const frontendSuccessUrl =
    process.env.FRONTEND_SUCCESS_URL ?? `${frontendOrigin}/#/members`
  const discordRedirectUri = getRequired('DISCORD_REDIRECT_URI')

  const profileDbPath =
    process.env.PROFILE_DB_PATH ?? join(process.cwd(), 'data', 'profiles.json')
  const profileDbModeRaw = (process.env.PROFILE_DB_MODE ?? 'json').toLowerCase()
  const profileDbMode: AppConfig['profileDbMode'] =
    profileDbModeRaw === 'memory' || profileDbModeRaw === 'postgres' ? profileDbModeRaw : 'json'

  return {
    port: getNumber('PORT', 4000),
    frontendOrigins,
    frontendOrigin,
    frontendSuccessUrl,
    profileDbMode,
    databaseUrl: process.env.DATABASE_URL,
    sessionSecret: getRequired('SESSION_SECRET'),
    sessionTtlMs: getNumber('SESSION_TTL_MS', 86_400_000),
    discordClientId: getRequired('DISCORD_CLIENT_ID'),
    discordClientSecret: getRequired('DISCORD_CLIENT_SECRET'),
    discordRedirectUri,
    discordBotEnabled: getBoolean('DISCORD_BOT_ENABLED', true),
    discordBotToken: process.env.DISCORD_BOT_TOKEN,
    discordGuildId: process.env.DISCORD_GUILD_ID ?? DEFAULT_REQUIRED_GUILD_ID,
    approvalAdminDiscordId: getRequired('APPROVAL_ADMIN_DISCORD_ID'),
    approvalRequestTimeoutMs: getNumber('APPROVAL_REQUEST_TIMEOUT_MS', 300_000),
    approvalAllowOnUnavailable: getBoolean('APPROVAL_ALLOW_ON_UNAVAILABLE', false),
    profileDbPath,
  }
}
