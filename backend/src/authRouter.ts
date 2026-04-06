import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import type { AppConfig } from './config.js'
import type { SessionStore, SessionUser } from './sessionStore.js'
import type { ProfileDatabase } from './jsonProfileDatabase.js'
import type { BotHandle } from './bot.js'

const SESSION_COOKIE = 'westside_sid'
const OAUTH_STATE_COOKIE = 'westside_oauth_state'

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

export function createAuthRouter(
  config: AppConfig,
  sessionStore: SessionStore,
  profileDb: ProfileDatabase,
  bot: BotHandle,
): Router {
  const router = Router()

  router.get('/discord/login', (_req, res) => {
    const state = randomBytes(16).toString('hex')
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: 10 * 60 * 1000,
      path: '/',
    })

    const params = new URLSearchParams({
      client_id: config.discordClientId,
      redirect_uri: config.discordRedirectUri,
      response_type: 'code',
      scope: 'identify email',
      prompt: 'consent',
      state,
    })

    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`)
  })

  router.get('/discord/callback', async (req, res) => {
    const { code, state } = req.query
    const stateCookie = req.cookies?.[OAUTH_STATE_COOKIE]

    if (
      typeof code !== 'string' ||
      typeof state !== 'string' ||
      !stateCookie ||
      stateCookie !== state
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
    profileDb.syncFromSession(sessionUser)

    const alreadyApproved = profileDb.isGroupMemberById(sessionUser.id)
    if (!alreadyApproved) {
      const decision = await bot.requestMembershipApproval({
        approverDiscordId: config.approvalAdminDiscordId,
        user: {
          id: sessionUser.id,
          username: sessionUser.username,
          displayName: sessionUser.displayName,
        },
        timeoutMs: config.approvalRequestTimeoutMs,
      })

      if (decision === 'approved') {
        profileDb.setGroupMemberById(sessionUser.id, true)
      } else {
        profileDb.setGroupMemberById(sessionUser.id, false)
        res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
        res.redirect(`${config.frontendOrigin}/#/members?approval=${decision}`)
        return
      }
    }

    const sessionId = sessionStore.create(sessionUser)

    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.cookieSecure,
      maxAge: config.sessionTtlMs,
      path: '/',
    })

    res.redirect(config.frontendSuccessUrl)
  })

  router.get('/me', (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE]
    if (!sessionId) {
      res.status(401).json({ authenticated: false })
      return
    }

    const session = sessionStore.get(sessionId)
    if (!session) {
      res.clearCookie(SESSION_COOKIE, { path: '/' })
      res.status(401).json({ authenticated: false })
      return
    }

    res.json({
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt,
    })
  })

  router.post('/logout', (req, res) => {
    const sessionId = req.cookies?.[SESSION_COOKIE]
    if (sessionId) {
      sessionStore.destroy(sessionId)
    }
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.status(204).send()
  })

  return router
}
