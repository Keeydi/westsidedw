import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function fromBase(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

function formatTime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '0:00'
  const mins = Math.floor(totalSeconds / 60)
  const secs = Math.floor(totalSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function HomeMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  const startPlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return false
    if (!audio.paused) {
      setIsPlaying(true)
      return true
    }
    try {
      await audio.play()
      setIsPlaying(true)
      return true
    } catch {
      setIsPlaying(false)
      return false
    }
  }, [])

  const progress = useMemo(() => {
    if (!duration) return 0
    return Math.min(100, (currentTime / duration) * 100)
  }, [currentTime, duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume

    const syncTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 0)
    }
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', syncTime)
    audio.addEventListener('loadedmetadata', syncTime)
    audio.addEventListener('durationchange', syncTime)
    audio.addEventListener('ended', onEnded)

    let cleaned = false
    const retryStart = () => {
      void startPlayback().then((didStart) => {
        if (didStart && !cleaned) {
          window.removeEventListener('pointerdown', retryStart)
          window.removeEventListener('keydown', retryStart)
          window.removeEventListener('touchstart', retryStart)
        }
      })
    }

    void startPlayback().then((didStart) => {
      if (!didStart) {
        window.addEventListener('pointerdown', retryStart, { once: true })
        window.addEventListener('keydown', retryStart, { once: true })
        window.addEventListener('touchstart', retryStart, { once: true })
      }
    })

    return () => {
      cleaned = true
      audio.removeEventListener('timeupdate', syncTime)
      audio.removeEventListener('loadedmetadata', syncTime)
      audio.removeEventListener('durationchange', syncTime)
      audio.removeEventListener('ended', onEnded)
      window.removeEventListener('pointerdown', retryStart)
      window.removeEventListener('keydown', retryStart)
      window.removeEventListener('touchstart', retryStart)
    }
  }, [startPlayback])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
  }, [volume])

  const togglePlay = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }
      return
    }
    audio.pause()
    setIsPlaying(false)
  }

  const seekBy = (delta: number) => {
    const audio = audioRef.current
    if (!audio) return
    const nextTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0))
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const handleVolumeChange = (nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume))
    setVolume(clamped)
  }

  return (
    <>
      <audio ref={audioRef} preload="metadata" src={fromBase('/music/westside-ost-original.wav')} />
      <aside className="west-home-player" aria-label="Homepage music player">
        <div className="west-home-player__head">
          <img
            src={fromBase('/affiliations/10k.png')}
            alt="Track cover"
            className="west-home-player__cover"
            loading="lazy"
            decoding="async"
          />
          <div className="west-home-player__meta">
            <div className="west-home-player__title">Westside OST</div>
            <div className="west-home-player__artist">Westside Exclusive</div>
          </div>
          <div className="west-home-player__badge">LIVE</div>
        </div>

        <div className="west-home-player__body">
          <div className="west-home-player__meter" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="west-home-player__time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          <div className="west-home-player__controls">
            <button type="button" className="west-home-player__btn" onClick={() => seekBy(-10)} aria-label="Back 10 seconds">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.5 5.5v13l-6.25-6.5 6.25-6.5Zm-7.75 0v13L3.5 12l6.25-6.5Z" />
              </svg>
            </button>
            <button
              type="button"
              className="west-home-player__btn west-home-player__btn--play"
              onClick={() => {
                void togglePlay()
              }}
              aria-label={isPlaying ? 'Pause music' : 'Play music'}
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5h3v14H7V5Zm7 0h3v14h-3V5Z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                </svg>
              )}
            </button>
            <button type="button" className="west-home-player__btn" onClick={() => seekBy(10)} aria-label="Forward 10 seconds">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M6.5 5.5v13l6.25-6.5-6.25-6.5Zm7.75 0v13l6.25-6.5-6.25-6.5Z" />
              </svg>
            </button>
            <div className={`west-home-player__eq ${isPlaying ? '' : 'west-home-player__eq--paused'}`} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="west-home-player__volume">
            <label htmlFor="west-home-player-volume" className="west-home-player__volume-label">
              Vol
            </label>
            <input
              id="west-home-player-volume"
              className="west-home-player__volume-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              onChange={(event) => handleVolumeChange(Number(event.target.value) / 100)}
              aria-label="Music volume"
            />
            <span className="west-home-player__volume-value">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </aside>
    </>
  )
}
