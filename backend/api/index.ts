import type { IncomingMessage, ServerResponse } from 'node:http'
import { createApp } from '../src/app.js'
import { loadConfig } from '../src/config.js'

const config = loadConfig()
const appPromise = createApp(config)

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await appPromise
  return app(req, res)
}
