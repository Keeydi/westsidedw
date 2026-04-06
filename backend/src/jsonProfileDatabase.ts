import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { SessionUser } from './sessionStore.js'

/** Social links as stored in profiles.json (`socials`) */
export type ProfileSocialsJson = {
  discord?: string
  github?: string
  twitch?: string
  tiktok?: string
  kick?: string
  youtube?: string
}

/**
 * One profile row in `data/profiles.json` (JSON array).
 * Discord identity + editable fields.
 */
export type ProfileRecordJson = {
  id: string
  username: string
  displayName: string
  avatar: string | null
  /** Only approved group members are visible on public members pages. */
  isGroupMember?: boolean
  bio?: string
  role?: string
  socials?: ProfileSocialsJson
  backgroundUrl?: string
  musicUrl?: string
}

/** Shape returned to the frontend (`socialLinks` matches existing API). */
export type ApiUserProfile = {
  bio?: string
  role?: string
  backgroundUrl?: string
  musicUrl?: string
  socialLinks?: ProfileSocialsJson
}

export type ProfileDatabase = {
  syncFromSession(user: SessionUser): void
  getByUsername(username: string): ProfileRecordJson | undefined
  isPublicMember(username: string): boolean
  isGroupMemberById(userId: string): boolean
  setGroupMemberById(userId: string, isGroupMember: boolean): void
  listPublicMembers(): Array<{ user: ProfileRecordJson; profile: ApiUserProfile }>
  getApiProfile(userId: string): ApiUserProfile
  upsertApiProfile(userId: string, patch: ApiUserProfile): ApiUserProfile
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeSocials(links: ProfileSocialsJson | undefined): ProfileSocialsJson | undefined {
  if (!links) return undefined
  const normalized: ProfileSocialsJson = {
    discord: normalizeOptional(links.discord),
    github: normalizeOptional(links.github),
    twitch: normalizeOptional(links.twitch),
    tiktok: normalizeOptional(links.tiktok),
    kick: normalizeOptional(links.kick),
    youtube: normalizeOptional(links.youtube),
  }
  return Object.values(normalized).some(Boolean) ? normalized : undefined
}

function recordToApi(record: ProfileRecordJson): ApiUserProfile {
  return {
    bio: record.bio,
    role: record.role,
    backgroundUrl: record.backgroundUrl,
    musicUrl: record.musicUrl,
    socialLinks: record.socials,
  }
}

function applyPatch(record: ProfileRecordJson, patch: ApiUserProfile): void {
  if (patch.bio !== undefined) {
    const v = normalizeOptional(patch.bio)
    if (v) record.bio = v
    else delete record.bio
  }
  if (patch.role !== undefined) {
    const v = normalizeOptional(patch.role)
    if (v) record.role = v
    else delete record.role
  }
  if (patch.backgroundUrl !== undefined) {
    const v = normalizeOptional(patch.backgroundUrl)
    if (v) record.backgroundUrl = v
    else delete record.backgroundUrl
  }
  if (patch.musicUrl !== undefined) {
    const v = normalizeOptional(patch.musicUrl)
    if (v) record.musicUrl = v
    else delete record.musicUrl
  }
  if (patch.socialLinks !== undefined) {
    const next = normalizeSocials(patch.socialLinks)
    if (next) record.socials = next
    else delete record.socials
  }
}

function isRecord(value: unknown): value is ProfileRecordJson {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.id === 'string' &&
    typeof o.username === 'string' &&
    typeof o.displayName === 'string' &&
    (o.avatar === null || typeof o.avatar === 'string')
  )
}

export function createJsonProfileDatabase(filePath: string): ProfileDatabase {
  const absolutePath = resolve(filePath)
  let records: ProfileRecordJson[] = []
  const byId = new Map<string, ProfileRecordJson>()
  const byUsernameLower = new Map<string, ProfileRecordJson>()

  const rebuildIndexes = () => {
    byId.clear()
    byUsernameLower.clear()
    for (const r of records) {
      byId.set(r.id, r)
      byUsernameLower.set(r.username.toLowerCase(), r)
    }
  }

  const load = () => {
    try {
      if (!existsSync(absolutePath)) {
        records = []
        rebuildIndexes()
        return
      }
      const text = readFileSync(absolutePath, 'utf8')
      const parsed = JSON.parse(text) as unknown
      if (!Array.isArray(parsed)) {
        console.error('[profiles] JSON root must be an array; using empty list.')
        records = []
      } else {
        records = parsed.filter(isRecord)
      }
      rebuildIndexes()
    } catch (err) {
      console.error('[profiles] Failed to load JSON database:', err)
      records = []
      rebuildIndexes()
    }
  }

  const save = () => {
    mkdirSync(dirname(absolutePath), { recursive: true })
    const tmp = `${absolutePath}.tmp`
    writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
    renameSync(tmp, absolutePath)
  }

  load()

  const syncFromSession = (user: SessionUser) => {
    const existing = byId.get(user.id)
    const avatar = user.avatarUrl
    if (existing) {
      existing.username = user.username
      existing.displayName = user.displayName
      existing.avatar = avatar
      if (user.bio && !existing.bio) {
        existing.bio = normalizeOptional(user.bio)
      }
      rebuildIndexes()
      save()
      return
    }

    const row: ProfileRecordJson = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar,
    }
    const discordBio = normalizeOptional(user.bio)
    if (discordBio) row.bio = discordBio
    records.push(row)
    rebuildIndexes()
    save()
  }

  const getByUsername = (username: string) => {
    return byUsernameLower.get(username.toLowerCase())
  }

  const isPublicMember = (username: string) => {
    const row = byUsernameLower.get(username.toLowerCase())
    return Boolean(row?.isGroupMember)
  }

  const isGroupMemberById = (userId: string) => {
    return Boolean(byId.get(userId)?.isGroupMember)
  }

  const setGroupMemberById = (userId: string, isGroupMember: boolean) => {
    const row = byId.get(userId)
    if (!row) return
    if (isGroupMember) row.isGroupMember = true
    else delete row.isGroupMember
    rebuildIndexes()
    save()
  }

  const listPublicMembers = () => {
    return records
      .filter((r) => r.isGroupMember)
      .map((r) => ({
        user: r,
        profile: recordToApi(r),
      }))
  }

  const getApiProfile = (userId: string) => {
    const r = byId.get(userId)
    if (!r) return {}
    return recordToApi(r)
  }

  const upsertApiProfile = (userId: string, patch: ApiUserProfile) => {
    const r = byId.get(userId)
    if (!r) {
      throw new Error(`Profile row missing for user ${userId}; sync session first.`)
    }
    applyPatch(r, patch)
    rebuildIndexes()
    save()
    return recordToApi(r)
  }

  return {
    syncFromSession,
    getByUsername,
    isPublicMember,
    isGroupMemberById,
    setGroupMemberById,
    listPublicMembers,
    getApiProfile,
    upsertApiProfile,
  }
}
