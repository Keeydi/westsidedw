import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { createAuthRouter } from './authRouter.js'
import { startDiscordBot } from './bot.js'
import { loadConfig } from './config.js'
import { createJsonProfileDatabase } from './jsonProfileDatabase.js'
import { createPostgresProfileDatabase } from './postgresProfileDatabase.js'
import { createProfileRouter } from './profileRouter.js'
import { createSessionStore } from './sessionStore.js'

const config = loadConfig()
const sessions = createSessionStore(config.sessionTtlMs, config.sessionSecret)
const bot = startDiscordBot(config.discordBotToken)
const profileDb = config.databaseUrl
  ? await createPostgresProfileDatabase(config.databaseUrl)
  : createJsonProfileDatabase(config.profileDbPath)

const app = express()

app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
    allowedHeaders: ['Content-Type', 'x-westside-sid'],
  }),
)
app.use(express.json())
app.use(cookieParser(config.sessionSecret))

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

app.use('/auth', createAuthRouter(config, sessions, profileDb, bot))
app.use('/profile', createProfileRouter(sessions, profileDb))

app.listen(config.port, () => {
  console.log(`Westside backend listening on http://localhost:${config.port}`)
  if (config.databaseUrl) {
    console.log('Profiles database: PostgreSQL (DATABASE_URL)')
  } else {
    console.log(`Profiles database: JSON (${config.profileDbPath})`)
  }
})
