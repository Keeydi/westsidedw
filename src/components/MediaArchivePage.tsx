import { useEffect, useMemo, useState } from 'react'
import './MediaArchiveRef.css'
import { backendBaseUrl, backendEnabled } from '../config'

type Platform = 'youtube' | 'tiktok'

type MediaItem = {
  title: string
  player: string
  url: string
  platform: Platform
  thumb?: string
  description?: string
}

function fromBase(path: string): string {
  const cleaned = path.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleaned}`
}

function normalizeMediaItems(payload: unknown): MediaItem[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown[] }).items)
      ? (payload as { items: unknown[] }).items
      : []

  const normalized: MediaItem[] = []
  for (const rawItem of source) {
    if (!rawItem || typeof rawItem !== 'object') continue
    const item = rawItem as Record<string, unknown>
    const platform = item.platform === 'youtube' || item.platform === 'tiktok' ? item.platform : null
    const url = typeof item.url === 'string' ? item.url : ''
    if (!platform || !url) continue
    normalized.push({
      title: typeof item.title === 'string' ? item.title : '',
      player: typeof item.player === 'string' ? item.player : '',
      url,
      platform,
      thumb: typeof item.thumb === 'string' ? item.thumb : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
    })
  }
  return normalized
}

function getYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1) || null
    if (parsed.pathname.includes('/embed/')) return parsed.pathname.split('/embed/')[1] ?? null
    return parsed.searchParams.get('v')
  } catch {
    return null
  }
}

function getTikTokVideoId(url: string): string | null {
  const match = url.match(/video\/(\d+)/)
  return match?.[1] ?? null
}

function getEmbedUrl(item: MediaItem): string | null {
  if (item.platform === 'youtube') {
    const id = getYouTubeVideoId(item.url)
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null
  }
  const id = getTikTokVideoId(item.url)
  return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1&controls=1` : null
}

function getYouTubePreviewEmbedUrl(url: string): string | null {
  const id = getYouTubeVideoId(url)
  if (!id) return null
  return `https://www.youtube.com/embed/${id}?autoplay=0&controls=1&modestbranding=1&rel=0`
}

