import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Container } from 'react-bootstrap'
import { backendBaseUrl, backendEnabled } from '../config'
import { socialHref } from '../socialHref'
import {
  loadYoutubeIframeApi,
  parseYouTubeVideoId,
  type YtPlayer,
} from '../youtubeSupport'

type PublicProfileResponse = {
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    discordStatus?: 'online' | 'idle' | 'dnd' | 'offline'
  }
  profile: {
    bio?: string
    musicUrl?: string
    role?: string
    backgroundUrl?: string
    bannerUrl?: string
    socialLinks?: Array<{
      platform: string
      value: string
      label?: string
    }>
  }
}
const BIO_MAX_CHARS = 16

function fromBase(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

function YouTubeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.498 6.186a2.997 2.997 0 0 0-2.11-2.12C19.52 3.5 12 3.5 12 3.5s-7.52 0-9.389.566A2.997 2.997 0 0 0 .502 6.186C0 8.065 0 12 0 12s0 3.935.502 5.814a2.997 2.997 0 0 0 2.109 2.12C4.48 20.5 12 20.5 12 20.5s7.52 0 9.389-.566a2.997 2.997 0 0 0 2.109-2.12C24 15.935 24 12 24 12s0-3.935-.502-5.814zM9.75 15.568V8.432L16 12l-6.25 3.568z" />
    </svg>
  )
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}

function TikTokGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.273V2h-3.127v13.273a2.896 2.896 0 0 1-5.793 0 2.896 2.896 0 0 1 2.896-2.896c.298 0 .586.045.857.13V9.34a6.029 6.029 0 0 0-.857-.061A6.03 6.03 0 0 0 3.766 15.31a6.03 6.03 0 0 0 6.029 6.03 6.03 6.03 0 0 0 6.029-6.03V8.695a7.914 7.914 0 0 0 4.622 1.48V7.048a4.773 4.773 0 0 1-.857-.362z" />
    </svg>
  )
}

function TwitchGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 3h20v12l-4 4h-4l-2 2h-3v-2H5L2 16V3zm18 11V5H4v10l2 2h4v2l2-2h4l4-3zM9 8h2v5H9V8zm5 0h2v5h-2V8z" />
    </svg>
  )
}

function KickGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3h6v7h2l3-3h4l-4.5 4.5L18 17h-4l-3-4H9v8H3V3z" />
    </svg>
  )
}

function GitHubGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.793 23.385c.6.111.82-.261.82-.58 0-.286-.01-1.04-.016-2.042-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.334-1.757-1.334-1.757-1.09-.746.083-.731.083-.731 1.205.085 1.84 1.238 1.84 1.238 1.07 1.833 2.807 1.304 3.492.997.108-.775.418-1.304.762-1.604-2.665-.304-5.467-1.332-5.467-5.93 0-1.31.468-2.382 1.236-3.222-.124-.303-.536-1.523.117-3.176 0 0 1.008-.323 3.303 1.23a11.49 11.49 0 0 1 6.014 0c2.294-1.553 3.302-1.23 3.302-1.23.654 1.653.242 2.873.118 3.176.77.84 1.235 1.912 1.235 3.222 0 4.61-2.807 5.623-5.48 5.921.43.37.814 1.102.814 2.222 0 1.604-.015 2.896-.015 3.29 0 .321.216.696.825.578A12.002 12.002 0 0 0 12 .5z" />
    </svg>
  )
}

function SocialGlyph({ platform }: { platform: string }) {
  const key = platform.toLowerCase()
  if (key === 'youtube') return <YouTubeGlyph />
  if (key === 'discord') return <DiscordGlyph />
  if (key === 'tiktok') return <TikTokGlyph />
  if (key === 'twitch') return <TwitchGlyph />
  if (key === 'kick') return <KickGlyph />
  if (key === 'github') return <GitHubGlyph />
  if (key === 'instagram') return <span>IG</span>
  if (key === 'facebook') return <span>F</span>
  if (key === 'x') return <span>X</span>
  if (key === 'threads') return <span>@</span>
  if (key === 'linkedin') return <span>in</span>
  if (key === 'telegram') return <span>T</span>
  if (key === 'reddit') return <span>R</span>
  return <span>{platform.slice(0, 1).toUpperCase()}</span>
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const total = Math.floor(seconds)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

function normalizeExternalUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return value
  return `https://${value}`
}

