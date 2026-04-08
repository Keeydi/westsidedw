import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { Router } from 'express'
import type { AppConfig } from './config.js'
import type { SessionStore, SessionUser } from './sessionStore.js'
import type { ProfileDatabase } from './profileDatabase.js'
import type { BotHandle } from './bot.js'
import { getSessionFromRequest } from './sessionAuth.js'

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

type DiscordTokenResponse = {
  access_token: string
}

type DiscordUserResponse = {
  id: string
  username: string
  global_name: string | null
  avatar: string | null
  email?: string
  bio?: string
}

type DiscordGuildResponse = {
  id: string
}

function toAvatarUrl(user: DiscordUserResponse): string | null {
  if (!user.avatar) return null
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
}

function buildSessionUser(user: DiscordUserResponse): SessionUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.global_name ?? user.username,
    avatarUrl: toAvatarUrl(user),
    email: user.email,
    bio: user.bio,
  }
}

function addSessionToFrontendUrl(url: string, sessionId: string): string {
  const hashIndex = url.indexOf('#')
  if (hashIndex >= 0) {
    const beforeHash = url.slice(0, hashIndex)
    const hashPart = url.slice(hashIndex + 1)
    const queryIndex = hashPart.indexOf('?')
    const route = queryIndex >= 0 ? hashPart.slice(0, queryIndex) : hashPart
    const query = queryIndex >= 0 ? hashPart.slice(queryIndex + 1) : ''
    const params = new URLSearchParams(query)
    params.set('sid', sessionId)
    const nextQuery = params.toString()
    return `${beforeHash}#${route}${nextQuery ? `?${nextQuery}` : ''}`
  }

  const parsed = new URL(url)
  parsed.searchParams.set('sid', sessionId)
  return parsed.toString()
}

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function signState(payloadBase64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

function safeEq(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

function createSignedOAuthState(secret: string): string {
  const payload = {
    iat: Date.now(),
    r: randomBytes(12).toString('hex'),
  }
  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  return `${payloadBase64}.${signState(payloadBase64, secret)}`
}

function verifySignedOAuthState(
  state: string,
  secret: string,
  ttlMs: number,
): boolean {
  const [payloadBase64, signature] = state.split('.')
  if (!payloadBase64 || !signature) return false

  const expected = signState(payloadBase64, secret)
  if (!safeEq(signature, expected)) return false

  try {
    const parsed = JSON.parse(fromBase64Url(payloadBase64)) as { iat?: number }
    if (typeof parsed.iat !== 'number' || !Number.isFinite(parsed.iat)) {
      return false
    }
    return Date.now() - parsed.iat <= ttlMs
  } catch {
    return false
  }
}

export function createAuthRouter(
  config: AppConfig,
  sessionStore: SessionStore,
  profileDb: ProfileDatabase,
  bot: BotHandle,
): Router {
  const router = Router()

  router.get('/discord/login', (_req, res) => {
    const state = createSignedOAuthState(config.sessionSecret)

    const params = new URLSearchParams({
      client_id: config.discordClientId,
      redirect_uri: config.discordRedirectUri,
      response_type: 'code',
      scope: 'identify email guilds',
      prompt: 'consent',
      state,
    })

    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`)
  })

  router.get('/discord/callback', async (req, res) => {
    const { code, state } = req.query

    if (
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      !verifySignedOAuthState(state, config.sessionSecret, OAUTH_STATE_TTL_MS)
    ) {
      res.status(400).json({ error: 'Invalid OAuth callback payload.' })
      return
    }

    const tokenBody = new URLSearchParams({
      client_id: config.discordClientId,
      client_secret: config.discordClientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.discordRedirectUri,
    })

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    })

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text()
      console.error('Discord token exchange failed:', body)
      res.status(502).json({ error: 'Discord token exchange failed.' })
      return
    }

    const tokenJson = (await tokenResponse.json()) as DiscordTokenResponse
    const guildResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    })

    if (!guildResponse.ok) {
      const body = await guildResponse.text()
      console.error('Discord guild membership fetch failed:', body)
      res.status(502).json({ error: 'Failed to verify Discord server membership.' })
      return
    }

    const guilds = (await guildResponse.json()) as DiscordGuildResponse[]
    const requiredGuildId = config.discordGuildId?.trim()
    const isInRequiredGuild = requiredGuildId
      ? guilds.some((guild) => guild.id === requiredGuildId)
      : true
    if (!isInRequiredGuild) {
      res.redirect(`${config.frontendOrigin}/#/members?approval=not_in_server`)
      return
    }

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    })

    if (!userResponse.ok) {
      const body = await userResponse.text()
      console.error('Discord user fetch failed:', body)
      res.status(502).json({ error: 'Failed to fetch Discord user profile.' })
      return
    }

    const userJson = (await userResponse.json()) as DiscordUserResponse
    const sessionUser = buildSessionUser(userJson)
    await profileDb.syncFromSession(sessionUser)
    const currentProfile = await profileDb.getApiProfile(sessionUser.id)

    const alreadyApproved = await profileDb.isGroupMemberById(sessionUser.id)
    if (!alreadyApproved) {
      const approval = await bot.requestMembershipApproval({
        approverDiscordId: config.approvalAdminDiscordId,
        user: {
          id: sessionUser.id,
          username: sessionUser.username,
          displayName: sessionUser.displayName,
          avatarUrl: sessionUser.avatarUrl,
          email: sessionUser.email,
          bio: sessionUser.bio,
          requestedRole: currentProfile.role,
        },
        timeoutMs: config.approvalRequestTimeoutMs,
      })

      if (approval.decision === 'approved') {
        await profileDb.setGroupMemberById(sessionUser.id, true)
        if (approval.assignedRole) {
          await profileDb.upsertApiProfile(sessionUser.id, { role: approval.assignedRole })
        }
      } else if (approval.decision === 'unavailable' && config.approvalAllowOnUnavailable) {
        // Serverless environments may not keep a persistent Discord bot socket.
        // Allowing this path keeps login functional when bot approval is disabled.
        await profileDb.setGroupMemberById(sessionUser.id, true)
      } else {
        await profileDb.setGroupMemberById(sessionUser.id, false)
        res.redirect(`${config.frontendOrigin}/#/members?approval=${approval.decision}`)
        return
      }
    }

    const sessionId = sessionStore.create(sessionUser)
    res.redirect(addSessionToFrontendUrl(config.frontendSuccessUrl, sessionId))
  })

  router.get('/me', (req, res) => {
    const resolved = getSessionFromRequest(req, sessionStore)
    if (!resolved) {
      res.status(401).json({ authenticated: false })
      return
    }

    res.json({
      authenticated: true,
      user: resolved.session.user,
      expiresAt: resolved.session.expiresAt,
    })
  })

  router.post('/logout', (req, res) => {
    const resolved = getSessionFromRequest(req, sessionStore)
    if (resolved) {
      sessionStore.destroy(resolved.sessionId)
    }
    res.status(204).send()
  })

  return router
}
