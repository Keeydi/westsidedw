import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { MemberCardContent } from './MemberCardContent'
import { memberCardSurfaceStyle } from '../memberCardSurfaceStyle'
import { socialHref } from '../socialHref'

type MemberUser = {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  email?: string
  bio?: string
}

type UserProfile = {
  bio?: string
  role?: string
  backgroundUrl?: string
  musicUrl?: string
  socialLinks?: {
    twitch?: string
    tiktok?: string
    discord?: string
    kick?: string
    youtube?: string
    github?: string
  }
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

type MemberCardProps = {
  user: MemberUser
  profile: UserProfile
}

function MemberCard({ user, profile }: MemberCardProps) {
  const handlePointerMove = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const px = x / rect.width - 0.5
    const py = y / rect.height - 0.5

    card.style.setProperty('--mx', `${x}px`)
    card.style.setProperty('--my', `${y}px`)
    card.style.setProperty('--mrx', `${(-py * 7).toFixed(2)}deg`)
    card.style.setProperty('--mry', `${(px * 8).toFixed(2)}deg`)
  }, [])

  const resetPointer = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const card = event.currentTarget
    card.style.setProperty('--mrx', '0deg')
    card.style.setProperty('--mry', '0deg')
    card.style.setProperty('--mx', '50%')
    card.style.setProperty('--my', '50%')
  }, [])

  return (
    <Link
      to={`/members/u/${encodeURIComponent(user.username)}`}
      className="west-member-card"
      onMouseMove={handlePointerMove}
      onMouseLeave={resetPointer}
      style={memberCardSurfaceStyle(profile)}
    >
      <MemberCardContent user={user} profile={profile} />
    </Link>
  )
}

type MembersProps = {
  editable?: boolean
}

function MembersDirectory({ backendBase }: { backendBase: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [members, setMembers] = useState<PublicMembersResponse['members']>([])

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
    <div className="west-members-grid">
      {members.map(({ user, profile }) => (
        <div key={user.id} id={`member-${user.id}`} className="west-member-grid-item">
          <MemberCard user={user} profile={profile} />
        </div>
      ))}
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
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const loadMe = async () => {
      try {
        const response = await fetch(`${backendBase}/auth/me`, {
          credentials: 'include',
          signal: controller.signal,
        })

        if (response.status === 401) {
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

  const updateSocialField = useCallback(
    (field: keyof NonNullable<UserProfile['socialLinks']>, value: string) => {
      setProfile((prev) => ({
        ...prev,
        socialLinks: {
          ...(prev.socialLinks ?? {}),
          [field]: value,
        },
      }))
    },
    [],
  )

  const saveProfile = useCallback(async () => {
    if (!user) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const response = await fetch(`${backendBase}/profile/me`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
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
      <h2 className="west-profile-editor__title mb-3">Customize My Profile</h2>
      <div className="west-profile-editor__grid">
        <label className="west-profile-editor__field">
          <span>Bio</span>
          <input
            type="text"
            value={profile.bio ?? ''}
            onChange={(event) => updateProfileField('bio', event.target.value)}
            placeholder="Write your profile bio"
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Role</span>
          <input
            type="text"
            value={profile.role ?? ''}
            onChange={(event) => updateProfileField('role', event.target.value)}
            placeholder="Founder, Member, ..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Background image URL</span>
          <input
            type="url"
            value={profile.backgroundUrl ?? ''}
            onChange={(event) => updateProfileField('backgroundUrl', event.target.value)}
            placeholder="https://..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Music URL</span>
          <input
            type="url"
            value={profile.musicUrl ?? ''}
            onChange={(event) => updateProfileField('musicUrl', event.target.value)}
            placeholder="YouTube link or direct audio URL (.mp3, etc.)"
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Twitch</span>
          <input
            type="url"
            value={profile.socialLinks?.twitch ?? ''}
            onChange={(event) => updateSocialField('twitch', event.target.value)}
            placeholder="https://twitch.tv/..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>TikTok</span>
          <input
            type="url"
            value={profile.socialLinks?.tiktok ?? ''}
            onChange={(event) => updateSocialField('tiktok', event.target.value)}
            placeholder="https://tiktok.com/@..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Discord</span>
          <input
            type="text"
            value={profile.socialLinks?.discord ?? ''}
            onChange={(event) => updateSocialField('discord', event.target.value)}
            placeholder="username or invite URL"
          />
        </label>

        <label className="west-profile-editor__field">
          <span>Kick</span>
          <input
            type="url"
            value={profile.socialLinks?.kick ?? ''}
            onChange={(event) => updateSocialField('kick', event.target.value)}
            placeholder="https://kick.com/..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>YouTube</span>
          <input
            type="url"
            value={profile.socialLinks?.youtube ?? ''}
            onChange={(event) => updateSocialField('youtube', event.target.value)}
            placeholder="https://youtube.com/..."
          />
        </label>

        <label className="west-profile-editor__field">
          <span>GitHub</span>
          <input
            type="text"
            value={profile.socialLinks?.github ?? ''}
            onChange={(event) => updateSocialField('github', event.target.value)}
            placeholder="username or https://github.com/..."
          />
        </label>
      </div>

      <div className="west-profile-editor__actions">
        <button
          type="button"
          className="west-pill-login-btn"
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {saveMessage ? <span className="west-profile-editor__message">{saveMessage}</span> : null}
      </div>

      {profile.musicUrl ? (
        <div className="west-profile-editor__music mt-3">
          <audio controls src={profile.musicUrl} preload="none" />
        </div>
      ) : null}

      {profile.socialLinks ? (
        <div className="west-profile-editor__socials mt-3">
          {Object.entries(profile.socialLinks).map(([key, value]) => {
            if (!value?.trim()) return null
            const href = socialHref(key, value)
            return (
              <a key={key} href={href} target="_blank" rel="noreferrer">
                {key}
              </a>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function Members({ editable = false }: MembersProps) {
  const backendBase = import.meta.env.VITE_BACKEND_BASE_URL ?? 'http://localhost:4000'
  const loginUrl = import.meta.env.VITE_DISCORD_AUTH_URL ?? `${backendBase}/auth/discord/login`

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
