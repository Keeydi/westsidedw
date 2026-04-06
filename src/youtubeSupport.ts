/** Returns YouTube video id if `url` is a known YouTube URL shape, else null. */
export function parseYouTubeVideoId(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0]
      if (id && /^[\w-]{11}$/.test(id)) return id
    }

    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'www.youtube-nocookie.com'
    ) {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{11}$/.test(v)) return v

      const embed = u.pathname.match(/^\/embed\/([\w-]{11})/)
      if (embed) return embed[1]

      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/)
      if (shorts) return shorts[1]

      const live = u.pathname.match(/^\/live\/([\w-]{11})/)
      if (live) return live[1]
    }
  } catch {
    /* invalid URL */
  }
  return null
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        id: string | HTMLElement,
        options: Record<string, unknown>,
      ) => YtPlayer
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
  }
}

export type YtPlayer = {
  playVideo: () => void
  pauseVideo: () => void
  destroy: () => void
  getPlayerState: () => number
}

export function loadYoutubeIframeApi(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()

  return new Promise((resolve, reject) => {
    let settled = false
    let poll = 0
    let timeout = 0

    const finish = () => {
      if (settled) return
      settled = true
      window.clearInterval(poll)
      window.clearTimeout(timeout)
      resolve()
    }
    const fail = () => {
      if (settled) return
      settled = true
      window.clearInterval(poll)
      window.clearTimeout(timeout)
      reject(new Error('YouTube API load timeout'))
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        prev?.()
      } finally {
        finish()
      }
    }

    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      document.head.appendChild(tag)
    }

    poll = window.setInterval(() => {
      if (window.YT?.Player) finish()
    }, 32)

    timeout = window.setTimeout(fail, 15000)
  })
}
