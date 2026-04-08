import type { SessionUser } from './sessionStore.js'

/** Legacy social links map (older fixed-key format). */
export type LegacyProfileSocialsJson = {
  discord?: string
  github?: string
  twitch?: string
  tiktok?: string
  kick?: string
  youtube?: string
}

/** Flexible social link row (new format). */
export type ProfileSocialLinkJson = {
  platform: string
  value: string
  label?: string
}

/** Social links accepted by API/storage (legacy map or new rows). */
export type ProfileSocialsInputJson = LegacyProfileSocialsJson | ProfileSocialLinkJson[]

/**
 * One profile row in storage.
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
  socials?: ProfileSocialsInputJson
  backgroundUrl?: string
  bannerUrl?: string
  musicUrl?: string
}

/** Shape returned to the frontend (`socialLinks` matches existing API). */
export type ApiUserProfile = {
  bio?: string
  role?: string
  backgroundUrl?: string
  bannerUrl?: string
  musicUrl?: string
  socialLinks?: ProfileSocialsInputJson
}

export type ProfileDatabase = {
  syncFromSession(user: SessionUser): Promise<void>
  getByUsername(username: string): Promise<ProfileRecordJson | undefined>
  isPublicMember(username: string): Promise<boolean>
  isGroupMemberById(userId: string): Promise<boolean>
  setGroupMemberById(userId: string, isGroupMember: boolean): Promise<void>
  listPublicMembers(): Promise<Array<{ user: ProfileRecordJson; profile: ApiUserProfile }>>
  getApiProfile(userId: string): Promise<ApiUserProfile>
  upsertApiProfile(userId: string, patch: ApiUserProfile): Promise<ApiUserProfile>
}
