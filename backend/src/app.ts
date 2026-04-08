import cors from 'cors'
import express from 'express'
import { join } from 'node:path'
import { createAuthRouter } from './authRouter.js'
import { startDiscordBot } from './bot.js'
import type { AppConfig } from './config.js'
import { createJsonProfileDatabase } from './jsonProfileDatabase.js'
import { createJsonMediaHighlightsStore } from './mediaHighlightsStore.js'
import { createMemoryProfileDatabase } from './memoryProfileDatabase.js'
import { createPostgresProfileDatabase } from './postgresProfileDatabase.js'
import type { ProfileDatabase } from './profileDatabase.js'
import { createProfileRouter } from './profileRouter.js'
import { createSessionStore } from './sessionStore.js'

function normalizeOrigin(value: string): string {
  try {
    const parsed = new URL(value)
    return `${parsed.protocol}//${parsed.host}`.toLowerCase()
  } catch {
    return value.replace(/\/+$/, '').toLowerCase()
  }
}

function isLocalhostOrigin(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export async function createApp(config: AppConfig) {
  const sessions = createSessionStore(config.sessionTtlMs, config.sessionSecret)
  const mediaHighlightsStore = createJsonMediaHighlightsStore(
    join(process.cwd(), 'data', 'media-highlights.json'),
  )
  let profileDb: ProfileDatabase
  if (config.profileDbMode === 'memory') {
    profileDb = createMemoryProfileDatabase()
  } else if (config.profileDbMode === 'postgres') {
    if (!config.databaseUrl) {
      throw new Error('PROFILE_DB_MODE=postgres requires DATABASE_URL')
    }
    profileDb = await createPostgresProfileDatabase(config.databaseUrl)
  } else if (config.databaseUrl) {
    profileDb = await createPostgresProfileDatabase(config.databaseUrl)
  } else {
    profileDb = createJsonProfileDatabase(config.profileDbPath)
  }
  const bot = startDiscordBot(
    config.discordBotToken,
    config.discordBotEnabled,
    config.discordGuildId,
    {
      profileDb,
      mediaHighlightsStore,
    },
  )
  const allowedOrigins = new Set(config.frontendOrigins.map(normalizeOrigin))

  const app = express()
  app.disable('x-powered-by')

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true)
          return
        }

        const normalized = normalizeOrigin(origin)
        if (allowedOrigins.has(normalized)) {
          callback(null, true)
          return
        }

        if (process.env.NODE_ENV !== 'production' && isLocalhostOrigin(origin)) {
          callback(null, true)
          return
        }

        callback(null, false)
      },
      allowedHeaders: ['Content-Type', 'x-westside-sid'],
      methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
      credentials: true,
      optionsSuccessStatus: 204,
    }),
  )
  app.use(express.json({ limit: '256kb' }))
  app.use('/media', express.static(join(process.cwd(), 'data', 'uploads')))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      botStatus: bot.getStatus(),
    })
  })

  app.get('/bot/status', (_req, res) => {
    res.json({
      status: bot.getStatus(),
      error: bot.getError(),
    })
  })

  app.get('/media/highlights', async (_req, res) => {
    const items = await mediaHighlightsStore.list()
    res.json({ items })
  })

  app.use('/auth', createAuthRouter(config, sessions, profileDb, bot))
  app.use('/profile', createProfileRouter(sessions, profileDb, bot))

  return app
}
