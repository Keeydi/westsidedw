import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import {
  buildSessionHeaders,
  consumeSidFromHashRoute,
  getSessionId,
  setSessionId,
} from '../authSession'
import { backendBaseUrl, backendEnabled, discordAuthUrl } from '../config'

type MemberUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  discordStatus?: 'online' | 'idle' | 'dnd' | 'offline'
  email?: string
  bio?: string
}

type UserProfile = {
  bio?: string
  role?: string
  backgroundUrl?: string
  bannerUrl?: string
  musicUrl?: string
  socialLinks?: SocialLinkRow[]
}

type SocialLinkRow = {
  platform: string
  value: string
  label?: string
}

type PublicMembersResponse = {
  members: Array<{
    user: MemberUser
    profile: UserProfile
  }>
}

type MeResponse = {
  authenticated: boolean
  user?: MemberUser
}

type MembersProps = {
  editable?: boolean
}

type GroupKey = 'leader' | 'coLeader' | 'officer' | 'veteran' | 'recruit'

const GROUP_META: Record<GroupKey, { main: string; sub: string }> = {
  leader: { main: 'DYISKUMPADRES', sub: 'LEADER' },
  coLeader: { main: 'DYISKUMPADRES', sub: 'CO-LEADER' },
  officer: { main: 'DYISKUMPADRES', sub: 'OFFICER' },
  veteran: { main: 'DYISKUMPADRES', sub: 'VETERAN' },
  recruit: { main: 'DYISKUMPADRES', sub: 'RECRUIT' },
}
const BIO_MAX_CHARS = 16
const SOCIAL_PLATFORM_OPTIONS = [
  'Custom',
  'Discord',
  'Instagram',
  'Facebook',
  'X',
  'Threads',
  'TikTok',
  'YouTube',
  'Twitch',
  'Kick',
  'GitHub',
  'LinkedIn',
  'Reddit',
  'Telegram',
  'WhatsApp',
  'Snapchat',
  'Pinterest',
  'Tumblr',
  'Weibo',
  'VK',
  'Bilibili',
  'Naver',
  'LINE',
  'WeChat',
  'Steam',
  'Spotify',
  'SoundCloud',
  'Apple Music',
  'Bandcamp',
  'Patreon',
  'Mastodon',
  'Bluesky',
  'Behance',
  'Dribbble',
  'DeviantArt',
  'Website',
] as const
const KNOWN_SOCIAL_PLATFORM_KEYS = new Set(
  SOCIAL_PLATFORM_OPTIONS.filter((name) => name !== 'Custom').map((name) => name.toLowerCase()),
)
const SOCIAL_PLATFORM_LABELS = new Map(
  SOCIAL_PLATFORM_OPTIONS.map((platformName) => [platformName.toLowerCase(), platformName]),
)

function limitBio(value: string): string {
  return value.slice(0, BIO_MAX_CHARS)
}

function inferGroup(role?: string): GroupKey {
  const value = (role ?? '').toLowerCase()
  if (value.includes('leader') && !value.includes('co')) return 'leader'
  if (value.includes('co-leader') || value.includes('co leader') || value.includes('coleader'))
    return 'coLeader'
  if (value.includes('officer') || value.includes('moderator') || value.includes('mod'))
    return 'officer'
  if (value.includes('veteran') || value.includes('elite') || value.includes('senior'))
    return 'veteran'
  return 'recruit'
}

function LoopingTypeText({ text, className }: { text: string; className: string }) {
  const [value, setValue] = useState('')

  useEffect(() => {
    const target = limitBio(text.trim() || 'No bio set.')
    let index = 0
    let deleting = false
    let timeoutId = 0
    let stopped = false

    setValue('')

    const tick = () => {
      if (stopped) return
      if (!deleting) {
        index = Math.min(target.length, index + 1)
        setValue(target.slice(0, index))
        if (index >= target.length) {
          deleting = true
          timeoutId = window.setTimeout(tick, 900)
          return
        }
        timeoutId = window.setTimeout(tick, 58)
        return
      }

      index = Math.max(0, index - 1)
      setValue(target.slice(0, index))
      if (index <= 0) {
        deleting = false
        timeoutId = window.setTimeout(tick, 300)
        return
      }
      timeoutId = window.setTimeout(tick, 34)
    }

    timeoutId = window.setTimeout(tick, 250)
    return () => {
      stopped = true
      window.clearTimeout(timeoutId)
    }
  }, [text])

  return <div className={className}>{value}</div>
}