function describeMusicSource(url: string, isYoutube: boolean, isFacebook: boolean): string {
  if (!url) return 'No Track'
  if (isYoutube) return 'YouTube'
  if (isFacebook) return 'Facebook Media'
  try {
    const parsed = new URL(url)
    const queryName = parsed.searchParams.get('name')?.trim()
    if (queryName) return queryName
    const lastPathPart = decodeURIComponent(parsed.pathname.split('/').pop() ?? '')
    const cleanedName = lastPathPart.replace(/\.[^/.]+$/, '').trim()
    if (cleanedName && !/^\d{10,}-[0-9a-f-]{20,}$/i.test(cleanedName)) {
      return cleanedName
    }
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return 'Uploaded MP3'
    return host || 'Audio Track'
  } catch {
    return 'Audio Track'
  }
}

function isFacebookUrl(raw: string): boolean {
  const value = raw.trim()
  if (!value) return false
  try {
    const parsed = new URL(value.startsWith('http') ? value : `https://${value}`)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    return (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.watch' ||
      host.endsWith('.fb.watch')
    )
  } catch {
    return false
  }
}

export function MemberProfile() {
  const { username } = useParams<{ username: string }>()
  const backendBase = backendBaseUrl
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PublicProfileResponse | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [entered, setEntered] = useState(false)
  const [vhsTime, setVhsTime] = useState('00:00:00')
  const [youtubeUnavailable, setYoutubeUnavailable] = useState(false)
  const [animatedBio, setAnimatedBio] = useState('')
  const musicUrl = normalizeExternalUrl(data?.profile.musicUrl ?? '')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const ytHostRef = useRef<HTMLDivElement | null>(null)
  const ytPlayerRef = useRef<YtPlayer | null>(null)
  const pendingYoutubePlayRef = useRef(false)
  const autoplayRequestedRef = useRef(false)
  const youtubeId = parseYouTubeVideoId(musicUrl)
  const useYoutube = Boolean(youtubeId)
  const useFacebookLink = isFacebookUrl(musicUrl)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!backendEnabled) {
      setLoading(false)
      setData(null)
      setError('Profile service is unavailable.')
      return
    }

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

  useEffect(() => {
    setEntered(false)
    autoplayRequestedRef.current = false
    pendingYoutubePlayRef.current = false
  }, [username])

  useEffect(() => {
    const tick = () => {
      const n = new Date()
      setVhsTime(
        [n.getHours(), n.getMinutes(), n.getSeconds()]
          .map((v) => String(v).padStart(2, '0'))
          .join(':'),
      )
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow
    const prevHtmlOverflow = document.documentElement.style.overflow
    const prevBodyOverscroll = document.body.style.overscrollBehavior
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    document.documentElement.style.overscrollBehavior = 'none'

    return () => {
      document.body.style.overflow = prevBodyOverflow
      document.documentElement.style.overflow = prevHtmlOverflow
      document.body.style.overscrollBehavior = prevBodyOverscroll
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const dots = Array.from({ length: 90 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.18,
      vy: -(Math.random() * 0.28 + 0.04),
      a: Math.random(),
      ta: Math.random(),
    }))

    let raf = 0
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const d of dots) {
        if (Math.random() < 0.007) d.ta = Math.random()
        d.a += (d.ta - d.a) * 0.012
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${d.a * 0.3})`
        ctx.fill()
        d.x += d.vx
        d.y += d.vy
        if (d.y < -10) {
          d.y = canvas.height + 10
          d.x = Math.random() * canvas.width
        }
      }
      raf = window.requestAnimationFrame(tick)
    }
    tick()

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

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
  const bannerBackgroundStyle = useMemo((): CSSProperties | undefined => {
    const bannerUrl = data?.profile.bannerUrl?.trim() || data?.profile.backgroundUrl?.trim()
    if (!bannerUrl) return undefined
    return {
      backgroundImage: `linear-gradient(rgba(7, 10, 18, 0.28), rgba(7, 10, 18, 0.58)), url("${bannerUrl}")`,
    }
  }, [data?.profile.bannerUrl, data?.profile.backgroundUrl])
  const status = data?.user.discordStatus ?? 'offline'
  const profileBioLabel = (data?.profile.bio?.trim() || 'No bio set.').slice(0, BIO_MAX_CHARS)
  const socialEntries = useMemo(() => {
    if (!data?.profile.socialLinks) return []
    return data.profile.socialLinks.filter(
      (entry) => Boolean(entry.platform?.trim()) && Boolean(entry.value?.trim()),
    )
  }, [data?.profile.socialLinks])
  const musicSourceLabel = useMemo(
    () => describeMusicSource(musicUrl, useYoutube, useFacebookLink),
    [musicUrl, useFacebookLink, useYoutube],
  )
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, (_, index) => ({
        id: index,
        style: {
          width: `${Math.random() * 2 + 0.5}px`,
          height: `${Math.random() * 2 + 0.5}px`,
          top: `${Math.random() * 100}vh`,
          left: `${Math.random() * 100}vw`,
          animationDuration: `${Math.random() * 4 + 2}s`,
          animationDelay: `${Math.random() * 4}s`,
        } as CSSProperties,
      })),
    [],
  )

  useEffect(() => {
    const text = profileBioLabel
    let index = 0
    let deleting = false
    let timeoutId = 0
    let stopped = false

    setAnimatedBio('')

    const tick = () => {
      if (stopped) return
      if (!deleting) {
        index = Math.min(text.length, index + 1)
        setAnimatedBio(text.slice(0, index))
        if (index >= text.length) {
          deleting = true
          timeoutId = window.setTimeout(tick, 900)
          return
        }
        timeoutId = window.setTimeout(tick, 68)
        return
      }

      index = Math.max(0, index - 1)
      setAnimatedBio(text.slice(0, index))
      if (index <= 0) {
        deleting = false
        timeoutId = window.setTimeout(tick, 320)
        return
      }
      timeoutId = window.setTimeout(tick, 36)
    }

    timeoutId = window.setTimeout(tick, 260)
    return () => {
      stopped = true
      window.clearTimeout(timeoutId)
    }
  }, [profileBioLabel])

  const toggleAudio = useCallback(async () => {
    if (useYoutube) {
      const player = ytPlayerRef.current
      if (!player) {
        pendingYoutubePlayRef.current = true
        return
      }
      pendingYoutubePlayRef.current = false
      setYoutubeUnavailable(false)
      const state = player.getPlayerState()
      const ytPlaying = window.YT?.PlayerState?.PLAYING ?? 1
      if (state === ytPlaying) player.pauseVideo()
      else player.playVideo()
      return
    }
    if (useFacebookLink && musicUrl) {
      window.open(musicUrl, '_blank', 'noopener,noreferrer')
      setIsPlaying(false)
      return
    }
    if (!musicUrl) return
    const node = audioRef.current
    if (!node) return
    try {
      if (node.paused) {
        await node.play()
        setIsPlaying(true)
      } else {
        node.pause()
        setIsPlaying(false)
      }
    } catch {
      setIsPlaying(false)
    }
  }, [musicUrl, useFacebookLink, useYoutube, youtubeUnavailable])

  const onSeek = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (useYoutube || useFacebookLink) return
      const node = audioRef.current
      if (!node || duration <= 0) return
      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
      node.currentTime = ratio * duration
      setCurrentTime(node.currentTime)
    },
    [duration, useFacebookLink, useYoutube],
  )

  useEffect(() => {
    if (!useYoutube || !youtubeId) {
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
      return
    }

    const host = ytHostRef.current
    if (!host) return

    let cancelled = false
    ytPlayerRef.current?.destroy()
    ytPlayerRef.current = null
    host.innerHTML = ''
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
    setYoutubeUnavailable(false)
    pendingYoutubePlayRef.current = false

    void (async () => {
      try {
        await loadYoutubeIframeApi()
        if (cancelled || !host.isConnected) return
        const YT = window.YT
        if (!YT?.Player) return

        const player = new YT.Player(host, {
          videoId: youtubeId,
          width: '240',
          height: '240',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              ytPlayerRef.current = player as YtPlayer
              const anyPlayer = player as unknown as {
                getDuration?: () => number
                mute?: () => void
                unMute?: () => void
                playVideo?: () => void
                pauseVideo?: () => void
                cueVideoById?: (videoId: string) => void
              }
              // YouTube often returns 0 duration until the video is cued.
              try {
                anyPlayer.cueVideoById?.(youtubeId)
                anyPlayer.mute?.()
                anyPlayer.playVideo?.()
                window.setTimeout(() => {
                  const d = anyPlayer.getDuration?.() ?? 0
                  if (d > 0) setDuration(d)
                  anyPlayer.unMute?.()
                  if (autoplayRequestedRef.current || pendingYoutubePlayRef.current) {
                    autoplayRequestedRef.current = false
                    pendingYoutubePlayRef.current = false
                    anyPlayer.playVideo?.()
                  } else {
                    anyPlayer.pauseVideo?.()
                  }
                }, 900)
              } catch {
                const d = anyPlayer.getDuration?.() ?? 0
                if (d > 0) setDuration(d)
              }
              if (pendingYoutubePlayRef.current) {
                pendingYoutubePlayRef.current = false
                anyPlayer.playVideo?.()
              }
            },
            onStateChange: (ev: { data: number }) => {
              setIsPlaying(ev.data === 1)
            },
            onError: () => {
              setYoutubeUnavailable(true)
              setIsPlaying(false)
            },
          },
        }) as unknown as YtPlayer
      } catch {
        setYoutubeUnavailable(true)
        setIsPlaying(false)
      }
    })()

    const interval = window.setInterval(() => {
      const p = ytPlayerRef.current as unknown as {
        getCurrentTime?: () => number
        getDuration?: () => number
      } | null
      if (!p) return
      const nextDuration = p.getDuration?.() ?? 0
      const nextCurrent = p.getCurrentTime?.() ?? 0
      if (nextDuration > 0) setDuration(nextDuration)
      setCurrentTime(nextCurrent)
    }, 500)

    // Extra metadata sync window for stubborn YouTube links.
    const durationProbe = window.setInterval(() => {
      const p = ytPlayerRef.current as unknown as {
        getDuration?: () => number
      } | null
      const d = p?.getDuration?.() ?? 0
      if (d > 0) setDuration(d)
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.clearInterval(durationProbe)
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
      host.innerHTML = ''
    }
  }, [useYoutube, youtubeId])

  useEffect(() => {
    if (useYoutube || useFacebookLink) return
    const node = audioRef.current
    if (!node) return
    setCurrentTime(0)
    setDuration(0)
    setIsPlaying(false)
  }, [musicUrl, useFacebookLink, useYoutube])

  useEffect(() => {
    if (!entered || !musicUrl || useFacebookLink) return
    if (useYoutube) {
      autoplayRequestedRef.current = true
      const player = ytPlayerRef.current
      if (player) {
        setYoutubeUnavailable(false)
        player.playVideo()
      } else {
        pendingYoutubePlayRef.current = true
      }
      return
    }
    const node = audioRef.current
    if (!node) return
    void node.play().catch(() => {
      setIsPlaying(false)
    })
  }, [entered, musicUrl, useFacebookLink, useYoutube])

  const onMouseMoveTrail = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    const t = document.createElement('div')
    t.className = 'trail'
    const size = Math.random() * 9 + 3
    t.style.left = `${event.clientX}px`
    t.style.top = `${event.clientY}px`
    t.style.width = `${size}px`
    t.style.height = `${size}px`
    document.body.appendChild(t)
    window.setTimeout(() => t.remove(), 650)
  }, [])

  if (loading) {
    return (
      <section className="west-profile-loader" aria-live="polite" aria-busy="true">
        <div className="west-profile-loader__core">
          <span className="west-profile-loader__ring west-profile-loader__ring--one" />
          <span className="west-profile-loader__ring west-profile-loader__ring--two" />
          <span className="west-profile-loader__glow" />
          <img
            src={fromBase('/affiliations/10k.png')}
            alt="Loading profile"
            className="west-profile-loader__logo"
            loading="eager"
          />
        </div>
        <p className="west-profile-loader__label mb-0">Loading profile...</p>
      </section>
    )
  }

  return (
    <section
      className={`${pageClassName} west-member-v2-page`}
      style={pageBackgroundStyle}
      onMouseMove={onMouseMoveTrail}
    >
      <div
        id="bg"
        style={{
          backgroundImage: data?.profile.backgroundUrl?.trim()
            ? `url("${data.profile.backgroundUrl.trim()}")`
            : 'none',
        }}
      />
      <div id="vignette" />
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />
      <div id="grain" />
      <div id="scanlines" />
      <div id="sweep" />
      <canvas id="pc" ref={canvasRef} />
      {stars.map((star) => (
        <div key={star.id} className="star" style={star.style} />
      ))}
      {!entered ? (
        <div id="overlay" onClick={() => setEntered(true)}>
          <div className="ov-eyebrow">tap to enter</div>
          <div className="ov-title">WESTSIDE</div>
          <div className="ov-sub">members profile</div>
        </div>
      ) : null}
      <Container fluid className="west-members-container px-3 px-sm-4 px-lg-4">
        {error ? (
          <div className="west-member-profile-inner">
            <Link to="/members" className="west-member-profile-back">
              ← Back to Members
            </Link>
            <p className="west-member-bio west-member-bio--status mb-0">{error}</p>
          </div>
        ) : data && entered ? (
          <div id="wrapper" className="west-member-v2-wrap" style={{ display: 'flex' }}>
            <div className="card west-member-v2-card" id="mainCard">
              <div
                className="card-top west-member-v2-top"
                style={{
                  background: 'linear-gradient(rgba(255,255,255,0.05), rgba(0,0,0,0.58))',
                }}
              >
                <div className="banner" id="discordBanner" style={bannerBackgroundStyle} />
                <Link to="/" className="home-btn west-member-v2-home" aria-label="Back to home" title="Back to home">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 9.5V20h14V9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <div className="rec-dot" />
              </div>

              <div className="profile-shell west-member-v2-shell">
                <div className="profile-main west-member-v2-main">
                  <div className="avatar-wrap west-member-v2-avatar-wrap">
                    <div className="avatar-frame">
                      <img
                        src={data.user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'}
                        alt={data.user.displayName}
                        className="avatar west-member-v2-avatar"
                        id="discordAvatar"
                      />
                    </div>
                    <div className={`sdot west-member-v2-status west-member-v2-status--${status}`} id="statusDot" />
                  </div>
                  <div className="name-row">
                    <div className="username west-member-v2-name" id="discordName">
                      {data.user.displayName}
                    </div>
                  </div>
                  <div className="subtitle west-member-v2-subtitle" id="discordStatus">
                    {animatedBio}
                  </div>
                </div>

                <div className="divider west-member-v2-divider" />
                <div className="west-member-v2-mid-dot" aria-hidden="true" />

                {socialEntries.length > 0 ? (
                  <div className="socials west-member-v2-socials">
                    {socialEntries.map((entry, index) => (
                      <a
                        key={`${entry.platform}-${index}`}
                        className="soc-btn west-member-v2-soc-btn"
                        href={socialHref(entry.platform, entry.value ?? '')}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={entry.label || entry.platform}
                        aria-label={entry.label || entry.platform}
                      >
                        <SocialGlyph platform={entry.platform} />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="audio-player west-member-v2-audio" id="audioPlayer">
                  <div className="eq" id="eqBars" aria-hidden="true">
                    <div className="eqb" />
                    <div className="eqb" />
                    <div className="eqb" />
                    <div className="eqb" />
                    <div className="eqb" />
                  </div>
                  <img
                    src={data.user.avatarUrl ?? 'https://cdn.discordapp.com/embed/avatars/0.png'}
                    alt="cover"
                    className="audio-cover"
                    id="coverArt"
                  />
                  <div className="audio-info">
                    <div className="audio-title">{musicSourceLabel}</div>
                    <div className="audio-artist">
                      {musicUrl
                        ? useFacebookLink
                          ? 'Facebook media link'
                          : useYoutube && youtubeUnavailable
                            ? 'Playback blocked in embed - tap play to open link'
                          : data.user.displayName
                        : 'Set music URL in profile'}
                    </div>
                    <div className="prog-wrap" id="progressWrap" onClick={onSeek}>
                      <div id="progressBar" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <div id="timeDisplay">
                      {useFacebookLink
                        ? 'Open in Facebook'
                        : `${formatTime(currentTime)} / ${
                            duration > 0 ? formatTime(duration) : useYoutube ? '--:--' : '0:00'
                          }`}
                    </div>
                  </div>
                  <button
                    className={`play-btn ${musicUrl ? '' : 'play-btn--inactive'}`}
                    id="playBtn"
                    type="button"
                    onClick={toggleAudio}
                    aria-disabled={!musicUrl}
                    aria-label={
                      useFacebookLink
                        ? 'Open Facebook media'
                        : useYoutube && youtubeUnavailable
                          ? 'YouTube playback unavailable'
                          : isPlaying
                            ? 'Pause audio'
                            : 'Play audio'
                    }
                  >
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <rect x="7" y="6" width="3.5" height="12" rx="0.8" />
                        <rect x="13.5" y="6" width="3.5" height="12" rx="0.8" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M8 6.5 18 12 8 17.5z" />
                      </svg>
                    )}
                  </button>
                  {useYoutube ? (
                    <div ref={ytHostRef} className="west-member-profile-yt-host" aria-hidden />
                  ) : null}
                  <audio
                    ref={audioRef}
                    preload="metadata"
                    src={useYoutube || useFacebookLink || !musicUrl ? undefined : musicUrl}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Container>
      <div className="vhs-time" id="vhsTime">
        {vhsTime}
      </div>
      <div className="vhs-lbl">Mohok Haxon</div>
    </section>
  )
}
