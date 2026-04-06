import { Router } from 'express'
import type { ApiUserProfile, ProfileDatabase } from './profileDatabase.js'
import type { SessionStore } from './sessionStore.js'
import { getSessionFromRequest } from './sessionAuth.js'

export function createProfileRouter(
  sessionStore: SessionStore,
  profileDb: ProfileDatabase,
): Router {
  const router = Router()

  router.get('/public-members', async (_req, res) => {
    const dbMembers = await profileDb.listPublicMembers()
    const members = dbMembers.map(({ user, profile }) => ({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatar,
      },
      profile,
    }))
    res.json({ members })
  })

  router.get('/public/:username', async (req, res) => {
    const raw = req.params.username
    if (!raw || typeof raw !== 'string') {
      res.status(400).json({ error: 'Invalid username.' })
      return
    }

    const record = await profileDb.getByUsername(raw)
    if (!record || !(await profileDb.isPublicMember(record.username))) {
      res.status(404).json({ error: 'Profile not found.' })
      return
    }

    const api = await profileDb.getApiProfile(record.id)
    res.json({
      user: {
        username: record.username,
        displayName: record.displayName,
        avatarUrl: record.avatar,
      },
      profile: api,
    })
  })

  router.get('/me', async (req, res) => {
    const resolved = getSessionFromRequest(req, sessionStore)
    if (!resolved) {
      res.status(401).json({ authenticated: false })
      return
    }

    await profileDb.syncFromSession(resolved.session.user)
    const profile = await profileDb.getApiProfile(resolved.session.user.id)
    res.json({
      authenticated: true,
      profile,
    })
  })

  router.put('/me', async (req, res) => {
    const resolved = getSessionFromRequest(req, sessionStore)
    if (!resolved) {
      res.status(401).json({ authenticated: false })
      return
    }

    await profileDb.syncFromSession(resolved.session.user)
    const payload = req.body as ApiUserProfile
    const profile = await profileDb.upsertApiProfile(resolved.session.user.id, payload)
    res.json({
      ok: true,
      profile,
    })
  })

  return router
}
