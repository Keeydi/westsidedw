import { mkdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import type { Request } from 'express'
import multer from 'multer'
import type { ApiUserProfile, ProfileDatabase } from './profileDatabase.js'
import type { BotHandle } from './bot.js'
import type { SessionStore, SessionUser } from './sessionStore.js'
import { getSessionFromRequest } from './sessionAuth.js'

export function createProfileRouter(
  sessionStore: SessionStore,
  profileDb: ProfileDatabase,
  bot: BotHandle,
): Router {
  const router = Router()
  const musicUploadDir = resolve(process.cwd(), 'data', 'uploads', 'music')
  const upload = multer({
    storage: multer.diskStorage({
      destination: (
        _req: Request,
        _file: Express.Multer.File,
        callback: (error: Error | null, destination: string) => void,
      ) => {
        try {
          mkdirSync(musicUploadDir, { recursive: true })
          callback(null, musicUploadDir)
        } catch (error) {
          callback(error as Error, musicUploadDir)
        }
      },
      filename: (
        _req: Request,
        file: Express.Multer.File,
        callback: (error: Error | null, filename: string) => void,
      ) => {
        const rawExt = extname(file.originalname).toLowerCase()
        const extension = rawExt === '.mp3' ? '.mp3' : '.mp3'
        callback(null, `${Date.now()}-${randomUUID()}${extension}`)
      },
    }),
    fileFilter: (
      _req: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback,
    ) => {
      const mime = file.mimetype.toLowerCase()
      const isMp3Mime = mime === 'audio/mpeg' || mime === 'audio/mp3' || mime === 'audio/x-mpeg'
      const isMp3Ext = extname(file.originalname).toLowerCase() === '.mp3'
      callback(null, isMp3Mime || isMp3Ext)
    },
    limits: {
      fileSize: 15 * 1024 * 1024,
      files: 1,
    },
  })

  router.get('/public-members', async (_req, res) => {
    const dbMembers = await profileDb.listPublicMembers()
    const statuses = await Promise.all(
      dbMembers.map(({ user }) => bot.getPresenceStatus(user.id)),
    )
    const members = dbMembers.map(({ user, profile }, index) => ({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatar,
        discordStatus: statuses[index] ?? 'offline',
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
        id: record.id,
        username: record.username,
        displayName: record.displayName,
        avatarUrl: record.avatar,
        discordStatus: await bot.getPresenceStatus(record.id),
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

  router.post('/me/music-upload', (req, res, next) => {
    const resolved = getSessionFromRequest(req, sessionStore)
    if (!resolved) {
      res.status(401).json({ authenticated: false })
      return
    }
    res.locals.sessionUser = resolved.session.user
    next()
  })

  router.post('/me/music-upload', (req, res, next) => {
    upload.single('music')(req, res, (error: unknown) => {
      if (!error) {
        next()
        return
      }
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: 'MP3 file is too large (max 15MB).' })
        return
      }
      res.status(400).json({ error: 'Invalid upload. Please upload a valid MP3 file.' })
    })
  })

  router.post('/me/music-upload', async (req, res) => {
    const sessionUser = res.locals.sessionUser as SessionUser | undefined
    if (!sessionUser?.id) {
      res.status(401).json({ authenticated: false })
      return
    }
    if (!req.file) {
      res.status(400).json({ error: 'Missing MP3 file.' })
      return
    }

    const host = req.get('host')
    if (!host) {
      res.status(500).json({ error: 'Unable to resolve upload host.' })
      return
    }
    await profileDb.syncFromSession(sessionUser)
    const originalBaseName =
      req.file.originalname.replace(/\.[^/.]+$/, '').trim() || 'Uploaded Track'
    const fileUrl = `${req.protocol}://${host}/media/music/${req.file.filename}?name=${encodeURIComponent(originalBaseName)}`
    const profile = await profileDb.upsertApiProfile(sessionUser.id, { musicUrl: fileUrl })
    res.json({ ok: true, profile, musicUrl: fileUrl })
  })

  return router
}