function MembersDirectory({ backendBase }: { backendBase: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<PublicMembersResponse['members']>([])
  const grouped = useMemo(() => {
    const base: Record<GroupKey, PublicMembersResponse['members']> = {
      leader: [],
      coLeader: [],
      officer: [],
      veteran: [],
      recruit: [],
    }
    for (const entry of members) {
      base[inferGroup(entry.profile.role)].push(entry)
    }
    return base
  }, [members])
  const visibleGroups = useMemo(
    () => (Object.keys(GROUP_META) as GroupKey[]).filter((groupKey) => grouped[groupKey].length > 0),
    [grouped],
  )
  const headerKicker =
    visibleGroups.length === 1 ? GROUP_META[visibleGroups[0]].sub : 'MEMBERS'

  useEffect(() => {
    const controller = new AbortController()
    const loadMembers = async () => {
      try {
        const response = await fetch(`${backendBase}/profile/public-members`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`Members request failed (${response.status})`)
        }
        const payload = (await response.json()) as PublicMembersResponse
        setMembers(payload.members ?? [])
      } catch (fetchError) {
        if (controller.signal.aborted) return
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load members.'
        setError(message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadMembers()
    return () => controller.abort()
  }, [backendBase])

  if (loading) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-0">Loading members...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-2">Could not load members.</p>
        <p className="west-member-bio west-member-bio--status mb-0">{error}</p>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-0">No approved group members available yet.</p>
      </div>
    )
  }

  return (
    <div className="west-members-tree-shell">
      <div className="west-members-tree-head">
        <span className="west-members-tree-head-line" />
        <span className="west-members-tree-head-brand">DYISKUMPADRES</span>
        <span className="west-members-tree-head-kicker">{headerKicker}</span>
        <span className="west-members-tree-head-line" />
      </div>

      {visibleGroups.map((groupKey) => {
        const items = grouped[groupKey]
        const meta = GROUP_META[groupKey]

        return (
          <section key={groupKey} className="west-members-tree-group">
            {visibleGroups.length > 1 ? (
              <div className="west-members-tree-group-title">
                <span className="west-members-tree-group-sub">{meta.sub}</span>
              </div>
            ) : null}
            <div className="west-members-tree-grid">
              {items.map(({ user, profile }) => (
                <Link
                  key={user.id}
                  to={`/members/u/${encodeURIComponent(user.username)}`}
                  className={`west-members-tree-node west-members-tree-node--${groupKey} text-decoration-none`}
                >
                  <span className="west-members-tree-node-rail" />
                  <div className="west-members-tree-avatar">
                    <img
                      src={user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'}
                      alt={user.displayName}
                      loading="lazy"
                    />
                    <span
                      className={`west-members-tree-status west-members-tree-status--${
                        user.discordStatus ?? 'offline'
                      }`}
                    />
                  </div>
                  <div className="west-members-tree-name">{user.displayName}</div>
                  <LoopingTypeText
                    className="west-members-tree-bio"
                    text={limitBio(profile.bio?.trim() || 'No bio set.')}
                  />
                </Link>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function MyProfileEditor({
  backendBase,
  loginUrl,
}: {
  backendBase: string
  loginUrl: string
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<MemberUser | null>(null)
  const [profile, setProfile] = useState<UserProfile>({})
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [uploadingMusic, setUploadingMusic] = useState(false)
  const [musicFileName, setMusicFileName] = useState('')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [openSocialMenuIndex, setOpenSocialMenuIndex] = useState<number | null>(null)
  const socialBuilderRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const sidFromUrl = consumeSidFromHashRoute()
    const sid = sidFromUrl ?? getSessionId()
    if (!sid) {
      setLoading(false)
      setUser(null)
      setError(null)
      return
    }

    const controller = new AbortController()
    const loadMe = async () => {
      try {
        const response = await fetch(`${backendBase}/auth/me`, {
          credentials: 'include',
          headers: buildSessionHeaders(),
          signal: controller.signal,
        })

        if (response.status === 401) {
          setSessionId(null)
          setUser(null)
          setError(null)
          return
        }

        if (!response.ok) {
          throw new Error(`Profile request failed (${response.status})`)
        }

        const payload = (await response.json()) as MeResponse
        if (!payload.authenticated || !payload.user) {
          setUser(null)
          return
        }
        setUser(payload.user)

        const profileResponse = await fetch(`${backendBase}/profile/me`, {
          credentials: 'include',
          headers: buildSessionHeaders(),
          signal: controller.signal,
        })
        if (profileResponse.ok) {
          const profilePayload = (await profileResponse.json()) as {
            authenticated: boolean
            profile?: UserProfile
          }
          setProfile(profilePayload.profile ?? {})
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load user profile.'
        setError(message)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadMe()
    return () => controller.abort()
  }, [backendBase])

  const updateProfileField = useCallback((field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }, [])

  const addSocialRow = useCallback(() => {
    setProfile((prev) => ({
      ...prev,
      socialLinks: [...(prev.socialLinks ?? []), { platform: 'discord', value: '' }],
    }))
  }, [])

  const removeSocialRow = useCallback((index: number) => {
    setProfile((prev) => {
      const current = prev.socialLinks ?? []
      return {
        ...prev,
        socialLinks: current.filter((_, rowIndex) => rowIndex !== index),
      }
    })
  }, [])

  const updateSocialRow = useCallback(
    (index: number, patch: Partial<SocialLinkRow>) => {
      setProfile((prev) => {
        const current = prev.socialLinks ?? []
        const next = current.map((row, rowIndex) =>
          rowIndex === index
            ? {
                ...row,
                ...patch,
              }
            : row,
        )
        return {
          ...prev,
          socialLinks: next,
        }
      })
    },
    [],
  )

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (socialBuilderRef.current?.contains(target)) return
      setOpenSocialMenuIndex(null)
    }
    document.addEventListener('mousedown', onDocumentMouseDown)
    return () => document.removeEventListener('mousedown', onDocumentMouseDown)
  }, [])

  const saveProfile = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch(`${backendBase}/profile/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: buildSessionHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(profile),
      })
      if (!response.ok) {
        throw new Error(`Save failed (${response.status})`)
      }
      const payload = (await response.json()) as { ok: boolean; profile: UserProfile }
      setProfile(payload.profile)
      setSaveMessage('Profile saved. Your card appears publicly only after approval.')
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : 'Failed to save profile.'
      setSaveMessage(message)
    } finally {
      setSaving(false)
    }
  }, [backendBase, profile, user])

  const uploadMusicFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const file = input.files?.[0]
      if (!file || !user) return

      const isMp3Mime =
        file.type === 'audio/mpeg' || file.type === 'audio/mp3' || file.type === 'audio/x-mpeg'
      const isMp3Name = file.name.toLowerCase().endsWith('.mp3')
      if (!isMp3Mime && !isMp3Name) {
        setSaveMessage('Please select an MP3 file.')
        input.value = ''
        return
      }

      setUploadingMusic(true)
      setMusicFileName(file.name)
      setSaveMessage(null)
      try {
        const formData = new FormData()
        formData.append('music', file)
        const response = await fetch(`${backendBase}/profile/me/music-upload`, {
          method: 'POST',
          credentials: 'include',
          headers: buildSessionHeaders(),
          body: formData,
        })
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string }
          const message = payload.error ? payload.error : `Upload failed (${response.status})`
          throw new Error(message)
        }
        const payload = (await response.json()) as { ok: boolean; profile: UserProfile }
        setProfile(payload.profile)
        setSaveMessage('MP3 uploaded. Your profile now uses this file for music.')
      } catch (uploadError) {
        const message =
          uploadError instanceof Error ? uploadError.message : 'Failed to upload music.'
        setSaveMessage(message)
      } finally {
        setUploadingMusic(false)
        input.value = ''
      }
    },
    [backendBase, user],
  )

  const logout = useCallback(async () => {
    setLoggingOut(true)
    setSaveMessage(null)
    try {
      await fetch(`${backendBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: buildSessionHeaders(),
      })
    } catch {
      // If network logout fails, still clear local session below.
    } finally {
      setSessionId(null)
      setUser(null)
      setLoggingOut(false)
    }
  }, [backendBase])

  if (loading) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-0">Loading your profile editor...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-2">Could not load Discord profile.</p>
        <p className="west-member-bio west-member-bio--status mb-0">{error}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="west-members-empty-state">
        <p className="west-member-bio mb-3">Login with Discord to edit your profile.</p>
        <a href={loginUrl} className="west-pill-login-btn text-decoration-none">
          Login with Discord
        </a>
      </div>
    )
  }

  return (
    <div className="west-profile-editor mx-auto">
      <div className="west-profile-editor__head">
        <span className="west-profile-editor__head-line" />
        <span className="west-profile-editor__head-brand">DYISKUMPADRES</span>
        <span className="west-profile-editor__head-kicker">PROFILE EDITOR</span>
        <span className="west-profile-editor__head-line" />
      </div>
      <h2 className="west-profile-editor__title">Customize My Profile</h2>
      <p className="west-profile-editor__subtitle">
        Keep your public card synced with the same WESTSIDE visual style.
      </p>
      <div className="west-profile-editor__section">
        <div className="west-profile-editor__section-title">Core Profile</div>
        <div className="west-profile-editor__grid">
          <label className="west-profile-editor__field">
            <span>Bio</span>
            <input
              type="text"
              value={profile.bio ?? ''}
              maxLength={BIO_MAX_CHARS}
              onChange={(event) => updateProfileField('bio', limitBio(event.target.value))}
              placeholder={`Write profile bio (${BIO_MAX_CHARS} max)`}
            />
          </label>

          <label className="west-profile-editor__field">
            <span>Role</span>
            <input
              type="text"
              value={profile.role ?? ''}
              readOnly
              placeholder="Leader, Co-Leader, Officer, Veteran, Recruit"
            />
          </label>

          <label className="west-profile-editor__field">
            <span>Page background image URL</span>
            <input
              type="url"
              value={profile.backgroundUrl ?? ''}
              onChange={(event) => updateProfileField('backgroundUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="west-profile-editor__field">
            <span>Profile banner image URL</span>
            <input
              type="url"
              value={profile.bannerUrl ?? ''}
              onChange={(event) => updateProfileField('bannerUrl', event.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="west-profile-editor__field west-profile-editor__field--wide">
            <span>Upload MP3</span>
            <div className="west-profile-editor__upload">
              <input
                id="west-profile-music-upload"
                className="west-profile-editor__upload-input"
                type="file"
                accept=".mp3,audio/mpeg"
                onChange={uploadMusicFile}
                disabled={uploadingMusic || saving || loggingOut}
              />
              <label
                htmlFor="west-profile-music-upload"
                className={`west-profile-editor__upload-btn ${
                  uploadingMusic || saving || loggingOut ? 'west-profile-editor__upload-btn--disabled' : ''
                }`}
              >
                {uploadingMusic ? 'Uploading...' : 'Select MP3'}
              </label>
              <span className="west-profile-editor__upload-name">
                {musicFileName || 'No file selected'}
              </span>
            </div>
          </label>
        </div>
      </div>

      <div className="west-profile-editor__section west-profile-editor__section--social">
        <div className="west-profile-editor__section-title">Social Links</div>
        <p className="west-profile-editor__section-note">
          Add any platform your members use worldwide. Choose from presets or use custom.
        </p>
        <div className="west-profile-editor__social-builder" ref={socialBuilderRef}>
          {(profile.socialLinks ?? []).map((social, index) => {
            const platformKey = social.platform?.trim().toLowerCase() ?? ''
            const isCustom =
              !platformKey || platformKey === 'custom' || !KNOWN_SOCIAL_PLATFORM_KEYS.has(platformKey)
            const customLabelValue = social.label?.trim() || (isCustom ? social.platform ?? '' : '')
            const selectedPlatformLabel = isCustom
              ? 'Custom'
              : (SOCIAL_PLATFORM_LABELS.get(platformKey) ?? social.platform)
            return (
              <div
                key={`social-row-${index}`}
                className={`west-profile-editor__social-row ${
                  isCustom ? 'west-profile-editor__social-row--custom' : ''
                } ${
                  openSocialMenuIndex === index ? 'west-profile-editor__social-row--menu-open' : ''
                }`}
              >
                <div className="west-profile-editor__platform-picker">
                  <button
                    type="button"
                    className="west-profile-editor__platform-toggle"
                    onClick={() =>
                      setOpenSocialMenuIndex((current) => (current === index ? null : index))
                    }
                  >
                    <span>{selectedPlatformLabel}</span>
                    <span aria-hidden="true">▼</span>
                  </button>
                  {openSocialMenuIndex === index ? (
                    <div className="west-profile-editor__platform-menu">
                      {SOCIAL_PLATFORM_OPTIONS.map((platformName) => {
                        const optionKey =
                          platformName === 'Custom' ? 'custom' : platformName.toLowerCase()
                        const active =
                          (isCustom && optionKey === 'custom') ||
                          (!isCustom && optionKey === platformKey)
                        return (
                          <button
                            key={platformName}
                            type="button"
                            className={`west-profile-editor__platform-option ${
                              active ? 'west-profile-editor__platform-option--active' : ''
                            }`}
                            onClick={() => {
                              if (optionKey === 'custom') {
                                updateSocialRow(index, {
                                  platform: 'custom',
                                  label: customLabelValue,
                                })
                              } else {
                                updateSocialRow(index, {
                                  platform: optionKey,
                                  label: undefined,
                                })
                              }
                              setOpenSocialMenuIndex(null)
                            }}
                          >
                            {platformName}
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                </div>
                {isCustom ? (
                  <input
                    type="text"
                    value={customLabelValue}
                    onChange={(event) =>
                      updateSocialRow(index, {
                        platform: 'custom',
                        label: event.target.value,
                      })
                    }
                    placeholder="Custom platform"
                  />
                ) : null}
                <input
                  type="text"
                  value={social.value ?? ''}
                  onChange={(event) => updateSocialRow(index, { value: event.target.value })}
                  placeholder="URL or username"
                />
                <button
                  type="button"
                  className="west-profile-editor__remove-social"
                  onClick={() => {
                    removeSocialRow(index)
                    setOpenSocialMenuIndex((current) => (current === index ? null : current))
                  }}
                >
                  Remove
                </button>
              </div>
            )
          })}
          <button
            type="button"
            className="west-profile-editor__add-social"
            onClick={addSocialRow}
            disabled={saving || loggingOut || uploadingMusic}
          >
            + Add Social
          </button>
        </div>
      </div>

      <div className="west-profile-editor__actions">
        <button
          type="button"
          className="west-pill-login-btn west-profile-editor__action-btn"
          onClick={saveProfile}
          disabled={saving || loggingOut || uploadingMusic}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        <button
          type="button"
          className="west-pill-login-btn west-profile-editor__action-btn west-profile-editor__action-btn--secondary"
          onClick={logout}
          disabled={saving || loggingOut || uploadingMusic}
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
        {saveMessage ? <span className="west-profile-editor__message">{saveMessage}</span> : null}
      </div>

    </div>
  )
}

export function Members({ editable = false }: MembersProps) {
  const backendBase = backendBaseUrl
  const loginUrl = discordAuthUrl

  if (!backendEnabled) {
    return (
      <section id="members" className="west-members-section">
        <Container fluid className="west-members-container px-3 px-sm-4 px-lg-4">
          <div className="west-members-content">
            <div className="west-members-empty-state">
              <p className="west-member-bio mb-2">Members service is currently unavailable.</p>
              <p className="west-member-bio west-member-bio--status mb-0">
                Configure `VITE_BACKEND_BASE_URL` with a live API URL.
              </p>
            </div>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section id="members" className="west-members-section">
      <Container fluid className="west-members-container px-3 px-sm-4 px-lg-4">
        <div className="west-members-content">
          {editable ? (
            <MyProfileEditor backendBase={backendBase} loginUrl={loginUrl} />
          ) : (
            <MembersDirectory backendBase={backendBase} />
          )}
        </div>
      </Container>
    </section>
  )
}
