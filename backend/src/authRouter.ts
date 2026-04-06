import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import type { AppConfig } from './config.js'
import type { SessionStore, SessionUser } from './sessionStore.js'
import type { ProfileDatabase } from './profileDatabase.js'
import type { BotHandle } from './bot.js'
import { getSessionFromRequest } from './sessionAuth.js'

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

export function createAuthRouter(
  config: AppConfig,
  sessionStore: SessionStore,
  profileDb: ProfileDatabase,
  bot: BotHandle,
): Router {
  const router = Router()
  const sessionCookieBaseOptions = {
    httpOnly: true,
    // GitHub Pages frontend and Railway backend are cross-site, so the
    // session cookie must be SameSite=None in secure (HTTPS) environments.
    sameSite: (config.cookieSecure ? 'none' : 'lax') as 'none' | 'lax',
    secure: config.cookieSecure,
    path: '/',
  }

  router.get('/discord/login', (_req, res) => {
    const state = randomBytes(16).toString('hex')
    res.cookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      // OAuth redirects back from discord.com to Railway (cross-site), so
      // keep state cookie cross-site capable in secure production envs.
      sameSite: (config.cookieSecure ? 'none' : 'lax') as 'none' | 'lax',
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
    await profileDb.syncFromSession(sessionUser)

    const alreadyApproved = await profileDb.isGroupMemberById(sessionUser.id)
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
        await profileDb.setGroupMemberById(sessionUser.id, true)
      } else {
        await profileDb.setGroupMemberById(sessionUser.id, false)
        res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
        res.redirect(`${config.frontendOrigin}/#/members?approval=${decision}`)
        return
      }
    }

    const sessionId = sessionStore.create(sessionUser)

    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })
    res.cookie(SESSION_COOKIE, sessionId, {
      ...sessionCookieBaseOptions,
      maxAge: config.sessionTtlMs,
    })

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
    res.clearCookie(SESSION_COOKIE, sessionCookieBaseOptions)
    res.status(204).send()
  })

  return router
}
