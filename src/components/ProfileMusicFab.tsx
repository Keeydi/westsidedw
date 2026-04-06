import { useCallback, useEffect, useRef, useState } from 'react'
import {
  loadYoutubeIframeApi,
  parseYouTubeVideoId,
  type YtPlayer,
} from '../youtubeSupport'

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      stroke="currentColor"
      fill="none"
      strokeWidth={2}
      viewBox="0 0 24 24"
      strokeLinecap="round"
      strokeLinejoin="round"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" />
    </svg>
  )
}

function PauseCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      height="1em"
      width="1em"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth={2} />
      <rect x="8.25" y="8" width="2.75" height="8" rx="0.5" fill="currentColor" />
      <rect x="13" y="8" width="2.75" height="8" rx="0.5" fill="currentColor" />
    </svg>
  )
}

type ProfileMusicFabProps = {
  musicUrl: string
}

const YT_PLAYING = 1

export function ProfileMusicFab({ musicUrl }: ProfileMusicFabProps) {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const ytHostRef = useRef<HTMLDivElement>(null)
  const ytPlayerRef = useRef<YtPlayer | null>(null)
  const youtubeId = parseYouTubeVideoId(musicUrl)
  const useYoutube = Boolean(youtubeId)

  const toggleAudio = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      void el.play().catch(() => setPlaying(false))
    } else {
      el.pause()
    }
  }, [])

  const toggleYoutube = useCallback(() => {
    const p = ytPlayerRef.current
    if (!p) return
    const state = p.getPlayerState()
    if (state === YT_PLAYING) {
      p.pauseVideo()
    } else {
      p.playVideo()
    }
  }, [])

  const toggle = useCallback(() => {
    if (useYoutube) toggleYoutube()
    else toggleAudio()
  }, [toggleAudio, toggleYoutube, useYoutube])

  useEffect(() => {
    if (useYoutube || !musicUrl) return
    const el = audioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    queueMicrotask(() => setPlaying(false))
    const onEnded = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    el.addEventListener('ended', onEnded)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)

    const tryAutoplay = () => {
      void el.play().catch(() => {})
    }
    tryAutoplay()
    el.addEventListener('canplay', tryAutoplay, { once: true })

    return () => {
      el.removeEventListener('canplay', tryAutoplay)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [musicUrl, useYoutube])

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
    queueMicrotask(() => setPlaying(false))
    host.innerHTML = ''

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
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: () => {
              ytPlayerRef.current = player
              void player.playVideo()
            },
            onStateChange: (ev: { data: number }) => {
              setPlaying(ev.data === YT_PLAYING)
            },
          },
        }) as YtPlayer
      } catch {
        setPlaying(false)
      }
    })()

    return () => {
      cancelled = true
      ytPlayerRef.current?.destroy()
      ytPlayerRef.current = null
      host.innerHTML = ''
    }
  }, [useYoutube, youtubeId])

  return (
    <>
      {!useYoutube ? (
        <audio
          ref={audioRef}
          className="west-member-profile-audio-sr"
          src={musicUrl}
          preload="auto"
        />
      ) : (
        <div ref={ytHostRef} className="west-member-profile-yt-host" aria-hidden />
      )}

      <button
        type="button"
        className="west-member-profile-music-fab"
        onClick={toggle}
        aria-label={playing ? 'Pause music' : 'Play music'}
      >
        {playing ? (
          <PauseCircleIcon className="west-member-profile-music-fab-icon" />
        ) : (
          <PlayCircleIcon className="west-member-profile-music-fab-icon" />
        )}
      </button>
    </>
  )
}
