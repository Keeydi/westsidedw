import { createApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = await createApp(config)

app.listen(config.port, () => {
  console.log(`Westside backend listening on port ${config.port}`)
  console.log(`Allowed frontend origins: ${config.frontendOrigins.join(', ')}`)
  if (config.profileDbMode === 'memory') {
    console.log('Profiles database: Memory (non-persistent)')
  } else if (config.profileDbMode === 'postgres') {
    console.log('Profiles database: PostgreSQL (PROFILE_DB_MODE=postgres)')
  } else if (config.databaseUrl) {
    console.log('Profiles database: PostgreSQL (DATABASE_URL)')
  } else {
    console.log(`Profiles database: JSON (${config.profileDbPath})`)
  }
  console.log(
    `Discord bot: ${
      config.discordBotEnabled && config.discordBotToken ? 'enabled' : 'disabled'
    }`,
  )
})
