import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import type { MemberCardProfile } from './MemberCardContent'
import { ProfileMusicFab } from './ProfileMusicFab'
import { ProfileShowcaseCard } from './ProfileShowcaseCard'
import { backendBaseUrl } from '../config'

type PublicProfileResponse = {
  user: {
    username: string
    displayName: string
    avatarUrl: string | null
  }
  profile: MemberCardProfile & {
    musicUrl?: string
    role?: string
    socialLinks?: {
      twitch?: string
      tiktok?: string
      discord?: string
      kick?: string
      youtube?: string
      github?: string
    }
  }
}

export function MemberProfile() {
  const { username } = useParams<{ username: string }>()
  const backendBase = backendBaseUrl
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicProfileResponse | null>(null)
  const musicUrl = data?.profile.musicUrl?.trim() ?? ''

  useEffect(() => {
    if (!username) {
      setLoading(false)
      setError('Missing username.')
      return
    }

    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `${backendBase}/profile/public/${encodeURIComponent(username)}`,
          { signal: controller.signal },
        )
        if (response.status === 404) {
          setData(null)
          setError('Profile not found.')
          return
        }
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`)
        }
        const payload = (await response.json()) as PublicProfileResponse
        setData(payload)
      } catch (fetchError) {
        if (controller.signal.aborted) return
        const message =
          fetchError instanceof Error ? fetchError.message : 'Unable to load profile.'
        setError(message)
        setData(null)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [backendBase, username])

  useEffect(() => {
    if (data?.user.displayName) {
      document.title = `${data.user.displayName} | WESTSIDE`
      return () => {
        document.title = 'WESTSIDE'
      }
    }
  }, [data?.user.displayName])

  const showcaseBio = useMemo(() => {
    if (!data) return ''
    const fromProfile = data.profile.bio?.trim()
    if (fromProfile) return fromProfile
    return 'No bio set.'
  }, [data])

  const pageBackgroundStyle = useMemo((): CSSProperties | undefined => {
    const url = data?.profile.backgroundUrl?.trim()
    if (!url) return undefined
    return {
      backgroundImage: `linear-gradient(rgba(5, 8, 14, 0.72), rgba(5, 8, 14, 0.82)), url("${url}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    }
  }, [data?.profile.backgroundUrl])

  const pageClassName =
    'west-member-profile-page' +
    (pageBackgroundStyle ? ' west-member-profile-page--has-cover' : '')

  return (
    <section className={pageClassName} style={pageBackgroundStyle}>
      {data && musicUrl ? <ProfileMusicFab musicUrl={musicUrl} /> : null}

      <Container fluid className="west-members-container px-3 px-sm-4 px-lg-4">
        <div className="west-member-profile-inner">
          <Link to="/members" className="west-member-profile-back">
            ← Back to Members
          </Link>

          {loading ? (
            <p className="west-member-bio mb-0">Loading profile...</p>
          ) : error ? (
            <p className="west-member-bio west-member-bio--status mb-0">{error}</p>
          ) : data ? (
            <div className="west-member-profile-card-block">
              <div className="west-member-profile-showcase-wrap">
                <ProfileShowcaseCard
                  displayName={data.user.displayName}
                  avatarUrl={data.user.avatarUrl}
                  bio={showcaseBio}
                  socialLinks={data.profile.socialLinks}
                />
              </div>
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