function getYouTubeThumb(url: string): string | null {
  const id = getYouTubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

export function MediaArchivePage() {
  const [activeItem, setActiveItem] = useState<MediaItem | null>(null)
  const [expandedPreviewUrl, setExpandedPreviewUrl] = useState<string | null>(null)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const youtubeItems = useMemo(() => mediaItems.filter((item) => item.platform === 'youtube'), [mediaItems])
  const tiktokItems = useMemo(() => mediaItems.filter((item) => item.platform === 'tiktok'), [mediaItems])
  const activeEmbedUrl = activeItem ? getEmbedUrl(activeItem) : null

  useEffect(() => {
    const controller = new AbortController()
    const loadMediaItems = async () => {
      try {
        const sourceUrl = backendEnabled
          ? `${backendBaseUrl}/media/highlights`
          : fromBase('/media-links.json')
        const response = await fetch(sourceUrl, {
          signal: controller.signal,
          cache: 'no-cache',
        })
        if (!response.ok) {
          setMediaItems([])
          return
        }
        const payload = (await response.json()) as unknown
        setMediaItems(normalizeMediaItems(payload))
      } catch {
        if (!controller.signal.aborted) setMediaItems([])
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false)
      }
    }
    void loadMediaItems()
    return () => controller.abort()
  }, [])

  return (
    <section className="west-media-archive">
      <div className="west-media-archive__container">
        <header className="west-media-archive__header">
          <h1 className="west-media-archive__title">Media</h1>
        </header>

        <section className="west-media-archive__section">
          <div className="west-media-archive__divider">
            <span>Featured Clips</span>
          </div>
          {loadingItems ? (
            <p className="west-media-archive__empty">Loading featured clips...</p>
          ) : youtubeItems.length === 0 ? (
            <p className="west-media-archive__empty">No YouTube clips configured yet.</p>
          ) : (
            <div className="west-media-archive__grid">
              {youtubeItems.map((item) => (
                <article
                  key={`${item.player}-${item.title}-${item.url}`}
                  className={`west-media-card west-media-card--youtube ${expandedPreviewUrl === item.url ? 'west-media-card--expanded' : ''}`}
                  onMouseEnter={() => setExpandedPreviewUrl(item.url)}
                  onMouseLeave={() => setExpandedPreviewUrl((current) => (current === item.url ? null : current))}
                  onFocusCapture={() => setExpandedPreviewUrl(item.url)}
                  onBlurCapture={() => setExpandedPreviewUrl((current) => (current === item.url ? null : current))}
                >
                  <button
                    type="button"
                    className="west-media-card__thumb-wrap west-media-card__thumb-wrap--trigger"
                    onClick={() => setActiveItem(item)}
                    aria-label={`Play ${item.title || 'video'} in large preview`}
                  >
                    {getYouTubePreviewEmbedUrl(item.url) ? (
                      <iframe
                        src={getYouTubePreviewEmbedUrl(item.url) ?? ''}
                        title={`${item.title} preview`}
                        className="west-media-card__youtube-preview"
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                      />
                    ) : getYouTubeThumb(item.url) ? (
                      <img
                        src={getYouTubeThumb(item.url) ?? ''}
                        alt={`${item.title} thumbnail`}
                        className="west-media-card__thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="west-media-card__thumb west-media-card__thumb--fallback">No thumbnail</div>
                    )}
                  </button>
                  <div className="west-media-card__content">
                    <div className="west-media-card__title">{item.title || 'Untitled clip'}</div>
                    <div className="west-media-card__meta">{item.player || 'Unknown player'}</div>
                    {item.description ? (
                      <div className="west-media-card__desc">{item.description}</div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="west-media-archive__section">
          <div className="west-media-archive__divider">
            <span>TikTok</span>
          </div>
          {loadingItems ? (
            <p className="west-media-archive__empty">Loading TikTok clips...</p>
          ) : tiktokItems.length === 0 ? (
            <p className="west-media-archive__empty">No TikTok clips configured yet.</p>
          ) : (
            <div className="west-media-archive__grid">
              {tiktokItems.map((item) => (
                <article
                  key={`${item.player}-${item.title}-${item.url}`}
                  className={`west-media-card ${expandedPreviewUrl === item.url ? 'west-media-card--expanded' : ''}`}
                  onMouseEnter={() => setExpandedPreviewUrl(item.url)}
                  onMouseLeave={() => setExpandedPreviewUrl((current) => (current === item.url ? null : current))}
                  onFocusCapture={() => setExpandedPreviewUrl(item.url)}
                  onBlurCapture={() => setExpandedPreviewUrl((current) => (current === item.url ? null : current))}
                >
                  <button
                    type="button"
                    className="west-media-card__thumb-wrap west-media-card__thumb-wrap--trigger"
                    onClick={() => setActiveItem(item)}
                    aria-label={`Play ${item.title || 'video'} in large preview`}
                  >
                    {item.thumb ? (
                      <img
                        src={item.thumb}
                        alt={`${item.title} thumbnail`}
                        className="west-media-card__thumb"
                        loading="lazy"
                      />
                    ) : (
                      <div className="west-media-card__thumb west-media-card__thumb--fallback">No thumbnail</div>
                    )}
                  </button>
                  <div className="west-media-card__content">
                    <div className="west-media-card__title">{item.title || 'Untitled clip'}</div>
                    <div className="west-media-card__meta">{item.player || 'Unknown player'}</div>
                    {item.description ? (
                      <div className="west-media-card__desc">{item.description}</div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeItem && activeEmbedUrl ? (
        <div className="west-media-modal" onClick={() => setActiveItem(null)}>
          <div className="west-media-modal__dialog" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="west-media-modal__close"
              onClick={() => setActiveItem(null)}
              aria-label="Close video"
            >
              x
            </button>
            <div className="west-media-modal__header">
              <div className="west-media-modal__title">{activeItem.title}</div>
              <div className="west-media-modal__meta">{activeItem.player}</div>
            </div>
            <iframe
              src={activeEmbedUrl}
              title={`${activeItem.title} player`}
              className="west-media-modal__frame"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              loading="lazy"
            />
            <a href={activeItem.url} target="_blank" rel="noreferrer" className="west-media-modal__link">
              Open original
            </a>
          </div>
        </div>
      ) : null}
    </section>
  )
}

