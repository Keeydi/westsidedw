import { Pool } from 'pg'
import type { SessionUser } from './sessionStore.js'
import type {
  ApiUserProfile,
  ProfileDatabase,
  ProfileRecordJson,
  ProfileSocialsJson,
} from './profileDatabase.js'

type ProfileRow = {
  id: string
  username: string
  display_name: string
  avatar: string | null
  is_group_member: boolean
  bio: string | null
  role: string | null
  socials: ProfileSocialsJson | null
  background_url: string | null
  music_url: string | null
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

function rowToRecord(row: ProfileRow): ProfileRecordJson {
  const record: ProfileRecordJson = {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatar: row.avatar,
  }
  if (row.is_group_member) record.isGroupMember = true
  if (row.bio) record.bio = row.bio
  if (row.role) record.role = row.role
  if (row.socials) record.socials = row.socials
  if (row.background_url) record.backgroundUrl = row.background_url
  if (row.music_url) record.musicUrl = row.music_url
  return record
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

export async function createPostgresProfileDatabase(
  databaseUrl: string,
): Promise<ProfileDatabase> {
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: false },
  })

  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar TEXT NULL,
      is_group_member BOOLEAN NOT NULL DEFAULT FALSE,
      bio TEXT NULL,
      role TEXT NULL,
      socials JSONB NULL,
      background_url TEXT NULL,
      music_url TEXT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `)

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_lower_idx
      ON profiles ((LOWER(username)));
  `)

  const syncFromSession = async (user: SessionUser) => {
    const discordBio = normalizeOptional(user.bio)
    await pool.query(
      `
      INSERT INTO profiles (id, username, display_name, avatar, bio, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar = EXCLUDED.avatar,
        bio = COALESCE(profiles.bio, EXCLUDED.bio),
        updated_at = NOW();
      `,
      [user.id, user.username, user.displayName, user.avatarUrl, discordBio ?? null],
    )
  }

  const getByUsername = async (username: string) => {
    const result = await pool.query<ProfileRow>(
      `SELECT * FROM profiles WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
      [username],
    )
    const row = result.rows[0]
    return row ? rowToRecord(row) : undefined
  }

  const isPublicMember = async (username: string) => {
    const result = await pool.query<{ is_group_member: boolean }>(
      `SELECT is_group_member FROM profiles WHERE LOWER(username) = LOWER($1) LIMIT 1;`,
      [username],
    )
    return Boolean(result.rows[0]?.is_group_member)
  }

  const isGroupMemberById = async (userId: string) => {
    const result = await pool.query<{ is_group_member: boolean }>(
      `SELECT is_group_member FROM profiles WHERE id = $1 LIMIT 1;`,
      [userId],
    )
    return Boolean(result.rows[0]?.is_group_member)
  }

  const setGroupMemberById = async (userId: string, isGroupMember: boolean) => {
    await pool.query(
      `UPDATE profiles SET is_group_member = $2, updated_at = NOW() WHERE id = $1;`,
      [userId, isGroupMember],
    )
  }

  const listPublicMembers = async () => {
    const result = await pool.query<ProfileRow>(
      `SELECT * FROM profiles WHERE is_group_member = TRUE ORDER BY updated_at DESC;`,
    )
    return result.rows.map((row: ProfileRow) => {
      const user = rowToRecord(row)
      return {
        user,
        profile: recordToApi(user),
      }
    })
  }

  const getApiProfile = async (userId: string) => {
    const result = await pool.query<ProfileRow>(
      `SELECT * FROM profiles WHERE id = $1 LIMIT 1;`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) return {}
    return recordToApi(rowToRecord(row))
  }

  const upsertApiProfile = async (userId: string, patch: ApiUserProfile) => {
    const result = await pool.query<ProfileRow>(
      `SELECT * FROM profiles WHERE id = $1 LIMIT 1;`,
      [userId],
    )
    const row = result.rows[0]
    if (!row) {
      throw new Error(`Profile row missing for user ${userId}; sync session first.`)
    }

    const current = rowToRecord(row)
    if (patch.bio !== undefined) {
      current.bio = normalizeOptional(patch.bio)
      if (!current.bio) delete current.bio
    }
    if (patch.role !== undefined) {
      current.role = normalizeOptional(patch.role)
      if (!current.role) delete current.role
    }
    if (patch.backgroundUrl !== undefined) {
      current.backgroundUrl = normalizeOptional(patch.backgroundUrl)
      if (!current.backgroundUrl) delete current.backgroundUrl
    }
    if (patch.musicUrl !== undefined) {
      current.musicUrl = normalizeOptional(patch.musicUrl)
      if (!current.musicUrl) delete current.musicUrl
    }
    if (patch.socialLinks !== undefined) {
      current.socials = normalizeSocials(patch.socialLinks)
      if (!current.socials) delete current.socials
    }

    await pool.query(
      `
      UPDATE profiles
      SET
        bio = $2,
        role = $3,
        socials = $4::jsonb,
        background_url = $5,
        music_url = $6,
        updated_at = NOW()
      WHERE id = $1;
      `,
      [
        userId,
        current.bio ?? null,
        current.role ?? null,
        current.socials ? JSON.stringify(current.socials) : null,
        current.backgroundUrl ?? null,
        current.musicUrl ?? null,
      ],
    )

    return recordToApi(current)
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
