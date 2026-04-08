import type { SessionUser } from './sessionStore.js'
import type {
  ApiUserProfile,
  ProfileDatabase,
  ProfileRecordJson,
  ProfileSocialLinkJson,
  ProfileSocialsInputJson,
} from './profileDatabase.js'

function normalizeOptional(value: string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined
  const trimmed = String(value).trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeSocials(
  links: ProfileSocialsInputJson | undefined,
): ProfileSocialLinkJson[] | undefined {
  if (!links) return undefined

  if (Array.isArray(links)) {
    const normalized = links
      .map((entry) => {
        const platform = normalizeOptional(entry.platform)?.toLowerCase()
        const value = normalizeOptional(entry.value)
        const label = normalizeOptional(entry.label)
        if (!platform || !value) return undefined
        return {
          platform,
          value,
          ...(label ? { label } : {}),
        } satisfies ProfileSocialLinkJson
      })
      .filter((entry): entry is ProfileSocialLinkJson => Boolean(entry))
    return normalized.length > 0 ? normalized : undefined
  }

  const normalized: ProfileSocialLinkJson[] = Object.entries(links)
    .map(([platform, value]) => {
      const nextValue = normalizeOptional(value)
      if (!nextValue) return undefined
      return { platform: platform.toLowerCase(), value: nextValue }
    })
    .filter((entry): entry is ProfileSocialLinkJson => Boolean(entry))
  return normalized.length > 0 ? normalized : undefined
}

function recordToApi(record: ProfileRecordJson): ApiUserProfile {
  return {
    bio: record.bio,
    role: record.role,
    backgroundUrl: record.backgroundUrl,
    bannerUrl: record.bannerUrl,
    musicUrl: record.musicUrl,
    socialLinks: normalizeSocials(record.socials),
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
  if (patch.bannerUrl !== undefined) {
    const v = normalizeOptional(patch.bannerUrl)
    if (v) record.bannerUrl = v
    else delete record.bannerUrl
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

export function createMemoryProfileDatabase(): ProfileDatabase {
  const byId = new Map<string, ProfileRecordJson>()

  const findByUsername = (username: string): ProfileRecordJson | undefined => {
    const needle = username.toLowerCase()
    for (const value of byId.values()) {
      if (value.username.toLowerCase() === needle) return value
    }
    return undefined
  }

  const syncFromSession = async (user: SessionUser) => {
    const existing = byId.get(user.id)
    if (existing) {
      existing.username = user.username
      existing.displayName = user.displayName
      existing.avatar = user.avatarUrl
      if (user.bio && !existing.bio) {
        existing.bio = normalizeOptional(user.bio)
      }
      return
    }

    const row: ProfileRecordJson = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatarUrl,
    }
    const discordBio = normalizeOptional(user.bio)
    if (discordBio) row.bio = discordBio
    byId.set(user.id, row)
  }

  const getByUsername = async (username: string) => findByUsername(username)

  const isPublicMember = async (username: string) => Boolean(findByUsername(username)?.isGroupMember)

  const isGroupMemberById = async (userId: string) => Boolean(byId.get(userId)?.isGroupMember)

  const setGroupMemberById = async (userId: string, isGroupMember: boolean) => {
    const row = byId.get(userId)
    if (!row) return
    if (isGroupMember) row.isGroupMember = true
    else delete row.isGroupMember
  }

  const listPublicMembers = async () =>
    Array.from(byId.values())
      .filter((record) => record.isGroupMember)
      .map((record) => ({
        user: record,
        profile: recordToApi(record),
      }))

  const getApiProfile = async (userId: string) => {
    const record = byId.get(userId)
    if (!record) return {}
    return recordToApi(record)
  }

  const upsertApiProfile = async (userId: string, patch: ApiUserProfile) => {
    const record = byId.get(userId)
    if (!record) {
      throw new Error(`Profile row missing for user ${userId}; sync session first.`)
    }
    applyPatch(record, patch)
    return recordToApi(record)
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

